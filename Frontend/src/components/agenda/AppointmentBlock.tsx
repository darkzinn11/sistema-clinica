import { Clock } from "iconsax-reactjs";
import type { AgendaAppointment as Appointment } from "@/lib/agenda/model";
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
  lane,
  accent,
}: {
  appointment: Appointment;
  top: number;
  height: number;
  onClick: () => void;
  selected?: boolean;
  /** Visão geral: agendamentos de profissionais diferentes ao mesmo tempo dividem a largura da coluna. */
  lane?: { index: number; count: number };
  /** Cor do profissional (visão geral), para saber de quem é cada bloco. */
  accent?: string;
}) {
  const patientName = appointment.patientName;
  const procName = appointment.procedureName;
  const status = APPOINTMENT_STATUS[appointment.status];
  // Densidade por altura; o procedimento aparece sempre: 1 linha (nome · procedimento + hora) →
  // nome / hora de início · procedimento → nome / horário completo / procedimento → + status.
  const compact = height < 46;
  const showProc = height >= 70;
  const showFooter = height >= 104;
  const statusDot = <span aria-hidden className={cn("h-2 w-2 shrink-0 rounded-full", TONE_DOT[status.tone])} />;

  return (
    <button
      type="button"
      onClick={onClick}
      data-kind={appointment.procedureKind}
      data-cancelled={["cancelado_pelo_profissional", "desmarcado_pelo_paciente"].includes(appointment.status) || undefined}
      data-selected={selected || undefined}
      aria-label={[appointment.start, patientName, procName, status.label].join(", ")}
      title={[appointment.start + "–" + appointment.end, patientName, procName, accent ? appointment.professionalName : null, status.label].filter(Boolean).join(" · ")}
      style={{
        top,
        height,
        ...(lane ? { left: `calc(${(lane.index / lane.count) * 100}% + 2px)`, width: `calc(${100 / lane.count}% - 4px)`, right: "auto" } : {}),
      }}
      className={cn(
        "ms-appointment absolute inset-x-1 z-10 flex flex-col overflow-hidden text-left focus-visible:outline-none",
        compact ? "justify-center rounded-md px-2.5" : "gap-0.5 rounded-lg px-3 py-1.5",
        accent && (compact ? "pl-4" : "pl-[18px]"),
      )}
    >
      {accent && <span aria-hidden className="absolute bottom-1.5 left-1.5 top-1.5 w-[3px] rounded-full" style={{ background: accent }} />}
      {compact ? (
        <span className="flex min-w-0 items-center gap-1.5 text-[12px] leading-tight">
          {statusDot}
          <span className="min-w-0 truncate">
            <span className="ms-appointment__name font-semibold text-text">{patientName}</span>
            <span className="ms-appointment__meta"> · {procName}</span>
          </span>
          <span className="ms-appointment__meta ml-auto shrink-0 tabular text-[11px] font-medium">{appointment.start}</span>
        </span>
      ) : (
        <>
          <span className={cn("ms-appointment__name text-[13px] font-semibold leading-snug text-text", showFooter ? "line-clamp-2" : "truncate")}>
            {patientName}
          </span>
          <span className="ms-appointment__meta flex min-w-0 items-center gap-1.5 text-[11px] font-medium">
            <Clock size={12} aria-hidden className="shrink-0" />
            {showProc ? (
              <span className="tabular truncate">{appointment.start} – {appointment.end}</span>
            ) : (
              // Sem a linha própria do procedimento: hora de início e procedimento dividem a linha.
              <span className="tabular shrink-0">{appointment.start}</span>
            )}
            {statusDot}
            {!showProc && <span className="min-w-0 truncate font-normal">{procName}</span>}
          </span>
        </>
      )}
      {showProc && (
        <span className="ms-appointment__meta truncate text-[11px]">{procName}{accent ? ` · ${appointment.professionalName}` : ""}</span>
      )}
      {showFooter && (
        <span className="mt-auto flex flex-wrap items-center gap-1 pt-0.5">
          <span className="ms-appointment__meta truncate text-[10px] font-medium">{status.label}</span>
        </span>
      )}
    </button>
  );
}
