/**
 * Dados fictícios do módulo de Estoque. Determinístico (rng do core),
 * itens plausíveis de uma clínica (descartáveis, insumos de exame,
 * medicamentos de uso local, EPI) — tudo fictício.
 */

import type { Tone } from "@/components/ui/badge";
import { addDaysIso } from "@/lib/format";
import { TODAY, locations, procedureById, procedures, rng } from "@/lib/mock/core";

export type MovimentoTipo = "entrada" | "saida" | "ajuste" | "transferencia";
export type RequisicaoStatus = "pendente" | "aprovada" | "atendida" | "recusada";

export const MOVIMENTO_TIPO_META: Record<MovimentoTipo, { label: string; tone: Tone }> = {
  entrada: { label: "Entrada", tone: "success" },
  saida: { label: "Saída", tone: "neutral" },
  ajuste: { label: "Ajuste", tone: "warning" },
  transferencia: { label: "Transferência", tone: "info" },
};

export const REQUISICAO_STATUS_META: Record<RequisicaoStatus, { label: string; tone: Tone }> = {
  pendente: { label: "Pendente", tone: "warning" },
  aprovada: { label: "Aprovada", tone: "info" },
  atendida: { label: "Atendida", tone: "success" },
  recusada: { label: "Recusada", tone: "danger" },
};

export const CATEGORIAS = ["Descartáveis", "Insumos de exame", "Medicamentos", "Materiais de curativo", "EPI"] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export const FORNECEDORES = ["MedSupply Distribuidora", "Cirúrgica Maranhão", "BioClin Hospitalar", "Nordeste Hospitalar", "FarmaCenter Distribuição"];

export const LOCAIS_ESTOQUE = ["Almoxarifado central", ...locations.map((l) => l.name)];

export const SETORES = ["Consultório 1", "Consultório 2", "Sala de Procedimentos", "Sala de Ultrassom", "Sala de Exames Cardiológicos", "Recepção"];

const USUARIOS = ["Ana Ribeiro", "Patrícia Souza", "Marcos Lima", "Juliana Freitas"];

export interface Produto {
  id: string;
  nome: string;
  codigo: string;
  categoria: Categoria;
  unidade: string;
  estoqueMinimo: number;
  estoqueMaximo: number;
  fornecedorPreferido: string;
  saldoAtual: number;
  custoUnitCents: number;
  local: string;
}

export interface LoteProduto {
  id: string;
  produtoId: string;
  lote: string;
  validade: string;
  quantidade: number;
}

export interface Movimentacao {
  id: string;
  tipo: MovimentoTipo;
  produtoId: string;
  loteId?: string;
  quantidade: number;
  documento?: string;
  fornecedor?: string;
  motivo?: string;
  usuario: string;
  data: string;
}

export interface KitComponente {
  produtoId: string;
  quantidade: number;
}

export interface Kit {
  id: string;
  nome: string;
  descricao: string;
  componentes: KitComponente[];
  procedureIds: string[];
}

export interface Requisicao {
  id: string;
  setor: string;
  solicitante: string;
  itens: { produtoId: string; quantidade: number }[];
  status: RequisicaoStatus;
  dataSolicitacao: string;
  dataResposta?: string;
  aprovadoPor?: string;
  observacao?: string;
}

function pick<T>(r: () => number, arr: readonly T[]): T {
  return arr[Math.floor(r() * arr.length)];
}

// --- produtos ------------------------------------------------------------------

const PRODUTOS_BASE: { nome: string; categoria: Categoria; unidade: string; custoUnitCents: number }[] = [
  { nome: "Luva de procedimento (P)", categoria: "Descartáveis", unidade: "caixa", custoUnitCents: 3490 },
  { nome: "Luva de procedimento (M)", categoria: "Descartáveis", unidade: "caixa", custoUnitCents: 3490 },
  { nome: "Luva estéril nº 7,5", categoria: "Descartáveis", unidade: "par", custoUnitCents: 890 },
  { nome: "Seringa descartável 5 ml", categoria: "Descartáveis", unidade: "unidade", custoUnitCents: 65 },
  { nome: "Seringa descartável 10 ml", categoria: "Descartáveis", unidade: "unidade", custoUnitCents: 78 },
  { nome: "Agulha descartável 25x7", categoria: "Descartáveis", unidade: "unidade", custoUnitCents: 32 },
  { nome: "Gel para ultrassom", categoria: "Insumos de exame", unidade: "frasco", custoUnitCents: 1890 },
  { nome: "Lençol descartável", categoria: "Descartáveis", unidade: "rolo", custoUnitCents: 2290 },
  { nome: "Papel para ECG", categoria: "Insumos de exame", unidade: "rolo", custoUnitCents: 4190 },
  { nome: "Eletrodo descartável para ECG", categoria: "Insumos de exame", unidade: "pacote", custoUnitCents: 3690 },
  { nome: "Anestésico local lidocaína 2%", categoria: "Medicamentos", unidade: "frasco", custoUnitCents: 1290 },
  { nome: "Álcool 70%", categoria: "Materiais de curativo", unidade: "frasco", custoUnitCents: 990 },
  { nome: "Gaze estéril", categoria: "Materiais de curativo", unidade: "pacote", custoUnitCents: 1190 },
  { nome: "Esparadrapo", categoria: "Materiais de curativo", unidade: "rolo", custoUnitCents: 890 },
  { nome: "Máscara cirúrgica tripla", categoria: "EPI", unidade: "caixa", custoUnitCents: 2990 },
  { nome: "Avental descartável", categoria: "EPI", unidade: "unidade", custoUnitCents: 450 },
  { nome: "Touca descartável", categoria: "EPI", unidade: "caixa", custoUnitCents: 1690 },
  { nome: "Espéculo descartável", categoria: "Descartáveis", unidade: "unidade", custoUnitCents: 290 },
  { nome: "Capa para transdutor", categoria: "Insumos de exame", unidade: "caixa", custoUnitCents: 3290 },
  { nome: "Soro fisiológico 0,9% 500ml", categoria: "Medicamentos", unidade: "frasco", custoUnitCents: 990 },
];

function makeProdutos(): Produto[] {
  const r = rng(314);
  return PRODUTOS_BASE.map((base, i) => {
    const estoqueMinimo = 10 + Math.floor(r() * 30);
    const estoqueMaximo = estoqueMinimo * (3 + Math.floor(r() * 3));
    const posicaoCritica = r() < 0.22;
    const saldoAtual = posicaoCritica ? Math.max(0, Math.round(estoqueMinimo * (0.2 + r() * 0.75))) : Math.round(estoqueMinimo * (1.1 + r() * 2.2));
    return {
      id: `prod-${String(i + 1).padStart(3, "0")}`,
      nome: base.nome,
      codigo: `EST-${String(1000 + i).slice(1)}`,
      categoria: base.categoria,
      unidade: base.unidade,
      estoqueMinimo,
      estoqueMaximo,
      fornecedorPreferido: pick(r, FORNECEDORES),
      saldoAtual,
      custoUnitCents: base.custoUnitCents,
      local: pick(r, LOCAIS_ESTOQUE),
    };
  });
}

export const produtos: Produto[] = makeProdutos();

export function produtoById(id: string): Produto | undefined {
  return produtos.find((p) => p.id === id);
}

// --- lotes dos produtos ------------------------------------------------------------

function makeLotesProdutos(): LoteProduto[] {
  const r = rng(642);
  const out: LoteProduto[] = [];
  for (const produto of produtos) {
    const temValidade = produto.categoria !== "EPI";
    if (!temValidade) continue;
    const nLotes = 1 + Math.floor(r() * 2);
    let restante = produto.saldoAtual;
    for (let i = 0; i < nLotes; i += 1) {
      const isLast = i === nLotes - 1;
      const quantidade = isLast ? restante : Math.max(1, Math.round(restante * (0.3 + r() * 0.4)));
      restante -= quantidade;
      const vencProximo = r() < 0.2;
      const validade = vencProximo ? addDaysIso(TODAY, 5 + Math.floor(r() * 25)) : addDaysIso(TODAY, 60 + Math.floor(r() * 500));
      out.push({
        id: `lp-${produto.id}-${i + 1}`,
        produtoId: produto.id,
        lote: `L${String(2600 + Math.floor(r() * 400))}`,
        validade,
        quantidade: Math.max(0, quantidade),
      });
    }
  }
  return out;
}

export const lotesProdutos: LoteProduto[] = makeLotesProdutos();

export function lotesDoProduto(produtoId: string): LoteProduto[] {
  return lotesProdutos.filter((l) => l.produtoId === produtoId).sort((a, b) => a.validade.localeCompare(b.validade));
}

export function proximoVencimento(produtoId: string): string | undefined {
  return lotesDoProduto(produtoId)[0]?.validade;
}

// --- movimentações -------------------------------------------------------------------

function makeMovimentacoes(): Movimentacao[] {
  const r = rng(258);
  const out: Movimentacao[] = [];
  const TIPOS: MovimentoTipo[] = ["entrada", "entrada", "saida", "saida", "saida", "ajuste", "transferencia"];
  for (let i = 0; i < 70; i += 1) {
    const produto = pick(r, produtos);
    const tipo = pick(r, TIPOS);
    const quantidade = tipo === "ajuste" ? 1 + Math.floor(r() * 5) : 2 + Math.floor(r() * 20);
    const data = addDaysIso(TODAY, -Math.floor(r() * 45));
    const lotesDisp = lotesDoProduto(produto.id);
    out.push({
      id: `mov-${String(i + 1).padStart(4, "0")}`,
      tipo,
      produtoId: produto.id,
      loteId: lotesDisp.length ? pick(r, lotesDisp).id : undefined,
      quantidade,
      documento: tipo === "entrada" ? `NF-${10000 + Math.floor(r() * 9000)}` : undefined,
      fornecedor: tipo === "entrada" ? produto.fornecedorPreferido : undefined,
      motivo: tipo === "ajuste" ? pick(r, ["Contagem de inventário", "Perda por validade vencida", "Produto danificado", "Divergência de conferência"]) : tipo === "transferencia" ? `Transferência para ${pick(r, LOCAIS_ESTOQUE)}` : undefined,
      usuario: pick(r, USUARIOS),
      data,
    });
  }
  return out.sort((a, b) => b.data.localeCompare(a.data));
}

export const movimentacoes: Movimentacao[] = makeMovimentacoes();

export function movimentacoesDoProduto(produtoId: string): Movimentacao[] {
  return movimentacoes.filter((m) => m.produtoId === produtoId);
}

/** Série de consumo semanal (últimas 12 semanas) pra gráfico de linha do produto. */
export function consumoSemanal(produtoId: string): { label: string; saida: number }[] {
  const r = rng(Number(produtoId.replace(/\D/g, "")) * 11 + 5);
  const out: { label: string; saida: number }[] = [];
  for (let i = 11; i >= 0; i -= 1) {
    const base = 8 + Math.floor(r() * 18);
    out.push({ label: `S-${i === 0 ? "atual" : i}`, saida: base });
  }
  return out;
}

// --- kits ----------------------------------------------------------------------------

function byNome(nome: string): string {
  return produtos.find((p) => p.nome === nome)?.id ?? produtos[0].id;
}

export const kits: Kit[] = [
  {
    id: "kit-1",
    nome: "Kit preventivo",
    descricao: "Materiais padrão para coleta de Papanicolau.",
    componentes: [
      { produtoId: byNome("Luva de procedimento (P)"), quantidade: 1 },
      { produtoId: byNome("Espéculo descartável"), quantidade: 1 },
      { produtoId: byNome("Lençol descartável"), quantidade: 1 },
    ],
    procedureIds: procedures.filter((p) => p.name.includes("Preventivo")).map((p) => p.id),
  },
  {
    id: "kit-2",
    nome: "Kit ultrassom transvaginal",
    descricao: "Materiais padrão para exame de ultrassom transvaginal.",
    componentes: [
      { produtoId: byNome("Gel para ultrassom"), quantidade: 1 },
      { produtoId: byNome("Capa para transdutor"), quantidade: 1 },
      { produtoId: byNome("Luva de procedimento (M)"), quantidade: 1 },
      { produtoId: byNome("Lençol descartável"), quantidade: 1 },
    ],
    procedureIds: procedures.filter((p) => p.name.includes("transvaginal")).map((p) => p.id),
  },
  {
    id: "kit-3",
    nome: "Kit ultrassom abdominal",
    descricao: "Materiais padrão para exames de ultrassom de abdome, mamas e obstétrico.",
    componentes: [
      { produtoId: byNome("Gel para ultrassom"), quantidade: 1 },
      { produtoId: byNome("Lençol descartável"), quantidade: 1 },
    ],
    procedureIds: procedures.filter((p) => p.specialty === "Ultrassonografia" && !p.name.includes("transvaginal")).map((p) => p.id),
  },
  {
    id: "kit-4",
    nome: "Kit eletrocardiograma",
    descricao: "Materiais padrão para ECG e Holter.",
    componentes: [
      { produtoId: byNome("Papel para ECG"), quantidade: 1 },
      { produtoId: byNome("Eletrodo descartável para ECG"), quantidade: 1 },
      { produtoId: byNome("Álcool 70%"), quantidade: 1 },
    ],
    procedureIds: procedures.filter((p) => ["Eletrocardiograma", "Holter 24h", "MAPA 24h"].includes(p.name)).map((p) => p.id),
  },
  {
    id: "kit-5",
    nome: "Kit pequeno procedimento",
    descricao: "Materiais padrão para infiltrações e crioterapia.",
    componentes: [
      { produtoId: byNome("Luva estéril nº 7,5"), quantidade: 1 },
      { produtoId: byNome("Anestésico local lidocaína 2%"), quantidade: 1 },
      { produtoId: byNome("Gaze estéril"), quantidade: 1 },
      { produtoId: byNome("Seringa descartável 5 ml"), quantidade: 1 },
      { produtoId: byNome("Agulha descartável 25x7"), quantidade: 1 },
    ],
    procedureIds: procedures.filter((p) => ["Crioterapia de lesão", "Infiltração articular"].includes(p.name)).map((p) => p.id),
  },
];

export function kitById(id: string): Kit | undefined {
  return kits.find((k) => k.id === id);
}

export { procedureById };

// --- requisições ---------------------------------------------------------------------

function makeRequisicoes(): Requisicao[] {
  const r = rng(479);
  const out: Requisicao[] = [];
  const STATUS_POOL: RequisicaoStatus[] = ["pendente", "pendente", "aprovada", "atendida", "atendida", "atendida", "recusada"];
  for (let i = 0; i < 18; i += 1) {
    const status = pick(r, STATUS_POOL);
    const nItens = 1 + Math.floor(r() * 3);
    const itens: { produtoId: string; quantidade: number }[] = [];
    for (let k = 0; k < nItens; k += 1) {
      const produto = pick(r, produtos);
      if (itens.some((it) => it.produtoId === produto.id)) continue;
      itens.push({ produtoId: produto.id, quantidade: 1 + Math.floor(r() * 8) });
    }
    const dataSolicitacao = addDaysIso(TODAY, -Math.floor(r() * 20));
    out.push({
      id: `req-${String(i + 1).padStart(3, "0")}`,
      setor: pick(r, SETORES),
      solicitante: pick(r, USUARIOS),
      itens,
      status,
      dataSolicitacao,
      dataResposta: status === "pendente" ? undefined : addDaysIso(dataSolicitacao, 1 + Math.floor(r() * 3)),
      aprovadoPor: status === "aprovada" || status === "atendida" ? "Ana Ribeiro" : status === "recusada" ? "Ana Ribeiro" : undefined,
      observacao: status === "recusada" ? "Quantidade solicitada acima do consumo médio do setor." : undefined,
    });
  }
  return out.sort((a, b) => b.dataSolicitacao.localeCompare(a.dataSolicitacao));
}

export const requisicoes: Requisicao[] = makeRequisicoes();
