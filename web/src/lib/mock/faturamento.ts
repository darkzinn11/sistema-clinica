/**
 * Dados fictícios do módulo de Faturamento TISS. Determinístico (rng do core),
 * reaproveita convênios/pacientes/profissionais/procedimentos do core e
 * acrescenta catálogos próprios (internação, quimioterapia, motivos de glosa)
 * plausíveis em TISS — tudo fictício.
 */

import type { Tone } from "@/components/ui/badge";
import { addDaysIso } from "@/lib/format";
import {
  TODAY,
  insuranceName,
  insurances,
  locations,
  patientById,
  patients,
  procedureById,
  procedures,
  professionalById,
  professionals,
  rng,
} from "@/lib/mock/core";

// --- tipos ------------------------------------------------------------------

export type GuiaTipo = "consulta" | "sadt" | "honorarios" | "internacao" | "quimioterapia";
export type GuiaStatus = "em_digitacao" | "pronta" | "em_lote" | "enviada" | "paga" | "glosada";
export type LoteStatus = "aberto" | "fechado" | "validado" | "enviado" | "processado";
export type AutorizacaoStatus = "autorizada" | "negada" | "em_analise" | "pendente_documentacao";
export type RecursoStatus = "em_analise" | "aceito" | "negado";

export const GUIA_TIPO_LABEL: Record<GuiaTipo, string> = {
  consulta: "Consulta",
  sadt: "SP/SADT",
  honorarios: "Honorários individuais",
  internacao: "Internação",
  quimioterapia: "Quimioterapia",
};

export const GUIA_TIPO_OPTIONS = (Object.keys(GUIA_TIPO_LABEL) as GuiaTipo[]).map((value) => ({ value, label: GUIA_TIPO_LABEL[value] }));

export const GUIA_STATUS_META: Record<GuiaStatus, { label: string; tone: Tone }> = {
  em_digitacao: { label: "Em digitação", tone: "neutral" },
  pronta: { label: "Pronta", tone: "info" },
  em_lote: { label: "Em lote", tone: "accent" },
  enviada: { label: "Enviada", tone: "warning" },
  paga: { label: "Paga", tone: "success" },
  glosada: { label: "Glosada", tone: "danger" },
};

export const GUIA_STATUS_ORDER: GuiaStatus[] = ["em_digitacao", "pronta", "em_lote", "enviada", "paga", "glosada"];

export const LOTE_STATUS_META: Record<LoteStatus, { label: string; tone: Tone }> = {
  aberto: { label: "Aberto", tone: "neutral" },
  fechado: { label: "Fechado", tone: "info" },
  validado: { label: "Validado", tone: "accent" },
  enviado: { label: "Enviado", tone: "warning" },
  processado: { label: "Processado", tone: "success" },
};

export const AUTORIZACAO_STATUS_META: Record<AutorizacaoStatus, { label: string; tone: Tone }> = {
  autorizada: { label: "Autorizada", tone: "success" },
  negada: { label: "Negada", tone: "danger" },
  em_analise: { label: "Em análise", tone: "warning" },
  pendente_documentacao: { label: "Pendente de documentação", tone: "info" },
};

export interface GuiaItem {
  id: string;
  tuss: string;
  descricao: string;
  quantidade: number;
  valorUnitCents: number;
}

export interface Recurso {
  justificativa: string;
  dataEnvio: string;
  status: RecursoStatus;
  valorRecursadoCents: number;
  anexos: number;
}

export interface Glosa {
  codigo: string;
  descricao: string;
  valorCents: number;
  itemDescricao: string;
  dataRetorno: string;
  recurso?: Recurso;
}

export interface Guia {
  id: string;
  numero: string;
  tipo: GuiaTipo;
  patientId: string;
  professionalId: string;
  insuranceId: string;
  carteirinha: string;
  validadeCarteirinha: string;
  elegibilidade: "elegivel" | "inelegivel" | "nao_verificado";
  caraterAtendimento: "eletivo" | "urgencia";
  dataAtendimento: string;
  localId: string;
  senhaAutorizacao?: string;
  status: GuiaStatus;
  itens: GuiaItem[];
  valorCents: number;
  loteId?: string;
  glosa?: Glosa;
  criadoEm: string;
  historico: { status: GuiaStatus; data: string; label: string }[];
}

export interface Lote {
  id: string;
  numero: string;
  insuranceId: string;
  status: LoteStatus;
  guiaIds: string[];
  valorCents: number;
  dataFechamento?: string;
  dataEnvio?: string;
  conferido: boolean;
}

export interface LoteValidacaoItem {
  tipo: "erro" | "aviso";
  guiaNumero: string;
  campo: string;
  mensagem: string;
}

export interface Autorizacao {
  id: string;
  patientId: string;
  procedureId: string;
  insuranceId: string;
  justificativa: string;
  status: AutorizacaoStatus;
  senha?: string;
  validade?: string;
  solicitadoEm: string;
}

export interface ValorConvenio {
  insuranceId: string;
  procedureId: string;
  valorContratadoCents: number;
  valorPraticadoCents: number;
}

// --- catálogos próprios -------------------------------------------------------

export const CONVENIOS = insurances.filter((i) => i.id !== "i0");

const INTERNACAO_ITENS = [
  { tuss: "40902016", descricao: "Diária de apartamento", valorCents: 45000 },
  { tuss: "40902024", descricao: "Diária de UTI", valorCents: 120000 },
  { tuss: "40903010", descricao: "Taxa de sala cirúrgica", valorCents: 180000 },
  { tuss: "40903126", descricao: "Kit de materiais cirúrgicos", valorCents: 32000 },
  { tuss: "40903150", descricao: "Honorário de equipe cirúrgica", valorCents: 95000 },
];

const QUIMIO_ITENS = [
  { tuss: "40903517", descricao: "Sessão de quimioterapia — ciclo ambulatorial", valorCents: 220000 },
  { tuss: "40903525", descricao: "Medicação antineoplásica — infusão", valorCents: 340000 },
  { tuss: "40903533", descricao: "Pré-medicação antiemética", valorCents: 28000 },
  { tuss: "40903541", descricao: "Acesso venoso para infusão", valorCents: 15000 },
];

export const GLOSA_MOTIVOS = [
  { codigo: "1801", descricao: "Procedimento sem autorização prévia" },
  { codigo: "1802", descricao: "Divergência de tabela de valores" },
  { codigo: "1803", descricao: "Beneficiário não identificado" },
  { codigo: "1804", descricao: "Falta de assinatura do beneficiário" },
  { codigo: "1805", descricao: "Quantidade excedente ao contratado" },
  { codigo: "1806", descricao: "Procedimento incompatível com a especialidade" },
  { codigo: "1807", descricao: "Prazo de faturamento expirado" },
];

/** Itens disponíveis pra compor uma guia de cada tipo (busca por TUSS). */
export function catalogoItens(tipo: GuiaTipo): { tuss: string; descricao: string; valorCents: number }[] {
  if (tipo === "internacao") return INTERNACAO_ITENS;
  if (tipo === "quimioterapia") return QUIMIO_ITENS;
  if (tipo === "sadt") return procedures.filter((p) => p.kind === "exame" || p.kind === "procedimento").map((p) => ({ tuss: p.tuss, descricao: p.name, valorCents: p.priceCents }));
  return procedures.filter((p) => p.kind === "consulta").map((p) => ({ tuss: p.tuss, descricao: p.name, valorCents: p.priceCents }));
}

// --- geração de guias ----------------------------------------------------------

function digits(r: () => number, n: number) {
  let s = "";
  for (let i = 0; i < n; i += 1) s += Math.floor(r() * 10);
  return s;
}

function pick<T>(r: () => number, arr: readonly T[]): T {
  return arr[Math.floor(r() * arr.length)];
}

const STATUS_PLAN: { status: GuiaStatus; count: number; minDaysAgo: number; maxDaysAgo: number }[] = [
  { status: "em_digitacao", count: 9, minDaysAgo: 0, maxDaysAgo: 4 },
  { status: "pronta", count: 13, minDaysAgo: 1, maxDaysAgo: 7 },
  { status: "em_lote", count: 11, minDaysAgo: 4, maxDaysAgo: 12 },
  { status: "enviada", count: 17, minDaysAgo: 9, maxDaysAgo: 24 },
  { status: "paga", count: 29, minDaysAgo: 18, maxDaysAgo: 75 },
  { status: "glosada", count: 11, minDaysAgo: 15, maxDaysAgo: 60 },
];

const TIPO_POOL: GuiaTipo[] = [
  "consulta", "consulta", "consulta", "consulta", "consulta",
  "sadt", "sadt", "sadt", "sadt",
  "honorarios", "honorarios",
  "internacao",
  "quimioterapia",
];

function statusLabel(s: GuiaStatus): string {
  const map: Record<GuiaStatus, string> = {
    em_digitacao: "Criada",
    pronta: "Validada",
    em_lote: "Adicionada ao lote",
    enviada: "Enviada ao convênio",
    paga: "Paga pelo convênio",
    glosada: "Retornou com glosa",
  };
  return map[s];
}

function buildHistorico(status: GuiaStatus, criadoEm: string): { status: GuiaStatus; data: string; label: string }[] {
  const chain: GuiaStatus[] = ["em_digitacao", "pronta", "em_lote", "enviada", status === "glosada" ? "glosada" : "paga"];
  const idx = chain.indexOf(status);
  const slice = idx === -1 ? ["em_digitacao" as GuiaStatus] : chain.slice(0, idx + 1);
  return slice.map((s, i) => ({ status: s, data: addDaysIso(criadoEm, i * 2), label: statusLabel(s) }));
}

function makeGuias(): Guia[] {
  const r = rng(781);
  const out: Guia[] = [];
  let seq = 0;
  for (const plan of STATUS_PLAN) {
    for (let i = 0; i < plan.count; i += 1) {
      seq += 1;
      const tipo = pick(r, TIPO_POOL);
      const insurance = pick(r, CONVENIOS);
      const pool = patients.filter((p) => p.insuranceId === insurance.id);
      const patient = pool.length ? pick(r, pool) : pick(r, patients);
      const professional = pick(r, professionals);
      const items = catalogoItens(tipo);
      const nItens = tipo === "internacao" ? 2 + Math.floor(r() * 3) : tipo === "quimioterapia" ? 2 + Math.floor(r() * 2) : tipo === "sadt" ? 1 + Math.floor(r() * 3) : 1;
      const chosen: GuiaItem[] = [];
      for (let k = 0; k < nItens; k += 1) {
        const it = pick(r, items);
        const quantidade = tipo === "quimioterapia" || tipo === "internacao" ? 1 + Math.floor(r() * 2) : 1;
        if (chosen.some((c) => c.tuss === it.tuss)) continue;
        chosen.push({ id: `${seq}-${k}`, tuss: it.tuss, descricao: it.descricao, quantidade, valorUnitCents: it.valorCents });
      }
      if (chosen.length === 0) chosen.push({ id: `${seq}-0`, tuss: items[0].tuss, descricao: items[0].descricao, quantidade: 1, valorUnitCents: items[0].valorCents });
      const valorCents = chosen.reduce((s, it) => s + it.quantidade * it.valorUnitCents, 0);
      const daysAgo = plan.minDaysAgo + Math.floor(r() * (plan.maxDaysAgo - plan.minDaysAgo + 1));
      const criadoEm = addDaysIso(TODAY, -daysAgo);
      const dataAtendimento = addDaysIso(criadoEm, -Math.floor(r() * 3));
      const carteirinha = patient.insuranceCard || digits(r, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
      let glosa: Glosa | undefined;
      if (plan.status === "glosada") {
        const motivo = pick(r, GLOSA_MOTIVOS);
        const item = pick(r, chosen);
        const dataRetorno = addDaysIso(criadoEm, 10 + Math.floor(r() * 10));
        const comRecurso = r() < 0.45;
        glosa = {
          codigo: motivo.codigo,
          descricao: motivo.descricao,
          valorCents: Math.round(item.valorUnitCents * item.quantidade * (0.4 + r() * 0.6)),
          itemDescricao: item.descricao,
          dataRetorno,
          recurso: comRecurso
            ? {
                justificativa: "Procedimento realizado conforme solicitação médica, anexamos a guia de autorização e o relatório do atendimento.",
                dataEnvio: addDaysIso(dataRetorno, 2 + Math.floor(r() * 4)),
                status: r() < 0.5 ? "aceito" : r() < 0.75 ? "em_analise" : "negado",
                valorRecursadoCents: Math.round(item.valorUnitCents * item.quantidade * (0.4 + r() * 0.6)),
                anexos: 1 + Math.floor(r() * 3),
              }
            : undefined,
        };
      }
      out.push({
        id: `guia-${String(seq).padStart(4, "0")}`,
        numero: `${TODAY.slice(0, 4)}${String(100300 + seq * 7).padStart(6, "0")}`,
        tipo,
        patientId: patient.id,
        professionalId: professional.id,
        insuranceId: insurance.id,
        carteirinha,
        validadeCarteirinha: addDaysIso(TODAY, 60 + Math.floor(r() * 400)),
        elegibilidade: r() < 0.84 ? "elegivel" : r() < 0.95 ? "nao_verificado" : "inelegivel",
        caraterAtendimento: r() < 0.9 ? "eletivo" : "urgencia",
        dataAtendimento,
        localId: pick(r, locations).id,
        senhaAutorizacao: tipo !== "consulta" && r() < 0.7 ? digits(r, 10) : undefined,
        status: plan.status,
        itens: chosen,
        valorCents,
        glosa,
        criadoEm,
        historico: buildHistorico(plan.status, criadoEm),
      });
    }
  }
  return out;
}

export const guias: Guia[] = makeGuias();

export function guiaById(id: string): Guia | undefined {
  return guias.find((g) => g.id === id);
}

// --- lotes -------------------------------------------------------------------

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function makeLotes(): Lote[] {
  const r = rng(913);
  const out: Lote[] = [];
  let seq = 100;
  for (const insurance of CONVENIOS) {
    const emLote = guias.filter((g) => g.insuranceId === insurance.id && g.status === "em_lote");
    const enviadas = guias.filter((g) => g.insuranceId === insurance.id && g.status === "enviada");
    const processadas = guias.filter((g) => g.insuranceId === insurance.id && (g.status === "paga" || g.status === "glosada"));

    for (const group of chunk(emLote, 6)) {
      if (!group.length) continue;
      seq += 1;
      const status: LoteStatus = r() < 0.5 ? "aberto" : "fechado";
      const lote: Lote = {
        id: `lote-${seq}`,
        numero: `${TODAY.slice(0, 4)}-${seq}`,
        insuranceId: insurance.id,
        status,
        guiaIds: group.map((g) => g.id),
        valorCents: group.reduce((s, g) => s + g.valorCents, 0),
        dataFechamento: status === "fechado" ? addDaysIso(TODAY, -Math.floor(r() * 3)) : undefined,
        conferido: status === "fechado" ? r() < 0.6 : false,
      };
      group.forEach((g) => (g.loteId = lote.id));
      out.push(lote);
    }
    for (const group of chunk(enviadas, 8)) {
      if (!group.length) continue;
      seq += 1;
      const dataEnvio = addDaysIso(TODAY, -(4 + Math.floor(r() * 15)));
      const lote: Lote = {
        id: `lote-${seq}`,
        numero: `${TODAY.slice(0, 4)}-${seq}`,
        insuranceId: insurance.id,
        status: "enviado",
        guiaIds: group.map((g) => g.id),
        valorCents: group.reduce((s, g) => s + g.valorCents, 0),
        dataFechamento: addDaysIso(dataEnvio, -1),
        dataEnvio,
        conferido: true,
      };
      group.forEach((g) => (g.loteId = lote.id));
      out.push(lote);
    }
    for (const group of chunk(processadas, 9)) {
      if (!group.length) continue;
      seq += 1;
      const dataEnvio = addDaysIso(TODAY, -(20 + Math.floor(r() * 40)));
      const lote: Lote = {
        id: `lote-${seq}`,
        numero: `${TODAY.slice(0, 4)}-${seq}`,
        insuranceId: insurance.id,
        status: "processado",
        guiaIds: group.map((g) => g.id),
        valorCents: group.reduce((s, g) => s + g.valorCents, 0),
        dataFechamento: addDaysIso(dataEnvio, -1),
        dataEnvio,
        conferido: true,
      };
      group.forEach((g) => (g.loteId = lote.id));
      out.push(lote);
    }
  }
  return out.sort((a, b) => b.numero.localeCompare(a.numero));
}

export const lotes: Lote[] = makeLotes();

export function loteById(id: string): Lote | undefined {
  return lotes.find((l) => l.id === id);
}

const CAMPOS_ERRO = ["Carteirinha do beneficiário", "Código do procedimento (TUSS)", "Data de atendimento", "Valor do procedimento", "Assinatura do beneficiário", "CBO do profissional solicitante"];

/** Resultado determinístico de validação do XML do lote (erros bloqueiam envio, avisos não). */
export function loteValidacao(lote: Lote): LoteValidacaoItem[] {
  const r = rng(Number(lote.id.replace(/\D/g, "")) * 7 + 3);
  const out: LoteValidacaoItem[] = [];
  const n = lote.status === "fechado" ? 1 + Math.floor(r() * 3) : lote.status === "aberto" ? 0 : Math.floor(r() * 2);
  for (let i = 0; i < n; i += 1) {
    const guiaId = pick(r, lote.guiaIds);
    const g = guiaById(guiaId);
    out.push({
      tipo: lote.status === "fechado" && i === 0 ? "erro" : r() < 0.4 ? "erro" : "aviso",
      guiaNumero: g?.numero ?? "—",
      campo: pick(r, CAMPOS_ERRO),
      mensagem: "Inconsistência encontrada na validação do XML TISS — confira o campo antes de reenviar.",
    });
  }
  return out;
}

// --- retorno e glosas ----------------------------------------------------------

export interface GlosaRow {
  guiaId: string;
  guiaNumero: string;
  insuranceId: string;
  patientId: string;
  itemDescricao: string;
  codigo: string;
  descricao: string;
  valorCents: number;
  dataRetorno: string;
  recurso?: Recurso;
}

export const glosasList: GlosaRow[] = guias
  .filter((g) => g.glosa)
  .map((g) => ({
    guiaId: g.id,
    guiaNumero: g.numero,
    insuranceId: g.insuranceId,
    patientId: g.patientId,
    itemDescricao: g.glosa!.itemDescricao,
    codigo: g.glosa!.codigo,
    descricao: g.glosa!.descricao,
    valorCents: g.glosa!.valorCents,
    dataRetorno: g.glosa!.dataRetorno,
    recurso: g.glosa!.recurso,
  }))
  .sort((a, b) => b.dataRetorno.localeCompare(a.dataRetorno));

// --- autorizações ----------------------------------------------------------------

const JUSTIFICATIVAS = [
  "Paciente com indicação clínica para investigação diagnóstica.",
  "Procedimento eletivo com histórico de acompanhamento prévio.",
  "Encaminhamento por suspeita clínica relatada em consulta.",
  "Continuidade de tratamento já iniciado na unidade.",
  "Procedimento de rotina conforme protocolo do convênio.",
];

function makeAutorizacoes(): Autorizacao[] {
  const r = rng(555);
  const out: Autorizacao[] = [];
  const candidatos = procedures.filter((p) => p.kind === "exame" || p.kind === "procedimento");
  const STATUS_POOL: AutorizacaoStatus[] = ["autorizada", "autorizada", "autorizada", "em_analise", "em_analise", "pendente_documentacao", "negada"];
  for (let i = 0; i < 26; i += 1) {
    const insurance = pick(r, CONVENIOS);
    const pool = patients.filter((p) => p.insuranceId === insurance.id);
    const patient = pool.length ? pick(r, pool) : pick(r, patients);
    const procedure = pick(r, candidatos);
    const status = pick(r, STATUS_POOL);
    const solicitadoEm = addDaysIso(TODAY, -Math.floor(r() * 30));
    out.push({
      id: `aut-${String(i + 1).padStart(3, "0")}`,
      patientId: patient.id,
      procedureId: procedure.id,
      insuranceId: insurance.id,
      justificativa: pick(r, JUSTIFICATIVAS),
      status,
      senha: status === "autorizada" ? digits(r, 10) : undefined,
      validade: status === "autorizada" ? addDaysIso(solicitadoEm, 30 + Math.floor(r() * 60)) : undefined,
      solicitadoEm,
    });
  }
  return out.sort((a, b) => b.solicitadoEm.localeCompare(a.solicitadoEm));
}

export const autorizacoes: Autorizacao[] = makeAutorizacoes();

// --- tabela de valores -------------------------------------------------------------

function makeValoresTabela(): ValorConvenio[] {
  const r = rng(271);
  const out: ValorConvenio[] = [];
  for (const insurance of CONVENIOS) {
    for (const proc of procedures) {
      const fator = 0.78 + r() * 0.42;
      out.push({
        insuranceId: insurance.id,
        procedureId: proc.id,
        valorContratadoCents: Math.round((proc.priceCents * fator) / 100) * 100,
        valorPraticadoCents: proc.priceCents,
      });
    }
  }
  return out;
}

export const valoresTabela: ValorConvenio[] = makeValoresTabela();

export function valorConvenio(insuranceId: string, procedureId: string): ValorConvenio | undefined {
  return valoresTabela.find((v) => v.insuranceId === insuranceId && v.procedureId === procedureId);
}

// --- prazos de envio ----------------------------------------------------------------

const DIA_LIMITE: Record<string, number> = { i1: 10, i2: 15, i3: 20, i4: 25, i5: 5 };

function nextDeadline(day: number): string {
  const d = new Date(`${TODAY}T12:00:00Z`);
  const todayDay = d.getUTCDate();
  let month = d.getUTCMonth();
  let year = d.getUTCFullYear();
  if (day < todayDay) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return new Date(Date.UTC(year, month, day, 12)).toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const da = new Date(`${a}T12:00:00Z`).getTime();
  const db = new Date(`${b}T12:00:00Z`).getTime();
  return Math.round((db - da) / 86400000);
}

export interface PrazoEnvio {
  insuranceId: string;
  dataLimite: string;
  diasRestantes: number;
}

export const prazosEnvio: PrazoEnvio[] = CONVENIOS.map((insurance) => {
  const dataLimite = nextDeadline(DIA_LIMITE[insurance.id] ?? 15);
  return { insuranceId: insurance.id, dataLimite, diasRestantes: daysBetween(TODAY, dataLimite) };
}).sort((a, b) => a.diasRestantes - b.diasRestantes);

// --- helpers de exibição -------------------------------------------------------------

export function guiaDisplayPatientName(g: Guia): string {
  return patientById(g.patientId)?.name ?? "—";
}

export function guiaDisplayProfessionalName(g: Guia): string {
  return professionalById(g.professionalId)?.name ?? "—";
}

export { patientById, professionalById, procedureById, insuranceName };
