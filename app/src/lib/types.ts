export type AppointmentStatus =
  | "aguardando"
  | "aguardando_pagamento"
  | "atendido"
  | "cancelado_pelo_profissional"
  | "chamando"
  | "desmarcado_pelo_paciente"
  | "em_atendimento"
  | "confirmado"
  | "nao_confirmado"
  | "nao_compareceu"
  | "remarcado";

export type PaymentMode = "particular" | "convenio";

export interface Professional {
  id: string;
  fullName: string;
  specialty: string;
  minAge?: number;
  notes?: string;
  phone?: string;
  active: boolean;
}

export interface Location {
  id: string;
  name: string;
}

export interface Equipment {
  id: string;
  name: string;
}

export interface Procedure {
  id: string;
  name: string;
  specialty?: string;
  defaultDurationMin: number;
  defaultPriceCents: number;
}

export interface Insurance {
  id: string;
  name: string;
}

export interface AvailabilityBlock {
  id: string;
  professionalId: string;
  weekday: number; // 0 = domingo .. 6 = sábado
  startTime: string; // "HH:mm"
  endTime: string;
  slotDurationMin: number;
  maxEncaixesPerDay: number;
}

export interface Patient {
  id: string;
  fullName: string;
  cpf?: string;
  hasNoCpf: boolean;
  birthDate?: string; // ISO date
  sex?: "masculino" | "feminino" | "indefinido";
  mobilePhone: string;
  phone?: string;
  email?: string;
  leadSource?: string;
  createdAt: string;
}

export interface AppointmentProcedureInput {
  procedureId: string;
  durationMin: number;
  paymentMode: PaymentMode;
  insuranceId?: string;
  priceCents: number;
  locationId?: string;
  equipmentId?: string;
}

export interface AppointmentProcedureRecord extends AppointmentProcedureInput {
  id: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  professionalId: string;
  startsAt: string; // ISO datetime
  endsAt: string;
  status: AppointmentStatus;
  isEncaixe: boolean;
  isRetorno: boolean;
  leadSource?: string;
  referringProfessionalId?: string;
  repeatGroupId?: string;
  notes?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  confirmedAt?: string;
  confirmationSentAt?: string;
  procedures: AppointmentProcedureRecord[];
  createdAt: string;
}

export interface WaitlistEntry {
  id: string;
  patientId: string;
  professionalId?: string;
  arrivedAt: string;
  attendedAt?: string;
}

// --- painel de chamada: totem, guichês, chamada de TV ----------------------

export interface TicketType {
  id: string;
  name: string;
  colorHex: string;
  prefix: string;
  startNumber: number;
  active: boolean;
}

export interface Counter {
  id: string;
  name: string;
  coveredLocationIds: string[];
}

export type TicketStatus = "aguardando" | "chamado" | "atendido" | "removido";

export interface Ticket {
  id: string;
  ticketTypeId: string;
  number: number;
  status: TicketStatus;
  counterId?: string;
  calledAt?: string;
  createdAt: string;
}

export interface TvBoardConfig {
  template: string;
  logoUrl?: string;
  color1: string;
  color2: string;
  color3: string;
  backgroundColor: string;
  intervalSeconds: number;
  youtubeVideoId?: string;
  showProfessionalName: boolean;
  showLocationName: boolean;
  voiceCall: boolean;
  callMoreThanOnce: boolean;
  preConsulta: boolean;
  posConsulta: boolean;
  showLastCalled: boolean;
  showPatientBirthdate: boolean;
  beepTwiceOnly: boolean;
  mutedVideo: boolean;
}
