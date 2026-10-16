import { ArrowLeft2, ArrowRight2, Calendar } from "iconsax-reactjs";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

/** Navegação de datas da agenda (anterior · Hoje · próximo + rótulo) — igual em Dia, Semana e Salas. */
export function DateNav({
  label,
  onPrev,
  onToday,
  onNext,
  prevLabel,
  nextLabel,
}: {
  label: ReactNode;
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <div className="inline-flex items-center gap-1 rounded-full bg-surface p-1">
        <Button iconOnly aria-label={prevLabel} icon={ArrowLeft2} variant="ghost" size="sm" onClick={onPrev} />
        <Button variant="secondary" size="sm" onClick={onToday} className="bg-surface-selected px-4 shadow-sm">Hoje</Button>
        <Button iconOnly aria-label={nextLabel} icon={ArrowRight2} variant="ghost" size="sm" onClick={onNext} />
      </div>
      <div className="ml-1 flex min-w-0 items-center gap-2 text-text">
        <Calendar size={17} aria-hidden className="shrink-0 text-text-muted" />
        <span className="text-sm font-semibold capitalize">{label}</span>
      </div>
    </div>
  );
}
