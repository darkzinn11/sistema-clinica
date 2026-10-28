import type { Icon as IconType } from "iconsax-reactjs";
import { type ReactNode, useId } from "react";
import { LayoutGroup, motion } from "motion/react";
import { cn } from "@/lib/cn";
import { TAB_SLIDE } from "@/lib/motion";
import LiquidTabs from "@/components/pinui/LiquidTabs";

interface TabDef {
  label: string;
  icon?: IconType;
  /** Contador opcional à direita do rótulo. */
  count?: number;
}

/**
 * Abas de estado local (conteúdo troca sem mudar a URL). Todas as abas do sistema são as abas líquidas
 * (a aba ativa é a orelha do card branco do conteúdo e escorre de uma aba para a outra) — por isso o
 * conteúdo não deve vir dentro de outro Card.
 */
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
  return (
    <LiquidTabs tabs={tabs} defaultIndex={defaultIndex}>
      {children}
    </LiquidTabs>
  );
}

/** Controle segmentado (2–5 opções curtas: Dia/Semana/Mês, Lista/Grade...). O fundo da opção ativa desliza até a escolhida. */
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
  const id = useId();
  return (
    <LayoutGroup id={id}>
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
                "relative inline-flex items-center gap-1.5 rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                size === "sm" ? "h-9 px-3.5 text-sm" : "h-10 px-4 text-base",
                active ? "text-text" : "text-text-muted hover:text-text",
              )}
            >
              {active && <motion.span layoutId="segmented-thumb" aria-hidden className="absolute inset-0 rounded-full bg-surface-selected shadow-sm" transition={TAB_SLIDE} />}
              <span className="relative inline-flex items-center gap-1.5">
                {Icon && <Icon size={15} aria-hidden />}
                {o.label}
              </span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
