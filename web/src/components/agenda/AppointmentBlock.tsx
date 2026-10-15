import { Flash, Refresh2, UserAdd } from "iconsax-reactjs";
import { insuranceName, patientById, procedureById, type Appointment } from "@/lib/mock/core";
import { APPOINTMENT_STATUS } from "@/lib/status";
import { cn } from "@/lib/cn";

const TONE_DOT: Record<string, string> = {
  success: "bg-success",
  warning: "bg-warning",
  info: "bg-info",
  accent: "bg-accent",
  neutral: "bg-text-subtle",
  danger: "bg-danger",
};

/**
 * Bloco de agendamento posicionado de forma absoluta numa coluna da grade
 * (dia/semana/sala). Densidade do conteúdo se adapta à altura disponível.
 */
export function AppointmentBlock({
  appointment,
  top,
  height,
  colorVar,
  onClick,
  selected = false,
}: {
  appointment: Appointment;
  top: number;
  height: number;
  /** Cor de identidade (ex.: `var(--c-series-2)`) usada na borda esquerda. */
  colorVar?: string;
  onClick: () => void;
  selected?: boolean;
}) {
  const patient = patientById(appointment.patientId);
  const proc = procedureById(appointment.procedureId);
  const status = APPOINTMENT_STATUS[appointment.status];
  const compact = height < 38;
  const tiny = height < 22;

  return (
    <button
      type="button"
      onClick={onClick}
      data-kind={proc?.kind ?? "consulta"}
      data-return={appointment.isRetorno || undefined}
      data-cancelled={["cancelado_pelo_profissional", "desmarcado_pelo_paciente"].includes(appointment.status) || undefined}
      data-selected={selected || undefined}
      aria-label={[appointment.start, patient?.name ?? "Paciente", proc?.name ?? "Agendamento", status.label].join(", ")}
      title={[appointment.start + "–" + appointment.end, patient?.name ?? "Paciente", proc?.name ?? "Agendamento", status.label].join(" · ")}
      style={{ top, height, borderLeftColor: colorVar ?? "var(--c-border-strong)" }}
      className={cn(
        "ms-appointment absolute inset-x-[3px] z-10 flex flex-col overflow-hidden rounded-[11px] border-l-[3px] px-2.5 py-1 text-left focus-visible:outline-none",
      )}
    >
      <span className={cn("flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-text", tiny && "leading-tight")}>
        <span aria-hidden className={cn("h-1.5 w-1.5 shrink-0 rounded-full", TONE_DOT[status.tone])} />
        <span className="shrink-0 tabular">{appointment.start}</span>
        <span className="truncate font-medium text-text/80">{patient?.name ?? "Paciente"}</span>
      </span>
      {!compact && (
        <span className="truncate text-[11px] text-text-muted">{proc?.name}</span>
      )}
      {!compact && height >= 66 && (
        <span className="mt-auto flex flex-wrap items-center gap-1 pt-0.5">
          <span className="truncate text-[10px] font-medium text-text-muted">{status.label}</span>
          {appointment.isEncaixe && <Flash size={11} variant="Bold" className="text-warning" aria-label="Encaixe" />}
          {appointment.isRetorno && <Refresh2 size={11} className="text-info" aria-label="Retorno" />}
          {appointment.isFirstVisit && <UserAdd size={11} className="text-accent" aria-label="1ª consulta" />}
          {appointment.insuranceId !== "i0" && (
            <span className="truncate rounded bg-surface-raised/70 px-1 text-[10px] text-text-subtle">{insuranceName(appointment.insuranceId)}</span>
          )}
        </span>
      )}
    </button>
  );
}
