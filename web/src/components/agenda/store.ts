import { useCallback, useSyncExternalStore } from "react";
import { appointmentsOn, type Appointment } from "@/lib/mock/core";

/**
 * Estado local compartilhado entre as telas da agenda (Dia, Semana, Por sala,
 * Check-in): agendamentos criados e alterações de status feitas no protótipo.
 * Vive só em memória — recarregar a página volta ao mock original.
 */

interface State {
  created: Appointment[];
  overrides: Record<string, Partial<Appointment>>;
}

let state: State = { created: [], overrides: {} };
const listeners = new Set<() => void>();
const dayCache = new Map<string, Appointment[]>();

function emit(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function baseOn(date: string): Appointment[] {
  let list = dayCache.get(date);
  if (!list) {
    list = appointmentsOn(date);
    dayCache.set(date, list);
  }
  return list;
}

export function resolveOn(s: State, date: string): Appointment[] {
  return [...baseOn(date), ...s.created.filter((a) => a.date === date)]
    .map((a) => (s.overrides[a.id] ? { ...a, ...s.overrides[a.id] } : a))
    .sort((a, b) => a.start.localeCompare(b.start));
}

let seq = 0;
export function newAppointmentId() {
  seq += 1;
  return `ag-novo-${seq}`;
}

let patientSeq = 0;
export function newPatientId() {
  patientSeq += 1;
  return `pac-novo-${patientSeq}`;
}

export function useAgendaStore() {
  const snap = useSyncExternalStore(subscribe, () => state, () => state);
  const apptsOn = useCallback((date: string) => resolveOn(snap, date), [snap]);
  const update = useCallback((id: string, patch: Partial<Appointment>) => {
    emit({ ...state, overrides: { ...state.overrides, [id]: { ...state.overrides[id], ...patch } } });
  }, []);
  const add = useCallback((list: Appointment[]) => {
    emit({ ...state, created: [...state.created, ...list] });
  }, []);
  return { apptsOn, update, add, version: snap };
}
