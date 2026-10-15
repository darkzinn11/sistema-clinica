"use server";

import { revalidatePath } from "next/cache";
import * as store from "@/lib/data/store";
import type { AppointmentProcedureInput, TvBoardConfig } from "@/lib/types";

export interface CreateAppointmentFormInput {
  patientId?: string;
  newPatient?: {
    fullName: string;
    mobilePhone: string;
    cpf?: string;
    hasNoCpf: boolean;
    birthDate?: string;
    sex?: "masculino" | "feminino" | "indefinido";
    leadSource?: string;
  };
  professionalId: string;
  startsAt: string;
  endsAt: string;
  isEncaixe: boolean;
  isRetorno: boolean;
  notes?: string;
  procedures: AppointmentProcedureInput[];
}

export async function createAppointmentAction(input: CreateAppointmentFormInput) {
  let patientId = input.patientId;
  try {
    if (!patientId && input.newPatient) {
      const patient = await store.createPatient(input.newPatient);
      patientId = patient.id;
    }
    if (!patientId) {
      return { ok: false as const, error: "Selecione ou cadastre um paciente." };
    }
    const appointment = await store.createAppointment({
      patientId,
      professionalId: input.professionalId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      isEncaixe: input.isEncaixe,
      isRetorno: input.isRetorno,
      notes: input.notes,
      procedures: input.procedures,
    });
    revalidatePath("/agenda");
    revalidatePath("/checkin");
    revalidatePath("/confirmacoes");
    return { ok: true as const, appointment };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Erro ao salvar." };
  }
}

export async function deleteAppointmentAction(appointmentId: string) {
  await store.deleteAppointment(appointmentId);
  revalidatePath("/agenda");
  revalidatePath("/checkin");
}

export async function checkInAction(appointmentId: string) {
  await store.checkIn(appointmentId);
  revalidatePath("/checkin");
  revalidatePath("/agenda");
  revalidatePath("/espera");
}

export async function checkOutAction(appointmentId: string) {
  await store.checkOut(appointmentId);
  revalidatePath("/checkin");
  revalidatePath("/espera");
}

export async function confirmAppointmentAction(appointmentId: string) {
  await store.confirmAppointment(appointmentId);
  revalidatePath("/confirmacoes");
  revalidatePath("/agenda");
}

export async function saveAvailabilityAction(
  professionalId: string,
  blocks: store.AvailabilityBlockInput[],
) {
  await store.saveAvailability(professionalId, blocks);
  revalidatePath(`/disponibilidade/${professionalId}`);
}

export async function addToWaitlistAction(patientId: string, professionalId?: string) {
  await store.addToWaitlist(patientId, professionalId);
  revalidatePath("/espera");
  revalidatePath("/agenda");
}

export async function removeFromWaitlistAction(entryId: string) {
  await store.removeFromWaitlist(entryId);
  revalidatePath("/espera");
  revalidatePath("/agenda");
}

export async function searchPatientsAction(query: string) {
  return store.searchPatients(query);
}

// --- painel de chamada: tipos de senha, guichês -----------------------------

export async function saveTicketTypeAction(ticketTypeId: string | null, input: store.TicketTypeInput) {
  await store.saveTicketType(ticketTypeId, input);
  revalidatePath("/configuracoes/tipos-de-senha");
  revalidatePath("/totem");
}

export async function deleteTicketTypeAction(ticketTypeId: string) {
  await store.deleteTicketType(ticketTypeId);
  revalidatePath("/configuracoes/tipos-de-senha");
  revalidatePath("/totem");
}

export async function saveCounterAction(counterId: string | null, input: store.CounterInput) {
  await store.saveCounter(counterId, input);
  revalidatePath("/configuracoes/guiches");
}

export async function deleteCounterAction(counterId: string) {
  await store.deleteCounter(counterId);
  revalidatePath("/configuracoes/guiches");
}

export async function saveTvBoardConfigAction(config: TvBoardConfig) {
  await store.saveTvBoardConfig(config);
  revalidatePath("/configuracoes/chamada-de-tv");
}

// --- painel de chamada: fila de senhas (rotas públicas: totem/TV) -----------

export async function issueTicketAction(ticketTypeId: string) {
  try {
    const ticket = await store.issueTicket(ticketTypeId);
    const typesById = await store.getTicketTypesByIdPublic();
    return { ok: true as const, ticket, code: store.ticketCode(ticket, typesById) };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Erro ao emitir senha." };
  }
}

export async function getCurrentCallAction() {
  const [current, lastCalled, counters, config, activeTicketTypes, queueCount, typesById] = await Promise.all([
    store.getCurrentCallPublic(),
    store.listLastCalledPublic(8),
    store.getCountersPublic(),
    store.getTvBoardConfigPublic(),
    store.getActiveTicketTypesPublic(),
    store.getQueueCountPublic(),
    store.getTicketTypesByIdPublic(),
  ]);
  return {
    current: current ? { code: store.ticketCode(current, typesById), counterId: current.counterId } : null,
    lastCalled: lastCalled.map((t) => ({ code: store.ticketCode(t, typesById), counterId: t.counterId })),
    counters,
    config,
    activeTicketTypes,
    queueCount,
  };
}

// --- painel de chamada: fila de senhas (operador, autenticado) --------------

export async function callNextTicketAction(counterId: string, ticketTypeId?: string) {
  try {
    const ticket = await store.callNextTicket(counterId, ticketTypeId);
    revalidatePath("/senhas");
    return { ok: true as const, ticket };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Erro ao chamar senha." };
  }
}

export async function callTicketAction(ticketId: string, counterId: string) {
  await store.callTicket(ticketId, counterId);
  revalidatePath("/senhas");
}

export async function recallTicketAction(ticketId: string) {
  await store.recallTicket(ticketId);
  revalidatePath("/senhas");
}

export async function removeTicketAction(ticketId: string) {
  await store.removeTicket(ticketId);
  revalidatePath("/senhas");
}

export async function getOperatorPanelAction() {
  const [ticketTypes, counters, queue, current, lastCalled] = await Promise.all([
    store.getTicketTypes(),
    store.getCounters(),
    store.listQueue(),
    store.getCurrentCall(),
    store.listLastCalled(10),
  ]);
  const typesById = new Map(ticketTypes.map((t) => [t.id, t]));
  return {
    ticketTypes,
    counters,
    queue: queue.map((t) => ({
      id: t.id,
      code: store.ticketCode(t, typesById),
      createdAt: t.createdAt,
      ticketTypeId: t.ticketTypeId,
    })),
    current: current ? { id: current.id, code: store.ticketCode(current, typesById), counterId: current.counterId } : null,
    lastCalled: lastCalled.map((t) => ({ id: t.id, code: store.ticketCode(t, typesById), counterId: t.counterId })),
  };
}
