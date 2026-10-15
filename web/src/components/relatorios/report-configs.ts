import {
  agendamentosEAtendimentos,
  analiseDeDespesas,
  dre,
  faturamentoPorConvenio,
  fluxoDeCaixa,
  pacientesPorPerfil,
  producaoSintetica,
  taxaDeOcupacao,
} from "@/components/relatorios/report-configs-core";
import {
  agendamentosPorUsuario,
  caixaAnalitico,
  caixaPorUsuario,
  caixaSintetico,
  conferenciaDeAmostras,
  consultasERetornos,
  consumoPorProcedimento,
  creditosPendentes,
  debitosPendentes,
  fechamentoDeCaixa,
  fechamentoDeCofre,
  fluxoDeCaixaMensal,
  guiasPagas,
  integracaoLaboratorial,
  mapaDeColetas,
  movimentacaoSintetica,
  pacientesPorDataDeCadastro,
  porCid,
  posicaoDeEstoque,
  prescricoes,
  producaoAnalitica,
  producaoExterna,
  producaoPorGrupo,
  produtividade,
  produtosAVencer,
  recoletas,
  repassesAnalitico,
  respostasDeFormularios,
  satisfacaoDosPacientes,
  servicosAExecutar,
  analiseDeReceitas,
  vendasParticulares,
} from "@/components/relatorios/report-configs-extra";
import type { ReportConfig, ReportFilters } from "@/components/relatorios/report-types";

/**
 * Tabela de despacho slug -> gerador. Todo relatório listado em
 * src/lib/mock/relatorios.ts tem uma entrada aqui (os 8 do briefing com
 * lógica própria, os demais com um "padrão" plausível por categoria).
 */
const GENERATORS: Record<string, (filters: ReportFilters) => ReportConfig> = {
  // Pacientes
  "pacientes-por-perfil": pacientesPorPerfil,
  "pacientes-por-data-de-cadastro": pacientesPorDataDeCadastro,
  "satisfacao-dos-pacientes": satisfacaoDosPacientes,
  // Prontuário
  "por-cid": porCid,
  prescricoes,
  "respostas-de-formularios": respostasDeFormularios,
  // Laboratório
  "integracao-laboratorial": integracaoLaboratorial,
  "mapa-de-coletas": mapaDeColetas,
  "conferencia-de-amostras": conferenciaDeAmostras,
  recoletas,
  // Agenda
  "agendamentos-e-atendimentos": agendamentosEAtendimentos,
  "consultas-e-retornos": consultasERetornos,
  "taxa-de-ocupacao": taxaDeOcupacao,
  "agendamentos-por-usuario": agendamentosPorUsuario,
  produtividade,
  // Faturamento
  "producao-analitica": producaoAnalitica,
  "producao-sintetica": producaoSintetica,
  "producao-externa": producaoExterna,
  "producao-por-grupo": producaoPorGrupo,
  "guias-pagas": guiasPagas,
  "vendas-particulares": vendasParticulares,
  "faturamento-por-convenio": faturamentoPorConvenio,
  // Caixa
  "caixa-sintetico": caixaSintetico,
  "caixa-analitico": caixaAnalitico,
  "fechamento-de-caixa": fechamentoDeCaixa,
  "fechamento-de-cofre": fechamentoDeCofre,
  "caixa-por-usuario": caixaPorUsuario,
  // Financeiro
  "fluxo-de-caixa": fluxoDeCaixa,
  "fluxo-de-caixa-mensal": fluxoDeCaixaMensal,
  "movimentacao-sintetica": movimentacaoSintetica,
  "analise-de-despesas": analiseDeDespesas,
  "analise-de-receitas": analiseDeReceitas,
  "creditos-pendentes": creditosPendentes,
  "debitos-pendentes": debitosPendentes,
  "servicos-a-executar": servicosAExecutar,
  "repasses-analitico": repassesAnalitico,
  dre,
  // Estoque
  "posicao-de-estoque": posicaoDeEstoque,
  "consumo-por-procedimento": consumoPorProcedimento,
  "produtos-a-vencer": produtosAVencer,
};

export function getReportConfig(slug: string, filters: ReportFilters): ReportConfig | undefined {
  return GENERATORS[slug]?.(filters);
}

export type { ReportConfig, ReportFilters } from "@/components/relatorios/report-types";
export { PERIOD_OPTIONS, defaultFilters, type Period } from "@/components/relatorios/report-types";
