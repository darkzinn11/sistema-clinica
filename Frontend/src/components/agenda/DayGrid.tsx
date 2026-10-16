import { Add } from "iconsax-reactjs";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import type { Appointment } from "@/lib/mock/core";
import { toMin, NOW_MIN } from "@/lib/mock/agenda";
import { AppointmentBlock } from "@/components/agenda/AppointmentBlock";
import { cn } from "@/lib/cn";

/** Altura do cabeçalho das colunas (px) — a linha de "agora" é posicionada abaixo dele. */
const HEADER_H = 84;

export interface GridColumn {
  id: string;
  label: ReactNode;
  sublabel?: ReactNode;
  /** Texto pequeno acima do rótulo (ex.: dia da semana). */
  kicker?: ReactNode;
  /** Rótulo grande (ex.: número do dia na visão semanal). */
  largeLabel?: boolean;
  /** Destaca o cabeçalho da coluna (ex.: hoje na visão semanal). */
  highlight?: boolean;
  colorVar?: string;
  /** Mostra a linha do horário atual nesta coluna. */
  isToday?: boolean;
}

/** Faixa fora do expediente: hachurado sutil, recuada e arredondada como os cards, com rótulo discreto. */
function OffHours({ top, height, label = "Fora do expediente" }: { top: number; height: number; label?: string }) {
  return (
    <div className="ms-agenda-off absolute inset-x-1 overflow-hidden" style={{ top: top + 2, height: Math.max(0, height - 4) }}>
      {height >= 44 && (
        <span className="sticky top-2 block px-3 pt-2 text-[11px] font-medium text-text-subtle">{label}</span>
      )}
    </div>
  );
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
  pxPerMin = 2.6,
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
  const showNow = columns.some((c) => c.isToday) && NOW_MIN >= dayStartMin && NOW_MIN <= dayEnd * 60;
  const nowY = Math.round(y(NOW_MIN));
  const nowLabel = `${String(Math.floor(NOW_MIN / 60)).padStart(2, "0")}:${String(NOW_MIN % 60).padStart(2, "0")}`;

  // Esmaecimentos laterais: só aparecem quando há conteúdo escondido daquele lado ao rolar na horizontal.
  const gridRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const updateEdges = useCallback(() => {
    const el = gridRef.current;
    if (!el) return;
    const left = el.scrollLeft > 1;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
  }, []);
  useEffect(() => {
    updateEdges();
    const el = gridRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateEdges, columns.length]);

  return (
    <div className="relative">
    <div
      ref={gridRef}
      onScroll={updateEdges}
      data-fade-left={edges.left || undefined}
      className="ms-agenda-grid isolate flex w-full overflow-x-auto bg-surface-raised"
    >
      {/* self-start: altura do conteúdo, não da área visível — senão o fundo acaba no meio ao rolar e os cards aparecem por cima. */}
      <div className="ms-agenda-timecol sticky left-0 z-50 w-[64px] shrink-0 self-start bg-surface-raised">
        <div className="sticky top-0 z-20 bg-surface-raised" style={{ height: HEADER_H }} />
        <div className="relative" style={{ height: totalHeight }}>
          {hours.map((h) => (
            <span
              key={h}
              // A primeira hora encosta no cabeçalho: alinhada pelo topo para não ficar cortada.
              className={cn("ms-agenda-time absolute right-2.5 text-[11px] tabular text-text-muted", h === dayStart ? "translate-y-1" : "-translate-y-1/2")}
              style={{ top: y(h * 60) }}
            >
              {String(h).padStart(2, "0")}:00
            </span>
          ))}
          {showNow && (
            // Início do indicador de "agora": etiqueta + bolinha + começo da linha, que continua nas colunas.
            // Altura fixa (20px) e posição arredondada: o centro cai no mesmo pixel da linha das colunas.
            <div className="absolute inset-x-0 z-10 flex h-5 items-center pl-1" style={{ top: nowY - 10 }}>
              <span className="h-5 shrink-0 rounded-full bg-accent px-2 text-[11px] font-semibold leading-5 tabular text-on-accent shadow-sm">
                <span className="sr-only">Agora: </span>{nowLabel}
              </span>
              <span aria-hidden className="ml-0.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
              <span aria-hidden className="h-0.5 flex-1 border-t-2 border-dotted border-accent" />
            </div>
          )}
        </div>
      </div>

      {/* Sem min-w-0: o contêiner cresce até a soma das colunas, então a linha de "agora" cobre a largura toda ao rolar. */}
      <div className="relative flex flex-1">
        {showNow && (
          // Linha única sobre toda a grade, por cima dos agendamentos (z-10) e abaixo do hover/seleção (z-30)
          // e dos cabeçalhos fixos (z-40).
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 z-[25] h-0.5 border-t-2 border-dotted border-accent"
            style={{ top: HEADER_H + nowY - 1 }}
          />
        )}
        {columns.map((col) => {
          const range = activeRangeFor?.(col.id);
          const closed = activeRangeFor ? range === null : false;
          const slotMin = slotMinutesFor?.(col.id) ?? 20;
          return (
            <div key={col.id} className="relative flex-1" style={{ minWidth: minColWidth }}>
              {/* px-1 = mesmo recuo lateral dos cards (inset-x-1): cabeçalhos e agendamentos ficam no mesmo grid. */}
              <div className="ms-agenda-professional sticky top-0 z-40 px-1 py-1.5" style={{ height: HEADER_H }}>
                <div className={cn("flex h-full flex-col items-center justify-center gap-1 rounded-lg px-3 text-center", col.highlight ? "bg-accent-muted" : "bg-surface")}>
                  {col.kicker && <span className={cn("text-[11px] font-medium capitalize", col.highlight ? "text-accent-ink" : "text-text-muted")}>{col.kicker}</span>}
                  <span className="flex min-w-0 max-w-full items-center gap-2">
                    {col.colorVar && <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: col.colorVar }} />}
                    <span className={cn("truncate font-semibold", col.largeLabel ? "tabular text-2xl leading-none" : "text-[13px]", col.highlight ? "text-accent-ink" : "text-text")}>{col.label}</span>
                  </span>
                  {col.sublabel && <span className="max-w-full truncate text-[11px] text-text-muted">{col.sublabel}</span>}
                </div>
              </div>

              <div className="relative" style={{ height: totalHeight }}>
                {hours.map((h) => (
                  <div key={h} aria-hidden className="absolute inset-x-0 border-t border-border/60" style={{ top: y(h * 60) }} />
                ))}

                {closed ? (
                  <OffHours top={0} height={totalHeight} label="Fechado" />
                ) : (
                  <>
                    {range && range.start > dayStartMin && <OffHours top={0} height={y(range.start)} />}
                    {range && range.end < dayEnd * 60 && <OffHours top={y(range.end)} height={totalHeight - y(range.end)} />}
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

                {!closed &&
                  appointmentsFor(col.id).map((a) => (
                    <AppointmentBlock
                      key={a.id}
                      appointment={a}
                      top={y(toMin(a.start)) + 1}
                      height={Math.max(18, (toMin(a.end) - toMin(a.start)) * pxPerMin - 3)}
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
    {/* Fora da área rolável para ficar sempre na borda direita visível. */}
    <div aria-hidden className="ms-agenda-fade-right" data-visible={edges.right || undefined} />
    </div>
  );
}
