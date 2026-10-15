/**
 * Dados fictícios compartilhados pelo protótipo de telas. NENHUM dado real —
 * nomes, CPFs e telefones são inventados/gerados (ver nota de privacidade em
 * replica/recon.md). Determinístico: mesma entrada, mesma saída, pra telas
 * baterem entre si e não dar diferença entre servidor e navegador.
 *
 * Quando o backend for ligado, cada tela troca estas importações pelas
 * funções equivalentes de src/lib/backend/store.ts.
 */

import type { AppointmentStatus } from "@/lib/status";

/** "Hoje" fixo do protótipo — evita data diferente entre servidor e cliente. */
export const TODAY = "2026-10-13";
export const NOW_TIME = "10:24";

// --- gerador pseudoaleatório determinístico ---------------------------------

export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function pick<T>(r: () => number, arr: readonly T[]): T {
  return arr[Math.floor(r() * arr.length)];
}

// --- clínica e usuário --------------------------------------------------------

export const clinic = {
  name: "Clínica Vida Plena",
  cnpj: "12.345.678/0001-90",
  phone: "(98) 3200-1000",
  units: [
    { id: "u1", name: "Unidade Centro" },
    { id: "u2", name: "Unidade Renascença" },
  ],
};

export const currentUser = {
  name: "Igor Leonardo",
  email: "igor.leonardo@vidaplena.com.br",
  role: "Recepção",
};

// --- catálogos -----------------------------------------------------------------

export interface Professional {
  id: string;
  name: string;
  specialty: string;
  council: string;
  /** Índice da cor de série (0–7) usada na agenda pra identificar o profissional. */
  color: number;
  startHour: number;
  endHour: number;
  slotMin: number;
}

export const professionals: Professional[] = [
  { id: "p1", name: "Dra. Camila Esteves", specialty: "Ultrassonografia", council: "CRM-MA 12345", color: 0, startHour: 8, endHour: 17, slotMin: 20 },
  { id: "p2", name: "Dra. Beatriz Nogueira", specialty: "Ginecologia", council: "CRM-MA 22341", color: 1, startHour: 8, endHour: 12, slotMin: 30 },
  { id: "p3", name: "Dr. Rafael Montenegro", specialty: "Psicologia", council: "CRP-22 04512", color: 2, startHour: 13, endHour: 19, slotMin: 50 },
  { id: "p4", name: "Dr. Henrique Lacerda", specialty: "Cardiologia", council: "CRM-MA 18877", color: 3, startHour: 8, endHour: 14, slotMin: 30 },
  { id: "p5", name: "Dra. Larissa Moura", specialty: "Dermatologia", council: "CRM-MA 30219", color: 4, startHour: 9, endHour: 18, slotMin: 30 },
  { id: "p6", name: "Dr. Thiago Barreto", specialty: "Ortopedia", council: "CRM-MA 27104", color: 5, startHour: 13, endHour: 18, slotMin: 20 },
  { id: "p7", name: "Dra. Fernanda Quintela", specialty: "Pediatria", council: "CRM-MA 19950", color: 6, startHour: 8, endHour: 13, slotMin: 30 },
  { id: "p8", name: "Dr. Gustavo Pimentel", specialty: "Clínica geral", council: "CRM-MA 31560", color: 7, startHour: 7, endHour: 13, slotMin: 20 },
];

export interface Procedure {
  id: string;
  name: string;
  tuss: string;
  specialty: string;
  durationMin: number;
  priceCents: number;
  kind: "consulta" | "exame" | "procedimento" | "sessao";
}

export const procedures: Procedure[] = [
  { id: "pr1", name: "Consulta clínica", tuss: "10101012", specialty: "Clínica geral", durationMin: 20, priceCents: 15000, kind: "consulta" },
  { id: "pr2", name: "Consulta ginecológica", tuss: "10101012", specialty: "Ginecologia", durationMin: 30, priceCents: 22000, kind: "consulta" },
  { id: "pr3", name: "Consulta cardiológica", tuss: "10101012", specialty: "Cardiologia", durationMin: 30, priceCents: 28000, kind: "consulta" },
  { id: "pr4", name: "Consulta dermatológica", tuss: "10101012", specialty: "Dermatologia", durationMin: 30, priceCents: 25000, kind: "consulta" },
  { id: "pr5", name: "Consulta pediátrica", tuss: "10101012", specialty: "Pediatria", durationMin: 30, priceCents: 20000, kind: "consulta" },
  { id: "pr6", name: "Consulta ortopédica", tuss: "10101012", specialty: "Ortopedia", durationMin: 20, priceCents: 24000, kind: "consulta" },
  { id: "pr7", name: "Sessão de psicoterapia", tuss: "50000470", specialty: "Psicologia", durationMin: 50, priceCents: 18000, kind: "sessao" },
  { id: "pr8", name: "US abdome total", tuss: "40901122", specialty: "Ultrassonografia", durationMin: 20, priceCents: 16000, kind: "exame" },
  { id: "pr9", name: "US obstétrico", tuss: "40901300", specialty: "Ultrassonografia", durationMin: 20, priceCents: 19000, kind: "exame" },
  { id: "pr10", name: "US morfológico 1º trimestre", tuss: "40901319", specialty: "Ultrassonografia", durationMin: 30, priceCents: 30000, kind: "exame" },
  { id: "pr11", name: "US transvaginal", tuss: "40901386", specialty: "Ultrassonografia", durationMin: 20, priceCents: 17000, kind: "exame" },
  { id: "pr12", name: "US mamas e axilas", tuss: "40901173", specialty: "Ultrassonografia", durationMin: 20, priceCents: 19000, kind: "exame" },
  { id: "pr13", name: "Eletrocardiograma", tuss: "40101010", specialty: "Cardiologia", durationMin: 15, priceCents: 9000, kind: "exame" },
  { id: "pr14", name: "Ecocardiograma", tuss: "40901033", specialty: "Cardiologia", durationMin: 30, priceCents: 35000, kind: "exame" },
  { id: "pr15", name: "Holter 24h", tuss: "20102038", specialty: "Cardiologia", durationMin: 15, priceCents: 22000, kind: "exame" },
  { id: "pr16", name: "MAPA 24h", tuss: "20102062", specialty: "Cardiologia", durationMin: 15, priceCents: 20000, kind: "exame" },
  { id: "pr17", name: "Preventivo (Papanicolau)", tuss: "40601110", specialty: "Ginecologia", durationMin: 20, priceCents: 12000, kind: "procedimento" },
  { id: "pr18", name: "Crioterapia de lesão", tuss: "30101131", specialty: "Dermatologia", durationMin: 20, priceCents: 21000, kind: "procedimento" },
  { id: "pr19", name: "Infiltração articular", tuss: "30724040", specialty: "Ortopedia", durationMin: 20, priceCents: 32000, kind: "procedimento" },
  { id: "pr20", name: "Retorno", tuss: "10101039", specialty: "Clínica geral", durationMin: 15, priceCents: 0, kind: "consulta" },
];

export const insurances = [
  { id: "i0", name: "Particular", ans: "—" },
  { id: "i1", name: "Saúde Bem Estar", ans: "41.234-5" },
  { id: "i2", name: "Vida Plena Saúde", ans: "38.112-0" },
  { id: "i3", name: "UniCuidar", ans: "35.998-1" },
  { id: "i4", name: "MedPrime", ans: "40.551-7" },
  { id: "i5", name: "Previsa Saúde", ans: "33.007-4" },
];

export const locations = [
  { id: "l1", name: "Consultório 1" },
  { id: "l2", name: "Consultório 2" },
  { id: "l3", name: "Consultório 3" },
  { id: "l4", name: "Consultório 4" },
  { id: "l5", name: "Sala de Ultrassom" },
  { id: "l6", name: "Sala de Exames Cardiológicos" },
  { id: "l7", name: "Sala de Procedimentos" },
  { id: "l8", name: "Sala de Psicologia" },
];

export const equipment = [
  { id: "e1", name: "Aparelho de ultrassom", location: "l5" },
  { id: "e2", name: "Eletrocardiógrafo", location: "l6" },
  { id: "e3", name: "Ecocardiógrafo", location: "l6" },
  { id: "e4", name: "Holter (3 unidades)", location: "l6" },
  { id: "e5", name: "Aparelho de crioterapia", location: "l7" },
];

/** Sala padrão de cada profissional (pra agenda por sala). */
export const professionalLocation: Record<string, string> = {
  p1: "l5", p2: "l1", p3: "l8", p4: "l6", p5: "l7", p6: "l2", p7: "l3", p8: "l4",
};

export const leadSources = ["Indicação", "Google", "Instagram", "WhatsApp", "Convênio", "Panfleto", "Retorno espontâneo"];

// --- pacientes ------------------------------------------------------------------

const FIRST_F = ["Marina", "Helena", "Larissa", "Juliana", "Camila", "Beatriz", "Patrícia", "Renata", "Aline", "Sofia", "Gabriela", "Luana", "Isabela", "Vanessa", "Tatiane", "Rafaela", "Clara", "Yasmin", "Natália", "Débora", "Lívia", "Bianca", "Priscila", "Elaine"];
const FIRST_M = ["João Victor", "Eduardo", "Rafael", "Lucas", "Mateus", "Pedro", "Gabriel", "Bruno", "Diego", "Felipe", "Rodrigo", "Thiago", "Caio", "André", "Vinícius", "Marcelo", "Leonardo", "Samuel", "Igor", "Otávio", "Daniel", "Henrique", "Arthur", "Renan"];
const LAST = ["Albuquerque", "Barbosa", "Castro", "Dutra", "Esteves", "Fontes", "Gonçalves", "Holanda", "Lacerda", "Matos", "Nogueira", "Oliveira", "Pereira", "Queiroz", "Ribeiro", "Sousa", "Teixeira", "Vasconcelos", "Moreira", "Cavalcante", "Brandão", "Furtado", "Lima", "Carvalho", "Rocha", "Siqueira"];

export interface Patient {
  id: string;
  name: string;
  sex: "F" | "M";
  birthDate: string;
  cpf: string;
  phone: string;
  email: string;
  insuranceId: string;
  insuranceCard: string;
  leadSource: string;
  createdAt: string;
  lastVisit?: string;
  nextVisit?: string;
  tags: string[];
  /** Alertas clínicos que precisam aparecer em destaque (alergias etc.). */
  alerts: string[];
  balanceCents: number;
  city: string;
}

function digits(r: () => number, n: number) {
  let s = "";
  for (let i = 0; i < n; i += 1) s += Math.floor(r() * 10);
  return s;
}

function makePatients(): Patient[] {
  const r = rng(42);
  const out: Patient[] = [];
  const TAGS = ["Gestante", "Idoso", "Retorno", "VIP", "Inadimplente", "PCD", "Pós-operatório"];
  const ALERTS = ["Alergia a dipirona", "Alergia a penicilina", "Hipertenso", "Diabético tipo 2", "Marca-passo", "Alergia a látex"];
  for (let i = 0; i < 64; i += 1) {
    const sex: "F" | "M" = r() < 0.58 ? "F" : "M";
    const first = sex === "F" ? pick(r, FIRST_F) : pick(r, FIRST_M);
    const last1 = pick(r, LAST);
    let last2 = pick(r, LAST);
    if (last2 === last1) last2 = LAST[(LAST.indexOf(last1) + 3) % LAST.length];
    const name = `${first} ${last1} ${last2}`;
    const year = 1948 + Math.floor(r() * 70);
    const month = 1 + Math.floor(r() * 12);
    const day = 1 + Math.floor(r() * 28);
    const birthDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const c = digits(r, 11);
    const cpf = `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}`;
    const phone = `(98) 9${digits(r, 4)}-${digits(r, 4)}`;
    const ins = r() < 0.38 ? "i0" : pick(r, insurances.slice(1)).id;
    const createdMonth = 1 + Math.floor(r() * 9);
    const tags: string[] = [];
    if (r() < 0.25) tags.push(pick(r, TAGS));
    const alerts: string[] = [];
    if (r() < 0.22) alerts.push(pick(r, ALERTS));
    const lastDays = Math.floor(r() * 200) + 1;
    out.push({
      id: `pac-${String(i + 1).padStart(3, "0")}`,
      name,
      sex,
      birthDate,
      cpf,
      phone,
      email: `${first.split(" ")[0].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}.${last1.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}@email.com`,
      insuranceId: ins,
      insuranceCard: ins === "i0" ? "" : digits(r, 16).replace(/(\d{4})(?=\d)/g, "$1 "),
      leadSource: pick(r, leadSources),
      createdAt: `2026-${String(createdMonth).padStart(2, "0")}-${String(1 + Math.floor(r() * 27)).padStart(2, "0")}`,
      lastVisit: lastDays < 180 ? isoMinusDays(TODAY, lastDays) : undefined,
      tags,
      alerts,
      balanceCents: r() < 0.12 ? Math.round(r() * 40000) : 0,
      city: pick(r, ["São Luís", "São Luís", "São Luís", "São José de Ribamar", "Paço do Lumiar", "Raposa"]),
    });
  }
  return out;
}

function isoMinusDays(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export const patients: Patient[] = makePatients();

export function patientById(id: string): Patient | undefined {
  return patients.find((p) => p.id === id);
}

export function professionalById(id: string): Professional | undefined {
  return professionals.find((p) => p.id === id);
}

export function procedureById(id: string): Procedure | undefined {
  return procedures.find((p) => p.id === id);
}

export function insuranceName(id: string): string {
  return insurances.find((i) => i.id === id)?.name ?? "—";
}

export function locationName(id: string): string {
  return locations.find((l) => l.id === id)?.name ?? "—";
}

// --- agendamentos ---------------------------------------------------------------

export interface Appointment {
  id: string;
  date: string;
  start: string; // "08:20"
  end: string;
  professionalId: string;
  patientId: string;
  procedureId: string;
  locationId: string;
  status: AppointmentStatus;
  insuranceId: string;
  isEncaixe: boolean;
  isRetorno: boolean;
  isFirstVisit: boolean;
  priceCents: number;
  arrivedAt?: string;
  notes?: string;
}

function hm(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

function dateSeed(iso: string) {
  return Number(iso.replaceAll("-", ""));
}

const PAST_STATUS: AppointmentStatus[] = ["atendido", "atendido", "atendido", "atendido", "nao_compareceu", "desmarcado_pelo_paciente"];
const FUTURE_STATUS: AppointmentStatus[] = ["confirmado", "confirmado", "nao_confirmado", "nao_confirmado", "confirmado", "remarcado"];

/**
 * Agendamentos de um dia (determinístico por data). No "hoje" do protótipo,
 * o que já passou do horário atual aparece atendido/faltou, o que está
 * perto aparece aguardando/em atendimento, e o resto confirmado/pendente.
 */
export function appointmentsOn(dateIso: string): Appointment[] {
  const day = new Date(`${dateIso}T12:00:00`).getDay();
  if (day === 0) return [];
  const r = rng(dateSeed(dateIso));
  const out: Appointment[] = [];
  const nowMin = Number(NOW_TIME.slice(0, 2)) * 60 + Number(NOW_TIME.slice(3));
  const isToday = dateIso === TODAY;
  const isPast = dateIso < TODAY;
  let n = 0;
  for (const prof of professionals) {
    if (day === 6 && prof.startHour >= 12) continue;
    const endHour = day === 6 ? Math.min(prof.endHour, 12) : prof.endHour;
    const procs = procedures.filter((p) => p.specialty === prof.specialty || (prof.specialty === "Clínica geral" && p.id === "pr20"));
    for (let m = prof.startHour * 60; m + prof.slotMin <= endHour * 60; m += prof.slotMin) {
      if (r() < 0.27) continue; // horário livre
      const proc = pick(r, procs.length ? procs : procedures);
      const patient = patients[Math.floor(r() * patients.length)];
      let status: AppointmentStatus;
      if (isPast) status = pick(r, PAST_STATUS);
      else if (!isToday) status = pick(r, FUTURE_STATUS);
      else if (m + prof.slotMin <= nowMin - 10) status = pick(r, PAST_STATUS);
      else if (m <= nowMin && m + prof.slotMin > nowMin) status = "em_atendimento";
      else if (m <= nowMin + 40) status = r() < 0.6 ? "aguardando" : "chamando";
      else status = pick(r, FUTURE_STATUS);
      if (status === "chamando" && out.some((a) => a.professionalId === prof.id && a.status === "chamando")) status = "aguardando";
      const encaixe = r() < 0.06;
      n += 1;
      out.push({
        id: `ag-${dateIso.replaceAll("-", "")}-${n}`,
        date: dateIso,
        start: hm(m),
        end: hm(m + prof.slotMin),
        professionalId: prof.id,
        patientId: patient.id,
        procedureId: proc.id,
        locationId: professionalLocation[prof.id],
        status,
        insuranceId: patient.insuranceId,
        isEncaixe: encaixe,
        isRetorno: proc.id === "pr20" || r() < 0.1,
        isFirstVisit: r() < 0.18,
        priceCents: proc.priceCents,
        arrivedAt: ["aguardando", "chamando", "em_atendimento", "atendido"].includes(status) ? hm(m - 5 - Math.floor(r() * 25)) : undefined,
      });
    }
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}

export const todayAppointments = appointmentsOn(TODAY);

/** Agendamentos do paciente nos últimos/próximos dias (pra perfil/prontuário). */
export function appointmentsForPatient(patientId: string, daysBack = 120, daysForward = 30): Appointment[] {
  const out: Appointment[] = [];
  for (let d = -daysBack; d <= daysForward; d += 1) {
    const iso = isoMinusDays(TODAY, -d);
    for (const a of appointmentsOn(iso)) if (a.patientId === patientId) out.push(a);
  }
  return out.sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start));
}

// --- notificações (topbar) ------------------------------------------------------

export const notifications = [
  { id: "n1", title: "3 pacientes aguardando há mais de 20 min", body: "Sala de espera · Dra. Camila Esteves", time: "há 2 min", unread: true, href: "/espera" },
  { id: "n2", title: "Lote TISS #2026-118 voltou com 4 glosas", body: "Saúde Bem Estar · R$ 612,00 glosados", time: "há 1 h", unread: true, href: "/faturamento/retorno" },
  { id: "n3", title: "Luva de procedimento abaixo do mínimo", body: "Estoque · 2 caixas restantes", time: "há 3 h", unread: true, href: "/estoque" },
  { id: "n4", title: "18 agendamentos de amanhã sem confirmação", body: "Confirmações", time: "ontem", unread: false, href: "/agenda/confirmacoes" },
  { id: "n5", title: "Caixa da recepção fechado com diferença de R$ 12,00", body: "Financeiro · Caixa", time: "ontem", unread: false, href: "/financeiro/caixa" },
];
