
import type { Icon as IconType } from "iconsax-reactjs";
import { Link } from "react-router";
import { useLocation } from "react-router";
import { type ReactNode, useState } from "react";
import { cn } from "@/lib/cn";

interface TabDef {
  label: string;
  icon?: IconType;
  /** Contador opcional à direita do rótulo. */
  count?: number;
}

const tabClass = (active: boolean) =>
  cn(
    "relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap px-1 pb-3 pt-1 text-base font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm",
    active
      ? "text-text after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-accent"
      : "text-text-muted hover:text-text",
  );

function TabInner({ tab }: { tab: TabDef }) {
  const Icon = tab.icon;
  return (
    <>
      {Icon && <Icon size={16} aria-hidden />}
      {tab.label}
      {tab.count !== undefined && (
        <span className="tabular rounded-full bg-surface px-1.5 py-0.5 text-xs text-text-muted">{tab.count}</span>
      )}
    </>
  );
}

/** Abas que são rotas (ex.: perfil do paciente). Ativa = rota atual. */
export function LinkTabs({ tabs, exact }: { tabs: (TabDef & { href: string })[]; exact?: boolean }) {
  const pathname = useLocation().pathname;
  const activeHref =
    tabs
      .filter((t) => (exact ? pathname === t.href : pathname === t.href || pathname.startsWith(`${t.href}/`)))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? tabs[0]?.href;
  return (
    <nav className="-mb-px flex gap-6 overflow-x-auto border-b border-border" aria-label="Seções">
      {tabs.map((t) => (
        <Link key={t.href} to={t.href} aria-current={t.href === activeHref ? "page" : undefined} className={tabClass(t.href === activeHref)}>
          <TabInner tab={t} />
        </Link>
      ))}
    </nav>
  );
}

/** Abas de estado local (conteúdo troca sem mudar a URL). */
export function Tabs({
  tabs,
  defaultIndex = 0,
  children,
}: {
  tabs: TabDef[];
  defaultIndex?: number;
  /** Uma função que recebe o índice ativo e devolve o painel. */
  children: (active: number) => ReactNode;
}) {
  const [active, setActive] = useState(defaultIndex);
  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" className="-mb-px flex gap-6 overflow-x-auto border-b border-border">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            role="tab"
            type="button"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={tabClass(i === active)}
          >
            <TabInner tab={t} />
          </button>
        ))}
      </div>
      <div role="tabpanel">{children(active)}</div>
    </div>
  );
}

/** Controle segmentado (2–5 opções curtas: Dia/Semana/Mês, Lista/Grade...). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  label,
}: {
  options: { value: T; label: string; icon?: IconType }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full bg-surface p-1">
      {options.map((o) => {
        const Icon = o.icon;
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
              size === "sm" ? "h-9 px-3.5 text-sm" : "h-10 px-4 text-base",
              active ? "bg-surface-selected text-text shadow-sm" : "text-text-muted hover:text-text",
            )}
          >
            {Icon && <Icon size={15} aria-hidden />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
