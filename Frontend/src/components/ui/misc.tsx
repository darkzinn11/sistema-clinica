import { IconCircle } from "@/components/ui/icon-circle";
import { ArrowDown2 } from "iconsax-reactjs";
import type { Icon as IconType } from "iconsax-reactjs";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

/** Tecla de atalho (⌘K, Esc...). */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded border border-border-strong bg-surface px-1 font-sans text-[11px] font-medium text-text-muted", className)}>
      {children}
    </kbd>
  );
}

/** Tooltip acessível, portallizado para não ser cortado por barras de rolagem. */
export function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: string;
  children: ReactNode;
  side?: "top" | "right" | "bottom";
}) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [point, setPoint] = useState({ x: 0, y: 0 });
  const updatePosition = useCallback(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Na sidebar, mantenha o tooltip afastado da borda externa do menu.
    const gap = side === "right" ? 22 : 12;
    setPoint(
      side === "right"
        ? { x: rect.right + gap, y: rect.top + rect.height / 2 }
        : { x: rect.left + rect.width / 2, y: side === "top" ? rect.top - gap : rect.bottom + gap },
    );
  }, [side]);

  useEffect(() => {
    if (!visible) return;
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setVisible(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("keydown", onEscape);
    };
  }, [visible, updatePosition]);

  const show = () => {
    updatePosition();
    setVisible(true);
  };
  return (
    <span
      ref={anchorRef}
      className="inline-flex w-full"
      onMouseEnter={show}
      onMouseLeave={() => setVisible(false)}
      onFocusCapture={show}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setVisible(false);
      }}
    >
      {children}
      {visible && typeof document !== "undefined" && createPortal(
        <span
          role="tooltip"
          className={cn(
            "ui-floating-tooltip pointer-events-none fixed z-[100] max-w-[min(320px,calc(100vw-24px))]",
            "whitespace-nowrap rounded-md border border-border-strong bg-surface-raised px-3 py-2",
            "text-sm font-medium text-text shadow-pop",
            side === "right" ? "-translate-y-1/2" : side === "top" ? "-translate-x-1/2 -translate-y-full" : "-translate-x-1/2",
          )}
          style={{ left: point.x, top: point.y }}
        >
          {content}
        </span>,
        document.body,
      )}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cn("block animate-pulse rounded-md bg-surface", className)} />;
}

/** Pílula de filtro (no protótipo é estática: mostra o filtro e o valor atual). */
export function FilterButton({ label, value, icon: Icon, active }: { label: string; value?: string; icon?: IconType; active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors",
        active ? "border-accent/40 bg-accent-muted text-accent" : "border-border-strong bg-surface-raised text-text-muted hover:text-text",
      )}
    >
      {Icon && <Icon size={14} aria-hidden />}
      <span>{label}</span>
      {value && <span className="font-medium text-text">{value}</span>}
      <ArrowDown2 size={14} aria-hidden />
    </button>
  );
}

/** Lista de pares rótulo/valor (ficha, detalhes). */
export function DescriptionList({ items, columns = 2 }: { items: { label: string; value: ReactNode }[]; columns?: 1 | 2 | 3 }) {
  const cols = { 1: "", 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3" };
  return (
    <dl className={cn("grid grid-cols-1 gap-x-6 gap-y-4", cols[columns])}>
      {items.map((it) => (
        <div key={it.label} className="flex flex-col gap-0.5">
          <dt className="text-sm text-text-muted">{it.label}</dt>
          <dd className="text-base text-text">{it.value ?? <span className="text-text-subtle">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

export interface TimelineEntry {
  id: string;
  icon: IconType;
  tone?: "accent" | "success" | "warning" | "danger" | "info" | "neutral";
  title: ReactNode;
  meta?: ReactNode;
  body?: ReactNode;
}

/** Linha do tempo vertical (prontuário, histórico, auditoria). */
export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <ol className="relative flex flex-col">
      {entries.map((e, i) => {
        const Icon = e.icon;
        return (
          <li key={e.id} className="relative flex gap-4 pb-6 last:pb-0">
            {i < entries.length - 1 && <span aria-hidden className="absolute left-4 top-9 bottom-0 w-px bg-border" />}
            <IconCircle tone={e.tone ?? "neutral"} size="sm" className="relative z-10">
              <Icon size={15} aria-hidden />
            </IconCircle>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="text-base font-medium text-text">{e.title}</p>
                {e.meta && <p className="text-sm text-text-muted">{e.meta}</p>}
              </div>
              {e.body && <div className="mt-2 text-base text-text-muted">{e.body}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Barra de progresso/medidor. Trilho é um tom claro da mesma família da cor. */
export function Meter({
  value,
  max = 100,
  label,
  tone = "accent",
  showValue,
}: {
  value: number;
  max?: number;
  label: string;
  tone?: "accent" | "success" | "warning" | "danger";
  showValue?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const fill = { accent: "bg-accent", success: "bg-success", warning: "bg-warning-fill", danger: "bg-danger-fill" };
  const track = { accent: "bg-accent-muted", success: "bg-success-bg", warning: "bg-warning-bg", danger: "bg-danger-bg" };
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-text-muted">{label}</span>
        {showValue && <span className="tabular font-medium text-text">{showValue}</span>}
      </div>
      <div role="progressbar" aria-label={label} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} className={cn("h-2 w-full overflow-hidden rounded-full", track[tone])}>
        <div className={cn("h-full rounded-full transition-[width]", fill[tone])} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Seção de formulário com título à esquerda e campos à direita (telas de cadastro/config). */
export function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="grid grid-cols-1 gap-x-10 gap-y-4 border-b border-border py-6 first:pt-0 last:border-0 lg:grid-cols-[240px_1fr]">
      <div>
        <h3 className="text-base font-semibold text-text">{title}</h3>
        {description && <p className="mt-1 text-sm text-text-muted">{description}</p>}
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  );
}

/** Passos de um fluxo (ex.: emissão de guia, fechamento de lote). */
export function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-2 text-sm">
      {steps.map((s, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        return (
          <li key={s} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                state === "done" && "bg-success-bg text-success",
                state === "current" && "bg-accent text-on-accent",
                state === "todo" && "bg-surface text-text-muted",
              )}
            >
              {i + 1}
            </span>
            <span className={cn(state === "current" ? "font-medium text-text" : "text-text-muted")}>{s}</span>
            {i < steps.length - 1 && <span aria-hidden className="mx-1 h-px w-6 bg-border-strong" />}
          </li>
        );
      })}
    </ol>
  );
}
