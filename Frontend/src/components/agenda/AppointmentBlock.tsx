import { Clock, Flash, Refresh2, UserAdd } from "iconsax-reactjs";
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
  onClick,
  selected = false,
}: {
  appointment: Appointment;
  top: number;
  height: number;
  onClick: () => void;
  selected?: boolean;
}) {
  const patient = patientById(appointment.patientId);
  const proc = procedureById(appointment.procedureId);
  const status = APPOINTMENT_STATUS[appointment.status];
  // Densidade por altura: 1 linha (nome + hora) → nome / hora → + procedimento → + status e marcadores.
  const compact = height < 46;
  const showProc = height >= 70;
  const showFooter = height >= 104;
  const statusDot = <span aria-hidden className={cn("h-2 w-2 shrink-0 rounded-full", TONE_DOT[status.tone])} />;

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
      style={{ top, height }}
      className={cn(
        "ms-appointment absolute inset-x-1 z-10 flex flex-col overflow-hidden text-left focus-visible:outline-none",
        compact ? "justify-center rounded-md px-2.5" : "gap-0.5 rounded-lg px-3 py-1.5",
      )}
    >
      {compact ? (
        <span className="flex min-w-0 items-center gap-1.5 text-[12px] leading-tight">
          {statusDot}
          <span className="ms-appointment__name truncate font-semibold text-text">{patient?.name ?? "Paciente"}</span>
          <span className="ms-appointment__meta ml-auto shrink-0 tabular text-[11px] font-medium">{appointment.start}</span>
        </span>
      ) : (
        <>
          <span className={cn("ms-appointment__name text-[13px] font-semibold leading-snug text-text", showFooter ? "line-clamp-2" : "truncate")}>
            {patient?.name ?? "Paciente"}
          </span>
          <span className="ms-appointment__meta flex min-w-0 items-center gap-1.5 text-[11px] font-medium">
            <Clock size={12} aria-hidden className="shrink-0" />
            <span className="tabular truncate">{appointment.start} – {appointment.end}</span>
            {statusDot}
          </span>
        </>
      )}
      {showProc && (
        <span className="ms-appointment__meta truncate text-[11px]">{proc?.name}</span>
      )}
      {showFooter && (
        <span className="mt-auto flex flex-wrap items-center gap-1 pt-0.5">
          <span className="ms-appointment__meta truncate text-[10px] font-medium">{status.label}</span>
          {appointment.isEncaixe && <Flash size={11} variant="Bold" className="text-warning" aria-label="Encaixe" />}
          {appointment.isRetorno && <Refresh2 size={11} className="text-info" aria-label="Retorno" />}
          {appointment.isFirstVisit && <UserAdd size={11} className="text-accent" aria-label="1ª consulta" />}
          {appointment.insuranceId !== "i0" && (
            <span className="truncate rounded-full bg-surface-raised/70 px-1.5 text-[10px] text-text-subtle">{insuranceName(appointment.insuranceId)}</span>
          )}
        </span>
      )}
    </button>
  );
}
