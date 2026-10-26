import type { AgendaItem, ApiGrade, ApiProcedure, ApiProfessional } from "@/lib/api/agenda";
import { statusFromBackend, type BackendStatus } from "@/lib/api/status-map";
import type { AppointmentStatus } from "@/lib/status";
import { clock, hm, toMin, weekday } from "./time";

/** Cor de série usada quando a clínica não escolheu uma cor para o profissional. */
const SERIES_FALLBACK = (index: number) => `var(--c-series-${(index % 8) + 1})`;

export interface Window { start: number; end: number; slotMin: number }

/** Profissional como a agenda o desenha: nome, especialidade principal, cor e janelas de atendimento por dia da semana. */
export interface AgendaProfessional {
  id: string;
  name: string;
  specialty: string;
  council: string;
  colorCss: string;
  windows: Record<number, Window[]>;
  slotMin: number;
}

/** Agendamento como as telas da agenda o usam (já com nomes). */
export interface AgendaAppointment {
  id: string;
  date: string;
  start: string;
  end: string;
  professionalId: string;
  professionalName: string;
  patientId: string;
  patientName: string;
  patientPhone: string | null;
  procedureId: string;
  procedureName: string;
  procedureKind: "consulta" | "exame" | "procedimento";
  status: AppointmentStatus;
  backendStatus: BackendStatus;
  version: number;
  channel: string;
  notes: string | null;
  priceCents: number | null;
  arrivedAt: string | null;
  startIso: string;
  patientAge: number | null;
  /** Primeira vez na especialidade (null = não dá para saber). */
  firstVisit: boolean | null;
  fitIn: boolean;
}

export function toAppointment(item: AgendaItem): AgendaAppointment {
  return {
    id: item.id,
    date: item.data,
    start: clock(item.inicio),
    end: clock(item.fim),
    professionalId: item.profissionalId,
    professionalName: item.profissionalNome,
    patientId: item.pacienteId,
    patientName: item.pacienteNome,
    patientPhone: item.pacienteCelular,
    procedureId: item.procedimentoId,
    procedureName: item.procedimentoNome,
    procedureKind: item.procedimentoTipo,
    status: statusFromBackend(item.status),
    backendStatus: item.status,
    version: item.versao,
    channel: item.canal,
    notes: item.observacao,
    priceCents: item.valorCentavos,
    arrivedAt: item.chegadaEm ? clock(item.chegadaEm) : null,
    startIso: item.inicio,
    patientAge: item.pacienteIdade ?? null,
    firstVisit: item.primeiraVez ?? null,
    fitIn: item.encaixe ?? false,
  };
}

export function buildProfessionals(professionals: ApiProfessional[], grades: ApiGrade[], unitId: string): AgendaProfessional[] {
  return professionals
    .filter((p) => p.ativo && !p.ocultoNaAgenda && p.unidadeIds.includes(unitId))
    .map((p, index) => {
      const windows: Record<number, Window[]> = {};
      for (const g of grades) {
        if (g.profissionalId !== p.id || g.unidadeId !== unitId || !g.ativo) continue;
        (windows[g.diaSemana] ??= []).push({ start: toMin(g.inicio.slice(0, 5)), end: toMin(g.fim.slice(0, 5)), slotMin: g.duracaoBlocoMin });
      }
      const main = p.especialidades.find((e) => e.principal) ?? p.especialidades[0];
      const first = Object.values(windows)[0]?.[0];
      return {
        id: p.id,
        name: p.nome,
        specialty: main?.nome ?? "Sem especialidade",
        council: [p.conselho, p.conselhoNum].filter(Boolean).join(" "),
        colorCss: p.corAgenda ?? SERIES_FALLBACK(index),
        windows,
        slotMin: first?.slotMin ?? 30,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

/** Janela em que o profissional atende naquele dia (do começo da primeira ao fim da última), ou nulo se não atende. */
export function workWindow(professional: AgendaProfessional, iso: string): { start: number; end: number } | null {
  const windows = professional.windows[weekday(iso)];
  if (!windows?.length) return null;
  return { start: Math.min(...windows.map((w) => w.start)), end: Math.max(...windows.map((w) => w.end)) };
}

const CANCELLED: AppointmentStatus[] = ["cancelado_pelo_profissional", "desmarcado_pelo_paciente", "nao_compareceu", "remarcado"];
export const isCancelled = (status: AppointmentStatus) => CANCELLED.includes(status);

/** Horários livres de uma grade, só para desenhar os "buracos" clicáveis; quem decide o que dá para marcar é o backend. */
export function freeSlots(professional: AgendaProfessional, iso: string, appointments: AgendaAppointment[]): string[] {
  const windows = professional.windows[weekday(iso)] ?? [];
  const busy = appointments
    .filter((a) => a.professionalId === professional.id && a.date === iso && !isCancelled(a.status))
    .map((a) => [toMin(a.start), toMin(a.end)] as const);
  const out: string[] = [];
  for (const w of windows) {
    for (let m = w.start; m + w.slotMin <= w.end; m += w.slotMin) {
      if (!busy.some(([s, e]) => m < e && m + w.slotMin > s)) out.push(hm(m));
    }
  }
  return out;
}

export interface AgendaProcedure { id: string; name: string; kind: "consulta" | "exame" | "procedimento"; durationMin: number | null; priceCents: number | null }

export function buildProcedures(procedures: ApiProcedure[]): AgendaProcedure[] {
  return procedures.map((p) => ({ id: p.id, name: p.nome, kind: p.tipo, durationMin: p.duracaoMin, priceCents: p.valorCentavos }));
}

/** O que a recepção pode fazer a cada status (as mesmas regras do backend: o servidor confere de novo). */
export const NEXT_BY_RECEPTION: Partial<Record<BackendStatus, BackendStatus[]>> = {
  agendado: ["confirmado", "check_in", "nao_compareceu"],
  confirmado: ["check_in", "nao_compareceu"],
};
export const CAN_CANCEL: BackendStatus[] = ["agendado", "confirmado", "check_in"];
export const CAN_RESCHEDULE: BackendStatus[] = ["agendado", "confirmado"];
