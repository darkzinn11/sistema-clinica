# Architecture: Clínica (um rebuild do núcleo de agendamento do Feegow Clinic)

Baseado em `replica/recon.md` e `replica/features.csv`. Escopo: agenda,
disponibilidade, cadastro mínimo de paciente, check-in/fila de espera e
confirmação de agendamentos. Uso próprio (uma clínica), não multi-tenant
comercial — mas a tabela `clinics` existe desde já para não travar se o
usuário abrir uma segunda unidade depois.

## Stack

| layer | choice | why |
| --- | --- | --- |
| web | Next.js 14 (App Router) + TypeScript | server actions cobrem CRUD de agenda sem precisar de uma API separada; um só deploy |
| styling | Tailwind, tokens de `/replica-design` | consistente com o resto do pacote Replica |
| database | Postgres (Supabase) | RLS pronto pra multi-usuário (recepção, profissionais, admin) sem servidor de auth separado |
| ORM | Drizzle | migrations como código, tipagem direta do schema, sem "magic" do Prisma |
| auth | Supabase Auth (e-mail + senha) | cobre S01 (login) igual ao original; convite de staff por e-mail |
| payments | **não aplicável nesta rodada** | uso interno — a clínica não cobra online dentro do app; `valor`/`convênio` são só registro, não checkout |
| email | Resend | lembretes de confirmação por e-mail (should-have), transacional simples |
| mensageria | WhatsApp Business Cloud API (Meta, oficial) | troca o "abre WhatsApp Desktop" do original por uma integração própria, com o número da clínica |
| jobs | Vercel Cron (sem fila dedicada) | só precisamos de 1-2 jobs diários (lembretes); Inngest seria over-engineering nesta escala |
| files | nenhum nesta rodada | foto de paciente e anexos são prontuário — fora de escopo |
| hosting | Vercel | deploy do Next.js sem configuração extra |

Um banco só. Sem microsserviços. Row Level Security no Postgres faz o
controle de acesso (recepção vê tudo da própria clínica; um profissional, se
tiver login próprio depois, só vê a própria agenda).

## Schema

Tabelas: 11 (núcleo) + 4 do addendum de chamada de senha = 15. Access rules:
**Postgres Row Level Security** — toda tabela tem `clinic_id`, toda policy
filtra por `clinic_id = auth_clinic_id()`, uma função SQL que busca a
clínica do usuário logado em `staff_users` via `auth.uid()` — mais simples
que uma custom claim no JWT e não precisa de nenhum Auth Hook configurado
à mão no dashboard. Implementado de verdade (não só planejado) em
`/replica-backend` — ver `app/supabase/migrations/20261013000000_init.sql`
pro SQL completo com índices, constraints e todas as policies;
`replica/schema.sql` é o rascunho desta fase, mantido como histórico.

```sql
-- ver replica/schema.sql para o arquivo completo

create type appointment_status as enum (
  'aguardando', 'aguardando_pagamento', 'atendido',
  'cancelado_pelo_profissional', 'chamando', 'desmarcado_pelo_paciente',
  'em_atendimento', 'confirmado', 'nao_confirmado', 'nao_compareceu',
  'remarcado'
);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete restrict,
  professional_id uuid not null references professionals(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status appointment_status not null default 'nao_confirmado',
  is_encaixe boolean not null default false,
  is_retorno boolean not null default false,
  lead_source text,
  referring_professional_id uuid references professionals(id) on delete set null,
  repeat_group_id uuid,
  notes text,
  checked_in_at timestamptz,
  confirmed_at timestamptz,
  confirmation_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointment_time_valid check (ends_at > starts_at)
);
create index on appointments (clinic_id, professional_id, starts_at);
create index on appointments (clinic_id, status);
create index on appointments (patient_id);

-- impede dois agendamentos do MESMO profissional sobrepostos,
-- exceto quando é encaixe (que é exatamente a válvula de escape do original)
create extension if not exists btree_gist;
alter table appointments add constraint no_overlap_unless_encaixe
  exclude using gist (
    professional_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (not is_encaixe);
```

Tabelas: `clinics`, `staff_users` (ligação com `auth.users` do Supabase),
`professionals`, `locations`, `equipment`, `procedures`, `availabilities`
(blocos semanais recorrentes, com `valid_from`/`valid_to` para versionar
grades como no original), `patients`, `appointments`, `appointment_procedures`
(1 agendamento : N procedimentos, cada um com forma de pagamento/convênio,
local e equipamento — como visto na tela real), `waitlist_entries` (fila de
espera, por profissional ou geral da clínica).

## API

Rotas como Server Actions do Next.js (sem REST pública — tudo atrás de
autenticação de staff).

| method path | does | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| action `getDaySchedule` | lista agendamentos do dia, agrupados por sala/equipamento | recepção, profissional | `professionalId, date` | lista de appointments + paciente + procedimentos | F01, S03 |
| action `createAppointment` | cria agendamento (ou encaixe, via flag) | recepção | dados do form S06 | appointment | F01, F02 |
| action `updateAppointment` | edita/remarca um agendamento | recepção | id + campos alterados | appointment | F01 |
| action `deleteAppointment` | cancela/exclui | recepção | id | — | F01 |
| action `repeatAppointment` | cria série recorrente a partir de um agendamento | recepção | id + datas/regra | N appointments com mesmo `repeat_group_id` | F03 |
| action `stopRepeat` | encerra a série a partir de uma data | recepção | `repeat_group_id`, data | — | F03 |
| action `searchPatients` | busca por nome/CPF/telefone/nascimento | recepção | query | lista de patients | F01, S06 |
| action `createPatient` | cadastro mínimo inline | recepção | nome, celular, cpf?, nascimento, sexo | patient | F01, S06 |
| action `saveAvailability` | salva grade semanal de um profissional | recepção/admin | professionalId + blocos por dia | availabilities | S05 |
| action `getWeeklyCapacity` | calcula horas totais/slots/duração média | recepção/admin | professionalId | resumo | S05 |
| action `checkIn` | marca chegada do paciente | recepção | appointmentId | appointment atualizado | F05, S07 |
| action `checkOut` | marca saída | recepção | appointmentId | appointment atualizado | F05 |
| action `listCheckinBoard` | lista do dia inteiro, todos profissionais, com filtros | recepção | data, status[], especialidade, profissional, paciente | lista | S07 |
| action `addToWaitlist` / `removeFromWaitlist` | fila de espera | recepção | patientId, professionalId? | waitlist_entry | S09, S10 |
| action `listConfirmationQueue` | agendamentos a confirmar num período | recepção | De/Até, profissional, status | lista + % confirmado | S08 |
| action `sendConfirmation` | dispara mensagem de confirmação | recepção | appointmentId, canal | confirmation_sent_at atualizado | F04 |
| webhook `POST /api/webhooks/whatsapp` | recebe status de entrega/resposta do WhatsApp Business API | Meta (assinado) | payload do Meta | marca `confirmed_at` se o paciente responder "sim" | F04 |
| action `listTicketTypes` / `saveTicketType` / `deleteTicketType` | CRUD dos tipos de senha | recepção/admin | nome, cor, sigla, nº início, ativo | ticket_type | S14 |
| action `listCounters` / `saveCounter` / `deleteCounter` | CRUD dos guichês | recepção/admin | nome, locais atendidos | counter | S15 |
| action `issueTicket` | emite uma senha pro totem (sem login) | paciente (anônimo) | ticketTypeId | ticket com número sequencial | F07, S18 |
| action `listQueue` | fila de senhas aguardando, com filtro | recepção | tipo?, guichê? | lista de tickets | S19 |
| action `callNextTicket` / `callTicket` | chama a próxima ou uma senha específica pra um guichê | recepção | ticketTypeId? ou ticketId, counterId | ticket atualizado (status=chamado) | F08, S19 |
| action `recallTicket` | anuncia de novo a senha atual | recepção | ticketId | — | S19 |
| action `removeTicket` | remove uma senha sem atender | recepção | ticketId | — | S19 |
| action `getCurrentCall` | estado atual pro painel de TV (polling) | público (sem login) | — | senha atual + últimas chamadas + config | S18, S19 |
| action `getTvBoardConfig` / `saveTvBoardConfig` | lê/salva a config visual do painel | público (leitura) / admin (escrita) | template, logo, cores, vídeo, toggles | tv_board_config | S16 |

Webhooks in: WhatsApp Business API (status de mensagem, respostas).
Webhooks out: nenhum nesta rodada (sem Stripe).
Jobs: `send-confirmation-reminders` (cron diário, 08:00 — agendamentos das
próximas 48h ainda não confirmados viram fila de confirmação/disparo
automático).

## The parts that bite

- **time zones**: clínica de local único (Brasil). Guardar tudo em UTC
  (`timestamptz`), exibir no timezone fixo da clínica (`clinics.timezone`,
  ex. `America/Fortaleza`). Diferente do Calendly-like original de
  referência do template do pacote: aqui não tem "paciente remoto em outro
  fuso" — é tudo presencial, então nada de detecção de timezone no
  front-end.
- **idempotency**: webhooks do WhatsApp podem chegar duplicados — guardar o
  `message_id` do Meta numa tabela/coluna única antes de processar, ignorar
  reprocessar o mesmo id.
- **races**: dois atendentes marcando o mesmo profissional no mesmo horário
  ao mesmo tempo — resolvido no banco com a `exclude constraint` acima
  (`no_overlap_unless_encaixe`), não só na UI. Encaixe é a válvula de escape
  intencional, igual ao original.
- **conflito de sala/equipamento**: o recon mostrou agendamentos do mesmo
  profissional usando o mesmo equipamento (ex. aparelho de ultrassom) em
  sequência — não adicionamos exclusão por equipamento na v1 pra não travar
  o fluxo real da clínica (ela já opera assim); revisar se virar problema.
- **LGPD**: `patients` guarda CPF, telefone, nascimento — dado pessoal
  sensível mesmo sem ser prontuário clínico. RLS obrigatório, sem exportar
  paciente por e-mail/relatório sem necessidade, e um plano de exclusão a
  pedido do titular (soft delete + anonimização, não dado na v1 mas deixar
  a coluna `anonymized_at` pronta).
- **painel de TV sem login**: `/totem` e `/tv` precisam funcionar numa tela
  fixa sem ninguém logado. Em produção isso é uma chave pública restrita por
  RLS a `select` num `clinic_id` fixo por unidade (nunca a chave de staff);
  nesta rodada de protótipo é só uma rota pública lendo a store em memória.
  **Realtime**: o painel de TV precisa saber "na hora" quando uma senha é
  chamada — Supabase Realtime (ou um poll a cada poucos segundos, mais
  simples e tolerante a falha) resolve sem precisar de WebSocket próprio.
- **corrida na numeração da senha**: dois totens emitindo ao mesmo tempo não
  podem gerar o mesmo número pro mesmo tipo — resolvido com uma sequence (ou
  `select ... for update`) por `ticket_type_id`, nunca calculando o próximo
  número em memória no client.

## Build order

1. **Vertical slice**: login (S01) -> agenda diária de um profissional (S03,
   só leitura) -> criar um agendamento (S06, campos essenciais: paciente,
   horário, 1 procedimento) -> aparece na lista. Tabelas: `clinics`,
   `staff_users`, `professionals`, `patients`, `procedures`, `appointments`.
   Prova a stack (Next.js + Supabase + RLS) de ponta a ponta.
2. **Must-haves** (`features.csv`, priority=must): disponibilidade semanal
   (S05), busca/cadastro de paciente completo (S06), múltiplos procedimentos
   por agendamento + particular/convênio (`appointment_procedures`), os 11
   status de agendamento, encaixe, check-in centralizado (S07).
3. **Should-haves**: retorno, repetição de agendamento (F03), fila de
   espera (S09/S10), confirmação em lote com WhatsApp Business API (S08,
   F04), origem do lead, alteração em massa.
4. **Could-haves / depois**: agenda de equipamentos/mapa de agenda, área do
   paciente, agendamento online público (S13), checagem de elegibilidade de
   convênio.
5. **Fixes do replica-entrepreneur**: rodar depois do build e do diff, ainda
   não aplicável.

Próximo passo: `/replica-design`.
