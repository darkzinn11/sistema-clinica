import { cn } from "@/lib/cn";
import { Input } from "@/components/ui/input";

/** Campo de cor livre: amostra + seletor nativo + hexadecimal editável. */
export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (hex: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-text">{label}</span>
      <div className="flex items-center gap-2">
        <label
          className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-md border border-border-strong"
          style={{ background: value }}
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label={label}
          />
        </label>
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono uppercase" aria-label={`${label} (hexadecimal)`} />
      </div>
    </div>
  );
}

/** Escolha de uma das 8 cores de série — usado pra identidade (senhas, tags). */
export function SeriesColorPicker({ value, onChange, label }: { value: number; onChange: (i: number) => void; label: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-text">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={value === i}
            aria-label={`Cor ${i + 1}`}
            onClick={() => onChange(i)}
            className={cn("h-7 w-7 rounded-full ring-offset-2 ring-offset-surface-raised transition-shadow", value === i && "ring-2 ring-accent")}
            style={{ background: `var(--c-series-${i + 1})` }}
          />
        ))}
      </div>
    </div>
  );
}
