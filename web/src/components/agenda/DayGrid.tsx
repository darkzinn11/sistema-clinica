import { Add } from "iconsax-reactjs";
import type { ReactNode } from "react";
import type { Appointment } from "@/lib/mock/core";
import { toMin, NOW_MIN } from "@/lib/mock/agenda";
import { AppointmentBlock } from "@/components/agenda/AppointmentBlock";

export interface GridColumn {
  id: string;
  label: ReactNode;
  sublabel?: ReactNode;
  colorVar?: string;
  /** Mostra a linha do horário atual nesta coluna. */
  isToday?: boolean;
}

/**
 * Grade de horários com uma coluna por entidade (profissional, sala ou dia da
 * semana) — reaproveitada pela Agenda do dia, Por sala e Semana. Eixo vertical
 * de tempo fixo + colunas roláveis horizontalmente.
 */
export function DayGrid({
  columns,
  dayStart = 7,
  dayEnd = 19,
  pxPerMin = 1.55,
  appointmentsFor,
  activeRangeFor,
  freeSlotsFor,
  slotMinutesFor,
  onSlotClick,
  onAppointmentClick,
  minColWidth = 200,
  selectedAppointmentId,
}: {
  columns: GridColumn[];
  dayStart?: number;
  dayEnd?: number;
  pxPerMin?: number;
  appointmentsFor: (colId: string) => Appointment[];
  /** Janela de funcionamento (min desde 00:00); null = fechado o dia todo nessa coluna. */
  activeRangeFor?: (colId: string) => { start: number; end: number } | null;
  freeSlotsFor?: (colId: string) => string[];
  slotMinutesFor?: (colId: string) => number;
  onSlotClick?: (colId: string, time: string) => void;
  onAppointmentClick: (appt: Appointment) => void;
  minColWidth?: number;
  selectedAppointmentId?: string | null;
}) {
  const dayStartMin = dayStart * 60;
  const totalHeight = (dayEnd - dayStart) * 60 * pxPerMin;
  const hours = Array.from({ length: dayEnd - dayStart + 1 }, (_, i) => dayStart + i);
  const y = (min: number) => (min - dayStartMin) * pxPerMin;

  return (
    <div className="ms-agenda-grid flex w-full overflow-x-auto bg-surface-raised">
      <div className="sticky left-0 z-20 w-[64px] shrink-0 border-r border-border bg-surface-raised">
        <div className="h-[70px] border-b border-border" />
        <div className="relative" style={{ height: totalHeight }}>
          {hours.map((h) => (
            <span
              key={h}
              className="ms-agenda-time absolute right-2.5 -translate-y-1/2 text-[11px] tabular text-text-muted"
              style={{ top: y(h * 60) }}
            >
              {String(h).padStart(2, "0")}:00
            </span>
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1">
        {columns.map((col) => {
          const range = activeRangeFor?.(col.id);
          const closed = activeRangeFor ? range === null : false;
          const slotMin = slotMinutesFor?.(col.id) ?? 20;
          return (
            <div key={col.id} className="relative flex-1 border-r border-border/70 last:border-r-0" style={{ minWidth: minColWidth }}>
              <div className="ms-agenda-professional sticky top-0 z-10 flex h-[70px] flex-col justify-center gap-1 border-b border-border px-3.5">
                <span className="flex min-w-0 items-center gap-2">
                  {col.colorVar && <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: col.colorVar }} />}
                  <span className="truncate text-[13px] font-semibold text-text">{col.label}</span>
                </span>
                {col.sublabel && <span className="truncate pl-[18px] text-[11px] text-text-muted">{col.sublabel}</span>}
              </div>

              <div className="relative" style={{ height: totalHeight }}>
                {hours.map((h) => (
                  <div key={h} aria-hidden className="absolute inset-x-0 border-t border-border/65" style={{ top: y(h * 60) }} />
                ))}

                {closed ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-surface/70 text-sm text-text-subtle">Fechado</div>
                ) : (
                  <>
                    {range && range.start > dayStartMin && (
                      <div aria-hidden className="absolute inset-x-0 top-0 bg-surface/70" style={{ height: y(range.start) }} />
                    )}
                    {range && range.end < dayEnd * 60 && (
                      <div aria-hidden className="absolute inset-x-0 bottom-0 bg-surface/70" style={{ top: y(range.end), height: totalHeight - y(range.end) }} />
                    )}
                  </>
                )}

                {!closed &&
                  freeSlotsFor?.(col.id).map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => onSlotClick?.(col.id, time)}
                      aria-label={`Criar agendamento às ${time}`}
                      style={{ top: y(toMin(time)), height: Math.max(16, slotMin * pxPerMin - 2) }}
                      className="ms-agenda-slot group absolute inset-x-1 z-[5] flex items-center justify-center focus-visible:outline-none"
                    >
                      <Add size={19} variant="Linear" className="text-accent opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden />
                    </button>
                  ))}

                {col.isToday && NOW_MIN >= dayStartMin && NOW_MIN <= dayEnd * 60 && (
                  <div aria-hidden className="absolute inset-x-0 z-20 flex items-center" style={{ top: y(NOW_MIN) }}>
                    <span className="h-2 w-2 shrink-0 rounded-full bg-danger" />
                    <span className="h-px flex-1 bg-danger" />
                  </div>
                )}

                {!closed &&
                  appointmentsFor(col.id).map((a) => (
                    <AppointmentBlock
                      key={a.id}
                      appointment={a}
                      top={y(toMin(a.start))}
                      height={Math.max(18, (toMin(a.end) - toMin(a.start)) * pxPerMin - 1)}
                      colorVar={col.colorVar}
                      onClick={() => onAppointmentClick(a)}
                      selected={selectedAppointmentId === a.id}
                    />
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
