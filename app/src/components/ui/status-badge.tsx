/**
 * 11 status de agendamento observados na conta real do Feegow, mapeados em
 * 5 grupos de cor (ver replica/design/components.md > StatusBadge).
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

const LABEL: Record<AppointmentStatus, string> = {
  aguardando: "Aguardando",
  aguardando_pagamento: "Aguardando pagamento",
  atendido: "Atendido",
  cancelado_pelo_profissional: "Cancelado pelo profissional",
  chamando: "Chamando",
  desmarcado_pelo_paciente: "Desmarcado pelo paciente",
  em_atendimento: "Em atendimento",
  confirmado: "Confirmado",
  nao_confirmado: "Não confirmado",
  nao_compareceu: "Não compareceu",
  remarcado: "Remarcado",
};

const GROUP_CLASSES: Record<AppointmentStatus, string> = {
  confirmado: "bg-success-bg text-success",
  aguardando: "bg-warning-bg text-warning",
  aguardando_pagamento: "bg-warning-bg text-warning",
  nao_confirmado: "bg-warning-bg text-warning",
  em_atendimento: "bg-info-bg text-info",
  chamando: "bg-info-bg text-info",
  atendido: "bg-accent-muted text-accent",
  cancelado_pelo_profissional: "bg-danger-bg text-danger",
  desmarcado_pelo_paciente: "bg-danger-bg text-danger",
  nao_compareceu: "bg-danger-bg text-danger",
  remarcado: "bg-danger-bg text-danger",
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${GROUP_CLASSES[status]}`}
    >
      {LABEL[status]}
    </span>
  );
}
