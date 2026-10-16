import type { Tone } from "@/components/ui/badge";

/**
 * 11 status de agendamento observados no original, agrupados em 5 tons
 * (ver replica/design/components.md > StatusBadge).
 */
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

export const APPOINTMENT_STATUS: Record<AppointmentStatus, { label: string; tone: Tone }> = {
  confirmado: { label: "Confirmado", tone: "success" },
  nao_confirmado: { label: "Não confirmado", tone: "warning" },
  aguardando: { label: "Aguardando", tone: "warning" },
  aguardando_pagamento: { label: "Aguardando pagamento", tone: "warning" },
  chamando: { label: "Chamando", tone: "info" },
  em_atendimento: { label: "Em atendimento", tone: "info" },
  atendido: { label: "Atendido", tone: "accent" },
  remarcado: { label: "Remarcado", tone: "neutral" },
  cancelado_pelo_profissional: { label: "Cancelado pelo profissional", tone: "danger" },
  desmarcado_pelo_paciente: { label: "Desmarcado pelo paciente", tone: "danger" },
  nao_compareceu: { label: "Não compareceu", tone: "danger" },
};
