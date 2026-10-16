/**
 * Dados fictícios do módulo de Atendimento: prontuário de consulta
 * (antecedentes, sinais vitais, CID-10, medicamentos, exames TUSS e modelos
 * de documento). Determinístico via rng — mesmo paciente, mesmo conteúdo.
 */

import { dateLong } from "@/lib/format";
import { TODAY, type Patient, rng } from "@/lib/mock/core";

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h || 1;
}

function pickN<T>(seed: number, pool: readonly T[], n: number): T[] {
  const r = rng(seed);
  const pool2 = [...pool];
  const out: T[] = [];
  const count = Math.min(n, pool2.length);
  for (let i = 0; i < count; i += 1) {
    const idx = Math.floor(r() * pool2.length);
    out.push(pool2.splice(idx, 1)[0]);
  }
  return out;
}

// --- contexto do paciente -----------------------------------------------------

const ANTECEDENTES_POOL = [
  "Hipertensão arterial sistêmica",
  "Diabetes mellitus tipo 2",
  "Asma brônquica",
  "Enxaqueca crônica",
  "Apendicectomia (2014)",
  "Tabagismo (ex-fumante há 5 anos)",
  "Dislipidemia",
  "Hipotireoidismo",
  "Depressão em tratamento",
];

const MEDICAMENTOS_USO_POOL = [
  "Losartana 50mg — 1x ao dia",
  "Metformina 850mg — 2x ao dia",
  "Levotiroxina 50mcg — em jejum",
  "Sinvastatina 20mg — à noite",
  "Anticoncepcional oral contínuo",
  "Sertralina 50mg — pela manhã",
  "Omeprazol 20mg — em jejum",
];

const PROBLEMAS_ATIVOS_POOL = [
  "Hipertensão não controlada",
  "Lombalgia crônica",
  "Transtorno de ansiedade",
  "Obesidade grau I",
  "Rinite alérgica",
  "Acompanhamento pré-natal",
  "Pós-operatório recente",
];

export function antecedentesFor(patientId: string): string[] {
  const h = hashStr(`${patientId}-ant`);
  if (h % 5 === 0) return ["Nenhum antecedente relevante relatado"];
  return pickN(h, ANTECEDENTES_POOL, 1 + (h % 3));
}

export function medicamentosEmUsoFor(patientId: string): string[] {
  const h = hashStr(`${patientId}-med`);
  if (h % 4 === 0) return ["Nenhum uso contínuo relatado"];
  return pickN(h, MEDICAMENTOS_USO_POOL, 1 + (h % 3));
}

export function problemasAtivosFor(patientId: string): string[] {
  const h = hashStr(`${patientId}-prob`);
  if (h % 4 === 0) return [];
  return pickN(h, PROBLEMAS_ATIVOS_POOL, 1 + (h % 2));
}

export interface VitalSeries {
  key: string;
  label: string;
  unit: string;
  values: number[];
}

/** Série curta de sinais vitais da triagem (pra sparkline) — determinística por paciente. */
export function vitaisFor(patientId: string): VitalSeries[] {
  const r = rng(hashStr(`${patientId}-vit`));
  const walk = (base: number, span: number, n = 6) => {
    const out: number[] = [];
    let v = base;
    for (let i = 0; i < n; i += 1) {
      v += (r() - 0.5) * span;
      out.push(Math.round(v));
    }
    return out;
  };
  return [
    { key: "pas", label: "PA sistólica", unit: "mmHg", values: walk(122, 10) },
    { key: "fc", label: "Frequência cardíaca", unit: "bpm", values: walk(76, 8) },
    { key: "temp", label: "Temperatura", unit: "°C", values: walk(36.5, 0.4).map((v) => Math.round(v * 10) / 10) },
    { key: "spo2", label: "Saturação O₂", unit: "%", values: walk(97, 1.5).map((v) => Math.min(100, v)) },
  ];
}

// --- CID-10 -------------------------------------------------------------------

export interface Cid10 {
  code: string;
  label: string;
}

export const CID10_LIST: Cid10[] = [
  { code: "I10", label: "Hipertensão essencial (primária)" },
  { code: "E11", label: "Diabetes mellitus não insulino-dependente" },
  { code: "J45", label: "Asma" },
  { code: "G43", label: "Enxaqueca" },
  { code: "M54.5", label: "Dor lombar baixa" },
  { code: "J06", label: "Infecção aguda das vias aéreas superiores" },
  { code: "N39.0", label: "Infecção do trato urinário" },
  { code: "F41.1", label: "Transtorno de ansiedade generalizada" },
  { code: "F32", label: "Episódio depressivo" },
  { code: "E66", label: "Obesidade" },
  { code: "K29", label: "Gastrite" },
  { code: "L23", label: "Dermatite de contato alérgica" },
  { code: "Z34", label: "Supervisão de gravidez normal" },
  { code: "O26", label: "Assistência à gestante por outros motivos" },
  { code: "M25.5", label: "Dor articular" },
  { code: "H52.1", label: "Miopia" },
  { code: "E03.9", label: "Hipotireoidismo não especificado" },
  { code: "R51", label: "Cefaleia" },
  { code: "B34.9", label: "Infecção viral não especificada" },
  { code: "I25.9", label: "Doença isquêmica crônica do coração" },
  { code: "Z00.0", label: "Exame médico geral" },
  { code: "Z23", label: "Necessidade de imunização" },
];

// --- prescrição -----------------------------------------------------------------

export interface Medicamento {
  id: string;
  name: string;
  forma: string;
  posologiaPadrao: string;
}

export const MEDICAMENTOS: Medicamento[] = [
  { id: "m1", name: "Amoxicilina 500mg", forma: "Cápsula", posologiaPadrao: "1 cápsula a cada 8 horas, por 7 dias" },
  { id: "m2", name: "Dipirona 500mg", forma: "Comprimido", posologiaPadrao: "1 comprimido a cada 6 horas, se dor" },
  { id: "m3", name: "Paracetamol 750mg", forma: "Comprimido", posologiaPadrao: "1 comprimido a cada 6 horas, se febre ou dor" },
  { id: "m4", name: "Ibuprofeno 600mg", forma: "Comprimido", posologiaPadrao: "1 comprimido a cada 8 horas, por 5 dias" },
  { id: "m5", name: "Omeprazol 20mg", forma: "Cápsula", posologiaPadrao: "1 cápsula em jejum, por 30 dias" },
  { id: "m6", name: "Losartana 50mg", forma: "Comprimido", posologiaPadrao: "1 comprimido pela manhã, uso contínuo" },
  { id: "m7", name: "Metformina 850mg", forma: "Comprimido", posologiaPadrao: "1 comprimido após café e jantar, uso contínuo" },
  { id: "m8", name: "Loratadina 10mg", forma: "Comprimido", posologiaPadrao: "1 comprimido ao dia, por 10 dias" },
  { id: "m9", name: "Azitromicina 500mg", forma: "Comprimido", posologiaPadrao: "1 comprimido ao dia, por 3 dias" },
  { id: "m10", name: "Predsim (prednisolona) 20mg/mL", forma: "Solução oral", posologiaPadrao: "0,5mL/kg pela manhã, por 5 dias" },
  { id: "m11", name: "Sertralina 50mg", forma: "Comprimido", posologiaPadrao: "1 comprimido pela manhã, uso contínuo" },
  { id: "m12", name: "Diazepam 5mg", forma: "Comprimido", posologiaPadrao: "1 comprimido à noite, se necessário" },
  { id: "m13", name: "Ácido fólico 5mg", forma: "Comprimido", posologiaPadrao: "1 comprimido ao dia" },
  { id: "m14", name: "Sulfato ferroso 40mg", forma: "Comprimido", posologiaPadrao: "1 comprimido ao dia, longe das refeições" },
];

export const MEDICAMENTOS_FAVORITOS = ["m2", "m3", "m1", "m5"];

export const VIAS_ADMINISTRACAO = ["Oral", "Intramuscular", "Intravenosa", "Tópica", "Sublingual", "Subcutânea", "Nasal"];

// --- exames (TUSS) ---------------------------------------------------------------

export interface ExameTuss {
  tuss: string;
  name: string;
}

export const EXAMES_TUSS: ExameTuss[] = [
  { tuss: "40302016", name: "Hemograma completo" },
  { tuss: "40311227", name: "Glicemia de jejum" },
  { tuss: "40316297", name: "Colesterol total e frações" },
  { tuss: "40311359", name: "Triglicerídeos" },
  { tuss: "40312190", name: "TSH" },
  { tuss: "40312212", name: "T4 livre" },
  { tuss: "40304361", name: "Ureia" },
  { tuss: "40302865", name: "Creatinina" },
  { tuss: "40306031", name: "Exame de urina tipo I (EAS)" },
  { tuss: "40305205", name: "Parasitológico de fezes" },
  { tuss: "40301563", name: "Beta-HCG quantitativo" },
  { tuss: "40901122", name: "Ultrassom de abdome total" },
  { tuss: "40901300", name: "Ultrassom obstétrico" },
  { tuss: "40101010", name: "Eletrocardiograma" },
  { tuss: "40901033", name: "Ecocardiograma" },
  { tuss: "41001066", name: "Raio-X de tórax" },
  { tuss: "40302970", name: "PCR (proteína C reativa)" },
  { tuss: "40311049", name: "Ácido úrico" },
];

export interface PainelExame {
  id: string;
  label: string;
  tuss: string[];
}

export const PAINEIS_EXAMES: PainelExame[] = [
  { id: "checkup", label: "Check-up básico", tuss: ["40302016", "40311227", "40316297", "40311359", "40304361", "40302865", "40306031"] },
  { id: "prenatal1", label: "Pré-natal 1º trimestre", tuss: ["40301563", "40302016", "40312190", "40306031", "40901300"] },
  { id: "cardio", label: "Avaliação cardiológica", tuss: ["40101010", "40901033", "40316297"] },
  { id: "tireoide", label: "Perfil tireoidiano", tuss: ["40312190", "40312212"] },
];

// --- modelos de evolução ----------------------------------------------------------

export interface EvolucaoTemplate {
  id: string;
  label: string;
  queixaPrincipal: string;
  hda: string;
  exameFisico: string;
  conduta: string;
}

export const EVOLUCAO_TEMPLATES: EvolucaoTemplate[] = [
  {
    id: "rotina",
    label: "Consulta de rotina",
    queixaPrincipal: "Paciente comparece para consulta de rotina, sem queixas no momento.",
    hda: "Assintomático. Mantém acompanhamento periódico conforme orientação prévia.",
    exameFisico: "Bom estado geral, corado, hidratado, eupneico. Ausculta cardíaca e pulmonar sem alterações. Abdome flácido e indolor.",
    conduta: "Orientações gerais de saúde e manutenção de hábitos. Retorno conforme rotina estabelecida.",
  },
  {
    id: "retorno",
    label: "Retorno",
    queixaPrincipal: "Paciente retorna para reavaliação do quadro acompanhado previamente.",
    hda: "Refere evolução favorável desde a última consulta, com boa adesão à conduta proposta.",
    exameFisico: "Exame físico sem alterações significativas em relação à última avaliação.",
    conduta: "Manter conduta atual. Reforçadas orientações. Agendado próximo retorno.",
  },
  {
    id: "inicial",
    label: "Avaliação inicial",
    queixaPrincipal: "Paciente comparece à primeira consulta relatando o motivo principal da procura.",
    hda: "História coletada detalhadamente nesta consulta, incluindo antecedentes pessoais e familiares.",
    exameFisico: "Exame físico geral realizado sem alterações relevantes ao momento.",
    conduta: "Solicitados exames complementares para investigação inicial. Retorno com resultados.",
  },
  {
    id: "agudo",
    label: "Queixa aguda",
    queixaPrincipal: "Paciente procura atendimento por sintomas de início recente.",
    hda: "Relata início dos sintomas nos últimos dias, nega sinais de alarme no momento.",
    exameFisico: "Sinais vitais estáveis. Exame físico dirigido à queixa sem achados de gravidade.",
    conduta: "Prescrição sintomática e orientações de sinais de alerta para retorno precoce, se necessário.",
  },
];

export function ultimaEvolucaoFor(patientId: string): EvolucaoTemplate {
  const h = hashStr(`${patientId}-evo`);
  return EVOLUCAO_TEMPLATES[h % EVOLUCAO_TEMPLATES.length];
}

// --- documentos -------------------------------------------------------------------

export function atestadoTemplate(patient: Patient, dias: number): string {
  return `Atesto, para os devidos fins, que o(a) paciente ${patient.name}, portador(a) do CPF ${patient.cpf}, foi atendido(a) nesta data e necessita de afastamento de suas atividades habituais por ${dias} dia(s) a partir de ${dateLong(TODAY)}.`;
}

export function declaracaoComparecimentoTemplate(patient: Patient, entrada: string, saida: string): string {
  return `Declaro, para os devidos fins, que o(a) paciente ${patient.name}, portador(a) do CPF ${patient.cpf}, compareceu a esta clínica em ${dateLong(TODAY)}, no período das ${entrada} às ${saida}, para fins de atendimento médico.`;
}

export function encaminhamentoTemplate(patient: Patient, especialidade: string, motivo: string): string {
  return `Encaminho o(a) paciente ${patient.name} para avaliação em ${especialidade}.\n\nMotivo do encaminhamento: ${motivo || "a ser detalhado"}.\n\nPermaneço à disposição para esclarecimentos adicionais.`;
}

export function relatorioTemplate(patient: Patient, conteudo: string): string {
  return `Relatório médico referente ao(à) paciente ${patient.name}, emitido em ${dateLong(TODAY)}.\n\n${conteudo || "Descreva aqui o histórico clínico relevante, evolução e condutas adotadas."}`;
}

// --- anexos -------------------------------------------------------------------------

export interface Anexo {
  id: string;
  name: string;
  kind: "imagem" | "pdf" | "documento";
  addedAt: string;
}

export function anexosIniciaisFor(patientId: string): Anexo[] {
  const h = hashStr(`${patientId}-anx`);
  if (h % 3 === 0) return [];
  const pool: Anexo[] = [
    { id: "a1", name: "exame-sangue-anterior.pdf", kind: "pdf", addedAt: "12/08/2026" },
    { id: "a2", name: "laudo-ultrassom.pdf", kind: "pdf", addedAt: "03/09/2026" },
    { id: "a3", name: "foto-lesao-pele.jpg", kind: "imagem", addedAt: "20/09/2026" },
    { id: "a4", name: "encaminhamento-cardiologia.pdf", kind: "documento", addedAt: "01/10/2026" },
  ];
  return pickN(h, pool, 1 + (h % 3));
}
