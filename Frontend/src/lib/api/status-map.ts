import type { AppointmentStatus } from "@/lib/status";

/**
 * O backend tem 8 status; a interface tem 11 (alguns são derivados: "chamando" vem da fila, "aguardando pagamento" do financeiro).
 * Aqui só o que o backend de fato sabe.
 */
export type BackendStatus = "agendado" | "confirmado" | "check_in" | "em_atendimento" | "atendido" | "cancelado" | "nao_compareceu" | "remarcado";

const TO_FRONT: Record<BackendStatus, AppointmentStatus> = {
  agendado: "nao_confirmado",
  confirmado: "confirmado",
  check_in: "aguardando",
  em_atendimento: "em_atendimento",
  atendido: "atendido",
  cancelado: "desmarcado_pelo_paciente",
  nao_compareceu: "nao_compareceu",
  remarcado: "remarcado",
};

const TO_BACK: Partial<Record<AppointmentStatus, BackendStatus>> = {
  nao_confirmado: "agendado",
  confirmado: "confirmado",
  aguardando: "check_in",
  chamando: "check_in",
  em_atendimento: "em_atendimento",
  atendido: "atendido",
  desmarcado_pelo_paciente: "cancelado",
  cancelado_pelo_profissional: "cancelado",
  nao_compareceu: "nao_compareceu",
  remarcado: "remarcado",
};

export function statusFromBackend(status: string): AppointmentStatus {
  return TO_FRONT[status as BackendStatus] ?? "nao_confirmado";
}

export function statusToBackend(status: AppointmentStatus): BackendStatus | undefined {
  return TO_BACK[status];
}
