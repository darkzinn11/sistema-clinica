import { Clock } from "iconsax-reactjs";
import type { AgendaAppointment as Appointment } from "@/lib/agenda/model";
import { toMin } from "@/lib/agenda/time";

const CANCELLED = ["cancelado_pelo_profissional", "desmarcado_pelo_paciente"];
const MAX_DOTS = 6;

function hhmm(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

/**
 * Resumo dos agendamentos de uma hora numa coluna da grade (visão semanal com todos os profissionais):
 * em vez de dividir a largura em faixas ilegíveis, mostra quantos são, o intervalo e de quais profissionais.
 */
export function AppointmentGroupBlock({
  appointments,
  top,
  height,
  colorFor,
  onClick,
}: {
  appointments: Appointment[];
  top: number;
  height: number;
  colorFor?: (appt: Appointment) => string | undefined;
  onClick: () => void;
}) {
  const active = appointments.filter((a) => !CANCELLED.includes(a.status));
  const cancelled = appointments.length - active.length;
  const allCancelled = active.length === 0;
  const start = Math.min(...appointments.map((a) => toMin(a.start)));
  const end = Math.max(...appointments.map((a) => toMin(a.end)));
  const professionals = [...new Map(appointments.map((a) => [a.professionalId, a])).values()];
  const title = allCancelled
    ? `${cancelled} cancelado${cancelled === 1 ? "" : "s"}`
    : `${active.length} agendamento${active.length === 1 ? "" : "s"}`;

  return (
    <button
      type="button"
      onClick={onClick}
      data-group
      data-cancelled={allCancelled || undefined}
      aria-label={`${hhmm(start)} a ${hhmm(end)}: ${title}${!allCancelled && cancelled ? ` e ${cancelled} cancelado${cancelled === 1 ? "" : "s"}` : ""}. Ver lista.`}
      style={{ top, height }}
      className="ms-appointment absolute inset-x-1 z-10 flex flex-col gap-1 overflow-hidden rounded-lg px-3 py-2 text-left focus-visible:outline-none"
    >
      <span className="ms-appointment__name truncate text-[13px] font-semibold leading-snug text-text">{title}</span>
      <span className="ms-appointment__meta flex min-w-0 items-center gap-1.5 text-[11px] font-medium">
        <Clock size={12} aria-hidden className="shrink-0" />
        <span className="tabular truncate">{hhmm(start)} – {hhmm(end)}</span>
      </span>
      {!allCancelled && cancelled > 0 && height >= 84 && (
        <span className="ms-appointment__meta truncate text-[11px]">+ {cancelled} cancelado{cancelled === 1 ? "" : "s"}</span>
      )}
      {height >= 64 && (
        <span className="mt-auto flex items-center gap-1">
          {professionals.slice(0, MAX_DOTS).map((a) => (
            <span
              key={a.professionalId}
              title={a.professionalName}
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-[var(--appt-bg)]"
              style={{ background: colorFor?.(a) ?? "var(--c-text-subtle)" }}
            />
          ))}
          {professionals.length > MAX_DOTS && (
            <span className="ms-appointment__meta text-[10px] font-semibold">+{professionals.length - MAX_DOTS}</span>
          )}
        </span>
      )}
    </button>
  );
}
