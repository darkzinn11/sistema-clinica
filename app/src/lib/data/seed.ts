import type {
  Appointment,
  AvailabilityBlock,
  Counter,
  Equipment,
  Insurance,
  Location,
  Patient,
  Procedure,
  Professional,
  TicketType,
  TvBoardConfig,
  WaitlistEntry,
} from "@/lib/types";

/**
 * Dados fictícios só para o protótipo rodar com algo na tela. Nomes e
 * números inventados aqui — nada vem da conta real usada no recon (ver
 * replica/recon.md, nota de privacidade).
 */

export const professionals: Professional[] = [
  {
    id: "prof-1",
    fullName: "Dra. Camila Esteves",
    specialty: "Ultrassonografia",
    minAge: 10,
    phone: "(98) 90000-0001",
    active: true,
  },
  {
    id: "prof-2",
    fullName: "Dra. Beatriz Nogueira",
    specialty: "Ginecologia",
    phone: "(98) 90000-0002",
    active: true,
  },
  {
    id: "prof-3",
    fullName: "Dr. Rafael Montenegro",
    specialty: "Psicologia",
    phone: "(98) 90000-0003",
    active: true,
  },
];

export const locations: Location[] = [
  { id: "loc-1", name: "Sala de Ultrassom" },
  { id: "loc-2", name: "Consultório 1" },
  { id: "loc-3", name: "Consultório 2" },
];

export const equipmentList: Equipment[] = [{ id: "eq-1", name: "Aparelho de Ultrassom" }];

export const procedures: Procedure[] = [
  { id: "proc-1", name: "US Obstétrico", specialty: "Ultrassonografia", defaultDurationMin: 20, defaultPriceCents: 19000 },
  { id: "proc-2", name: "US Morfológico 1º Trimestre", specialty: "Ultrassonografia", defaultDurationMin: 30, defaultPriceCents: 30000 },
  { id: "proc-3", name: "US Abdome Total", specialty: "Ultrassonografia", defaultDurationMin: 20, defaultPriceCents: 11000 },
  { id: "proc-4", name: "Consulta Ginecológica", specialty: "Ginecologia", defaultDurationMin: 30, defaultPriceCents: 17000 },
  { id: "proc-5", name: "Sessão de Psicoterapia", specialty: "Psicologia", defaultDurationMin: 50, defaultPriceCents: 14000 },
];

export const insurances: Insurance[] = [
  { id: "ins-1", name: "Saúde Bem Estar" },
  { id: "ins-2", name: "Vida Plena Saúde" },
];

function weekday(dateIso: string): number {
  return new Date(`${dateIso}T12:00:00`).getDay();
}

export const availabilities: AvailabilityBlock[] = [
  { id: "av-1", professionalId: "prof-1", weekday: 2, startTime: "14:00", endTime: "18:00", slotDurationMin: 10, maxEncaixesPerDay: 3 },
  { id: "av-2", professionalId: "prof-1", weekday: 4, startTime: "14:00", endTime: "17:30", slotDurationMin: 10, maxEncaixesPerDay: 5 },
  { id: "av-3", professionalId: "prof-2", weekday: 1, startTime: "08:00", endTime: "12:00", slotDurationMin: 30, maxEncaixesPerDay: 2 },
  { id: "av-4", professionalId: "prof-2", weekday: 3, startTime: "08:00", endTime: "12:00", slotDurationMin: 30, maxEncaixesPerDay: 2 },
  { id: "av-5", professionalId: "prof-3", weekday: 1, startTime: "13:00", endTime: "18:00", slotDurationMin: 50, maxEncaixesPerDay: 0 },
  { id: "av-6", professionalId: "prof-3", weekday: 5, startTime: "13:00", endTime: "18:00", slotDurationMin: 50, maxEncaixesPerDay: 0 },
];

export const patients: Patient[] = [
  { id: "pat-1", fullName: "Marina Albuquerque Sousa", hasNoCpf: false, cpf: "111.111.111-11", birthDate: "1990-03-12", sex: "feminino", mobilePhone: "(98) 99100-1001", leadSource: "indicacao", createdAt: "2026-09-01T10:00:00-03:00" },
  { id: "pat-2", fullName: "João Victor Barbosa Lima", hasNoCpf: false, cpf: "222.222.222-22", birthDate: "1985-07-22", sex: "masculino", mobilePhone: "(98) 99100-1002", leadSource: "google", createdAt: "2026-09-03T10:00:00-03:00" },
  { id: "pat-3", fullName: "Helena Castro Fontes", hasNoCpf: false, cpf: "333.333.333-33", birthDate: "1996-11-02", sex: "feminino", mobilePhone: "(98) 99100-1003", leadSource: "instagram", createdAt: "2026-09-05T10:00:00-03:00" },
  { id: "pat-4", fullName: "Eduardo Matos Pereira", hasNoCpf: true, birthDate: "1978-01-30", sex: "masculino", mobilePhone: "(98) 99100-1004", leadSource: "whatsapp", createdAt: "2026-09-08T10:00:00-03:00" },
  { id: "pat-5", fullName: "Larissa Ferreira Dutra", hasNoCpf: false, cpf: "444.444.444-44", birthDate: "1992-05-17", sex: "feminino", mobilePhone: "(98) 99100-1005", leadSource: "indicacao", createdAt: "2026-09-10T10:00:00-03:00" },
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function at(time: string, dateIso = todayIso()): string {
  return new Date(`${dateIso}T${time}:00-03:00`).toISOString();
}

export const seedTodayIso = todayIso();
export const seedWeekday = weekday(seedTodayIso);

export const appointments: Appointment[] = [
  {
    id: "appt-1",
    patientId: "pat-1",
    professionalId: "prof-1",
    startsAt: at("14:30"),
    endsAt: at("14:50"),
    status: "confirmado",
    isEncaixe: false,
    isRetorno: false,
    leadSource: "indicacao",
    procedures: [
      { id: "ap-1", procedureId: "proc-2", durationMin: 20, paymentMode: "particular", priceCents: 30000, locationId: "loc-1", equipmentId: "eq-1" },
    ],
    confirmedAt: "2026-10-10T11:00:00-03:00",
    confirmationSentAt: "2026-10-10T10:00:00-03:00",
    createdAt: "2026-10-01T09:00:00-03:00",
  },
  {
    id: "appt-2",
    patientId: "pat-2",
    professionalId: "prof-1",
    startsAt: at("14:50"),
    endsAt: at("15:10"),
    status: "nao_confirmado",
    isEncaixe: false,
    isRetorno: false,
    procedures: [
      { id: "ap-2", procedureId: "proc-3", durationMin: 20, paymentMode: "particular", priceCents: 11000, locationId: "loc-1", equipmentId: "eq-1" },
    ],
    createdAt: "2026-10-02T09:00:00-03:00",
  },
  {
    id: "appt-3",
    patientId: "pat-3",
    professionalId: "prof-1",
    startsAt: at("15:10"),
    endsAt: at("15:20"),
    status: "em_atendimento",
    isEncaixe: true,
    isRetorno: false,
    procedures: [
      { id: "ap-3", procedureId: "proc-1", durationMin: 10, paymentMode: "convenio", insuranceId: "ins-1", priceCents: 19000, locationId: "loc-1", equipmentId: "eq-1" },
    ],
    createdAt: "2026-10-05T09:00:00-03:00",
  },
  {
    id: "appt-4",
    patientId: "pat-4",
    professionalId: "prof-2",
    startsAt: at("09:00"),
    endsAt: at("09:30"),
    status: "atendido",
    isEncaixe: false,
    isRetorno: true,
    procedures: [
      { id: "ap-4", procedureId: "proc-4", durationMin: 30, paymentMode: "particular", priceCents: 17000, locationId: "loc-2" },
    ],
    checkedInAt: at("08:55"),
    createdAt: "2026-09-20T09:00:00-03:00",
  },
  {
    id: "appt-5",
    patientId: "pat-5",
    professionalId: "prof-3",
    startsAt: at("13:00"),
    endsAt: at("13:50"),
    status: "nao_compareceu",
    isEncaixe: false,
    isRetorno: false,
    procedures: [
      { id: "ap-5", procedureId: "proc-5", durationMin: 50, paymentMode: "convenio", insuranceId: "ins-2", priceCents: 14000, locationId: "loc-3" },
    ],
    createdAt: "2026-09-25T09:00:00-03:00",
  },
];

export const waitlistEntries: WaitlistEntry[] = [];

// --- painel de chamada: totem, guichês, chamada de TV ----------------------

export const ticketTypes: TicketType[] = [
  { id: "tt-1", name: "Consulta", colorHex: "#1a7a4c", prefix: "CON", startNumber: 1, active: true },
  { id: "tt-2", name: "Exames", colorHex: "#1d55d6", prefix: "EXM", startNumber: 1, active: true },
  { id: "tt-3", name: "Laboratório", colorHex: "#7a1a8c", prefix: "LAB", startNumber: 1, active: true },
  { id: "tt-4", name: "Consulta Preferencial", colorHex: "#9a5b00", prefix: "CON P", startNumber: 1, active: true },
  { id: "tt-5", name: "Exames Preferencial", colorHex: "#9a5b00", prefix: "EXM P", startNumber: 1, active: true },
  { id: "tt-6", name: "Laboratório Preferencial", colorHex: "#9a5b00", prefix: "LAB P", startNumber: 1, active: true },
  { id: "tt-7", name: "Retorno", colorHex: "#161a20", prefix: "RET", startNumber: 1, active: true },
  { id: "tt-8", name: "Retorno Preferencial", colorHex: "#9a5b00", prefix: "RET P", startNumber: 1, active: true },
];

export const counters: Counter[] = [
  { id: "ctr-1", name: "Guichê 1", coveredLocationIds: [] },
  { id: "ctr-2", name: "Guichê 2", coveredLocationIds: [] },
  { id: "ctr-3", name: "Guichê 3", coveredLocationIds: ["loc-1"] },
  { id: "ctr-4", name: "Guichê 4", coveredLocationIds: ["loc-1"] },
];

export const tvBoardConfig: TvBoardConfig = {
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
