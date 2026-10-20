/**
 * Catálogo dos SVGs de empty state exportados do Figma.
 * Caminhos estáveis: /illustrations/<modulo>/<nome>.svg
 */
export const EMPTY_STATE_ASSETS = {
  "agenda/nenhum-agendamento-alt": "/illustrations/agenda/nenhum-agendamento-alt.svg",
  "agenda/nenhum-agendamento": "/illustrations/agenda/nenhum-agendamento.svg",
  "agenda/nenhum-equipamento": "/illustrations/agenda/nenhum-equipamento.svg",
  "agenda/nenhuma-sala-cadastrada": "/illustrations/agenda/nenhuma-sala-cadastrada.svg",
  "agenda/sem-confirmacoes": "/illustrations/agenda/sem-confirmacoes.svg",
  "atendimento/nenhum-atendimento": "/illustrations/atendimento/nenhum-atendimento.svg",
  "atendimento/nenhuma-prescricao": "/illustrations/atendimento/nenhuma-prescricao.svg",
  "atendimento/sem-evolucoes-clinicas": "/illustrations/atendimento/sem-evolucoes-clinicas.svg",
  "cadastros/nenhum-profissional": "/illustrations/cadastros/nenhum-profissional.svg",
  "configuracoes/nenhum-usuario-conectado": "/illustrations/configuracoes/nenhum-usuario-conectado.svg",
  "configuracoes/nenhuma-integracao": "/illustrations/configuracoes/nenhuma-integracao.svg",
  "estoque/estoque-vazio": "/illustrations/estoque/estoque-vazio.svg",
  "estoque/nenhum-kit": "/illustrations/estoque/nenhum-kit.svg",
  "estoque/nenhum-produto": "/illustrations/estoque/nenhum-produto.svg",
  "estoque/nenhuma-requisicao": "/illustrations/estoque/nenhuma-requisicao.svg",
  "estoque/sem-movimentacoes": "/illustrations/estoque/sem-movimentacoes.svg",
  "faturamento/nenhum-lote": "/illustrations/faturamento/nenhum-lote.svg",
  "faturamento/nenhum-retorno": "/illustrations/faturamento/nenhum-retorno.svg",
  "faturamento/nenhuma-autorizacao": "/illustrations/faturamento/nenhuma-autorizacao.svg",
  "faturamento/nenhuma-guia-alt": "/illustrations/faturamento/nenhuma-guia-alt.svg",
  "faturamento/nenhuma-guia": "/illustrations/faturamento/nenhuma-guia.svg",
  "financeiro/nenhum-cartao": "/illustrations/financeiro/nenhum-cartao.svg",
  "financeiro/nenhum-repasse": "/illustrations/financeiro/nenhum-repasse.svg",
  "financeiro/nenhuma-conta-a-pagar": "/illustrations/financeiro/nenhuma-conta-a-pagar.svg",
  "financeiro/nenhuma-conta-a-receber": "/illustrations/financeiro/nenhuma-conta-a-receber.svg",
  "financeiro/nenhuma-nota-fiscal": "/illustrations/financeiro/nenhuma-nota-fiscal.svg",
  "financeiro/nenhuma-proposta": "/illustrations/financeiro/nenhuma-proposta.svg",
  "financeiro/nenhuma-recorrencia": "/illustrations/financeiro/nenhuma-recorrencia.svg",
  "financeiro/sem-extratos": "/illustrations/financeiro/sem-extratos.svg",
  "financeiro/sem-movimentacoes-financeiras": "/illustrations/financeiro/sem-movimentacoes-financeiras.svg",
  "globais/busca-sem-resultados": "/illustrations/globais/busca-sem-resultados.svg",
  "globais/filtros-sem-resultados": "/illustrations/globais/filtros-sem-resultados.svg",
  "globais/graficos-sem-dados": "/illustrations/globais/graficos-sem-dados.svg",
  "globais/sem-atividades-recentes": "/illustrations/globais/sem-atividades-recentes.svg",
  "globais/sem-notificacoes-alt": "/illustrations/globais/sem-notificacoes-alt.svg",
  "globais/sem-notificacoes": "/illustrations/globais/sem-notificacoes.svg",
  "globais/sem-registros-alt": "/illustrations/globais/sem-registros-alt.svg",
  "globais/sem-registros": "/illustrations/globais/sem-registros.svg",
  "pacientes/nenhum-convenio": "/illustrations/pacientes/nenhum-convenio.svg",
  "pacientes/nenhum-documento": "/illustrations/pacientes/nenhum-documento.svg",
  "pacientes/nenhum-exame-alt": "/illustrations/pacientes/nenhum-exame-alt.svg",
  "pacientes/nenhum-exame": "/illustrations/pacientes/nenhum-exame.svg",
  "pacientes/nenhum-paciente-alt": "/illustrations/pacientes/nenhum-paciente-alt.svg",
  "pacientes/nenhum-paciente": "/illustrations/pacientes/nenhum-paciente.svg",
  "pacientes/prontuario-vazio": "/illustrations/pacientes/prontuario-vazio.svg",
  "recepcao/nenhuma-senha-na-fila": "/illustrations/recepcao/nenhuma-senha-na-fila.svg",
  "recepcao/sala-de-espera-vazia": "/illustrations/recepcao/sala-de-espera-vazia.svg",
} as const;

export type EmptyStateAsset = keyof typeof EMPTY_STATE_ASSETS;

const normalize = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase();

/**
 * Associa os títulos já existentes nas telas a uma arte contextual.
 * Um `illustration` explícito no componente sempre tem prioridade.
 */
export function inferEmptyStateAsset(title: string, description = ""): EmptyStateAsset {
  const t = normalize(title);
  const d = normalize(description);

  // Agenda, agendamentos e disponibilidade
  if (/domingo|nao atende|agendamento|agenda|horarios marcados|historico ainda/.test(t)) return "agenda/nenhum-agendamento";
  if (/confirmac/.test(t)) return "agenda/sem-confirmacoes";
  if (/sala/.test(t)) return "agenda/nenhuma-sala-cadastrada";
  if (/equipamento/.test(t)) return "agenda/nenhum-equipamento";
  if (/check.?in/.test(t)) return "agenda/nenhum-agendamento-alt";

  // Recepção e filas
  if (/recepcao|sala de espera|aguardando/.test(t)) return "recepcao/sala-de-espera-vazia";
  if (/senha|chamada/.test(t)) return "recepcao/nenhuma-senha-na-fila";

  // Pacientes, prontuário e atendimento
  if (/prescric|receita medica/.test(t)) return "atendimento/nenhuma-prescricao";
  if (/evoluc|anotac.*clinic/.test(t)) return "atendimento/sem-evolucoes-clinicas";
  if (/atendimento|consulta iniciada/.test(t)) return "atendimento/nenhum-atendimento";
  if (/prontuario|registro clinico/.test(t)) return "pacientes/prontuario-vazio";
  if (/exame/.test(t)) return "pacientes/nenhum-exame";
  if (/documento|anexo|arquivo/.test(t)) return "pacientes/nenhum-documento";
  if (/convenio|plano cadastrado/.test(t)) return "pacientes/nenhum-convenio";
  if (/paciente/.test(t)) return "pacientes/nenhum-paciente";

  // Faturamento
  if (/autorizac/.test(t)) return "faturamento/nenhuma-autorizacao";
  if (/guia/.test(t)) return "faturamento/nenhuma-guia";
  if (/lote/.test(t)) return "faturamento/nenhum-lote";
  if (/retorno/.test(t)) return "faturamento/nenhum-retorno";

  // Estoque
  if (/requisic/.test(t)) return "estoque/nenhuma-requisicao";
  if (/kit/.test(t)) return "estoque/nenhum-kit";
  if (/produto|estoque/.test(t)) return "estoque/nenhum-produto";

  // Financeiro
  if (/conta.*pagar|a vencer|vencimento/.test(t)) return "financeiro/nenhuma-conta-a-pagar";
  if (/conta.*receber/.test(t)) return "financeiro/nenhuma-conta-a-receber";
  if (/conciliac|extrato/.test(t)) return "financeiro/sem-extratos";
  if (/cartao/.test(t)) return "financeiro/nenhum-cartao";
  if (/repasse/.test(t)) return "financeiro/nenhum-repasse";
  if (/nota fiscal|nota encontrada|nfs-e|recibo/.test(t)) return "financeiro/nenhuma-nota-fiscal";
  if (/proposta/.test(t)) return "financeiro/nenhuma-proposta";
  if (/recorrencia|recorrente/.test(t)) return "financeiro/nenhuma-recorrencia";
  if (/lancamento|movimentac|sem entradas|pagamento/.test(t)) return "financeiro/sem-movimentacoes-financeiras";

  // Configurações e cadastros
  if (/integrac/.test(t)) return "configuracoes/nenhuma-integracao";
  if (/usuario conectado|sessao ativa/.test(t)) return "configuracoes/nenhum-usuario-conectado";
  if (/profissional/.test(t)) return "cadastros/nenhum-profissional";
  if (/funcionario/.test(t)) return "cadastros/nenhum-profissional";

  // Estado de filtros, busca, dados e alertas globais
  if (/notificac|aviso/.test(t)) return "globais/sem-notificacoes";
  if (/mensage/.test(t)) return "globais/sem-atividades-recentes";
  if (/atividad.*recent/.test(t)) return "globais/sem-atividades-recentes";
  if (/relatorio|sem dados|grafico/.test(t)) return "globais/graficos-sem-dados";
  if (/favorito/.test(t)) return "globais/sem-registros-alt";
  if (/filtro/.test(t) || /filtro/.test(d) && /registro|resultado/.test(t)) return "globais/filtros-sem-resultados";
  if (/busca|pesquis|encontrado|encontrada|resultado/.test(t)) return "globais/busca-sem-resultados";

  return "globais/sem-registros";
}
