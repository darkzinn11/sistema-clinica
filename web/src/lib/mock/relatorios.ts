/**
 * Catálogo de relatórios do protótipo — metadados (nome, categoria, descrição)
 * usados pela tela /relatorios e como fonte pra gerar dados fictícios em
 * src/components/relatorios/report-configs.tsx. Nenhum dado real.
 */

import {
  Calendar,
  ClipboardTick,
  Microscope,
  Moneys,
  People,
  ReceiptText,
  Wallet2,
  Box,
} from "iconsax-reactjs";
import type { Icon as IconType } from "iconsax-reactjs";

export type ReportCategory =
  | "Pacientes"
  | "Prontuário"
  | "Laboratório"
  | "Agenda"
  | "Faturamento"
  | "Caixa"
  | "Financeiro"
  | "Estoque";

export const CATEGORIES: ReportCategory[] = [
  "Pacientes",
  "Prontuário",
  "Laboratório",
  "Agenda",
  "Faturamento",
  "Caixa",
  "Financeiro",
  "Estoque",
];

export const CATEGORY_ICON: Record<ReportCategory, IconType> = {
  Pacientes: People,
  Prontuário: ClipboardTick,
  Laboratório: Microscope,
  Agenda: Calendar,
  Faturamento: ReceiptText,
  Caixa: Wallet2,
  Financeiro: Moneys,
  Estoque: Box,
};

export interface ReportDef {
  slug: string;
  name: string;
  category: ReportCategory;
  description: string;
}

export const REPORTS: ReportDef[] = [
  // Pacientes
  { slug: "pacientes-por-perfil", name: "Por perfil", category: "Pacientes", description: "Distribuição dos pacientes ativos por faixa etária, sexo e convênio." },
  { slug: "pacientes-por-data-de-cadastro", name: "Por data de cadastro", category: "Pacientes", description: "Evolução de novos cadastros ao longo do tempo, por origem de captação." },
  { slug: "satisfacao-dos-pacientes", name: "Satisfação dos pacientes", category: "Pacientes", description: "Notas e comentários coletados após os atendimentos, por profissional." },
  // Prontuário
  { slug: "por-cid", name: "Por CID", category: "Prontuário", description: "Atendimentos agrupados por CID-10 registrado no prontuário." },
  { slug: "prescricoes", name: "Prescrições", category: "Prontuário", description: "Medicamentos e posologias prescritos no período, por profissional." },
  { slug: "respostas-de-formularios", name: "Respostas de formulários", category: "Prontuário", description: "Respostas coletadas em formulários clínicos aplicados aos pacientes." },
  // Laboratório
  { slug: "integracao-laboratorial", name: "Integração laboratorial", category: "Laboratório", description: "Status de envio e retorno de exames com laboratórios parceiros." },
  { slug: "mapa-de-coletas", name: "Mapa de coletas", category: "Laboratório", description: "Coletas programadas por sala, horário e responsável." },
  { slug: "conferencia-de-amostras", name: "Conferência de amostras", category: "Laboratório", description: "Checklist de amostras coletadas, conferidas e enviadas ao laboratório." },
  { slug: "recoletas", name: "Recoletas", category: "Laboratório", description: "Exames que precisaram de nova coleta, com o motivo registrado." },
  // Agenda
  { slug: "agendamentos-e-atendimentos", name: "Agendamentos e atendimentos", category: "Agenda", description: "Volume de agendamentos, comparecimentos e faltas no período." },
  { slug: "consultas-e-retornos", name: "Consultas e retornos", category: "Agenda", description: "Proporção entre primeiras consultas e retornos por especialidade." },
  { slug: "taxa-de-ocupacao", name: "Taxa de ocupação", category: "Agenda", description: "Ocupação da agenda de cada profissional em relação à capacidade disponível." },
  { slug: "agendamentos-por-usuario", name: "Agendamentos por usuário", category: "Agenda", description: "Quem marcou cada agendamento — recepção, paciente ou profissional." },
  { slug: "produtividade", name: "Produtividade", category: "Agenda", description: "Atendimentos realizados por profissional e por hora trabalhada." },
  // Faturamento
  { slug: "producao-analitica", name: "Produção analítica", category: "Faturamento", description: "Lista detalhada de todos os procedimentos faturados no período." },
  { slug: "producao-sintetica", name: "Produção sintética", category: "Faturamento", description: "Produção consolidada por profissional, particular e convênio." },
  { slug: "producao-externa", name: "Produção externa", category: "Faturamento", description: "Procedimentos realizados fora da clínica ou por parceiros externos." },
  { slug: "producao-por-grupo", name: "Produção por grupo", category: "Faturamento", description: "Produção agrupada por especialidade ou grupo de procedimentos." },
  { slug: "guias-pagas", name: "Guias pagas", category: "Faturamento", description: "Guias de convênio já pagas, com prazo e valor líquido recebido." },
  { slug: "vendas-particulares", name: "Vendas particulares", category: "Faturamento", description: "Procedimentos vendidos diretamente ao paciente, sem convênio." },
  { slug: "faturamento-por-convenio", name: "Faturamento por convênio", category: "Faturamento", description: "Comparativo de faturamento, glosas e prazo de pagamento entre convênios." },
  // Caixa
  { slug: "caixa-sintetico", name: "Caixa sintético", category: "Caixa", description: "Resumo diário de entradas e saídas por forma de recebimento." },
  { slug: "caixa-analitico", name: "Caixa analítico", category: "Caixa", description: "Lançamentos detalhados de cada caixa aberto no período." },
  { slug: "fechamento-de-caixa", name: "Fechamento de caixa", category: "Caixa", description: "Conferência entre o valor declarado e o apurado em cada fechamento." },
  { slug: "fechamento-de-cofre", name: "Fechamento de cofre", category: "Caixa", description: "Movimentação do cofre central e diferenças encontradas." },
  { slug: "caixa-por-usuario", name: "Caixa por usuário", category: "Caixa", description: "Desempenho de caixa por operador de recepção." },
  // Financeiro
  { slug: "fluxo-de-caixa", name: "Fluxo de caixa", category: "Financeiro", description: "Entradas e saídas diárias e o saldo acumulado da clínica." },
  { slug: "fluxo-de-caixa-mensal", name: "Fluxo de caixa mensal", category: "Financeiro", description: "Projeção e realizado do fluxo de caixa mês a mês." },
  { slug: "movimentacao-sintetica", name: "Movimentação sintética", category: "Financeiro", description: "Resumo das movimentações financeiras por categoria." },
  { slug: "analise-de-despesas", name: "Análise de despesas", category: "Financeiro", description: "Despesas por categoria e centro de custo, com variação no período." },
  { slug: "analise-de-receitas", name: "Análise de receitas", category: "Financeiro", description: "Receitas por origem — particular, convênio e outras fontes." },
  { slug: "creditos-pendentes", name: "Créditos pendentes", category: "Financeiro", description: "Valores a receber em aberto, por paciente e por vencimento." },
  { slug: "debitos-pendentes", name: "Débitos pendentes", category: "Financeiro", description: "Contas a pagar em aberto, por fornecedor e por vencimento." },
  { slug: "servicos-a-executar", name: "Serviços a executar", category: "Financeiro", description: "Procedimentos já pagos ou autorizados que ainda não foram realizados." },
  { slug: "repasses-analitico", name: "Repasses analítico", category: "Financeiro", description: "Detalhamento dos repasses devidos a cada profissional." },
  { slug: "dre", name: "DRE", category: "Financeiro", description: "Demonstração do resultado do exercício, da receita bruta ao lucro líquido." },
  // Estoque
  { slug: "posicao-de-estoque", name: "Posição de estoque", category: "Estoque", description: "Saldo atual de produtos por local de armazenamento." },
  { slug: "consumo-por-procedimento", name: "Consumo por procedimento", category: "Estoque", description: "Itens de estoque consumidos por tipo de procedimento realizado." },
  { slug: "produtos-a-vencer", name: "Produtos a vencer", category: "Estoque", description: "Lotes com validade próxima, por produto e localização." },
];

export function reportBySlug(slug: string): ReportDef | undefined {
  return REPORTS.find((r) => r.slug === slug);
}

export function reportsByCategory(category: ReportCategory): ReportDef[] {
  return REPORTS.filter((r) => r.category === category);
}
