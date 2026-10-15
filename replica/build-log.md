# Build log

Convenção: data, tela (S-ID do recon), status, o que falta, o que foi mais
difícil do que parecia. Código em `app/`. Camada de dados é falsa (em
memória, `app/src/lib/data/store.ts`) até `/replica-backend` trocar por
Supabase — nenhuma tela deveria precisar mudar quando isso acontecer, só esse
arquivo e `actions.ts`.

## 2026-10-13

- **Shell do app** — done. Nav superior (Agenda, Check-in, Confirmações,
  Sala de espera), tokens/primitivos de `/replica-design` conectados, dados
  de seed fictícios (`seed.ts` — nomes inventados, nenhum dado da conta real
  usada no recon).
- **S03 Agenda diária** — done (núcleo do vertical slice). Seletor de
  profissional, navegação por dia, lista agrupada por sala, badges de status,
  fila de espera lateral. Falta: visão semanal/múltipla (S04), mini
  calendário mensal com indicador de ocupação.
- **S06 Painel de agendamento** — done para o caso principal. Busca de
  paciente, cadastro inline, múltiplos procedimentos, particular/convênio,
  encaixe/retorno, origem do lead. Falta: UI de repetição (`repeatAppointment`
  já existe na camada de dados, só não tem botão na tela), profissional
  solicitante/encaminhamento sem campo ainda, editar um agendamento existente
  (só criação está pronta).
- **S05 Disponibilidade** — done. Toggle por dia, blocos com horário/duração
  de slot/máx. encaixes, painel de capacidade semanal recalculando ao vivo —
  testado no navegador, bate com o comportamento visto na conta real.
- **S07 Check-in** — done para o essencial. Lista do dia inteiro com todos
  os profissionais, ação de check-in/check-out. Falta: filtros de
  status/paciente/especialidade (só profissional está implementado).
- **S08 Confirmação de agendamentos** — done com envio simulado. Barra de
  progresso, agrupado por profissional, botão "marcar como confirmado".
  WhatsApp de verdade fica para `/replica-backend`. Achei e corrigi um bug de
  design aqui: o check-in estava sobrescrevendo o status do agendamento e
  isso fazia ele sumir da fila de confirmação — separei "confirmado pelo
  paciente" (`confirmedAt`) de "estado clínico do dia" (`status`), que são
  coisas diferentes mesmo no produto original (dá pra confirmar presença dias
  antes e só chegar/ser atendido no dia).
- **S09 Sala de espera (clínica)** e widget por profissional — done,
  incluindo adicionar paciente à fila sem precisar de agendamento.
- **S01 Login** — stub visual só, sem autenticação. Intencional: auth de
  verdade é escopo de `/replica-backend`.
- **S11 Cadastro de paciente** — só o subconjunto usado no fluxo de
  agendamento (visto no recon como parte do próprio formulário S06). O
  cadastro completo (endereço, RG, CNS, convênios do paciente) não foi
  construído — é, em grande parte, prontuário, fora de escopo.

### Mais difícil do que parecia

- **Next.js 16 + Cache Components**: o scaffold vem com o experimental
  "Cache Components" ligado por padrão, que quebra qualquer página usando
  `new Date()` (nosso `todayIso()`) durante o prerender. Como toda tela
  dessa ferramenta depende de dado ao vivo mesmo, desliguei a flag em
  `next.config.ts` em vez de anotar cada página.
- **Busca de paciente sem acento**: "Joao" não encontrava "João" com a
  implementação ingênua (`.includes()` puro). Comum em digitação no Brasil —
  corrigido normalizando acentos dos dois lados da comparação.
- **Confirmação vs. status clínico**: ver nota acima sobre `confirmedAt`.

### Estado é em memória

O store reseta a cada restart do `next dev` — normal para este estágio.
Persistência de verdade (Postgres/Supabase, RLS) é o trabalho de
`/replica-backend`.

## Resumo

Telas: 7 de 13 do recon construídas de ponta a ponta (S03, S05, S06, S07,
S08, S09, S10), 1 em stub (S01), 1 parcial (S11, só o subconjunto
necessário), 4 não iniciadas (S02 dashboard, S04 semanal/múltipla, S12
equipamentos/mapa, S13 agendamento online — todas could/should de prioridade
menor).

Must-haves do `features.csv`: 11 de 12 em `yes` ou `partial`. O que falta:
agenda semanal/múltipla (S04), ainda em `no`. Should-haves: maioria em `yes`,
com repetição de agendamento e integração WhatsApp real pendentes.

Próximo passo: `/replica-backend` para trocar a camada de dados falsa por
Postgres/Supabase de verdade (schema já definido em `replica/schema.sql`) e
implementar a autenticação de S01.

## 2026-10-13 (tarde) — addendum: painel de chamada (totem, guichês, TV)

Escopo novo, trazido pelo usuário com um print da própria conta (ver
addendum em `replica/recon.md`). Construído na mesma sessão, direto —
sem passar nas fases cheias de `/replica-architect` e `/replica-design`
de novo, só adendos pontuais nos três documentos (recon, architecture,
schema, design).

- **S14 Tipos de Senha** — done. `/configuracoes/tipos-de-senha`. 8 tipos
  seedados iguais aos reais (Consulta/Exames/Laboratório + Preferencial +
  Retorno). CRUD completo (nome, cor com color-picker, sigla, nº de início,
  ativo).
- **S15 Guichês** — done. `/configuracoes/guiches`. Em vez da abstração
  "Grupo de Locais" (que eu não consegui ver o que configura), vinculei
  guichê diretamente a uma lista de salas — mais simples e cobre o mesmo
  caso de uso.
- **S16 Chamada de TV** — done pra aparência (template, logo, 3 cores +
  fundo com color-picker, intervalo, ID do vídeo, os 10 checkboxes do
  original). Vídeo do Youtube e chamada por voz ficam como campo salvo,
  sem o player/áudio de verdade — são integração de mídia, não dado.
- **S18 Totem** — done. Grade de botões grandes por tipo de senha ativo,
  emite senha com número sequencial por tipo (CON1, CON2...), tela de
  confirmação some sozinha depois de alguns segundos.
- **S19 Chamar senha (operador)** — done. Fila, filtro por tipo, seletor de
  guichê, "Chamar próxima" ou uma específica, "Senha atual" em destaque,
  histórico com re-chamar e remover. Atualiza sozinho a cada poucos
  segundos (polling — nota abaixo).
- **S18/19 painel de TV público** — done. Estado ocioso mostra a grade de
  tipos (igual ao que vi na conta real com a fila vazia); ao chamar uma
  senha, mostra "Senha atual" gigante + guichê + últimas chamadas, com as
  cores configuradas em S16.

### Testado de ponta a ponta no navegador

Totem emite CON1 → aparece na fila do painel do operador → operador chama
pro Guichê 1 → painel de TV (aba separada) mostra "CON1 · Guichê 1" →
repetido com CON2, confirma que o histórico e a numeração sequencial por
tipo funcionam.

### Decisões e o que ficou de fora

- **Cor dinâmica e contraste**: a cor de cada tipo de senha é dado do
  usuário (não um token fixo), então o texto em cima dela (branco ou
  preto) é calculado pela mesma fórmula de luminância do
  `contrast.py` do replica-design, não fixado — ver
  `src/lib/contrast-text.ts`.
- **Tempo real = polling, não WebSocket**: o painel de TV e o painel do
  operador reconsultam a cada poucos segundos via Server Action em vez de
  um canal próprio. Simples o bastante pro protótipo; `/replica-backend`
  troca por Supabase Realtime se a recepção achar o atraso perceptível.
- **Sem autenticação no totem/TV**: são rotas públicas de propósito (igual
  ao original, que gera um link público por unidade) — ainda não têm a
  policy de RLS restrita por `clinic_id` que `replica/schema.sql` já
  descreve; isso é trabalho de `/replica-backend`.
- Chamada por voz e vídeo promocional ficam como campos de configuração
  sem a mídia real — áudio/vídeo são harder parts legítimas, não um
  descuido.

## 2026-10-13 (noite) — /replica-backend: auth + banco de verdade

Detalhes completos em `replica/backend.md`. Resumo: toda a camada de dados
em memória (`store.ts`) foi reescrita pra consultar Postgres via Supabase —
migration completa com RLS em `app/supabase/migrations/`, auth real
(login/sair/esqueci-senha) com middleware protegendo as rotas internas.

**Sem Docker nesta máquina** (não dá pra rodar `supabase start` local) **e
sem projeto Supabase ainda** (o usuário pediu pra eu preparar o código
primeiro) — então nada disso foi testado contra um banco de verdade. `tsc
--noEmit` e `eslint` passam limpos, mas isso verifica sintaxe/tipos, não
comportamento. `npm run dev` não funciona até o `.env.local` ter chaves
reais — é esperado, não é regressão.

Decisão que vale registrar: RLS usa uma função `auth_clinic_id()` que
consulta `staff_users` por `auth.uid()`, em vez de uma custom claim no JWT
(mais simples, não precisa configurar Auth Hook no dashboard). `/totem` e
`/tv` continuam públicas de propósito (como o original) e usam a service
role key nas duas Server Actions que tocam — bypass documentado, não
descuido.
