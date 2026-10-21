# MultiSaúde — Roadmap por fatias

Cada fatia é um **fluxo de clínica ponta a ponta**, demonstrável, e não um módulo isolado.

**Critério de ordem (decisão do dono do projeto):** seguir a sequência em que as coisas acontecem na clínica, a
partir de uma clínica que acabou de abrir (o paciente chega, é atendido no guichê, agenda), e não o que seria mais
impressionante de mostrar. A ordem das fatias abaixo é provisória e será revista por esse critério.
Uma fatia só fecha quando tem: migração nova (nunca editar aplicada), API, permissões do
papel envolvido, testes (inclusive isolamento de tenant) e uma demonstração por curl/Postman.

Regra de escopo: backend e banco. Frontend segue com mocks até decisão contrária.

## Decisões já tomadas
- Agenda: só se agenda dentro da grade do profissional; não há encaixe fora dela nem sobre bloqueio.
- Remarcar mantém histórico (o antigo vira `remarcado`, o novo aponta para ele) e só a recepção remarca.
- Médico só vê pacientes com vínculo (já atendeu ou tem agendamento futuro), só a própria agenda e **não vê preços**:
  encaminha o paciente à recepção, que informa valores e tira dúvidas. Sem acesso de emergência por exceção.
- Cada unidade vê só a sua agenda. Há rodízio de médicos e médicos em várias clínicas: proteger a clínica de vazamento
  é requisito, incluindo contenção de varredura em volume.
- Prontuário: por padrão o médico só vê as evoluções que ele escreveu. O dono da clínica quer poder **habilitar** que
  um médico veja as de outro (João vê as de José, sem José ver as de Maria): habilitação por par, com direção,
  não transitiva, feita pelo Administrador e limitada a pacientes com vínculo. **Sem prazo de validade**: vale até
  ser revogada (decisão do dono do projeto).
- **Doctoralia: sem integração por ora** (decisão do dono do projeto, 20/10/2026). Dos ~352 agendamentos do mês, só 2 vieram
  do agendamento online da Doctoralia; o valor para a clínica está nas avaliações, que vivem no perfil e não dependem do
  nosso sistema. A Doctoralia é dona do Feegow (reportagens, não confirmado em fonte primária) e não achei API pública
  para terceiros. Na troca de sistema: desligar o agendamento online da Doctoralia ou mantê-lo no Feegow durante a
  transição, para não gerar horário duplicado. Quando voltar ao assunto: contato oficial antes de qualquer código, base
  legal/contrato pela LGPD, e a origem do agendamento ganha o valor `doctoralia`.
- Laboratório é **externo** (Lacmar, no mesmo prédio). Sem módulo de laboratório.
  Exame = pedido emitido pelo médico (documento). Resultado = anexo no prontuário,
  trazido pelo paciente. Integração com o Lacmar fica fora do escopo até haver demanda.
- Monólito modular, sem microserviços. Sem deploy em produção por enquanto.

## Estado atual (base)
Pronto: identidade/sessões/permissões (login por código da clínica), pacientes completos no padrão Feegow (prontuário sequencial,
histórico, inativação com motivo, duplicados, prioridade/origem da clínica), profissionais completos (cadastro, especialidade principal,
procedimentos habilitados, cópia de grade), procedimentos e especialidades com catálogo ANS, fila de senhas, prontuário,
agendamento (com conflito por profissional e lista de procedimentos habilitados).
Sem API: grades, salas, convênios, check-in, prontuário, financeiro, estoque.
Papéis existentes: Administrador, Recepção (sem permissões de negócio).

## Fatia 0 — Arrumar a casa
- Teste de base (`./mvnw verify`) com o túnel aberto.
- Diagrama versionado em `docs/` (hoje só em ~/Documents).
- Agenda: corrigir @Future só no fim, distinguir 409 de conflito vs referência inválida,
  validar unidade da sessão, testes de procedimento/agendamento/conflito/cancelado/tenant.

## Fatia 1 — Consulta particular simples  *(primeira demonstração)*
Fluxo: recepção agenda → paciente chega (check-in) → médico atende e registra evolução → encerra.
- Agenda completa: grades, bloqueios, encaixe, retorno, máquina de status, cancelamento.
- Check-in (sem fila/senha ainda).
- Prontuário mínimo: evolução imutável (versão que substitui, hash, assinatura).
- Papéis: Recepção com permissões reais; novo papel Médico (só os próprios atendimentos).
- Auditoria de leitura do prontuário.

### Feito na Fatia 1
- Agenda completa (grades, bloqueios, cancelar, remarcar, histórico, disponibilidade), papéis Médico e Recepção,
  acesso por vínculo, privacidade entre médicos e unidades, contenção de varredura.
- Prontuário mínimo: evolução imutável, só do autor, correção por nova versão, auditoria de acesso a pacientes.

### Implantação da clínica (ordem descrita pelo dono, a construir)
Antes do primeiro agendamento a clínica configura, nesta ordem: **especialidades** → **procedimentos** → **profissionais**
(dados e conselho, especialidade, procedimentos habilitados na agenda, horários de atendimento, acesso).
Já existem: unidades, usuários, grades, tipos de senha e guichês. Faltam o cadastro completo de procedimentos e
profissionais, o vínculo profissional↔procedimento e especialidades por clínica. Ver README e a conversa de 20/10/2026.
**Feito (V21 a V25):** especialidades e procedimentos por clínica, com catálogos oficiais da ANS (CBO e TUSS 22), busca sem acento e CORS corrigido para PUT/DELETE.
**Resolvido (V20):** a grade define o bloco de horário e o tempo do procedimento é opcional ("0 min" = ainda não medido).
Quando a clínica medir uma média, basta preencher o tempo do procedimento.
Descoberto nas telas de agendamento e ainda por construir: **vários procedimentos por agendamento**, **valor por item**,
**sala e equipamento** (ultrassom é provavelmente o grosso da clínica), **número de prontuário sequencial**, CPF e celular
obrigatórios no cadastro do paciente (com "sem CPF" explícito) e **prioridade do paciente**.

### Pendências da Fatia 1
- Encaminhamento do médico à recepção ao fim do atendimento (hoje não há registro dessa passagem).
- Fila de senhas e guichês: **feita** (ver README). Totem com CPF e credencial de dispositivo: **feito** (V27). Faltam o perfil da Lacmar e o painel de TV.
- Assinatura digital ICP-Brasil e política de acesso a prontuário de quem saiu da clínica (requisitos legais).

## Fatia 2 — Prescrição, pedido de exame e documentos
Fluxo: médico prescreve, pede exames (para o Lacmar), emite atestado; paciente volta com
resultado; recepção/médico anexa; retorno agendado vinculado.
- Prescrição, documentos com modelos, anexos (storage_key), retorno_de.

## Fatia 3 — Cobrança particular
Fluxo: atendimento gera cobrança → caixa recebe → recibo.
- Caixa (abertura/fechamento), cobrança, parcelas, pagamento, estorno.
- Papel Caixa/Financeiro.

## Fatia 4 — Convênio
Fluxo: carteirinha → procedimento com tabela do convênio → autorização → guia → faturamento.
- Convênios, planos, tabelas de preço com vigência, paciente_convenio, guias TISS.

## Fatia 5 — Procedimento com recurso (ultrassom) e triagem
Fluxo: técnico de enfermagem faz triagem; exame ocupa sala + equipamento.
- Salas, equipamentos, alocação de recurso no agendamento (sem conflito de recurso).
- Modelos de formulário versionados (JSON schema) para triagem.
- Papéis Enfermagem/Técnico.

## Fatia 6 — Sala de espera
- Fila, senha, guichê, chamada (painel TV e totem ficam para o frontend).
- Confirmação de agendamento (canal a definir).

## Fatia 7 — Gestão (dono/gerente)
- Comissão e repasse de profissional, relatórios, estoque, indicadores de agenda.

## Fatia 8 — Produção
- Backup e restauração testados, LGPD (consentimento, retenção, exportação), logs,
  integração com o Frontend, deploy. Depois: operação multi-clínica (SaaS).

## Pendências que dependem de conversa com a clínica
- Como a recepção trata encaixe e overbooking hoje.
- Quem pode ver prontuário de quem (médico só do próprio paciente? gerente vê?).
- Particular x convênio: quais convênios a MultiSaúde atende de fato.
- Repasse: percentual fixo, por procedimento, por convênio?
