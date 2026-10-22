import { ArrowLeft2, ArrowRight2 } from "iconsax-reactjs";
import { useState } from "react";
import { todayIso } from "@/lib/agenda/time";
import { cn } from "@/lib/cn";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function monthStart(iso: string) {
  return `${iso.slice(0, 7)}-01`;
}

/** Mini calendário de mês pra navegação rápida de data (painel lateral da Agenda do dia). */
export function MiniMonth({ value, onSelect }: { value: string; onSelect: (iso: string) => void }) {
  const [cursor, setCursor] = useState(monthStart(value));
  const [prevValue, setPrevValue] = useState(value);
  if (prevValue !== value) {
    setPrevValue(value);
    setCursor(monthStart(value));
  }

  const year = Number(cursor.slice(0, 4));
  const month = Number(cursor.slice(5, 7)) - 1;
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysCount = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const label = new Date(Date.UTC(year, month, 1, 12)).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  function shift(delta: number) {
    const d = new Date(Date.UTC(year, month + delta, 1));
    setCursor(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-01`);
  }

  const cells: (string | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysCount }, (_, i) => `${year}-${pad(month + 1)}-${pad(i + 1)}`)];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium capitalize text-text">{label}</span>
        <div className="flex items-center gap-0.5">
          <button type="button" aria-label="Mês anterior" onClick={() => shift(-1)} className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-surface">
            <ArrowLeft2 size={14} aria-hidden />
          </button>
          <button type="button" aria-label="Próximo mês" onClick={() => shift(1)} className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-surface">
            <ArrowRight2 size={14} aria-hidden />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-[11px] text-text-subtle">
        {WEEKDAYS.map((w, i) => (
          <span key={`${w}-${i}`}>{w}</span>
        ))}
        {cells.map((iso, i) => {
          if (!iso) return <span key={`b-${i}`} />;
          const isToday = iso === todayIso();
          const isSelected = iso === value;
          const isSunday = new Date(`${iso}T12:00:00`).getDay() === 0;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              aria-current={isSelected ? "date" : undefined}
              className={cn(
                "mx-auto flex h-7 w-7 items-center justify-center rounded-full text-sm tabular transition-colors",
                isSelected ? "bg-accent text-on-accent font-semibold" : isToday ? "font-semibold text-accent" : isSunday ? "text-text-subtle" : "text-text",
                !isSelected && "hover:bg-surface",
              )}
            >
              {Number(iso.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
