/**
 * TEMPORÁRIO — dados de exemplo para visualizar as etiquetas da sala de espera (60+/80+, 1ª vez, encaixe).
 * Para remover: apagar este arquivo e o bloco marcado com "MOCK" em SalaEspera.tsx.
 */
import type { AgendaAppointment } from "@/lib/agenda/model";
import type { BackendStatus } from "@/lib/api/status-map";
import { statusFromBackend } from "@/lib/api/status-map";
import { nowMin, todayIso } from "@/lib/agenda/time";

const hhmm = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(((min % 60) + 60) % 60).padStart(2, "0")}`;

type Row = {
  name: string;
  professionalId: string;
  professionalName: string;
  procedure: string;
  status: BackendStatus;
  /** Minutos desde a chegada (só para quem já chegou). */
  arrivedAgo: number;
  age: number | null;
  firstVisit: boolean | null;
  fitIn: boolean;
};

const ROWS: Row[] = [
  { name: "Maria das Graças Souza", professionalId: "mock-1", professionalName: "Dr. Henrique Lacerda", procedure: "Consulta cardiológica", status: "check_in", arrivedAgo: 26, age: 82, firstVisit: true, fitIn: false },
  { name: "José Ribamar Lima", professionalId: "mock-2", professionalName: "Dr. Gustavo Pimentel", procedure: "Consulta clínica", status: "check_in", arrivedAgo: 14, age: 67, firstVisit: false, fitIn: true },
  { name: "Ana Clara Ferreira", professionalId: "mock-3", professionalName: "Dra. Beatriz Nogueira", procedure: "Consulta ginecológica", status: "check_in", arrivedAgo: 6, age: 34, firstVisit: true, fitIn: true },
  { name: "Bruno Duarte Modelo", professionalId: "mock-2", professionalName: "Dr. Gustavo Pimentel", procedure: "Retorno", status: "check_in", arrivedAgo: 3, age: 41, firstVisit: false, fitIn: false },
  { name: "Francisca Alves Costa", professionalId: "mock-1", professionalName: "Dr. Henrique Lacerda", procedure: "Holter 24h", status: "em_atendimento", arrivedAgo: 40, age: 73, firstVisit: false, fitIn: false },
  { name: "Lucas Pereira Gomes", professionalId: "mock-4", professionalName: "Dra. Fernanda Quintela", procedure: "Consulta pediátrica", status: "em_atendimento", arrivedAgo: 22, age: 7, firstVisit: true, fitIn: false },
  { name: "Raimundo Nonato Silva", professionalId: "mock-3", professionalName: "Dra. Beatriz Nogueira", procedure: "Consulta ginecológica", status: "atendido", arrivedAgo: 95, age: 61, firstVisit: false, fitIn: true },
  { name: "Carla Mendes Rocha", professionalId: "mock-4", professionalName: "Dra. Fernanda Quintela", procedure: "Consulta pediátrica", status: "atendido", arrivedAgo: 80, age: 29, firstVisit: false, fitIn: false },
];

export const MOCK_SPECIALTY: Record<string, string> = {
  "mock-1": "Cardiologia",
  "mock-2": "Clínica geral",
  "mock-3": "Ginecologia",
  "mock-4": "Pediatria",
};

export function mockWaitingRoom(): AgendaAppointment[] {
  const now = nowMin();
  const date = todayIso();
  return ROWS.map((r, i) => {
    const arrived = now - r.arrivedAgo;
    const start = Math.ceil((arrived + 5) / 10) * 10;
    return {
      id: `mock-${i}`,
      date,
      start: hhmm(start),
      end: hhmm(start + 20),
      professionalId: r.professionalId,
      professionalName: r.professionalName,
      patientId: `mock-paciente-${i}`,
      patientName: r.name,
      patientPhone: null,
      procedureId: "mock",
      procedureName: r.procedure,
      procedureKind: "consulta",
      status: statusFromBackend(r.status),
      backendStatus: r.status,
      version: 0,
      channel: "mock",
      notes: null,
      priceCents: null,
      arrivedAt: hhmm(arrived),
      startIso: "",
      patientAge: r.age,
      firstVisit: r.firstVisit,
      fitIn: r.fitIn,
    };
  });
}
