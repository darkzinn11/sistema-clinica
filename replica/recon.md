# Recon map: Feegow Clinic (web)

Scope: Agendamento de consultas (núcleo) — agenda da clínica, marcação, encaixe,
repetição, confirmação (incl. envio por WhatsApp), check-in/check-out, fila de
espera/sala de espera — mais, a partir de 2026-10-13, o painel de chamada de
senha (totem de autoatendimento, guichês, chamada de TV). Fora de escopo
nesta rodada: prontuário eletrônico completo, faturamento/TISS, financeiro,
telemedicina, assistente de IA (ficam para rodadas futuras se necessário).
For: uso próprio (clínica do usuário), não é um produto a ser vendido.
Date: 2026-10-13

> STATUS: núcleo de agendamento validado na conta real do usuário (passeio
> guiado, sem login feito por mim). Pronto para `/replica-architect`.
>
> Nota de privacidade: durante o passeio eu vi pacientes, telefones, CPFs e
> nomes reais da clínica do usuário na tela. Nada disso foi copiado para este
> arquivo — só estrutura de campos, rótulos e opções de configuração (enums).
> Não tirei nem salvei screenshots da conta logada por esse motivo; `replica/screens/`
> ficou vazio nesta rodada.

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | marketing site | https://feegowclinic.com.br/ | posicionamento, "o software de gestão médica que sua equipe precisa" |
| 2 | página de produto | https://feegowclinic.com.br/produtos/feegow-clinic | lista de funcionalidades de agenda: confirmação, fila de espera, encaixe/"repescagem de faltosos", check-in/check-out, telemedicina integrada |
| 3 | preços e planos | https://feegowclinic.com.br/precos-e-planos | Starter R$129, Plus R$199, VIP R$249 por profissional/mês; agendamento online limitado a 24h no Starter |
| 4 | central de ajuda — como agendar | https://ajuda.feegow.com/support/solutions/articles/67000114583-5-como-realizar-um-agendamento-no-feegow | passo a passo do fluxo de agendamento padrão, encaixe e repetição |
| 5 | Google Play | https://play.google.com/store/apps/details?id=com.feegow_app | app "Feegow Software Clínico", usado por 33 mil+ profissionais segundo o marketing |
| 6 | conta própria do usuário | app.feegow.com (clínica multi-especialidade: ultrassom, ginecologia, psicologia) | passeio guiado em 2026-10-13, usuário logado, eu só observei/cliquei em telas de leitura — não editei nem salvei nada |

## Core loop

A recepção marca, confirma (inclusive via WhatsApp em lote) e organiza o dia de
consultas de vários profissionais e especialidades numa agenda compartilhada,
com check-in/check-out e fila de espera por consultório.

## Screens

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Login | app.feegow.com | autenticar | form e-mail/senha, "lembrar dados", "esqueci a senha" | vazio |
| S02 | Dashboard / resumo da semana | tela inicial após login | visão geral: acessos, contas a vencer/vencidas, novos pacientes, aniversariantes do dia, gráfico a pagar/receber | cards numéricos, gráfico de barras, lista de aniversariantes | preenchido |
| S03 | Agenda diária | Agenda > Diária | ver e organizar os agendamentos de um profissional no dia, agrupados por sala/equipamento | seletor de profissional, botões Grade/Imprimir/Encaixe/Bloqueio/Alterações em massa, mini calendário mensal (dias com indicador de ocupação), lista de horários com badge de status, abas laterais "Notas" / "Espera" | preenchido; "Espera" tem estado vazio ("Nenhum paciente na fila de espera deste profissional") |
| S04 | Agenda semanal / múltipla | Agenda > Semanal / Múltipla | mesma agenda em visão de grade por vários dias/profissionais | grade de horários | não percorrido a fundo (visual a confirmar depois) |
| S05 | Horários de Atendimento (disponibilidade do profissional) | Agenda diária > botão "Grade" (abre cadastro do profissional) | configurar a disponibilidade semanal de um profissional | toggle por dia da semana, blocos de horário (início-fim, duração do slot em min, limite de "encaixes/dia"), toggle "Exibir na Doctoralia" por bloco, botão "Copiar de outro médico", painel lateral "Capacidade Semanal" (horas totais, nº de slots, duração média), link "Próximas vigências" / histórico de vigências passadas, tour guiado de onboarding (passo 1 de 6, "pular tour") | vazio (dia desligado), preenchido (dia com 1-2 blocos) |
| S06 | Tela de agendamento (edição) | clicar num item da Agenda diária, ou em um horário livre | criar/editar um agendamento | abas "Agendamento / Ficha / Histórico / Conta"; campos: Data*, Hora*, checkboxes Encaixe e Retorno, Especialidade, **Status** (enum, ver componentes), dados do paciente (Nome, Telefone, Celular*, E-mail, Nascimento, Sexo, **Origem** do lead, CPF*+checkbox "Sem CPF", Indicado por, Profissional Solicitante com busca), tabela de procedimentos (Procedimento, Tempo em min, Forma: Particular/Convênio, Valor/Convênio, Local/sala, Equipamento, botão + para adicionar outro procedimento), Valor total calculado, Observações, botões Salvar/Repetir/Remarcar/Excluir, ícone de impressão | preenchido (não testei vazio nem erro de validação para não alterar dados reais) |
| S07 | Check-in | Agenda > Check-in | lista única de todos os agendamentos do dia, de todos os profissionais/especialidades, para dar check-in | colunas: Agendado, Chegada, Paciente, Profissional, Especialidade, Procedimento, Local, Equipamento, Tabela, Valor/Convênio, botão CHECKIN por linha; filtros: Status (multi-select), Paciente, Especialidade, Profissional | preenchido |
| S08 | Confirmação de agendamentos | Agenda > Confirmar agendamentos | confirmar em lote os agendamentos futuros, com envio de mensagem | barra de progresso "X% confirmada" + contadores (a confirmar / confirmados), botão "Modelo de Mensagem", seletor de canal (ex.: "WhatsApp Desktop"), lista agrupada por profissional com Data, Paciente (nome clicável + celular), Procedimento, Local, Valor/Convênio, Observações, **Elegibilidade** (checagem de convênio); filtros: Status, Paciente, Profissional, Tipo/Grupo de Procedimento, intervalo De/Até | preenchido |
| S09 | Sala de Espera (clínica inteira) | menu Espera (topo) | ver pacientes aguardando atendimento em qualquer consultório | filtro de status (Aguardando/Em atendimento), filtro por profissional e especialidade, ordenação por horário de chegada, botão de atualizar | vazio ("Nenhum paciente aguardando para ser atendido") |
| S10 | Fila de espera por profissional (widget) | Agenda diária > aba lateral "Espera" | fila de espera específica do profissional selecionado | botão "+ Adicionar Paciente" | vazio |
| S11 | Cadastro de paciente (completo) | Pacientes > Inserir (ou abrir um paciente existente) | ficha completa do paciente — **a maior parte é prontuário eletrônico, fora do escopo desta rodada** | aba "Dados Principais" (Nome, Nascimento, Estrangeiro, CPF*, Cor de Identificação, Sexo, Nome Social, Altura/Peso/IMC, Prontuário(auto), Prioridade, endereço completo, Profissão, Escolaridade, Estado Civil, 2 telefones, 2 e-mails, Nacionalidade, RG, Origem, Indicação, Religião, CNS, Cor da pele, Observações, Avisos e Pendências, Convênios do Paciente); barra lateral com ~18 seções de prontuário (Anamnese, Laudos, Diagnósticos, Prescrições, Exames, Imagens, Agendamentos, Recibos, Conta etc.) — só "Dados Principais" e "Agendamentos" interessam ao núcleo de agendamento | formulário vazio (paciente novo) |
| S12 | Equipamentos Alocados / Mapa de agenda | Agenda > Equipamentos Alocados / Mapa de agenda | visões auxiliares da agenda por equipamento/sala | não percorrido a fundo | — |
| S13 | Agendamento online (portal do paciente) | link público, fora do login da clínica | paciente marca sozinho (mencionado no marketing/planos, limitado a 24h no plano Starter) | não acessível sem um link público configurado — não percorrido | PENDENTE se for necessário no MVP |

## Flows

```
F01 Recepção agenda uma consulta (padrão)
    S03 (clica horário livre) -> S06 (preenche/busca paciente, procedimento,
    particular/convênio) -> salvar -> volta pra S03 com o novo item na lista
    edge: paciente sem CPF (checkbox "Sem CPF"), convênio, múltiplos
    procedimentos no mesmo agendamento, profissional solicitante (encaminhamento)

F02 Encaixe de paciente
    S03 -> marca checkbox "Encaixe" dentro da própria tela de agendamento (S06)
    -> horário fica fora da grade padrão -> salvar
    (não é uma tela separada — é uma flag no mesmo formulário de agendamento)

F03 Repetição de agendamento
    S06 (agendamento existente) -> botão "Repetir" -> seleciona novas datas
    -> salva uma série -> depois: "Parar Repetição" num item da série

F04 Confirmação em lote via WhatsApp
    S08 -> filtra por profissional/período -> clica no paciente/celular (abre
    WhatsApp Desktop com modelo de mensagem) -> paciente responde -> recepção
    marca como confirmado -> barra de progresso atualiza

F05 Check-in e fila de espera
    S07 (lista do dia) -> botão CHECKIN -> paciente aparece em S09/S10 (fila
    de espera) -> atendimento -> (check-out, não percorrido em detalhe)

F06 Configurar disponibilidade de um profissional
    S03 -> botão "Grade" -> S05 -> liga/desliga dias, define blocos de
    horário e duração do slot -> painel de capacidade semanal recalcula -> salvar
```

Cliques do caminho feliz (F01): 2 (abrir S06 a partir de um slot livre + salvar),
contando que o paciente já exista na busca. Soma mais 1-2 cliques se precisar
cadastrar paciente novo inline.

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Badge de status do agendamento | 11 valores: Aguardando, Aguardando pagamento, Atendido, Cancelado pelo profissional, Chamando, Desmarcado pelo paciente, Em atendimento, Marcado-confirmado, Marcado-não confirmado, Não compareceu, Remarcado | cor por status (verde=confirmado, laranja=não confirmado, etc.) | S03, S06, S07, S08 |
| Mini calendário mensal | — | dia com agendamentos (marcado), dia selecionado, hoje | S03 |
| Seletor de profissional | dropdown com avatar | — | S03, S07, S08, S09 |
| Tabela de procedimentos (linha dinâmica) | adicionar/remover linha (+) | vazio, 1 procedimento, múltiplos procedimentos | S06 |
| Barra de progresso de confirmação | percentual + contagem | 0%–100% | S08 |
| Toggle de dia da semana (disponibilidade) | ligado/desligado, com 1+ blocos de horário | vazio, 1 bloco, múltiplos blocos | S05 |
| Botão de ação em lista | ex.: "CHECKIN" | default, ação disparada | S07 |
| Painel lateral "Notas / Espera" (abas) | — | vazio ("Nenhum paciente na fila...") | S03 |
| Modal "Informações do Profissional" | observações do profissional, faixa etária atendida, lista de procedimentos que realiza, telefones | — | S03 (clique no ícone/nome do profissional) |

## Inferred data model

```
Patient     id, nome, nome_social, cpf (opcional via flag sem_cpf), rg, cns,
            nascimento, sexo, telefone, telefone2, celular (obrigatório),
            celular2, email, email2, endereco completo, profissao,
            escolaridade, estado_civil, nacionalidade, naturalidade,
            origem (enum: indicação/jornal/google/tv/whatsapp/instagram/...),
            indicacao (texto livre), religiao, cor_pele, cor_identificacao,
            prioridade, observacoes, avisos_pendencias, prontuario_numero(auto)
            evidence: S06 (campos inline), S11 (cadastro completo)
            confidence: high

Professional  id, nome, especialidade(s), faixa_etaria_atendida, observacoes,
              telefones
              evidence: S03 seletor, modal "Informações do Profissional"
              confidence: high

Availability  id, professional_id, dia_semana, hora_inicio, hora_fim,
              duracao_slot_min, max_encaixes_dia, exibir_em_agendamento_online(bool)
              evidence: S05
              confidence: high

AvailabilityVersion  id, professional_id, vigencia_inicio, vigencia_fim,
                      (histórico de grades anteriores)
              evidence: S05 "Próximas vigências" / "Vigências passadas"
              confidence: medium

Appointment  id, patient_id, professional_id, data, hora, especialidade,
             status (enum de 11 valores, ver Components), is_encaixe(bool),
             is_retorno(bool), origem_lead, profissional_solicitante_id(nullable),
             observacoes, repeat_group_id(nullable), checkin_at(nullable),
             created_at
             evidence: S06, S07, S08
             confidence: high

AppointmentProcedure  id, appointment_id, procedure_id, tempo_min,
                       forma_pagamento (particular | convênio), valor,
                       local_id, equipamento_id(nullable)
             evidence: S06 (tabela de procedimentos, 1:N por agendamento)
             confidence: high

Procedure    id, nome, duracao_padrao_min, valor_padrao, especialidade_id
             evidence: S06, modal de informações do profissional
             confidence: high

Location     id, nome (ex.: "Sala de Ultrassom", "Consultório 3")
             evidence: S03, S06, S07 (coluna "Local")
             confidence: high

Equipment    id, nome (ex.: "ULTRASSOM")
             evidence: S06, S07 (coluna "Equipamento")
             confidence: high

Insurance (Convênio)  id, nome, regras de elegibilidade
             evidence: S08 coluna "Elegibilidade", S06 "Forma: Convênio"
             confidence: medium
```

Relationships: Professional 1-n Availability, Professional 1-n Appointment,
Patient 1-n Appointment, Appointment 1-n AppointmentProcedure, Procedure 1-n
AppointmentProcedure, Location 0-n AppointmentProcedure, Equipment 0-n
AppointmentProcedure, Insurance 0-n AppointmentProcedure, Appointment 0-1
repeat_group (auto-relação).

## Addendum 2026-10-13: painel de chamada (totem, guichês, chamada de TV)

Explorado a partir de uma captura de tela enviada pelo usuário
(`Outras Configurações > Chamada de TV`) + passeio guiado meu em
`Outras Configurações > Totem e Guichês` e no botão "Chamar senha" do
rodapé. É um sistema de senha de fila clássico (tipo banco/posto de saúde),
separado do núcleo de agendamento mas usado pela mesma recepção.

### Screens

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S14 | Config. Tipos de Senha | Outras Configurações > Totem e Guichês > aba "Tipos de Senha" | cadastrar os tipos de senha emitidos pelo totem | lista lateral de tipos, formulário: Nome, Cor (hex), Sigla (prefixo, ex. "CON"), Nº de Início, checkbox por unidade/clínica | preenchido (8 tipos cadastrados: Consulta, Exames, Laboratório, Consulta/Exames/Laboratório Preferencial, Retorno, Retorno Preferencial) |
| S15 | Config. Guichês | Outras Configurações > Totem e Guichês > aba "Guichês" | cadastrar os guichês (balcões) de atendimento por unidade | lista de unidades à esquerda, à direita lista de guichês (nome + dropdown "Grupo de Locais") | preenchido (4 guichês numerados) |
| S16 | Config. Chamada de TV | Outras Configurações > Chamada de TV | configurar a aparência e o comportamento do painel de TV | select de template, campo de logo (URL), intervalo, 3 cores + cor de fundo (hex com color-picker), ID de vídeo do Youtube, checkboxes: Nome do Profissional, Nome do Local, Chamada por Voz, Chamar Mais de Uma Vez, Pré-consulta, Pós-consulta, Exibir Últimas Senhas Chamadas, Data de Nascimento do Paciente, Bipar apenas duas vezes, Vídeo Mudo | preenchido |
| S17 | Links do painel de TV | Outras Configurações > Totem e Guichês > aba "Links" | pegar a URL pública do painel, por unidade | tabela unidade → botões "Tela Padrão" / "Tela Cheia" (abrem em nova aba, fora do login) | preenchido (1 unidade) |
| S18 | Totem (autoatendimento) | a URL pública, acessada num tablet/totem físico | paciente tira uma senha sozinho | grade de botões grandes coloridos, 1 por tipo de senha ativo, com ícone "i" (info) e o nome do tipo | visto no modo "Tela Cheia" com fila vazia — mostrou a grade de tipos em vez de uma senha sendo chamada; não vi o estado "senha emitida" nem o estado com uma chamada ativa |
| S19 | Chamar senha (painel do operador) | botão "Chamar senha" no rodapé, disponível em qualquer tela logada | recepção vê a fila e chama a próxima senha pra um guichê | tabela da fila ("Nº da senha/Paciente", "Hora da chegada", "Tipo", vazia no momento), painel direito: "Senha atual" (grande, "-" quando nada chamado), filtro por tipo de senha, filtro por guichê, contador "Fila/Em espera: Total 0", lista "Últimas senhas chamadas" (Senha + Guichê, ex. "LAB P7 · Guichê 4", com botão remover e botão re-chamar/anunciar) | fila vazia; histórico de chamadas anteriores preenchido |

### Flows

```
F07 Paciente tira uma senha no totem
    S18 -> toca no tipo de senha (ex. "Consulta") -> recebe um número
    sequencial com o prefixo do tipo (ex. "CON3") -> senha entra na fila

F08 Recepção chama a próxima senha
    S19 -> filtra por tipo/guichê (opcional) -> chama a próxima da fila (ou
    uma específica) -> vira "Senha atual", some da fila, aparece no topo de
    "Últimas senhas chamadas" -> o painel de TV (S18/público) e a chamada
    por voz disparam, se configurados em S16
    edge: re-chamar uma senha já chamada (bater de novo), remover uma senha
    sem atender (desistência)
```

### Inferred data model (addendum)

```
TicketType   id, nome, cor (hex), sigla (prefixo, 3 letras), numero_inicio,
             ativo, unidades[] (quais clínicas/unidades emitem esse tipo)
             evidence: S14 — 8 tipos reais: Consulta(CON)/Exames(EXM)/
             Laboratório(LAB), cada um com uma versão "Preferencial", mais
             Retorno/Retorno Preferencial
             confidence: high

Counter (Guichê)  id, nome, grupo_de_locais_id (nullable)
             evidence: S15 — 4 guichês, cada um pode ser restrito a um
             "grupo de locais" (não detalhei o que compõe um grupo)
             confidence: medium

Ticket       id, ticket_type_id, numero (sequencial por tipo), status
             (aguardando | chamado | atendido | removido), counter_id
             (nullable, preenchido quando chamado), called_at, created_at
             evidence: S19 — fila + histórico de "últimas senhas chamadas"
             com formato "SIGLA[ P]NÚMERO" (P = preferencial)
             confidence: high

TvBoardConfig  id, template, logo_url, color1, color2, color3,
               background_color, interval_seconds, youtube_video_id,
               show_professional_name(bool), show_location_name(bool),
               voice_call(bool), call_more_than_once(bool),
               pre_consulta(bool), pos_consulta(bool),
               show_last_called(bool), show_patient_birthdate(bool),
               beep_twice_only(bool), muted_video(bool)
               evidence: S16, formulário inteiro
               confidence: high
```

Relationships: TicketType 1-n Ticket, Counter 0-n Ticket (chamada), Clinic
1-1 TvBoardConfig (por unidade, nesta rodada tratamos como 1 clínica = 1
config).

### Out of scope dentro deste addendum

- "Grupo de Locais" como abstração própria — não vi o que configura esse
  grupo (pode ser outra tela, "Locais de Acesso", não explorada); modelei
  Guichê → Locations diretamente (lista de salas atendidas) em vez de criar
  uma entidade "grupo" extra não confirmada.
- Chamada por voz (text-to-speech) de verdade e beep sonoro — ficam como
  toggle de configuração sem o áudio real implementado nesta rodada.
- Vídeo promocional (Youtube) no idle do painel — o campo fica salvo e
  exibido como link, sem embutir o player agora.

## Feature matrix

Ver `features.csv` (atualizado com os achados reais).

## Out of scope (cannot or should not be cloned)

- Prontuário eletrônico completo (Anamnese, Laudos, Diagnósticos, Prescrições,
  Exames, Imagens — vistos em S11), TISS/faturamento, financeiro completo,
  telemedicina, Noa Notes (assistente IA) — fora do núcleo de agendamento
  definido para esta rodada; podem virar recon separado depois.
- Integração real com Doctoralia e WhatsApp Desktop — são integrações de
  terceiros a recriar com APIs próprias (ex.: WhatsApp Business API, link
  próprio em vez de "Doctoralia"), nunca a marca ou o parceiro da Feegow.
- Lista de parceiros/convênios específicos da clínica do usuário (nomes de
  clínicas parceiras vistos nos dados de "Origem") — são dados do negócio do
  usuário, não uma feature do produto a clonar.
- Marca, nome "Feegow", paleta, logo e "by Doctoralia" — nunca entram no clone
  (ver `/replica-brand`).

## Size

Screens 19 (13 do núcleo de agendamento + 6 do addendum de chamada de
senha). Flows 8 confirmados (6 + 2 do addendum). Entidades: 14 (10 do núcleo
+ 4 do painel de chamada). Partes difíceis: agenda multi-profissional/
multi-especialidade em tempo real, disponibilidade com vigências e exceções,
confirmação em massa via WhatsApp (integração externa, sem API oficial
simples), checagem de elegibilidade de convênio, chamada de senha em tempo
real (totem, operador e painel de TV todos vendo o mesmo estado ao vivo) e
chamada por voz/áudio. Tamanho estimado: **M** (algumas semanas) para o núcleo de
agendamento com CRUD + check-in + fila de espera; sobe para **L** se incluir
confirmação em massa via WhatsApp, checagem de elegibilidade de convênio e o
painel de chamada de senha com atualização em tempo real.
