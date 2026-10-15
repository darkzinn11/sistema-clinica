/**
 * Dados fictícios do módulo Financeiro. Determinístico via `rng` — mesma
 * entrada, mesma saída. Nenhum dado real (ver nota de privacidade em
 * src/lib/mock/core.ts).
 */

import { TODAY, insuranceName, insurances, patientById, patients, procedureById, procedures, professionalById, professionals, rng } from "@/lib/mock/core";
import { addDaysIso } from "@/lib/format";

function pick<T>(r: () => number, arr: readonly T[]): T {
  return arr[Math.floor(r() * arr.length)];
}

// --- catálogos ------------------------------------------------------------------

export const FORMAS_PAGAMENTO = ["Pix", "Cartão de crédito", "Cartão de débito", "Dinheiro", "Convênio", "Boleto", "Transferência"] as const;
export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number];

export const CATEGORIAS_RECEITA = ["Consultas particulares", "Exames", "Convênios", "Procedimentos", "Outras receitas"];
export const CATEGORIAS_DESPESA = [
  "Aluguel",
  "Folha de pagamento",
  "Material médico",
  "Impostos",
  "Softwares e sistemas",
  "Marketing",
  "Manutenção",
  "Água e energia",
  "Contabilidade",
  "Limpeza",
];
export const TODAS_CATEGORIAS = [...CATEGORIAS_RECEITA, ...CATEGORIAS_DESPESA];

export const CENTROS_CUSTO = [
  "Recepção",
  "Administrativo",
  "Clínica geral",
  "Ginecologia",
  "Cardiologia",
  "Dermatologia",
  "Ortopedia",
  "Pediatria",
  "Psicologia",
  "Ultrassonografia",
];

export const CONTAS = ["Banco Alfa — CC 1234", "Caixa recepção", "Cofre"] as const;
export type Conta = (typeof CONTAS)[number];

export interface Fornecedor {
  id: string;
  nome: string;
  categoria: string;
}

export const FORNECEDORES: Fornecedor[] = [
  { id: "forn-01", nome: "MedSupply Distribuidora Ltda", categoria: "Material médico" },
  { id: "forn-02", nome: "Imobiliária Porto Seguro", categoria: "Aluguel" },
  { id: "forn-03", nome: "Contabilize Assessoria Contábil", categoria: "Contabilidade" },
  { id: "forn-04", nome: "TechClin Sistemas", categoria: "Softwares e sistemas" },
  { id: "forn-05", nome: "Energisa Maranhão", categoria: "Água e energia" },
  { id: "forn-06", nome: "Clean Clinic Serviços de Limpeza", categoria: "Limpeza" },
  { id: "forn-07", nome: "Prefeitura de São Luís (ISS)", categoria: "Impostos" },
  { id: "forn-08", nome: "Equipa Med Equipamentos", categoria: "Material médico" },
  { id: "forn-09", nome: "Fibra Clínica Telecom", categoria: "Softwares e sistemas" },
  { id: "forn-10", nome: "Agência Alvo Marketing", categoria: "Marketing" },
];

export function fornecedorById(id: string): Fornecedor | undefined {
  return FORNECEDORES.find((f) => f.id === id);
}

// --- lançamentos (contas a receber / pagar) --------------------------------------

export type LancamentoTipo = "receita" | "despesa";
export type LancamentoStatus = "em_aberto" | "vencido" | "pago" | "parcial" | "cancelado";

export interface Lancamento {
  id: string;
  tipo: LancamentoTipo;
  descricao: string;
  contraparteNome: string;
  pacienteId?: string;
  fornecedorId?: string;
  categoria: string;
  centroCusto: string;
  conta: Conta;
  formaPagamento: string;
  valorCents: number;
  vencimento: string;
  dataPagamento?: string;
  status: LancamentoStatus;
  parcelaAtual?: number;
  parcelaTotal?: number;
  recorrente?: boolean;
}

const DESC_RECEITA: Record<string, string[]> = {
  "Consultas particulares": ["Consulta particular", "Consulta de retorno", "Avaliação inicial"],
  Exames: ["Exame de imagem", "Exame cardiológico", "Bateria de exames"],
  Convênios: ["Faturamento de convênio", "Repasse de guia TISS", "Reembolso de convênio"],
  Procedimentos: ["Procedimento ambulatorial", "Infiltração articular", "Crioterapia"],
  "Outras receitas": ["Aluguel de sala para terceiro", "Venda de kit domiciliar", "Taxa de 2ª via de laudo"],
};

function makeLancamentosReceita(): Lancamento[] {
  const r = rng(5101);
  const out: Lancamento[] = [];
  for (let i = 0; i < 72; i += 1) {
    const categoria = pick(r, CATEGORIAS_RECEITA);
    const patient = pick(r, patients);
    const descricao = pick(r, DESC_RECEITA[categoria]);
    const diasOffset = Math.floor(r() * 110) - 60; // -60..+49
    const vencimento = addDaysIso(TODAY, diasOffset);
    const valorCents = 6000 + Math.floor(r() * 180) * 500;
    const parcelado = r() < 0.16;
    const parcelaTotal = parcelado ? 2 + Math.floor(r() * 5) : undefined;
    const roll = r();
    let status: LancamentoStatus;
    let dataPagamento: string | undefined;
    if (roll < 0.5) {
      status = "pago";
      dataPagamento = addDaysIso(vencimento, Math.floor(r() * 3) - 1);
    } else if (roll < 0.58) {
      status = "parcial";
    } else if (roll < 0.63) {
      status = "cancelado";
    } else if (vencimento < TODAY) {
      status = "vencido";
    } else {
      status = "em_aberto";
    }
    out.push({
      id: `rec-${String(i + 1).padStart(3, "0")}`,
      tipo: "receita",
      descricao,
      contraparteNome: categoria === "Convênios" ? insuranceName(patient.insuranceId === "i0" ? "i1" : patient.insuranceId) : patient.name,
      pacienteId: patient.id,
      categoria,
      centroCusto: pick(r, CENTROS_CUSTO),
      conta: pick(r, CONTAS),
      formaPagamento: pick(r, FORMAS_PAGAMENTO),
      valorCents,
      vencimento,
      dataPagamento,
      status,
      parcelaAtual: parcelado ? 1 + Math.floor(r() * (parcelaTotal ?? 1)) : undefined,
      parcelaTotal,
      recorrente: r() < 0.08,
    });
  }
  return out.sort((a, b) => a.vencimento.localeCompare(b.vencimento));
}

const DESC_DESPESA: Record<string, string[]> = {
  Aluguel: ["Aluguel da sede — competência"],
  "Folha de pagamento": ["Folha de pagamento — equipe clínica", "Folha de pagamento — equipe administrativa", "13º salário (parcela)"],
  "Material médico": ["Compra de material médico-hospitalar", "Reposição de insumos descartáveis", "Compra de EPI"],
  Impostos: ["ISS — serviços prestados", "Simples Nacional (DAS)", "Guia de INSS"],
  "Softwares e sistemas": ["Assinatura de sistema de gestão", "Licença de prontuário eletrônico", "Hospedagem e backup"],
  Marketing: ["Campanha de mídia social", "Produção de conteúdo", "Impulsionamento de anúncios"],
  Manutenção: ["Manutenção de equipamento", "Manutenção predial", "Revisão de ar-condicionado"],
  "Água e energia": ["Conta de energia elétrica", "Conta de água e esgoto"],
  Contabilidade: ["Honorários contábeis — mensalidade"],
  Limpeza: ["Serviço de limpeza terceirizado", "Compra de material de limpeza"],
};

function makeLancamentosDespesa(): Lancamento[] {
  const r = rng(5202);
  const out: Lancamento[] = [];
  for (let i = 0; i < 58; i += 1) {
    const categoria = pick(r, CATEGORIAS_DESPESA);
    const fornecedoresDaCategoria = FORNECEDORES.filter((f) => f.categoria === categoria);
    const fornecedor = fornecedoresDaCategoria.length ? pick(r, fornecedoresDaCategoria) : pick(r, FORNECEDORES);
    const descricao = pick(r, DESC_DESPESA[categoria]);
    const diasOffset = Math.floor(r() * 110) - 55;
    const vencimento = addDaysIso(TODAY, diasOffset);
    const base = categoria === "Aluguel" ? 480000 : categoria === "Folha de pagamento" ? 920000 : 8000 + Math.floor(r() * 140) * 500;
    const roll = r();
    let status: LancamentoStatus;
    let dataPagamento: string | undefined;
    if (roll < 0.55) {
      status = "pago";
      dataPagamento = addDaysIso(vencimento, Math.floor(r() * 3) - 1);
    } else if (roll < 0.6) {
      status = "parcial";
    } else if (roll < 0.64) {
      status = "cancelado";
    } else if (vencimento < TODAY) {
      status = "vencido";
    } else {
      status = "em_aberto";
    }
    out.push({
      id: `pag-${String(i + 1).padStart(3, "0")}`,
      tipo: "despesa",
      descricao,
      contraparteNome: fornecedor.nome,
      fornecedorId: fornecedor.id,
      categoria,
      centroCusto: pick(r, CENTROS_CUSTO),
      conta: pick(r, CONTAS),
      formaPagamento: pick(r, FORMAS_PAGAMENTO),
      valorCents: base,
      vencimento,
      dataPagamento,
      status,
      recorrente: ["Aluguel", "Folha de pagamento", "Softwares e sistemas", "Contabilidade"].includes(categoria),
    });
  }
  return out.sort((a, b) => a.vencimento.localeCompare(b.vencimento));
}

export const lancamentosReceber: Lancamento[] = makeLancamentosReceita();
export const lancamentosPagar: Lancamento[] = makeLancamentosDespesa();
export const todosLancamentos: Lancamento[] = [...lancamentosReceber, ...lancamentosPagar];

export function lancamentoById(id: string): Lancamento | undefined {
  return todosLancamentos.find((l) => l.id === id);
}

export const STATUS_LABEL: Record<LancamentoStatus, string> = {
  em_aberto: "Em aberto",
  vencido: "Vencido",
  pago: "Pago",
  parcial: "Parcial",
  cancelado: "Cancelado",
};

export const STATUS_TONE: Record<LancamentoStatus, "neutral" | "warning" | "danger" | "success" | "info"> = {
  em_aberto: "info",
  vencido: "danger",
  pago: "success",
  parcial: "warning",
  cancelado: "neutral",
};

export function kpisLancamentos(list: Lancamento[]) {
  const emAberto = list.filter((l) => l.status === "em_aberto" || l.status === "parcial").reduce((s, l) => s + l.valorCents, 0);
  const vencido = list.filter((l) => l.status === "vencido").reduce((s, l) => s + l.valorCents, 0);
  const noMes = list.filter((l) => l.status === "pago" && (l.dataPagamento ?? "").slice(0, 7) === TODAY.slice(0, 7)).reduce((s, l) => s + l.valorCents, 0);
  const previsto30 = list
    .filter((l) => (l.status === "em_aberto" || l.status === "vencido") && l.vencimento <= addDaysIso(TODAY, 30))
    .reduce((s, l) => s + l.valorCents, 0);
  return { emAberto, vencido, noMes, previsto30 };
}

export function historicoLancamento(l: Lancamento): { id: string; titulo: string; data: string; corpo?: string }[] {
  const out: { id: string; titulo: string; data: string; corpo?: string }[] = [
    { id: "h1", titulo: "Lançamento criado", data: addDaysIso(l.vencimento, -14), corpo: `${l.categoria} · ${l.centroCusto}` },
  ];
  if (l.recorrente) out.push({ id: "h2", titulo: "Gerado por recorrência", data: addDaysIso(l.vencimento, -14) });
  if (l.status === "parcial") out.push({ id: "h3", titulo: "Pagamento parcial registrado", data: addDaysIso(l.vencimento, -2), corpo: "50% do valor recebido" });
  if (l.status === "pago" && l.dataPagamento) out.push({ id: "h4", titulo: "Pagamento registrado", data: l.dataPagamento, corpo: `via ${l.formaPagamento}` });
  if (l.status === "cancelado") out.push({ id: "h5", titulo: "Lançamento cancelado", data: addDaysIso(l.vencimento, -3) });
  return out.sort((a, b) => a.data.localeCompare(b.data));
}

// --- fluxo diário (visão geral) --------------------------------------------------

export function fluxoDiario(dias: number): { label: string; receitas: number; despesas: number }[] {
  const out: { label: string; receitas: number; despesas: number }[] = [];
  for (let i = dias - 1; i >= 0; i -= 1) {
    const iso = addDaysIso(TODAY, -i);
    const receitas = lancamentosReceber.filter((l) => l.status === "pago" && l.dataPagamento === iso).reduce((s, l) => s + l.valorCents, 0);
    const despesas = lancamentosPagar.filter((l) => l.status === "pago" && l.dataPagamento === iso).reduce((s, l) => s + l.valorCents, 0);
    out.push({ label: iso.slice(8, 10), receitas, despesas });
  }
  return out;
}

export function receitaPorFormaPagamento(): { label: string; value: number }[] {
  const pagos = lancamentosReceber.filter((l) => l.status === "pago" || l.status === "parcial");
  const map = new Map<string, number>();
  for (const l of pagos) map.set(l.formaPagamento, (map.get(l.formaPagamento) ?? 0) + l.valorCents);
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

export function topProcedimentosPorReceita(): { label: string; value: number }[] {
  const r = rng(5303);
  return procedures
    .filter((p) => p.priceCents > 0)
    .map((p) => ({ label: p.name, value: Math.round((p.priceCents * (6 + Math.floor(r() * 24))) / 100) * 100 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

// --- recorrentes ------------------------------------------------------------------

export interface Recorrente {
  id: string;
  tipo: LancamentoTipo;
  descricao: string;
  categoria: string;
  frequencia: "mensal" | "anual";
  valorCents: number;
  proximoLancamento: string;
  conta: Conta;
  ativo: boolean;
}

export const recorrentes: Recorrente[] = [
  { id: "rc-01", tipo: "despesa", descricao: "Aluguel da sede", categoria: "Aluguel", frequencia: "mensal", valorCents: 480000, proximoLancamento: addDaysIso(TODAY, 2), conta: "Banco Alfa — CC 1234", ativo: true },
  { id: "rc-02", tipo: "despesa", descricao: "Folha de pagamento — equipe", categoria: "Folha de pagamento", frequencia: "mensal", valorCents: 1860000, proximoLancamento: addDaysIso(TODAY, 4), conta: "Banco Alfa — CC 1234", ativo: true },
  { id: "rc-03", tipo: "despesa", descricao: "Sistema de gestão TechClin", categoria: "Softwares e sistemas", frequencia: "mensal", valorCents: 69000, proximoLancamento: addDaysIso(TODAY, 9), conta: "Banco Alfa — CC 1234", ativo: true },
  { id: "rc-04", tipo: "despesa", descricao: "Internet fibra + telefonia", categoria: "Softwares e sistemas", frequencia: "mensal", valorCents: 38000, proximoLancamento: addDaysIso(TODAY, 11), conta: "Banco Alfa — CC 1234", ativo: true },
  { id: "rc-05", tipo: "despesa", descricao: "Honorários contábeis", categoria: "Contabilidade", frequencia: "mensal", valorCents: 95000, proximoLancamento: addDaysIso(TODAY, 15), conta: "Banco Alfa — CC 1234", ativo: true },
  { id: "rc-06", tipo: "despesa", descricao: "Limpeza terceirizada", categoria: "Limpeza", frequencia: "mensal", valorCents: 220000, proximoLancamento: addDaysIso(TODAY, 6), conta: "Banco Alfa — CC 1234", ativo: true },
  { id: "rc-07", tipo: "despesa", descricao: "Seguro predial e de equipamentos", categoria: "Manutenção", frequencia: "anual", valorCents: 420000, proximoLancamento: addDaysIso(TODAY, 128), conta: "Banco Alfa — CC 1234", ativo: true },
  { id: "rc-08", tipo: "despesa", descricao: "Licença de prontuário eletrônico", categoria: "Softwares e sistemas", frequencia: "anual", valorCents: 180000, proximoLancamento: addDaysIso(TODAY, 61), conta: "Banco Alfa — CC 1234", ativo: false },
  { id: "rc-09", tipo: "receita", descricao: "Aluguel de sala — Dra. parceira", categoria: "Outras receitas", frequencia: "mensal", valorCents: 150000, proximoLancamento: addDaysIso(TODAY, 5), conta: "Banco Alfa — CC 1234", ativo: true },
  { id: "rc-10", tipo: "receita", descricao: "Convênio corporativo — plano empresarial", categoria: "Convênios", frequencia: "mensal", valorCents: 620000, proximoLancamento: addDaysIso(TODAY, 8), conta: "Banco Alfa — CC 1234", ativo: true },
];

export function projecao12Meses(): { label: string; receitas: number; despesas: number }[] {
  const r = rng(5404);
  const out: { label: string; receitas: number; despesas: number }[] = [];
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const mesAtual = Number(TODAY.slice(5, 7)) - 1;
  const baseReceitas = recorrentes.filter((r2) => r2.tipo === "receita" && r2.ativo).reduce((s, r2) => s + (r2.frequencia === "mensal" ? r2.valorCents : r2.valorCents / 12), 0) + 3200000;
  const baseDespesas = recorrentes.filter((r2) => r2.tipo === "despesa" && r2.ativo).reduce((s, r2) => s + (r2.frequencia === "mensal" ? r2.valorCents : r2.valorCents / 12), 0) + 900000;
  for (let i = 0; i < 12; i += 1) {
    const idx = (mesAtual + i) % 12;
    const variacaoR = 0.92 + r() * 0.2;
    const variacaoD = 0.94 + r() * 0.14;
    out.push({ label: meses[idx], receitas: Math.round((baseReceitas * variacaoR) / 100) * 100, despesas: Math.round((baseDespesas * variacaoD) / 100) * 100 });
  }
  return out;
}

// --- caixa --------------------------------------------------------------------

export interface MovimentoCaixa {
  id: string;
  hora: string;
  tipo: "recebimento" | "sangria" | "suprimento";
  descricao: string;
  formaPagamento?: string;
  valorCents: number;
}

function makeMovimentosCaixaHoje(): MovimentoCaixa[] {
  const r = rng(5505);
  const out: MovimentoCaixa[] = [];
  let hora = 7 * 60 + 25;
  const nomes = patients.slice(0, 40);
  for (let i = 0; i < 14; i += 1) {
    hora += 8 + Math.floor(r() * 24);
    const roll = r();
    if (roll < 0.82) {
      const p = pick(r, nomes);
      out.push({
        id: `mv-${i}`,
        hora: `${String(Math.floor(hora / 60)).padStart(2, "0")}:${String(hora % 60).padStart(2, "0")}`,
        tipo: "recebimento",
        descricao: `Recebimento — ${p.name}`,
        formaPagamento: pick(r, FORMAS_PAGAMENTO.filter((f) => f !== "Boleto" && f !== "Transferência")),
        valorCents: 8000 + Math.floor(r() * 40) * 500,
      });
    } else if (roll < 0.92) {
      out.push({ id: `mv-${i}`, hora: `${String(Math.floor(hora / 60)).padStart(2, "0")}:${String(hora % 60).padStart(2, "0")}`, tipo: "sangria", descricao: "Sangria para o cofre", valorCents: -(15000 + Math.floor(r() * 10) * 500) });
    } else {
      out.push({ id: `mv-${i}`, hora: `${String(Math.floor(hora / 60)).padStart(2, "0")}:${String(hora % 60).padStart(2, "0")}`, tipo: "suprimento", descricao: "Suprimento de troco", valorCents: 10000 });
    }
  }
  return out;
}

export const caixaHoje = {
  nome: "Caixa recepção",
  abertoPor: "Ana Ribeiro",
  abertoAs: "07:02",
  saldoInicialCents: 20000,
  movimentos: makeMovimentosCaixaHoje(),
};

export function saldoAtualCaixa(): number {
  return caixaHoje.saldoInicialCents + caixaHoje.movimentos.reduce((s, m) => s + m.valorCents, 0);
}

export function entradasPorFormaCaixa(): { label: string; value: number }[] {
  const map = new Map<string, number>();
  for (const m of caixaHoje.movimentos) {
    if (m.tipo !== "recebimento" || !m.formaPagamento) continue;
    map.set(m.formaPagamento, (map.get(m.formaPagamento) ?? 0) + m.valorCents);
  }
  return [...map.entries()].map(([label, value]) => ({ label, value }));
}

export interface CaixaHistorico {
  id: string;
  data: string;
  responsavel: string;
  esperadoCents: number;
  contadoCents: number;
}

export const historicoCaixas: CaixaHistorico[] = (() => {
  const r = rng(5606);
  const out: CaixaHistorico[] = [];
  for (let i = 1; i <= 14; i += 1) {
    const esperado = 180000 + Math.floor(r() * 400) * 500;
    const dif = Math.floor(r() * 7) - 3;
    out.push({ id: `ch-${i}`, data: addDaysIso(TODAY, -i), responsavel: pick(r, ["Ana Ribeiro", "Marcos Vieira", "Juliana Prado"]), esperadoCents: esperado, contadoCents: esperado + dif * 500 });
  }
  return out;
})();

export const cofre = {
  saldoCents: 1286000,
  movimentos: [
    { id: "cf-1", data: addDaysIso(TODAY, 0), descricao: "Sangria do caixa recepção", valorCents: 15000 },
    { id: "cf-2", data: addDaysIso(TODAY, -1), descricao: "Sangria do caixa recepção", valorCents: 18500 },
    { id: "cf-3", data: addDaysIso(TODAY, -2), descricao: "Depósito bancário", valorCents: -200000 },
    { id: "cf-4", data: addDaysIso(TODAY, -3), descricao: "Sangria do caixa recepção", valorCents: 16000 },
  ],
};

// --- extrato e conciliação --------------------------------------------------------

export interface ExtratoLinha {
  id: string;
  data: string;
  descricao: string;
  valorCents: number;
  conciliado: boolean;
  sugestaoLancamentoId?: string;
  confianca?: number;
}

export const contaCorrente = { nome: "Banco Alfa — CC 1234", saldoCents: 18420000 };

export const extratoLinhas: ExtratoLinha[] = (() => {
  const r = rng(5707);
  const out: ExtratoLinha[] = [];
  const pagos = lancamentosPagar.filter((l) => l.conta === "Banco Alfa — CC 1234" && (l.status === "pago" || l.status === "em_aberto")).slice(0, 10);
  const recs = lancamentosReceber.filter((l) => l.conta === "Banco Alfa — CC 1234" && (l.status === "pago" || l.status === "em_aberto")).slice(0, 10);
  let n = 0;
  for (const l of recs) {
    n += 1;
    const matched = r() < 0.65;
    out.push({ id: `ex-${n}`, data: l.dataPagamento ?? l.vencimento, descricao: `PIX RECEBIDO — ${l.contraparteNome}`, valorCents: l.valorCents, conciliado: matched, sugestaoLancamentoId: matched ? undefined : l.id, confianca: matched ? undefined : 70 + Math.floor(r() * 28) });
  }
  for (const l of pagos) {
    n += 1;
    const matched = r() < 0.55;
    out.push({ id: `ex-${n}`, data: l.dataPagamento ?? l.vencimento, descricao: `DÉBITO — ${l.contraparteNome.toUpperCase()}`, valorCents: -l.valorCents, conciliado: matched, sugestaoLancamentoId: matched ? undefined : l.id, confianca: matched ? undefined : 62 + Math.floor(r() * 32) });
  }
  // algumas linhas sem sugestão nenhuma (tarifas bancárias etc.)
  out.push({ id: `ex-${n + 1}`, data: addDaysIso(TODAY, -2), descricao: "TARIFA DE MANUTENÇÃO DE CONTA", valorCents: -4990, conciliado: false });
  out.push({ id: `ex-${n + 2}`, data: addDaysIso(TODAY, -5), descricao: "RENDIMENTO POUPANÇA PROGRAMADA", valorCents: 18230, conciliado: false });
  return out.sort((a, b) => b.data.localeCompare(a.data));
})();

export function pctConciliado(): number {
  const total = extratoLinhas.length || 1;
  const feitos = extratoLinhas.filter((l) => l.conciliado).length;
  return Math.round((feitos / total) * 100);
}

// --- repasses -----------------------------------------------------------------

export const COMPETENCIAS = ["2026-08", "2026-09", "2026-10"];

export function competenciaLabel(c: string): string {
  const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  return `${meses[Number(c.slice(5, 7)) - 1]} de ${c.slice(0, 4)}`;
}

export interface RepasseItem {
  id: string;
  data: string;
  pacienteId: string;
  procedimentoId: string;
  valorCents: number;
  percentual: number;
  repasseCents: number;
}

export interface RepasseProfissional {
  professionalId: string;
  producaoBrutaCents: number;
  regraPercent: number;
  descontosCents: number;
  aRepassarCents: number;
  status: "pendente" | "aprovado" | "pago";
  itens: RepasseItem[];
}

export function repassesPorCompetencia(competencia: string): RepasseProfissional[] {
  const r = rng(Number(competencia.replace("-", "")) + 9);
  return professionals.map((prof) => {
    const regraPercent = [40, 45, 50, 55, 60][Math.floor(r() * 5)];
    const nItens = 10 + Math.floor(r() * 30);
    const itens: RepasseItem[] = [];
    let producaoBruta = 0;
    for (let i = 0; i < nItens; i += 1) {
      const proc = pick(r, procedures.filter((p) => p.specialty === prof.specialty || p.id === "pr20"));
      const patient = pick(r, patients);
      const valor = proc.priceCents || 15000;
      const repasse = Math.round((valor * regraPercent) / 100);
      producaoBruta += valor;
      itens.push({
        id: `${prof.id}-${competencia}-${i}`,
        data: `${competencia}-${String(1 + Math.floor(r() * 27)).padStart(2, "0")}`,
        pacienteId: patient.id,
        procedimentoId: proc.id,
        valorCents: valor,
        percentual: regraPercent,
        repasseCents: repasse,
      });
    }
    const descontos = Math.round(producaoBruta * 0.02);
    const aRepassar = itens.reduce((s, it) => s + it.repasseCents, 0) - descontos;
    const statusRoll = r();
    const status: "pendente" | "aprovado" | "pago" = competencia === COMPETENCIAS[COMPETENCIAS.length - 1] ? (statusRoll < 0.5 ? "pendente" : "aprovado") : "pago";
    return { professionalId: prof.id, producaoBrutaCents: producaoBruta, regraPercent, descontosCents: descontos, aRepassarCents: aRepassar, status, itens: itens.sort((a, b) => a.data.localeCompare(b.data)) };
  });
}

// --- notas fiscais (NFS-e) ------------------------------------------------------

export interface NotaFiscal {
  id: string;
  numero: string;
  dataEmissao: string;
  tomadorNome: string;
  servico: string;
  valorCents: number;
  aliquotaIss: number;
  issCents: number;
  status: "emitida" | "processando" | "cancelada" | "erro";
  erro?: string;
}

export const notasFiscais: NotaFiscal[] = (() => {
  const r = rng(5808);
  const out: NotaFiscal[] = [];
  const servicos = ["Consulta médica", "Exame de imagem", "Procedimento ambulatorial", "Sessão terapêutica"];
  const erros = ["CNPJ do tomador inválido", "Falha na comunicação com a prefeitura", "Código de serviço não homologado"];
  for (let i = 0; i < 46; i += 1) {
    const patient = pick(r, patients);
    const valor = 8000 + Math.floor(r() * 50) * 500;
    const aliquota = pick(r, [2, 2.5, 3, 5]);
    const roll = r();
    const status: NotaFiscal["status"] = roll < 0.78 ? "emitida" : roll < 0.88 ? "processando" : roll < 0.95 ? "erro" : "cancelada";
    out.push({
      id: `nfse-${i + 1}`,
      numero: String(100245 + i),
      dataEmissao: addDaysIso(TODAY, -Math.floor(r() * 60)),
      tomadorNome: patient.name,
      servico: pick(r, servicos),
      valorCents: valor,
      aliquotaIss: aliquota,
      issCents: Math.round((valor * aliquota) / 100),
      status,
      erro: status === "erro" ? pick(r, erros) : undefined,
    });
  }
  return out.sort((a, b) => b.dataEmissao.localeCompare(a.dataEmissao));
})();

// --- cartões e cheques ----------------------------------------------------------

export interface TransacaoCartao {
  id: string;
  data: string;
  bandeira: string;
  tipo: "credito" | "debito" | "parcelado";
  parcelas?: number;
  brutoCents: number;
  taxaPercent: number;
  liquidoCents: number;
  previsaoRecebimento: string;
  conciliado: boolean;
}

export const transacoesCartao: TransacaoCartao[] = (() => {
  const r = rng(5909);
  const out: TransacaoCartao[] = [];
  const bandeiras = ["Visa", "Mastercard", "Elo", "Amex"];
  for (let i = 0; i < 50; i += 1) {
    const tipoRoll = r();
    const tipo: TransacaoCartao["tipo"] = tipoRoll < 0.45 ? "debito" : tipoRoll < 0.8 ? "credito" : "parcelado";
    const parcelas = tipo === "parcelado" ? 2 + Math.floor(r() * 10) : undefined;
    const bruto = 8000 + Math.floor(r() * 60) * 500;
    const taxa = tipo === "debito" ? 1.2 + r() * 0.5 : tipo === "credito" ? 2.4 + r() * 0.8 : 3.2 + r() * 1.6;
    const liquido = Math.round(bruto * (1 - taxa / 100));
    const data = addDaysIso(TODAY, -Math.floor(r() * 30));
    const prazo = tipo === "debito" ? 1 : tipo === "credito" ? 30 : 30 * (parcelas ?? 1);
    out.push({
      id: `tc-${i + 1}`,
      data,
      bandeira: pick(r, bandeiras),
      tipo,
      parcelas,
      brutoCents: bruto,
      taxaPercent: Math.round(taxa * 100) / 100,
      liquidoCents: liquido,
      previsaoRecebimento: addDaysIso(data, prazo),
      conciliado: r() < 0.7,
    });
  }
  return out.sort((a, b) => b.data.localeCompare(a.data));
})();

export function recebiveisFuturosPorSemana(): { label: string; value: number }[] {
  const out: { label: string; value: number }[] = [];
  for (let w = 0; w < 6; w += 1) {
    const start = addDaysIso(TODAY, w * 7);
    const end = addDaysIso(TODAY, w * 7 + 6);
    const value = transacoesCartao.filter((t) => t.previsaoRecebimento >= start && t.previsaoRecebimento <= end).reduce((s, t) => s + t.liquidoCents, 0);
    out.push({ label: `Sem ${w + 1}`, value });
  }
  return out;
}

export interface Cheque {
  id: string;
  numero: string;
  banco: string;
  emitente: string;
  valorCents: number;
  bomPara: string;
  status: "em_carteira" | "depositado" | "devolvido";
}

export const cheques: Cheque[] = (() => {
  const r = rng(6010);
  const out: Cheque[] = [];
  const bancos = ["Banco Alfa", "Banco Nordeste Forte", "Caixa Popular", "Banco Vale do Itapecuru"];
  for (let i = 0; i < 16; i += 1) {
    const patient = pick(r, patients);
    const roll = r();
    const status: Cheque["status"] = roll < 0.5 ? "em_carteira" : roll < 0.88 ? "depositado" : "devolvido";
    out.push({
      id: `ch-${i + 1}`,
      numero: String(850100 + i),
      banco: pick(r, bancos),
      emitente: patient.name,
      valorCents: 10000 + Math.floor(r() * 50) * 500,
      bomPara: addDaysIso(TODAY, Math.floor(r() * 40) - 10),
      status,
    });
  }
  return out;
})();

// --- propostas (orçamentos) ------------------------------------------------------

export interface PropostaItem {
  descricao: string;
  valorCents: number;
}

export interface Proposta {
  id: string;
  numero: string;
  pacienteId: string;
  itens: PropostaItem[];
  valorCents: number;
  descontoCents: number;
  condicaoPagamento: string;
  criadoEm: string;
  validade: string;
  status: "rascunho" | "enviada" | "aprovada" | "recusada" | "expirada";
}

export const propostas: Proposta[] = (() => {
  const r = rng(6111);
  const out: Proposta[] = [];
  const condicoes = ["À vista com 10% de desconto", "Em até 3x sem juros", "Em até 6x no cartão", "50% de entrada + 2x"];
  for (let i = 0; i < 30; i += 1) {
    const patient = pick(r, patients);
    const nItens = 1 + Math.floor(r() * 3);
    const itens: PropostaItem[] = [];
    for (let j = 0; j < nItens; j += 1) {
      const proc = pick(r, procedures.filter((p) => p.priceCents > 0));
      itens.push({ descricao: proc.name, valorCents: proc.priceCents });
    }
    const subtotal = itens.reduce((s, it) => s + it.valorCents, 0);
    const desconto = r() < 0.4 ? Math.round(subtotal * 0.1) : 0;
    const criadoEm = addDaysIso(TODAY, -Math.floor(r() * 50));
    const roll = r();
    const status: Proposta["status"] = roll < 0.18 ? "rascunho" : roll < 0.45 ? "enviada" : roll < 0.72 ? "aprovada" : roll < 0.9 ? "recusada" : "expirada";
    out.push({
      id: `prop-${i + 1}`,
      numero: `ORC-${2026}${String(i + 1).padStart(4, "0")}`,
      pacienteId: patient.id,
      itens,
      valorCents: subtotal - desconto,
      descontoCents: desconto,
      condicaoPagamento: pick(r, condicoes),
      criadoEm,
      validade: addDaysIso(criadoEm, 15),
      status,
    });
  }
  return out.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
})();

export function kpisPropostas() {
  const enviadas = propostas.filter((p) => p.status !== "rascunho").length;
  const aprovadas = propostas.filter((p) => p.status === "aprovada").length;
  const recusadasOuExpiradas = propostas.filter((p) => p.status === "recusada" || p.status === "expirada").length;
  const taxaAprovacao = enviadas ? Math.round((aprovadas / (aprovadas + recusadasOuExpiradas || 1)) * 100) : 0;
  const emNegociacaoCents = propostas.filter((p) => p.status === "enviada").reduce((s, p) => s + p.valorCents, 0);
  return { enviadas, taxaAprovacao, emNegociacaoCents };
}

// --- re-exports de conveniência ---------------------------------------------------

export { patientById, professionalById, procedureById, insuranceName, insurances };
