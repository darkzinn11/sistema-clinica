/**
 * Dados fictícios do módulo Pacientes: histórico clínico, evoluções,
 * prescrições, exames com valores de referência, arquivos e financeiro.
 * Determinístico por paciente (rng semeado pelo id) — mesma tela sempre
 * mostra os mesmos dados fictícios pro mesmo paciente.
 */

import { rng, professionals, procedures, insuranceName, patientById, TODAY } from "@/lib/mock/core";
import { addDaysIso } from "@/lib/format";

function pick<T>(r: () => number, arr: readonly T[]): T {
  return arr[Math.floor(r() * arr.length)];
}

function seedFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h || 1;
}

function rngFor(id: string, salt: number): () => number {
  return rng(seedFromId(id) + salt * 7919);
}

function minusDays(days: number): string {
  return addDaysIso(TODAY, -days);
}

// --- complementares (cadastro) --------------------------------------------------

export const CONTACT_PREF = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "ligacao", label: "Ligação" },
  { value: "sms", label: "SMS" },
  { value: "email", label: "E-mail" },
];

export const CIVIL_STATUS = ["Solteiro(a)", "Casado(a)", "União estável", "Divorciado(a)", "Viúvo(a)"];

export const EDUCATION_LEVELS = [
  "Fundamental incompleto",
  "Fundamental completo",
  "Médio incompleto",
  "Médio completo",
  "Superior incompleto",
  "Superior completo",
  "Pós-graduação",
];

export const PROFESSIONS = [
  "Professor(a)",
  "Comerciante",
  "Autônomo(a)",
  "Servidor(a) público(a)",
  "Estudante",
  "Aposentado(a)",
  "Motorista",
  "Enfermeiro(a)",
  "Engenheiro(a)",
  "Do lar",
  "Advogado(a)",
  "Vendedor(a)",
];

export const UFS = ["MA", "PI", "CE", "PA", "TO"];

export const CLINICAL_ALERT_TYPES = ["Alergia", "Condição crônica", "Uso contínuo", "Risco cirúrgico", "Outro"];

// --- endereço e complementares derivados (perfil > Dados) ------------------------

const STREETS = ["Rua das Flores", "Avenida Litorânea", "Rua dos Pinheiros", "Travessa São José", "Avenida Jerônimo de Albuquerque", "Rua Grande", "Rua do Sol", "Avenida Colares Moreira"];
const NEIGHBORHOODS = ["Centro", "Renascença", "Calhau", "Cohama", "Turu", "Ponta do Farol", "Cohab", "Olho d'Água"];

export interface PatientAddress {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export function addressForPatient(id: string): PatientAddress {
  const patient = patientById(id);
  const r = rngFor(id, 9);
  return {
    cep: `65${String(Math.floor(r() * 900) + 100)}-${String(Math.floor(r() * 900) + 100)}`,
    logradouro: pick(r, STREETS),
    numero: String(Math.floor(r() * 1800) + 10),
    complemento: r() < 0.4 ? `Apto ${Math.floor(r() * 400) + 101}` : "",
    bairro: pick(r, NEIGHBORHOODS),
    cidade: patient?.city ?? "São Luís",
    uf: "MA",
  };
}

export interface PatientComplementary {
  profissao: string;
  estadoCivil: string;
  escolaridade: string;
}

export function complementaryInfoForPatient(id: string): PatientComplementary {
  const r = rngFor(id, 10);
  return {
    profissao: pick(r, PROFESSIONS),
    estadoCivil: pick(r, CIVIL_STATUS),
    escolaridade: pick(r, EDUCATION_LEVELS),
  };
}

// --- propostas (financeiro) --------------------------------------------------------

export interface Proposal {
  id: string;
  patientId: string;
  title: string;
  date: string;
  amountCents: number;
  status: "aguardando" | "aprovada" | "recusada";
}

const PROPOSAL_TITLES = ["Pacote de 10 sessões de fisioterapia", "Check-up anual completo", "Tratamento dermatológico — 3 sessões", "Plano de acompanhamento nutricional"];

export function proposalsForPatient(id: string, count = 1): Proposal[] {
  const r = rngFor(id, 11);
  const out: Proposal[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push({
      id: `${id}-prop-${i + 1}`,
      patientId: id,
      title: pick(r, PROPOSAL_TITLES),
      date: minusDays(5 + Math.floor(r() * 25)),
      amountCents: 30000 + Math.floor(r() * 200000),
      status: r() < 0.5 ? "aguardando" : r() < 0.8 ? "aprovada" : "recusada",
    });
  }
  return out;
}

// --- sinais vitais ---------------------------------------------------------------

export interface VitalPoint {
  label: string;
  date: string;
  sistolica: number;
  diastolica: number;
}

export function vitalsForPatient(id: string): VitalPoint[] {
  const r = rngFor(id, 1);
  const baseSys = 112 + Math.floor(r() * 20);
  const baseDia = 70 + Math.floor(r() * 12);
  const points: VitalPoint[] = [];
  const visits = 8;
  for (let i = visits - 1; i >= 0; i -= 1) {
    const daysAgo = i * (18 + Math.floor(r() * 10));
    const drift = Math.round((r() - 0.5) * 10);
    points.push({
      label: addDaysIso(TODAY, -daysAgo).slice(5).split("-").reverse().join("/"),
      date: minusDays(daysAgo),
      sistolica: Math.max(96, baseSys + drift),
      diastolica: Math.max(60, baseDia + Math.round(drift * 0.6)),
    });
  }
  return points;
}

// --- prontuário (evolução, anamnese, exame, prescrição, atestado) ---------------

export type ClinicalEntryType = "evolucao" | "anamnese" | "exame" | "prescricao" | "atestado";

export interface ClinicalEntry {
  id: string;
  patientId: string;
  type: ClinicalEntryType;
  date: string;
  time: string;
  professionalId: string;
  title: string;
  summary: string;
  body: string;
}

const EVOLUTION_SNIPPETS = [
  "Paciente relata melhora do quadro desde a última consulta. Mantém uso regular da medicação prescrita, sem efeitos colaterais relatados. Exame físico sem alterações significativas.",
  "Refere dor leve a moderada, intermitente, sem irradiação. Nega febre ou outros sintomas sistêmicos. Orientado quanto a sinais de alarme e retorno caso piora.",
  "Comparece para retorno de rotina. Sinais vitais estáveis. Solicitados exames complementares de controle. Reforçadas orientações sobre dieta e atividade física.",
  "Boa adesão ao tratamento. Paciente e familiares orientados sobre a evolução esperada. Ajuste de dose da medicação em uso conforme resposta clínica.",
  "Quadro estável, sem queixas novas. Revisados exames laboratoriais recentes, dentro da normalidade. Mantida conduta atual, retorno em 60 dias.",
];

const ANAMNESE_SNIPPETS = [
  "Paciente nega comorbidades prévias relevantes. Histórico familiar positivo para hipertensão. Nega tabagismo, etilismo social ocasional.",
  "Primeira consulta na especialidade. Relata sintomas há cerca de 3 semanas, de início gradual. Já fez uso de medicação sintomática por conta própria, sem melhora completa.",
  "Antecedentes pessoais sem particularidades. Refere alergia medicamentosa conhecida (ver alertas do cadastro). Uso de anticoncepcional oral contínuo.",
];

const PRESCRIPTION_NOTES = [
  "Retornar em caso de piora ou surgimento de novos sintomas.",
  "Tomar preferencialmente após as refeições.",
  "Evitar exposição solar durante o uso da medicação.",
  "Suspender em caso de reação alérgica e procurar atendimento.",
];

function titleFor(type: ClinicalEntryType, procName?: string): string {
  switch (type) {
    case "evolucao":
      return "Evolução clínica";
    case "anamnese":
      return "Anamnese";
    case "exame":
      return `Resultado de exame${procName ? ` — ${procName}` : ""}`;
    case "prescricao":
      return "Prescrição médica";
    case "atestado":
      return "Atestado médico";
  }
}

export function clinicalHistoryForPatient(id: string, count = 9): ClinicalEntry[] {
  const r = rngFor(id, 2);
  const specialtyProcs = procedures.filter((p) => p.kind === "exame");
  const entries: ClinicalEntry[] = [];
  const weights: ClinicalEntryType[] = ["evolucao", "evolucao", "evolucao", "anamnese", "exame", "prescricao", "atestado"];
  let daysAgo = 4 + Math.floor(r() * 10);
  for (let i = 0; i < count; i += 1) {
    const type = i === count - 1 ? "anamnese" : pick(r, weights);
    const prof = pick(r, professionals);
    const proc = pick(r, specialtyProcs);
    const body =
      type === "evolucao"
        ? pick(r, EVOLUTION_SNIPPETS)
        : type === "anamnese"
          ? pick(r, ANAMNESE_SNIPPETS)
          : type === "exame"
            ? `Resultado revisado em consulta. ${pick(r, EVOLUTION_SNIPPETS)}`
            : type === "prescricao"
              ? `Medicação prescrita conforme avaliação clínica. ${pick(r, PRESCRIPTION_NOTES)}`
              : "Atesto, para os devidos fins, que o(a) paciente esteve sob avaliação médica nesta data, necessitando de afastamento das atividades habituais.";
    entries.push({
      id: `${id}-pr-${i + 1}`,
      patientId: id,
      type,
      date: minusDays(daysAgo),
      time: `${8 + Math.floor(r() * 10)}:${pick(r, ["00", "15", "30", "45"])}`,
      professionalId: prof.id,
      title: titleFor(type, type === "exame" ? proc.name : undefined),
      summary: body.slice(0, 84).trimEnd() + (body.length > 84 ? "…" : ""),
      body,
    });
    daysAgo += 6 + Math.floor(r() * 24);
  }
  return entries.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
}

// --- prescrições com medicamentos ------------------------------------------------

export interface Medication {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  date: string;
  professionalId: string;
  medications: Medication[];
  status: "ativa" | "expirada" | "renovada";
}

const MEDICATIONS: Medication[] = [
  { name: "Losartana potássica 50 mg", dose: "1 comprimido", frequency: "1x ao dia, pela manhã", duration: "Uso contínuo" },
  { name: "Metformina 850 mg", dose: "1 comprimido", frequency: "2x ao dia, após refeições", duration: "Uso contínuo" },
  { name: "Amoxicilina 500 mg", dose: "1 cápsula", frequency: "de 8 em 8 horas", duration: "7 dias" },
  { name: "Dipirona sódica 500 mg", dose: "1 comprimido", frequency: "até de 6 em 6 horas, se dor", duration: "5 dias" },
  { name: "Ibuprofeno 400 mg", dose: "1 comprimido", frequency: "de 8 em 8 horas, após refeições", duration: "5 dias" },
  { name: "Omeprazol 20 mg", dose: "1 cápsula", frequency: "1x ao dia, em jejum", duration: "30 dias" },
  { name: "Loratadina 10 mg", dose: "1 comprimido", frequency: "1x ao dia", duration: "10 dias" },
  { name: "Sertralina 50 mg", dose: "1 comprimido", frequency: "1x ao dia, pela manhã", duration: "Uso contínuo" },
  { name: "Ácido fólico 5 mg", dose: "1 comprimido", frequency: "1x ao dia", duration: "Uso contínuo" },
  { name: "Predsim (prednisolona) 20mg/mL", dose: "0,5 mL", frequency: "1x ao dia", duration: "3 dias" },
];

export function prescriptionsForPatient(id: string, count = 4): Prescription[] {
  const r = rngFor(id, 3);
  const out: Prescription[] = [];
  let daysAgo = 10 + Math.floor(r() * 15);
  for (let i = 0; i < count; i += 1) {
    const n = 1 + Math.floor(r() * 3);
    const meds: Medication[] = [];
    const used = new Set<number>();
    for (let m = 0; m < n; m += 1) {
      let idx = Math.floor(r() * MEDICATIONS.length);
      while (used.has(idx)) idx = (idx + 1) % MEDICATIONS.length;
      used.add(idx);
      meds.push(MEDICATIONS[idx]);
    }
    out.push({
      id: `${id}-rx-${i + 1}`,
      patientId: id,
      date: minusDays(daysAgo),
      professionalId: pick(r, professionals).id,
      medications: meds,
      status: i === 0 ? "ativa" : r() < 0.3 ? "renovada" : "expirada",
    });
    daysAgo += 20 + Math.floor(r() * 40);
  }
  return out;
}

// --- exames: pedidos + resultados com referência --------------------------------

export interface ExamResultRow {
  name: string;
  value: number;
  unit: string;
  refMin: number;
  refMax: number;
}

export interface ExamOrder {
  id: string;
  patientId: string;
  procedureId: string;
  professionalId: string;
  status: "solicitado" | "coletado" | "resultado_disponivel";
  requestedAt: string;
  collectedAt?: string;
  resultAt?: string;
  results?: ExamResultRow[];
}

const LAB_PANELS: { name: string; unit: string; min: number; max: number; variance: number }[] = [
  { name: "Glicemia de jejum", unit: "mg/dL", min: 70, max: 99, variance: 40 },
  { name: "Colesterol total", unit: "mg/dL", min: 0, max: 190, variance: 60 },
  { name: "HDL", unit: "mg/dL", min: 40, max: 60, variance: 15 },
  { name: "LDL", unit: "mg/dL", min: 0, max: 130, variance: 40 },
  { name: "Triglicerídeos", unit: "mg/dL", min: 0, max: 150, variance: 80 },
  { name: "TSH", unit: "µUI/mL", min: 0.4, max: 4.0, variance: 2 },
  { name: "Hemoglobina", unit: "g/dL", min: 12, max: 16, variance: 2.5 },
  { name: "Creatinina", unit: "mg/dL", min: 0.6, max: 1.3, variance: 0.4 },
];

export function examOrdersForPatient(id: string, count = 5): ExamOrder[] {
  const r = rngFor(id, 4);
  const examProcs = procedures.filter((p) => p.kind === "exame");
  const out: ExamOrder[] = [];
  let daysAgo = 3 + Math.floor(r() * 20);
  for (let i = 0; i < count; i += 1) {
    const proc = pick(r, examProcs);
    const statusRoll = i === 0 ? r() * 0.6 : r();
    const status: ExamOrder["status"] = statusRoll < 0.25 ? "solicitado" : statusRoll < 0.5 ? "coletado" : "resultado_disponivel";
    const requestedAt = minusDays(daysAgo);
    const collectedAt = status !== "solicitado" ? minusDays(Math.max(0, daysAgo - 2)) : undefined;
    const resultAt = status === "resultado_disponivel" ? minusDays(Math.max(0, daysAgo - 4)) : undefined;
    let results: ExamResultRow[] | undefined;
    if (status === "resultado_disponivel") {
      const n = 2 + Math.floor(r() * 3);
      const panel: ExamResultRow[] = [];
      const used = new Set<number>();
      for (let k = 0; k < n; k += 1) {
        let idx = Math.floor(r() * LAB_PANELS.length);
        while (used.has(idx)) idx = (idx + 1) % LAB_PANELS.length;
        used.add(idx);
        const base = LAB_PANELS[idx];
        const outOfRangeRoll = r();
        const mid = (base.min + base.max) / 2;
        const value = outOfRangeRoll < 0.28 ? base.max + base.variance * r() * 0.6 + 1 : mid + (r() - 0.5) * (base.max - base.min) * 0.7;
        panel.push({ name: base.name, unit: base.unit, refMin: base.min, refMax: base.max, value: Math.round(value * 10) / 10 });
      }
      results = panel;
    }
    out.push({
      id: `${id}-ex-${i + 1}`,
      patientId: id,
      procedureId: proc.id,
      professionalId: pick(r, professionals).id,
      status,
      requestedAt,
      collectedAt,
      resultAt,
      results,
    });
    daysAgo += 15 + Math.floor(r() * 35);
  }
  return out;
}

// --- documentos (atestados, declarações, laudos, encaminhamentos) ---------------

export interface PatientDocument {
  id: string;
  patientId: string;
  type: "atestado" | "declaracao" | "laudo" | "encaminhamento";
  title: string;
  date: string;
  professionalId: string;
  status: "assinado" | "rascunho";
}

const DOC_TITLES: Record<PatientDocument["type"], string[]> = {
  atestado: ["Atestado médico — 1 dia", "Atestado médico — 2 dias", "Atestado médico — acompanhante"],
  declaracao: ["Declaração de comparecimento", "Declaração de saúde"],
  laudo: ["Laudo de ultrassonografia", "Laudo de eletrocardiograma", "Laudo médico descritivo"],
  encaminhamento: ["Encaminhamento para cardiologia", "Encaminhamento para fisioterapia", "Encaminhamento para exame de imagem"],
};

export function documentsForPatient(id: string, count = 5): PatientDocument[] {
  const r = rngFor(id, 5);
  const types: PatientDocument["type"][] = ["atestado", "declaracao", "laudo", "encaminhamento"];
  const out: PatientDocument[] = [];
  let daysAgo = 5 + Math.floor(r() * 20);
  for (let i = 0; i < count; i += 1) {
    const type = pick(r, types);
    out.push({
      id: `${id}-doc-${i + 1}`,
      patientId: id,
      type,
      title: pick(r, DOC_TITLES[type]),
      date: minusDays(daysAgo),
      professionalId: pick(r, professionals).id,
      status: r() < 0.78 ? "assinado" : "rascunho",
    });
    daysAgo += 12 + Math.floor(r() * 30);
  }
  return out;
}

// --- arquivos (imagens, pdfs, documentos) ---------------------------------------

export interface PatientFile {
  id: string;
  patientId: string;
  name: string;
  kind: "imagem" | "pdf" | "planilha" | "outro";
  sizeKb: number;
  uploadedAt: string;
}

const FILE_NAMES: { name: string; kind: PatientFile["kind"] }[] = [
  { name: "Resultado US abdome.pdf", kind: "pdf" },
  { name: "Foto da lesão.jpg", kind: "imagem" },
  { name: "Encaminhamento cardiologia.pdf", kind: "pdf" },
  { name: "Exame de sangue - laboratório.pdf", kind: "pdf" },
  { name: "Raio-x tórax.jpg", kind: "imagem" },
  { name: "Carteirinha do convênio.jpg", kind: "imagem" },
  { name: "Receituário anterior.pdf", kind: "pdf" },
  { name: "Planilha de evolução de peso.xlsx", kind: "planilha" },
];

export function filesForPatient(id: string, count = 4): PatientFile[] {
  const r = rngFor(id, 6);
  const out: PatientFile[] = [];
  let daysAgo = 8 + Math.floor(r() * 20);
  const used = new Set<number>();
  for (let i = 0; i < count; i += 1) {
    let idx = Math.floor(r() * FILE_NAMES.length);
    while (used.has(idx) && used.size < FILE_NAMES.length) idx = (idx + 1) % FILE_NAMES.length;
    used.add(idx);
    const f = FILE_NAMES[idx];
    out.push({
      id: `${id}-file-${i + 1}`,
      patientId: id,
      name: f.name,
      kind: f.kind,
      sizeKb: 80 + Math.floor(r() * 4000),
      uploadedAt: minusDays(daysAgo),
    });
    daysAgo += 10 + Math.floor(r() * 25);
  }
  return out;
}

// --- financeiro: lançamentos, recibos, propostas --------------------------------

export interface FinancialEntry {
  id: string;
  patientId: string;
  date: string;
  description: string;
  kind: "cobranca" | "pagamento" | "estorno";
  amountCents: number;
  status: "pago" | "pendente" | "atrasado";
  method?: string;
}

const METHODS = ["Cartão de crédito", "Pix", "Dinheiro", "Cartão de débito", "Boleto"];

export function financialEntriesForPatient(id: string, count = 6): FinancialEntry[] {
  const r = rngFor(id, 7);
  const patient = patientById(id);
  const out: FinancialEntry[] = [];
  let daysAgo = 3 + Math.floor(r() * 20);
  for (let i = 0; i < count; i += 1) {
    const proc = pick(r, procedures);
    const isPending = patient && patient.balanceCents > 0 && i === 0;
    const status: FinancialEntry["status"] = isPending ? (r() < 0.5 ? "atrasado" : "pendente") : "pago";
    out.push({
      id: `${id}-fin-${i + 1}`,
      patientId: id,
      date: minusDays(daysAgo),
      description: proc.name,
      kind: "cobranca",
      amountCents: proc.priceCents || 15000 + Math.floor(r() * 10000),
      status,
      method: status === "pago" ? pick(r, METHODS) : undefined,
    });
    daysAgo += 12 + Math.floor(r() * 35);
  }
  return out;
}

// --- convênios / coberturas -------------------------------------------------------

export interface CoveragePlan {
  insuranceId: string;
  insuranceLabel: string;
  card: string;
  plan: string;
  validUntil: string;
  holder: string;
  eligibility: "elegivel" | "pendente" | "inelegivel";
}

const PLAN_NAMES = ["Essencial", "Standard", "Premium", "Família", "Empresarial"];

export function coveragesForPatient(id: string): CoveragePlan[] {
  const patient = patientById(id);
  if (!patient || patient.insuranceId === "i0") return [];
  const r = rngFor(id, 8);
  return [
    {
      insuranceId: patient.insuranceId,
      insuranceLabel: insuranceName(patient.insuranceId),
      card: patient.insuranceCard || "—",
      plan: pick(r, PLAN_NAMES),
      validUntil: addDaysIso(TODAY, 30 + Math.floor(r() * 500)),
      holder: r() < 0.82 ? patient.name : "Titular do plano",
      eligibility: r() < 0.08 ? "pendente" : "elegivel",
    },
  ];
}

// --- duplicados (cadastro) --------------------------------------------------------

export function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

export function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}
