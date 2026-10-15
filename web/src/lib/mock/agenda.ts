/**
 * Dados e utilitários do módulo Agenda/Início. Tudo derivado de
 * `@/lib/mock/core` de forma determinística (mesma data → mesmo resultado).
 */

import {
  NOW_TIME,
  TODAY,
  appointmentsOn,
  equipment,
  insurances,
  patients,
  procedures,
  professionals,
  rng,
  type Appointment,
  type Patient,
  type Procedure,
  type Professional,
} from "@/lib/mock/core";
import { addDaysIso } from "@/lib/format";
import type { AppointmentStatus } from "@/lib/status";

// --- tempo -------------------------------------------------------------------

export const DAY_START = 7;
export const DAY_END = 19;

export function toMin(hhmm: string): number {
  return Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
}

export function hm(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

export const NOW_MIN = toMin(NOW_TIME);

export function minutesBetween(a: string, b: string): number {
  return toMin(b) - toMin(a);
}

/** 0 = domingo … 6 = sábado. */
export function weekday(iso: string): number {
  return new Date(`${iso}T12:00:00`).getDay();
}

/** Segunda-feira da semana da data. */
export function mondayOf(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  const wd = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - (wd === 0 ? 6 : wd - 1));
  return d.toISOString().slice(0, 10);
}

// --- status ------------------------------------------------------------------

export const CANCELLED: AppointmentStatus[] = ["cancelado_pelo_profissional", "desmarcado_pelo_paciente", "nao_compareceu", "remarcado"];
export const IN_CLINIC: AppointmentStatus[] = ["aguardando", "aguardando_pagamento", "chamando", "em_atendimento"];

export function isCancelled(s: AppointmentStatus) {
  return CANCELLED.includes(s);
}

/** Ordem usada em contadores e filtros. */
export const STATUS_ORDER: AppointmentStatus[] = [
  "confirmado",
  "nao_confirmado",
  "aguardando",
  "aguardando_pagamento",
  "chamando",
  "em_atendimento",
  "atendido",
  "remarcado",
  "nao_compareceu",
  "desmarcado_pelo_paciente",
  "cancelado_pelo_profissional",
];

// --- horários de trabalho -----------------------------------------------------

/** Janela de atendimento do profissional naquele dia (null = não atende). */
export function workWindow(prof: Professional, iso: string): { start: number; end: number } | null {
  const wd = weekday(iso);
  if (wd === 0) return null;
  if (wd === 6) {
    if (prof.startHour >= 12) return null;
    return { start: prof.startHour * 60, end: Math.min(prof.endHour, 12) * 60 };
  }
  return { start: prof.startHour * 60, end: prof.endHour * 60 };
}

/** Horários livres (início) de um profissional numa data, dada a lista de agendamentos. */
export function freeSlots(prof: Professional, iso: string, appts: Appointment[]): string[] {
  const win = workWindow(prof, iso);
  if (!win) return [];
  const busy = appts.filter((a) => a.professionalId === prof.id && !isCancelled(a.status)).map((a) => [toMin(a.start), toMin(a.end)] as const);
  const out: string[] = [];
  for (let m = win.start; m + prof.slotMin <= win.end; m += prof.slotMin) {
    if (!busy.some(([s, e]) => m < e && m + prof.slotMin > s)) out.push(hm(m));
  }
  return out;
}

/** Todos os horários da grade do profissional no dia, com indicação de ocupado. */
export function allSlots(prof: Professional, iso: string, appts: Appointment[]): { time: string; busy: boolean }[] {
  const win = workWindow(prof, iso);
  if (!win) return [];
  const free = new Set(freeSlots(prof, iso, appts));
  const out: { time: string; busy: boolean }[] = [];
  for (let m = win.start; m + prof.slotMin <= win.end; m += prof.slotMin) out.push({ time: hm(m), busy: !free.has(hm(m)) });
  return out;
}

/** Ocupação (0–1) de um profissional num dia. */
export function occupancy(prof: Professional, iso: string, appts = appointmentsOn(iso)): { pct: number; booked: number; total: number } {
  const win = workWindow(prof, iso);
  if (!win) return { pct: 0, booked: 0, total: 0 };
  const total = Math.floor((win.end - win.start) / prof.slotMin);
  const booked = appts.filter((a) => a.professionalId === prof.id && !isCancelled(a.status)).length;
  return { pct: total ? Math.min(1, booked / total) : 0, booked, total };
}

// --- pacientes criados no protótipo -----------------------------------------------

const extraPatients = new Map<string, Patient>();

export function registerPatient(p: Patient) {
  extraPatients.set(p.id, p);
}

export function findPatient(id: string): Patient | undefined {
  return extraPatients.get(id) ?? patients.find((p) => p.id === id);
}

export function allPatients(): Patient[] {
  return [...extraPatients.values(), ...patients];
}

/** Normaliza pra busca sem acento e sem caixa. */
export function norm(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// --- pagamento pendente / sinais extras ----------------------------------------------

export function hasPendingPayment(a: Appointment): boolean {
  if (a.insuranceId !== "i0" || a.priceCents === 0) return false;
  const p = findPatient(a.patientId);
  if (p && p.balanceCents > 0) return true;
  return Number(a.id.split("-").pop()) % 5 === 0;
}

// --- confirmações ---------------------------------------------------------------

export type MessageStatus = "nao_enviado" | "enviado" | "lido" | "confirmado" | "sem_resposta" | "quer_remarcar";

export const MESSAGE_STATUS: Record<MessageStatus, { label: string; tone: "neutral" | "info" | "accent" | "success" | "warning" | "danger" }> = {
  nao_enviado: { label: "Não enviado", tone: "neutral" },
  enviado: { label: "Enviado", tone: "info" },
  lido: { label: "Lido", tone: "accent" },
  confirmado: { label: "Confirmado", tone: "success" },
  sem_resposta: { label: "Sem resposta", tone: "warning" },
  quer_remarcar: { label: "Quer remarcar", tone: "danger" },
};

export function initialMessageStatus(a: Appointment): MessageStatus {
  if (a.status === "confirmado") return "confirmado";
  if (a.status === "remarcado") return "quer_remarcar";
  const n = Number(a.id.split("-").pop());
  const opts: MessageStatus[] = ["nao_enviado", "nao_enviado", "enviado", "lido", "sem_resposta", "nao_enviado", "quer_remarcar"];
  return opts[n % opts.length];
}

export const DEFAULT_TEMPLATE =
  "Olá, {paciente}! Aqui é da Clínica Vida Plena. Lembramos do seu horário em {data} às {hora} com {profissional}. Responda 1 para confirmar ou 2 para remarcar.";

// --- equipamentos -------------------------------------------------------------

export interface EquipmentAllocation {
  id: string;
  equipmentId: string;
  start: string;
  end: string;
  label: string;
  professionalId: string;
  patientId?: string;
}

/** Procedimentos que ocupam cada equipamento. */
const EQUIP_PROCS: Record<string, string[]> = {
  e1: ["pr8", "pr9", "pr10", "pr11", "pr12"],
  e2: ["pr13", "pr3"],
  e3: ["pr14"],
  e4: ["pr15", "pr16"],
  e5: ["pr18"],
};

/** Capacidade simultânea (Holter tem 3 unidades). */
export const EQUIP_CAPACITY: Record<string, number> = { e1: 1, e2: 1, e3: 1, e4: 3, e5: 1 };

export function equipmentAllocations(iso: string): EquipmentAllocation[] {
  const appts = appointmentsOn(iso).filter((a) => !isCancelled(a.status));
  const out: EquipmentAllocation[] = [];
  for (const eq of equipment) {
    for (const a of appts) {
      if (!EQUIP_PROCS[eq.id]?.includes(a.procedureId)) continue;
      const proc = procedures.find((p) => p.id === a.procedureId);
      out.push({ id: `${eq.id}-${a.id}`, equipmentId: eq.id, start: a.start, end: a.end, label: proc?.name ?? "Uso", professionalId: a.professionalId, patientId: a.patientId });
    }
  }
  // Reservas avulsas (manutenção, uso compartilhado) — geram conflitos plausíveis.
  if (weekday(iso) !== 0) {
    const r = rng(Number(iso.replaceAll("-", "")) + 7);
    const extra: { eq: string; prof: string; label: string; dur: number }[] = [
      { eq: "e1", prof: "p2", label: "US transvaginal (Ginecologia)", dur: 30 },
      { eq: "e3", prof: "p8", label: "Calibração preventiva", dur: 45 },
      { eq: "e5", prof: "p6", label: "Crioterapia (Ortopedia)", dur: 20 },
      { eq: "e2", prof: "p7", label: "ECG pediátrico", dur: 20 },
    ];
    extra.forEach((x, i) => {
      const same = out.filter((o) => o.equipmentId === x.eq);
      const base = same.length ? toMin(same[Math.floor(r() * same.length)].start) + 10 : (9 + i * 2) * 60;
      out.push({ id: `${x.eq}-extra-${i}`, equipmentId: x.eq, start: hm(base), end: hm(base + x.dur), label: x.label, professionalId: x.prof });
    });
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}

// --- tabelas de valores ---------------------------------------------------------

export const PRICE_TABLES = insurances.map((i) => ({ id: i.id, name: i.id === "i0" ? "Particular (tabela própria)" : i.name }));

/** Valor do procedimento numa tabela; null = não coberto. */
export function priceFor(proc: Procedure, insuranceId: string): number | null {
  if (insuranceId === "i0") return proc.priceCents;
  const idx = Number(insuranceId.slice(1));
  const pIdx = Number(proc.id.slice(2));
  if ((pIdx + idx) % 7 === 0 && proc.kind !== "consulta") return null;
  const factor = [1, 0.62, 0.7, 0.55, 0.78, 0.66][idx] ?? 0.6;
  return Math.round((proc.priceCents * factor) / 100) * 100;
}

export const PREPARO: Record<string, string> = {
  pr8: "Jejum de 8 h. Evitar refrigerante na véspera.",
  pr9: "Bexiga cheia até 20 semanas: beber 4 copos de água 1 h antes.",
  pr10: "Bexiga cheia; trazer exames anteriores.",
  pr11: "Bexiga vazia. Pode ser feito em qualquer fase do ciclo.",
  pr12: "Não usar desodorante ou talco no dia.",
  pr13: "Sem preparo. Evitar cremes no tórax.",
  pr14: "Sem preparo. Trazer laudos anteriores.",
  pr15: "Tomar banho antes; roupa folgada com botões.",
  pr16: "Roupa de manga curta; manter medicação habitual.",
  pr17: "Sem relação sexual e sem duchas 48 h antes.",
  pr18: "Sem preparo.",
  pr19: "Informar uso de anticoagulante.",
};

// --- aniversariantes ---------------------------------------------------------------

/** Aniversariantes de hoje até +6 dias. Garante pelo menos 2 (deterministicamente). */
export function birthdaysThisWeek(): { patient: Patient; date: string; turning: number }[] {
  const days: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(`${TODAY}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }
  const out: { patient: Patient; date: string; turning: number }[] = [];
  for (const p of patients) {
    const md = p.birthDate.slice(5);
    const day = days.find((d) => d.slice(5) === md);
    if (day) out.push({ patient: p, date: day, turning: Number(day.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) });
  }
  const fillers = [patients[11], patients[37], patients[52]];
  let i = 0;
  while (out.length < 3 && i < fillers.length) {
    const p = fillers[i];
    const date = days[i === 0 ? 0 : i * 2];
    if (!out.some((o) => o.patient.id === p.id)) out.push({ patient: p, date, turning: Number(date.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) });
    i += 1;
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

// --- pendências do dia (Início) ---------------------------------------------------------

export const PENDENCIAS = {
  glosas: { count: 4, valueCents: 61200 },
  estoqueBaixo: 3,
  caixaDiferencaCents: 1200,
};

export function professionalsWorking(iso: string): Professional[] {
  return professionals.filter((p) => workWindow(p, iso));
}

// --- tendências (indicadores do Início) ------------------------------------------

/** Série plausível de 7 pontos terminando exatamente no valor atual (sparklines). */
export function trendEndingAt(seed: number, last: number, spread = 0.2): number[] {
  const r = rng(seed);
  const out: number[] = [];
  for (let i = 0; i < 6; i += 1) out.push(Math.max(0, Math.round(last * (1 + (r() - 0.5) * spread * 2))));
  out.push(Math.round(last));
  return out;
}

// --- mapa de ocupação ---------------------------------------------------------

/** Ocupação (0–1) de um profissional em cada um dos próximos `days` dias a partir de `startIso`. */
export function occupancyNextDays(prof: Professional, startIso: string, days: number): { date: string; pct: number }[] {
  const out: { date: string; pct: number }[] = [];
  for (let i = 0; i < days; i += 1) {
    const iso = addDaysIso(startIso, i);
    out.push({ date: iso, pct: occupancy(prof, iso).pct });
  }
  return out;
}

// --- conflitos de equipamento ---------------------------------------------------

/** Ids de alocações que ultrapassam a capacidade simultânea do equipamento (varredura por linha do tempo). */
export function equipmentConflicts(allocs: EquipmentAllocation[], capacity: number): Set<string> {
  const points: { t: number; kind: 1 | -1; id: string }[] = [];
  for (const a of allocs) {
    points.push({ t: toMin(a.start), kind: 1, id: a.id });
    points.push({ t: toMin(a.end), kind: -1, id: a.id });
  }
  points.sort((a, b) => a.t - b.t || a.kind - b.kind);
  const active = new Set<string>();
  const conflicted = new Set<string>();
  for (const p of points) {
    if (p.kind === 1) {
      active.add(p.id);
      if (active.size > capacity) for (const id of active) conflicted.add(id);
    } else {
      active.delete(p.id);
    }
  }
  return conflicted;
}
