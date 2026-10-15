/**
 * Dados fictícios da Recepção: sala de espera (derivada dos agendamentos de
 * hoje) e senhas de atendimento (totem / chamada / painel de TV).
 * Determinístico via rng — mesma seed, mesmo resultado em toda tela.
 */

import type { Tone } from "@/components/ui/badge";
import { age } from "@/lib/format";
import { NOW_TIME, TODAY, type Appointment, type Patient, appointmentsOn, patients, rng } from "@/lib/mock/core";

function pick<T>(r: () => number, arr: readonly T[]): T {
  return arr[Math.floor(r() * arr.length)];
}

function toMin(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

function fromMin(min: number): string {
  const h = Math.floor(((min % 1440) + 1440) % 1440 / 60);
  const m = ((min % 60) + 60) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// --- sala de espera (a partir dos agendamentos de hoje) ---------------------

const WAITING_STATUSES: Appointment["status"][] = ["aguardando", "aguardando_pagamento", "chamando", "em_atendimento", "atendido"];

/** Agendamentos de hoje que já deram entrada na recepção (têm horário de chegada). */
export function waitingRoomToday(): Appointment[] {
  return appointmentsOn(TODAY).filter((a) => WAITING_STATUSES.includes(a.status) && a.arrivedAt);
}

/** Minutos desde a chegada até "agora" (NOW_TIME, fixo no protótipo). */
export function waitMinutes(arrivedAt: string, now: string = NOW_TIME): number {
  return toMin(now) - toMin(arrivedAt);
}

export type WaitTone = "neutral" | "warning" | "danger";

/** 20min = atenção, 40min = crítico — thresholds do protótipo. */
export function waitTone(min: number): WaitTone {
  if (min >= 40) return "danger";
  if (min >= 20) return "warning";
  return "neutral";
}

export type TriageRisk = "emergencia" | "muito_urgente" | "urgente" | "pouco_urgente" | "nao_urgente";

export const TRIAGE_RISK: Record<TriageRisk, { label: string; tone: Tone }> = {
  emergencia: { label: "Emergência", tone: "danger" },
  muito_urgente: { label: "Muito urgente", tone: "danger" },
  urgente: { label: "Urgente", tone: "warning" },
  pouco_urgente: { label: "Pouco urgente", tone: "info" },
  nao_urgente: { label: "Não urgente", tone: "success" },
};

const RISK_ORDER: TriageRisk[] = ["emergencia", "muito_urgente", "urgente", "pouco_urgente", "nao_urgente"];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Nem todo paciente da espera passou por triagem — só uma parte tem risco classificado. */
export function triageFor(appointmentId: string): TriageRisk | undefined {
  const h = hashStr(appointmentId);
  if (h % 10 < 6) return undefined;
  // pondera pra urgência moderada ser mais comum que emergência
  const weighted = [0, 0, 1, 1, 1, 2, 2, 2, 3, 3];
  return RISK_ORDER[weighted[h % weighted.length]];
}

export interface PriorityFlag {
  key: string;
  label: string;
}

/** Badges de prioridade legal (Lei do Idoso, gestante, PCD) derivados de tags/idade. */
export function priorityFlags(patient: Patient): PriorityFlag[] {
  const out: PriorityFlag[] = [];
  if (age(patient.birthDate, TODAY) >= 60) out.push({ key: "60+", label: "60+" });
  if (patient.tags.includes("Gestante")) out.push({ key: "gestante", label: "Gestante" });
  if (patient.tags.includes("PCD")) out.push({ key: "preferencial", label: "Preferencial" });
  return out;
}

// --- senhas (totem / chamar senha / painel de tv) ---------------------------

export type TicketTypeCode = "CON" | "EXM" | "LAB" | "RET";

export const TICKET_TYPES: { code: TicketTypeCode; label: string; longLabel: string }[] = [
  { code: "CON", label: "Consulta", longLabel: "Consultas" },
  { code: "EXM", label: "Exames", longLabel: "Exames" },
  { code: "LAB", label: "Laboratório", longLabel: "Laboratório" },
  { code: "RET", label: "Retorno", longLabel: "Retornos" },
];

export type SenhaStatus = "esperando" | "chamado" | "atendido" | "nao_compareceu";

export interface Senha {
  id: string;
  code: string;
  type: TicketTypeCode;
  preferential: boolean;
  patientId: string;
  createdAt: string;
  status: SenhaStatus;
  guiche?: number;
  calledAt?: string;
}

function buildSenhas(): Senha[] {
  const r = rng(777);
  const out: Senha[] = [];
  const counters: Record<TicketTypeCode, number> = { CON: 0, EXM: 0, LAB: 0, RET: 0 };
  const nowMin = toMin(NOW_TIME);
  let t = nowMin - 165;
  let n = 0;
  while (t < nowMin + 4) {
    const step = 3 + Math.floor(r() * 5);
    if (r() < 0.45) {
      t += step;
      continue;
    }
    const type = pick(r, TICKET_TYPES).code;
    counters[type] += 1;
    const preferential = r() < 0.22;
    const patient = pick(r, patients);
    const createdAt = fromMin(t);
    n += 1;
    const sinceCreated = nowMin - t;
    let status: SenhaStatus;
    let calledAt: string | undefined;
    let guiche: number | undefined;
    if (sinceCreated > 55) {
      status = r() < 0.08 ? "nao_compareceu" : "atendido";
      calledAt = fromMin(t + 4 + Math.floor(r() * 10));
      guiche = 1 + Math.floor(r() * 4);
    } else if (sinceCreated > 6 && r() < 0.55) {
      status = "chamado";
      calledAt = fromMin(Math.min(nowMin, t + 4 + Math.floor(r() * 6)));
      guiche = 1 + Math.floor(r() * 4);
    } else {
      status = "esperando";
    }
    out.push({
      id: `sen-${n}`,
      code: `${type}${preferential ? " P" : ""} ${String(counters[type]).padStart(2, "0")}`,
      type,
      preferential,
      patientId: patient.id,
      createdAt,
      status,
      guiche,
      calledAt,
    });
    t += step;
  }
  return out;
}

export const initialSenhas: Senha[] = buildSenhas();

export const GUICHES = [1, 2, 3, 4, 5, 6];

// --- painel de tv: chamadas simuladas ao vivo --------------------------------

export interface TvCall {
  id: string;
  patientFirstName: string;
  code: string;
  place: string;
}

/** Lista de chamadas usada pelo painel de TV pra simular novas chamadas a cada ciclo. */
export function buildTvCalls(count = 40): TvCall[] {
  const r = rng(4242);
  const out: TvCall[] = [];
  const rooms = ["Consultório 1", "Consultório 2", "Consultório 3", "Consultório 4", "Guichê 1", "Guichê 2", "Guichê 3", "Sala de Ultrassom"];
  for (let i = 0; i < count; i += 1) {
    const patient = pick(r, patients);
    const type = pick(r, TICKET_TYPES);
    const first = patient.name.split(" ")[0];
    out.push({
      id: `tv-${i}`,
      patientFirstName: first,
      code: `${type.code} ${String(10 + Math.floor(r() * 80)).padStart(2, "0")}`,
      place: pick(r, rooms),
    });
  }
  return out;
}

export const HEALTH_TIPS = [
  { title: "Hidrate-se", body: "Beber água regularmente ajuda a regular a pressão arterial e melhora a disposição ao longo do dia." },
  { title: "Check-up em dia", body: "Consultas de rotina anuais ajudam a identificar precocemente alterações de saúde." },
  { title: "Sono de qualidade", body: "Dormir de 7 a 9 horas por noite fortalece o sistema imunológico e a saúde mental." },
  { title: "Vacinação", body: "Mantenha a carteira de vacinação atualizada — procure a recepção para mais informações." },
  { title: "Alimentação equilibrada", body: "Inclua frutas e vegetais em todas as refeições para manter os níveis de energia estáveis." },
];
