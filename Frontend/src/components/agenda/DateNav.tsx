import { ArrowLeft2, ArrowRight2, Calendar } from "iconsax-reactjs";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { daysBetweenIso } from "@/lib/format";
import { mondayOf, todayIso } from "@/lib/agenda/time";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** "2026-10-31" → "31/Out" */
function dayMonth(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${MONTHS[Number(m) - 1]}`;
}

/** Rótulo do botão central: Hoje / Amanhã / Ontem ou a data (31/Out); na semana, Esta semana ou a segunda-feira. */
function relativeLabel(date: string, unit: "day" | "week"): string {
  if (unit === "week") {
    const monday = mondayOf(date);
    return monday === mondayOf(todayIso()) ? "Esta semana" : dayMonth(monday);
  }
  const n = daysBetweenIso(todayIso(), date);
  if (n === 0) return "Hoje";
  if (n === 1) return "Amanhã";
  if (n === -1) return "Ontem";
  return dayMonth(date);
}

export function DateNav({
  date,
  unit = "day",
  label,
  onPrev,
  onToday,
  onNext,
  prevLabel,
  nextLabel,
}: {
  /** Data exibida (ISO) — define o texto do botão central. */
  date: string;
  unit?: "day" | "week";
  label: ReactNode;
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
}) {
  const relative = relativeLabel(date, unit);
  const isCurrent = relative === "Hoje" || relative === "Esta semana";
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <div className="inline-flex items-center gap-1 rounded-full bg-surface p-1">
        <Button iconOnly aria-label={prevLabel} icon={ArrowLeft2} variant="ghost" size="sm" onClick={onPrev} />
        <Button
          variant="secondary"
          size="sm"
          onClick={onToday}
          title={isCurrent ? undefined : unit === "week" ? "Voltar para esta semana" : "Voltar para hoje"}
          className="bg-surface-selected px-4 shadow-sm"
        >
          {relative}
        </Button>
        <Button iconOnly aria-label={nextLabel} icon={ArrowRight2} variant="ghost" size="sm" onClick={onNext} />
      </div>
      <div className="ml-1 flex min-w-0 items-center gap-2 text-text">
        <Calendar size={17} aria-hidden className="shrink-0 text-text-muted" />
        <span className="text-sm font-semibold capitalize">{label}</span>
      </div>
    </div>
  );
}
