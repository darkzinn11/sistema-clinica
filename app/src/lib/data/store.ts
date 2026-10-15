/**
 * Sem tipos gerados do Supabase ainda (precisa de um projeto real pra rodar
 * `supabase gen types typescript --linked` — ver replica/backend.md). Até
 * lá, as linhas cruas do banco chegam como `any` nos mappers abaixo; trocar
 * por `Database["public"]["Tables"]["x"]["Row"]` quando o projeto existir.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type {
  Appointment,
  AppointmentProcedureInput,
  AppointmentProcedureRecord,
  AppointmentStatus,
  AvailabilityBlock,
  Counter,
  Patient,
  Procedure,
  Professional,
  Ticket,
  TicketType,
  TvBoardConfig,
  WaitlistEntry,
} from "@/lib/types";

/**
 * Camada de dados de verdade (Postgres via Supabase) — mesma assinatura de
 * função que a versão em memória tinha, pra nenhuma tela precisar mudar.
 * RLS cuida do isolamento por clínica em tudo que passa pelo cliente
 * ligado à sessão (`createClient()`); as duas exceções públicas (totem e
 * painel de TV, sem login) usam `createServiceClient()` — ver nota de
 * segurança na migration e em replica/backend.md.
 */

function mustGetClinicId(clinicId: string | null): string {
  if (!clinicId) throw new Error("Usuário sem clínica associada (staff_users).");
  return clinicId;
}

async function currentClinicId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string> {
  const { data, error } = await supabase.rpc("auth_clinic_id");
  if (error) throw error;
  return mustGetClinicId(data as string | null);
}

function throwIfError<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

// --- mappers (snake_case do banco -> camelCase do app) ----------------------

function mapProfessional(row: any): Professional {
  return {
    id: row.id,
    fullName: row.full_name,
    specialty: row.specialty,
    minAge: row.min_age ?? undefined,
    notes: row.notes ?? undefined,
    phone: row.phone ?? undefined,
    active: row.active,
  };
}

function mapLocation(row: any) {
  return { id: row.id, name: row.name };
}

function mapEquipment(row: any) {
  return { id: row.id, name: row.name };
}

function mapProcedure(row: any): Procedure {
  return {
    id: row.id,
    name: row.name,
    specialty: row.specialty ?? undefined,
    defaultDurationMin: row.default_duration_min,
    defaultPriceCents: row.default_price_cents,
  };
}

function mapInsurance(row: any) {
  return { id: row.id, name: row.name };
}

function mapAvailability(row: any): AvailabilityBlock {
  return {
    id: row.id,
    professionalId: row.professional_id,
    weekday: row.weekday,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    slotDurationMin: row.slot_duration_min,
    maxEncaixesPerDay: row.max_encaixes_per_day,
  };
}

function mapPatient(row: any): Patient {
  return {
    id: row.id,
    fullName: row.full_name,
    cpf: row.cpf ?? undefined,
    hasNoCpf: row.has_no_cpf,
    birthDate: row.birth_date ?? undefined,
    sex: row.sex ?? undefined,
    mobilePhone: row.mobile_phone,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    leadSource: row.lead_source ?? undefined,
    createdAt: row.created_at,
  };
}

function mapAppointmentProcedure(row: any): AppointmentProcedureRecord {
  return {
    id: row.id,
    procedureId: row.procedure_id,
    durationMin: row.duration_min,
    paymentMode: row.payment_mode,
    insuranceId: row.insurance_id ?? undefined,
    priceCents: row.price_cents,
    locationId: row.location_id ?? undefined,
    equipmentId: row.equipment_id ?? undefined,
  };
}

function mapAppointment(row: any): Appointment {
  return {
    id: row.id,
    patientId: row.patient_id,
    professionalId: row.professional_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    isEncaixe: row.is_encaixe,
    isRetorno: row.is_retorno,
    leadSource: row.lead_source ?? undefined,
    referringProfessionalId: row.referring_professional_id ?? undefined,
    repeatGroupId: row.repeat_group_id ?? undefined,
    notes: row.notes ?? undefined,
    checkedInAt: row.checked_in_at ?? undefined,
    checkedOutAt: row.checked_out_at ?? undefined,
    confirmedAt: row.confirmed_at ?? undefined,
    confirmationSentAt: row.confirmation_sent_at ?? undefined,
    procedures: (row.appointment_procedures ?? []).map(mapAppointmentProcedure),
    createdAt: row.created_at,
  };
}

function mapWaitlistEntry(row: any): WaitlistEntry {
  return {
    id: row.id,
    patientId: row.patient_id,
    professionalId: row.professional_id ?? undefined,
    arrivedAt: row.arrived_at,
    attendedAt: row.attended_at ?? undefined,
  };
}

function mapTicketType(row: any): TicketType {
  return {
    id: row.id,
    name: row.name,
    colorHex: row.color_hex,
    prefix: row.prefix,
    startNumber: row.start_number,
    active: row.active,
  };
}

function mapCounter(row: any): Counter {
  return { id: row.id, name: row.name, coveredLocationIds: row.covered_location_ids ?? [] };
}

function mapTicket(row: any): Ticket {
  return {
    id: row.id,
    ticketTypeId: row.ticket_type_id,
    number: row.number,
    status: row.status,
    counterId: row.counter_id ?? undefined,
    calledAt: row.called_at ?? undefined,
    createdAt: row.created_at,
  };
}

function mapTvBoardConfig(row: any): TvBoardConfig {
  return {
    template: row.template,
    logoUrl: row.logo_url ?? undefined,
    color1: row.color_1,
    color2: row.color_2,
    color3: row.color_3,
    backgroundColor: row.background_color,
    intervalSeconds: row.interval_seconds,
    youtubeVideoId: row.youtube_video_id ?? undefined,
    showProfessionalName: row.show_professional_name,
    showLocationName: row.show_location_name,
    voiceCall: row.voice_call,
    callMoreThanOnce: row.call_more_than_once,
    preConsulta: row.pre_consulta,
    posConsulta: row.pos_consulta,
    showLastCalled: row.show_last_called,
    showPatientBirthdate: row.show_patient_birthdate,
    beepTwiceOnly: row.beep_twice_only,
    mutedVideo: row.muted_video,
  };
}

// --- catálogos --------------------------------------------------------------

export async function getProfessionals(): Promise<Professional[]> {
  const supabase = await createClient();
  const res = await supabase.from("professionals").select("*").eq("active", true).order("full_name");
  return throwIfError(res).map(mapProfessional);
}

export async function getProfessional(professionalId: string): Promise<Professional | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("professionals").select("*").eq("id", professionalId).maybeSingle();
  return data ? mapProfessional(data) : null;
}

/** Todos os profissionais (ativos ou não) num Map — pra telas que listam
 * agendamentos de vários profissionais junto (check-in, confirmações). */
export async function getProfessionalsById(): Promise<Map<string, Professional>> {
  const supabase = await createClient();
  const res = await supabase.from("professionals").select("*");
  return new Map(throwIfError(res).map((row) => [row.id, mapProfessional(row)]));
}

export async function getLocations() {
  const supabase = await createClient();
  const res = await supabase.from("locations").select("*").order("name");
  return throwIfError(res).map(mapLocation);
}

export async function getEquipment() {
  const supabase = await createClient();
  const res = await supabase.from("equipment").select("*").order("name");
  return throwIfError(res).map(mapEquipment);
}

export async function getProcedures(): Promise<Procedure[]> {
  const supabase = await createClient();
  const res = await supabase.from("procedures").select("*").eq("active", true).order("name");
  return throwIfError(res).map(mapProcedure);
}

export async function getProcedure(procedureId: string): Promise<Procedure | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("procedures").select("*").eq("id", procedureId).maybeSingle();
  return data ? mapProcedure(data) : null;
}

export async function getInsurances() {
  const supabase = await createClient();
  const res = await supabase.from("insurances").select("*").eq("active", true).order("name");
  return throwIfError(res).map(mapInsurance);
}

// --- pacientes ----------------------------------------------------------------

export async function searchPatients(query: string): Promise<Patient[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const supabase = await createClient();
  const res = await supabase.rpc("search_patients", { q });
  return throwIfError(res).map(mapPatient);
}

export async function getPatient(patientId: string): Promise<Patient | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("patients").select("*").eq("id", patientId).maybeSingle();
  return data ? mapPatient(data) : null;
}

/** Busca várias de uma vez (evita 1 query por linha numa lista). */
export async function getPatientsByIds(patientIds: string[]): Promise<Map<string, Patient>> {
  const unique = [...new Set(patientIds)];
  if (unique.length === 0) return new Map();
  const supabase = await createClient();
  const res = await supabase.from("patients").select("*").in("id", unique);
  return new Map(throwIfError(res).map((row) => [row.id, mapPatient(row)]));
}

export interface CreatePatientInput {
  fullName: string;
  mobilePhone: string;
  cpf?: string;
  hasNoCpf: boolean;
  birthDate?: string;
  sex?: Patient["sex"];
  leadSource?: string;
}

export async function createPatient(input: CreatePatientInput): Promise<Patient> {
  const supabase = await createClient();
  const clinicId = await currentClinicId(supabase);
  const res = await supabase
    .from("patients")
    .insert({
      clinic_id: clinicId,
      full_name: input.fullName,
      mobile_phone: input.mobilePhone,
      cpf: input.cpf ?? null,
      has_no_cpf: input.hasNoCpf,
      birth_date: input.birthDate ?? null,
      sex: input.sex ?? null,
      lead_source: input.leadSource ?? null,
    })
    .select("*")
    .single();
  return mapPatient(throwIfError(res));
}

// --- disponibilidade ----------------------------------------------------------

export async function getAvailability(professionalId: string): Promise<AvailabilityBlock[]> {
  const supabase = await createClient();
  const res = await supabase
    .from("availabilities")
    .select("*")
    .eq("professional_id", professionalId)
    .order("weekday")
    .order("start_time");
  return throwIfError(res).map(mapAvailability);
}

export interface AvailabilityBlockInput {
  weekday: number;
  startTime: string;
  endTime: string;
  slotDurationMin: number;
  maxEncaixesPerDay: number;
}

export async function saveAvailability(professionalId: string, blocks: AvailabilityBlockInput[]) {
  const supabase = await createClient();
  const clinicId = await currentClinicId(supabase);
  // troca a grade inteira do profissional — mais simples e seguro que tentar
  // casar blocos antigos com novos id a id.
  const del = await supabase.from("availabilities").delete().eq("professional_id", professionalId);
  if (del.error) throw new Error(del.error.message);
  if (blocks.length === 0) return [];
  const res = await supabase
    .from("availabilities")
    .insert(
      blocks.map((b) => ({
        clinic_id: clinicId,
        professional_id: professionalId,
        weekday: b.weekday,
        start_time: b.startTime,
        end_time: b.endTime,
        slot_duration_min: b.slotDurationMin,
        max_encaixes_per_day: b.maxEncaixesPerDay,
      })),
    )
    .select("*");
  return throwIfError(res).map(mapAvailability);
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export async function getWeeklyCapacity(professionalId: string) {
  const blocks = await getAvailability(professionalId);
  const totalMinutes = blocks.reduce(
    (sum, b) => sum + (timeToMinutes(b.endTime) - timeToMinutes(b.startTime)),
    0,
  );
  const slots = blocks.reduce((sum, b) => {
    const span = timeToMinutes(b.endTime) - timeToMinutes(b.startTime);
    return sum + Math.floor(span / Math.max(1, b.slotDurationMin));
  }, 0);
  const avgDurationMin = blocks.length
    ? Math.round(blocks.reduce((s, b) => s + b.slotDurationMin, 0) / blocks.length)
    : 0;
  return { totalHours: Math.round((totalMinutes / 60) * 10) / 10, slots, avgDurationMin };
}

// --- agenda / agendamentos ------------------------------------------------------

const APPOINTMENT_SELECT = "*, appointment_procedures(*)";

function localDateRangeUtc(dateIso: string) {
  // Aproximação America/Fortaleza (UTC-3) sem lib de timezone nesta rodada —
  // mesma limitação que a versão em memória tinha.
  const start = new Date(`${dateIso}T00:00:00-03:00`).toISOString();
  const end = new Date(`${dateIso}T23:59:59.999-03:00`).toISOString();
  return { start, end };
}

export async function getDaySchedule(professionalId: string, dateIso: string): Promise<Appointment[]> {
  const { start, end } = localDateRangeUtc(dateIso);
  const supabase = await createClient();
  const res = await supabase
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .eq("professional_id", professionalId)
    .gte("starts_at", start)
    .lte("starts_at", end)
    .order("starts_at");
  return throwIfError(res).map(mapAppointment);
}

export async function listCheckinBoard(dateIso: string): Promise<Appointment[]> {
  const { start, end } = localDateRangeUtc(dateIso);
  const supabase = await createClient();
  const res = await supabase
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .gte("starts_at", start)
    .lte("starts_at", end)
    .order("starts_at");
  return throwIfError(res).map(mapAppointment);
}

export async function getAppointment(appointmentId: string): Promise<Appointment | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .eq("id", appointmentId)
    .maybeSingle();
  return data ? mapAppointment(data) : null;
}

export interface CreateAppointmentInput {
  patientId: string;
  professionalId: string;
  startsAt: string;
  endsAt: string;
  isEncaixe: boolean;
  isRetorno: boolean;
  leadSource?: string;
  referringProfessionalId?: string;
  notes?: string;
  procedures: AppointmentProcedureInput[];
}

export class ScheduleConflictError extends Error {
  constructor() {
    super("Esse profissional já tem um agendamento nesse horário. Marque como encaixe se for intencional.");
  }
}

function isExclusionViolation(error: { code?: string; message: string }): boolean {
  return error.code === "23P01" || error.message.includes("no_overlap_unless_encaixe");
}

export async function createAppointment(input: CreateAppointmentInput): Promise<Appointment> {
  const supabase = await createClient();
  const clinicId = await currentClinicId(supabase);

  const { data: appointment, error } = await supabase
    .from("appointments")
    .insert({
      clinic_id: clinicId,
      patient_id: input.patientId,
      professional_id: input.professionalId,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      is_encaixe: input.isEncaixe,
      is_retorno: input.isRetorno,
      lead_source: input.leadSource ?? null,
      referring_professional_id: input.referringProfessionalId ?? null,
      notes: input.notes ?? null,
      status: "nao_confirmado",
    })
    .select("*")
    .single();

  if (error) {
    if (isExclusionViolation(error)) throw new ScheduleConflictError();
    throw new Error(error.message);
  }

  if (input.procedures.length > 0) {
    const res = await supabase.from("appointment_procedures").insert(
      input.procedures.map((p) => ({
        appointment_id: appointment.id,
        procedure_id: p.procedureId,
        duration_min: p.durationMin,
        payment_mode: p.paymentMode,
        insurance_id: p.insuranceId ?? null,
        price_cents: p.priceCents,
        location_id: p.locationId ?? null,
        equipment_id: p.equipmentId ?? null,
      })),
    );
    if (res.error) throw new Error(res.error.message);
  }

  return (await getAppointment(appointment.id))!;
}

export interface UpdateAppointmentInput {
  startsAt?: string;
  endsAt?: string;
  status?: AppointmentStatus;
  isEncaixe?: boolean;
  isRetorno?: boolean;
  notes?: string;
  procedures?: AppointmentProcedureInput[];
}

export async function updateAppointment(appointmentId: string, patch: UpdateAppointmentInput): Promise<Appointment> {
  const supabase = await createClient();

  const columns: Record<string, unknown> = {};
  if (patch.startsAt !== undefined) columns.starts_at = patch.startsAt;
  if (patch.endsAt !== undefined) columns.ends_at = patch.endsAt;
  if (patch.status !== undefined) columns.status = patch.status;
  if (patch.isEncaixe !== undefined) columns.is_encaixe = patch.isEncaixe;
  if (patch.isRetorno !== undefined) columns.is_retorno = patch.isRetorno;
  if (patch.notes !== undefined) columns.notes = patch.notes;

  if (Object.keys(columns).length > 0) {
    const { error } = await supabase.from("appointments").update(columns).eq("id", appointmentId);
    if (error) {
      if (isExclusionViolation(error)) throw new ScheduleConflictError();
      throw new Error(error.message);
    }
  }

  if (patch.procedures) {
    const del = await supabase.from("appointment_procedures").delete().eq("appointment_id", appointmentId);
    if (del.error) throw new Error(del.error.message);
    const res = await supabase.from("appointment_procedures").insert(
      patch.procedures.map((p) => ({
        appointment_id: appointmentId,
        procedure_id: p.procedureId,
        duration_min: p.durationMin,
        payment_mode: p.paymentMode,
        insurance_id: p.insuranceId ?? null,
        price_cents: p.priceCents,
        location_id: p.locationId ?? null,
        equipment_id: p.equipmentId ?? null,
      })),
    );
    if (res.error) throw new Error(res.error.message);
  }

  return (await getAppointment(appointmentId))!;
}

export async function deleteAppointment(appointmentId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("appointments").delete().eq("id", appointmentId);
  if (error) throw new Error(error.message);
}

export async function repeatAppointment(appointmentId: string, dates: string[]): Promise<Appointment[]> {
  const base = await getAppointment(appointmentId);
  if (!base) throw new Error("Agendamento não encontrado");
  const supabase = await createClient();
  const clinicId = await currentClinicId(supabase);

  const groupId = base.repeatGroupId ?? base.id;
  if (!base.repeatGroupId) {
    const { error } = await supabase
      .from("appointments")
      .update({ repeat_group_id: groupId })
      .eq("id", appointmentId);
    if (error) throw new Error(error.message);
  }

  const baseStart = new Date(base.startsAt);
  const baseEnd = new Date(base.endsAt);
  const created: Appointment[] = [];

  for (const dateIso of dates) {
    const startsAt = new Date(`${dateIso}T00:00:00`);
    startsAt.setHours(baseStart.getHours(), baseStart.getMinutes(), 0, 0);
    const endsAt = new Date(`${dateIso}T00:00:00`);
    endsAt.setHours(baseEnd.getHours(), baseEnd.getMinutes(), 0, 0);

    const { data: appointment, error } = await supabase
      .from("appointments")
      .insert({
        clinic_id: clinicId,
        patient_id: base.patientId,
        professional_id: base.professionalId,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        is_encaixe: base.isEncaixe,
        is_retorno: base.isRetorno,
        lead_source: base.leadSource ?? null,
        notes: base.notes ?? null,
        repeat_group_id: groupId,
        status: "nao_confirmado",
      })
      .select("*")
      .single();
    if (error) {
      if (isExclusionViolation(error)) throw new ScheduleConflictError();
      throw new Error(error.message);
    }

    if (base.procedures.length > 0) {
      const res = await supabase.from("appointment_procedures").insert(
        base.procedures.map((p) => ({
          appointment_id: appointment.id,
          procedure_id: p.procedureId,
          duration_min: p.durationMin,
          payment_mode: p.paymentMode,
          insurance_id: p.insuranceId ?? null,
          price_cents: p.priceCents,
          location_id: p.locationId ?? null,
          equipment_id: p.equipmentId ?? null,
        })),
      );
      if (res.error) throw new Error(res.error.message);
    }
    created.push((await getAppointment(appointment.id))!);
  }

  return created;
}

export async function stopRepeat(repeatGroupId: string, fromDateIso: string) {
  const supabase = await createClient();
  const { start } = localDateRangeUtc(fromDateIso);
  const { error } = await supabase
    .from("appointments")
    .delete()
    .eq("repeat_group_id", repeatGroupId)
    .gte("starts_at", start);
  if (error) throw new Error(error.message);
}

export async function checkIn(appointmentId: string): Promise<Appointment> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from("appointments")
    .update({ status: "em_atendimento", checked_in_at: nowIso })
    .eq("id", appointmentId);
  if (error) throw new Error(error.message);

  const appt = (await getAppointment(appointmentId))!;
  const clinicId = await currentClinicId(supabase);
  const wl = await supabase.from("waitlist_entries").insert({
    clinic_id: clinicId,
    patient_id: appt.patientId,
    professional_id: appt.professionalId,
    arrived_at: nowIso,
  });
  if (wl.error) throw new Error(wl.error.message);
  return appt;
}

export async function checkOut(appointmentId: string): Promise<Appointment> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from("appointments")
    .update({ status: "atendido", checked_out_at: nowIso })
    .eq("id", appointmentId);
  if (error) throw new Error(error.message);

  const appt = (await getAppointment(appointmentId))!;
  const upd = await supabase
    .from("waitlist_entries")
    .update({ attended_at: nowIso })
    .eq("patient_id", appt.patientId)
    .is("attended_at", null);
  if (upd.error) throw new Error(upd.error.message);
  return appt;
}

// --- fila de espera -------------------------------------------------------------

export async function listWaitlist(professionalId?: string): Promise<WaitlistEntry[]> {
  const supabase = await createClient();
  let query = supabase.from("waitlist_entries").select("*").is("attended_at", null).order("arrived_at");
  if (professionalId) query = query.eq("professional_id", professionalId);
  const res = await query;
  return throwIfError(res).map(mapWaitlistEntry);
}

export async function addToWaitlist(patientId: string, professionalId?: string): Promise<WaitlistEntry> {
  const supabase = await createClient();
  const clinicId = await currentClinicId(supabase);
  const res = await supabase
    .from("waitlist_entries")
    .insert({ clinic_id: clinicId, patient_id: patientId, professional_id: professionalId ?? null })
    .select("*")
    .single();
  return mapWaitlistEntry(throwIfError(res));
}

export async function removeFromWaitlist(entryId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("waitlist_entries").delete().eq("id", entryId);
  if (error) throw new Error(error.message);
}

// --- confirmação em lote ----------------------------------------------------------

export interface ConfirmationQueueFilters {
  fromDateIso: string;
  toDateIso: string;
  professionalId?: string;
}

const CLOSED_STATUSES: AppointmentStatus[] = [
  "cancelado_pelo_profissional",
  "desmarcado_pelo_paciente",
  "nao_compareceu",
];

export async function listConfirmationQueue(filters: ConfirmationQueueFilters) {
  const { start } = localDateRangeUtc(filters.fromDateIso);
  const { end } = localDateRangeUtc(filters.toDateIso);
  const supabase = await createClient();
  let query = supabase
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .gte("starts_at", start)
    .lte("starts_at", end)
    .not("status", "in", `(${CLOSED_STATUSES.join(",")})`);
  if (filters.professionalId) query = query.eq("professional_id", filters.professionalId);
  const res = await query;
  const inWindow = throwIfError(res).map(mapAppointment);

  const pending = inWindow.filter((a) => !a.confirmedAt);
  const confirmedInRange = inWindow.filter((a) => a.confirmedAt);
  const total = pending.length + confirmedInRange.length;
  const percentConfirmed = total === 0 ? 0 : Math.round((confirmedInRange.length / total) * 100);
  return { pending, confirmedCount: confirmedInRange.length, percentConfirmed };
}

const PRE_VISIT_STATUSES: AppointmentStatus[] = ["nao_confirmado", "aguardando"];

export async function confirmAppointment(appointmentId: string): Promise<Appointment> {
  const current = await getAppointment(appointmentId);
  if (!current) throw new Error("Agendamento não encontrado");
  const supabase = await createClient();
  const { error } = await supabase
    .from("appointments")
    .update({
      confirmed_at: new Date().toISOString(),
      status: PRE_VISIT_STATUSES.includes(current.status) ? "confirmado" : current.status,
    })
    .eq("id", appointmentId);
  if (error) throw new Error(error.message);
  return (await getAppointment(appointmentId))!;
}

// --- painel de chamada: tipos de senha, guichês ----------------------------------

export async function getTicketTypes(): Promise<TicketType[]> {
  const supabase = await createClient();
  const res = await supabase.from("ticket_types").select("*").order("name");
  return throwIfError(res).map(mapTicketType);
}

export async function getActiveTicketTypes(): Promise<TicketType[]> {
  const supabase = await createClient();
  const res = await supabase.from("ticket_types").select("*").eq("active", true).order("name");
  return throwIfError(res).map(mapTicketType);
}

/** Pro totem — rota pública, sem sessão. Service role. */
export async function getActiveTicketTypesPublic(): Promise<TicketType[]> {
  const supabase = createServiceClient();
  const res = await supabase.from("ticket_types").select("*").eq("active", true).order("name");
  return throwIfError(res).map(mapTicketType);
}

export async function getTicketType(ticketTypeId: string): Promise<TicketType | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("ticket_types").select("*").eq("id", ticketTypeId).maybeSingle();
  return data ? mapTicketType(data) : null;
}

export interface TicketTypeInput {
  name: string;
  colorHex: string;
  prefix: string;
  startNumber: number;
  active: boolean;
}

export async function saveTicketType(ticketTypeId: string | null, input: TicketTypeInput): Promise<TicketType> {
  const supabase = await createClient();
  const columns = {
    name: input.name,
    color_hex: input.colorHex,
    prefix: input.prefix,
    start_number: input.startNumber,
    active: input.active,
  };
  if (ticketTypeId) {
    const res = await supabase.from("ticket_types").update(columns).eq("id", ticketTypeId).select("*").single();
    return mapTicketType(throwIfError(res));
  }
  const clinicId = await currentClinicId(supabase);
  const res = await supabase
    .from("ticket_types")
    .insert({ ...columns, clinic_id: clinicId })
    .select("*")
    .single();
  return mapTicketType(throwIfError(res));
}

export async function deleteTicketType(ticketTypeId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("ticket_types").delete().eq("id", ticketTypeId);
  if (error) throw new Error(error.message);
}

export async function getCounters(): Promise<Counter[]> {
  const supabase = await createClient();
  const res = await supabase.from("counters").select("*").order("name");
  return throwIfError(res).map(mapCounter);
}

/** Pro painel de TV — rota pública, sem sessão. Service role. */
export async function getCountersPublic(): Promise<Counter[]> {
  const supabase = createServiceClient();
  const res = await supabase.from("counters").select("*").order("name");
  return throwIfError(res).map(mapCounter);
}

export async function getCounter(counterId: string): Promise<Counter | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("counters").select("*").eq("id", counterId).maybeSingle();
  return data ? mapCounter(data) : null;
}

export interface CounterInput {
  name: string;
  coveredLocationIds: string[];
}

export async function saveCounter(counterId: string | null, input: CounterInput): Promise<Counter> {
  const supabase = await createClient();
  const columns = { name: input.name, covered_location_ids: input.coveredLocationIds };
  if (counterId) {
    const res = await supabase.from("counters").update(columns).eq("id", counterId).select("*").single();
    return mapCounter(throwIfError(res));
  }
  const clinicId = await currentClinicId(supabase);
  const res = await supabase
    .from("counters")
    .insert({ ...columns, clinic_id: clinicId })
    .select("*")
    .single();
  return mapCounter(throwIfError(res));
}

export async function deleteCounter(counterId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("counters").delete().eq("id", counterId);
  if (error) throw new Error(error.message);
}

// --- painel de chamada: fila de senhas -----------------------------------------

/** Pede o Map uma vez (`getTicketTypesById`) e reusa em cada chamada — evita
 * 1 query por senha ao montar fila/histórico. */
export function ticketCode(ticket: Pick<Ticket, "ticketTypeId" | "number">, ticketTypesById: Map<string, TicketType>): string {
  const prefix = ticketTypesById.get(ticket.ticketTypeId)?.prefix ?? "???";
  return `${prefix}${ticket.number}`;
}

export async function getTicketTypesById(): Promise<Map<string, TicketType>> {
  const types = await getTicketTypes();
  return new Map(types.map((t) => [t.id, t]));
}

/** Versão pra rotas públicas (totem/TV) — service role, sem RLS. */
export async function getTicketTypesByIdPublic(): Promise<Map<string, TicketType>> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("ticket_types").select("*");
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((row) => [row.id, mapTicketType(row)]));
}

/** Emite a senha via a função atômica `issue_ticket` (evita número repetido
 * se dois totens baterem ao mesmo tempo). Rota pública — service role. */
export async function issueTicket(ticketTypeId: string): Promise<Ticket> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("issue_ticket", { p_ticket_type_id: ticketTypeId });
  if (error) throw new Error(error.message);
  return mapTicket(data);
}

export interface QueueFilters {
  ticketTypeId?: string;
}

export async function listQueue(filters: QueueFilters = {}): Promise<Ticket[]> {
  const supabase = await createClient();
  let query = supabase.from("tickets").select("*").eq("status", "aguardando").order("created_at");
  if (filters.ticketTypeId) query = query.eq("ticket_type_id", filters.ticketTypeId);
  const res = await query;
  return throwIfError(res).map(mapTicket);
}

export async function listLastCalled(limit = 10): Promise<Ticket[]> {
  const supabase = await createClient();
  const res = await supabase
    .from("tickets")
    .select("*")
    .in("status", ["chamado", "atendido"])
    .order("called_at", { ascending: false })
    .limit(limit);
  return throwIfError(res).map(mapTicket);
}

/** Pro painel de TV — rota pública, sem sessão. Service role. */
export async function listLastCalledPublic(limit = 10): Promise<Ticket[]> {
  const supabase = createServiceClient();
  const res = await supabase
    .from("tickets")
    .select("*")
    .in("status", ["chamado", "atendido"])
    .order("called_at", { ascending: false })
    .limit(limit);
  return throwIfError(res).map(mapTicket);
}

export async function getCurrentCall(): Promise<Ticket | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tickets")
    .select("*")
    .eq("status", "chamado")
    .order("called_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? mapTicket(data) : null;
}

/** Pro painel de TV — rota pública, sem sessão. Service role. */
export async function getCurrentCallPublic(): Promise<Ticket | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("tickets")
    .select("*")
    .eq("status", "chamado")
    .order("called_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? mapTicket(data) : null;
}

export async function callNextTicket(counterId: string, ticketTypeId?: string): Promise<Ticket> {
  const queue = await listQueue({ ticketTypeId });
  const next = queue[0];
  if (!next) throw new Error("Não há senhas aguardando nessa fila.");
  return callTicket(next.id, counterId);
}

export async function callTicket(ticketId: string, counterId: string): Promise<Ticket> {
  const supabase = await createClient();
  const res = await supabase
    .from("tickets")
    .update({ status: "chamado", counter_id: counterId, called_at: new Date().toISOString() })
    .eq("id", ticketId)
    .select("*")
    .single();
  return mapTicket(throwIfError(res));
}

export async function recallTicket(ticketId: string): Promise<Ticket> {
  const supabase = await createClient();
  const res = await supabase
    .from("tickets")
    .update({ called_at: new Date().toISOString() })
    .eq("id", ticketId)
    .select("*")
    .single();
  return mapTicket(throwIfError(res));
}

export async function removeTicket(ticketId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tickets").update({ status: "removido" }).eq("id", ticketId);
  if (error) throw new Error(error.message);
}

export async function getQueueCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .eq("status", "aguardando");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Pro painel de TV — rota pública, sem sessão. Service role. */
export async function getQueueCountPublic(): Promise<number> {
  const supabase = createServiceClient();
  const { count, error } = await supabase
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .eq("status", "aguardando");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

// --- painel de chamada: config visual da TV -------------------------------------

// Antes de salvar pela primeira vez (ex.: clínica recém-criada sem rodar o
// seed), não existe linha em tv_board_configs ainda — cai nesses defaults
// em vez de quebrar a tela.
const DEFAULT_TV_BOARD_CONFIG: TvBoardConfig = {
  template: "padrao",
  color1: "#1d55d6",
  color2: "#161a20",
  color3: "#5b6472",
  backgroundColor: "#f5f6f8",
  intervalSeconds: 6,
  showProfessionalName: false,
  showLocationName: true,
  voiceCall: true,
  callMoreThanOnce: true,
  preConsulta: false,
  posConsulta: false,
  showLastCalled: true,
  showPatientBirthdate: false,
  beepTwiceOnly: true,
  mutedVideo: false,
};

export async function getTvBoardConfig(): Promise<TvBoardConfig> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tv_board_configs").select("*").limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapTvBoardConfig(data) : DEFAULT_TV_BOARD_CONFIG;
}

/** Pro painel de TV — rota pública, sem sessão. Service role. */
export async function getTvBoardConfigPublic(): Promise<TvBoardConfig> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("tv_board_configs").select("*").limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapTvBoardConfig(data) : DEFAULT_TV_BOARD_CONFIG;
}

export async function saveTvBoardConfig(config: TvBoardConfig): Promise<TvBoardConfig> {
  const supabase = await createClient();
  const clinicId = await currentClinicId(supabase);
  const columns = {
    clinic_id: clinicId,
    template: config.template,
    logo_url: config.logoUrl ?? null,
    color_1: config.color1,
    color_2: config.color2,
    color_3: config.color3,
    background_color: config.backgroundColor,
    interval_seconds: config.intervalSeconds,
    youtube_video_id: config.youtubeVideoId ?? null,
    show_professional_name: config.showProfessionalName,
    show_location_name: config.showLocationName,
    voice_call: config.voiceCall,
    call_more_than_once: config.callMoreThanOnce,
    pre_consulta: config.preConsulta,
    pos_consulta: config.posConsulta,
    show_last_called: config.showLastCalled,
    show_patient_birthdate: config.showPatientBirthdate,
    beep_twice_only: config.beepTwiceOnly,
    muted_video: config.mutedVideo,
    updated_at: new Date().toISOString(),
  };
  const res = await supabase.from("tv_board_configs").upsert(columns, { onConflict: "clinic_id" }).select("*").single();
  return mapTvBoardConfig(throwIfError(res));
}
