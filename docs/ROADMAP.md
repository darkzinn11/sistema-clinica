# MultiSaúde — Roadmap por fatias

Cada fatia é um **fluxo de clínica ponta a ponta**, demonstrável, e não um módulo isolado.
Uma fatia só fecha quando tem: migração nova (nunca editar aplicada), API, permissões do
papel envolvido, testes (inclusive isolamento de tenant) e uma demonstração por curl/Postman.

Regra de escopo: backend e banco. Frontend segue com mocks até decisão contrária.

## Decisões já tomadas
- Laboratório é **externo** (Lacmar, no mesmo prédio). Sem módulo de laboratório.
  Exame = pedido emitido pelo médico (documento). Resultado = anexo no prontuário,
  trazido pelo paciente. Integração com o Lacmar fica fora do escopo até haver demanda.
- Monólito modular, sem microserviços. Sem deploy em produção por enquanto.

## Estado atual (base)
Pronto: identidade/sessões/permissões, pacientes (CRUD), profissionais (criar/listar),
procedimentos (criar/listar), agendamento (criar/listar, com conflito por profissional).
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
