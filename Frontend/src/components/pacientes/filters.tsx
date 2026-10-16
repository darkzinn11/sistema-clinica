import { ArrowDown2 } from "iconsax-reactjs";
import type { Icon as IconType } from "iconsax-reactjs";
import { DropdownMenu } from "@/components/ui/overlay";
import { cn } from "@/lib/cn";

const pillBase = "inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-sm transition-colors";
const pillActive = "border-accent/40 bg-accent-muted text-accent";
const pillInactive = "border-border-strong bg-surface-raised text-text-muted hover:text-text";

/**
 * Filtro em pílula com menu suspenso — mesma linguagem visual do `FilterButton`
 * estático de `@/components/ui/misc`, só que funcional (o componente
 * compartilhado não expõe onClick). Primitivo local, conforme permitido
 * quando falta uma variante interativa no design system.
 */
export function FilterDropdown<T extends string>({
  label,
  icon: Icon,
  value,
  options,
  onChange,
}: {
  label: string;
  icon?: IconType;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const active = value !== options[0]?.value;
  const current = options.find((o) => o.value === value);
  return (
    <DropdownMenu
      label={label}
      trigger={(p) => (
        <button type="button" {...p} className={cn(pillBase, active ? pillActive : pillInactive)}>
          {Icon && <Icon size={14} aria-hidden />}
          <span>{label}</span>
          {active && current && <span className="font-medium text-text">{current.label}</span>}
          <ArrowDown2 size={14} aria-hidden />
        </button>
      )}
      items={options.map((o) => ({ label: o.label, onSelect: () => onChange(o.value) }))}
    />
  );
}

/** Pílula de alternância booleana (ex.: "Aniversariantes da semana"). */
export function TogglePill({ label, icon: Icon, active, onClick }: { label: string; icon?: IconType; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={cn(pillBase, active ? pillActive : pillInactive)}>
      {Icon && <Icon size={14} aria-hidden />}
      <span>{label}</span>
    </button>
  );
}
