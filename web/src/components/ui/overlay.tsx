import { IconCircle } from "@/components/ui/icon-circle";

import { Add } from "iconsax-reactjs";
import type { Icon as IconType } from "iconsax-reactjs";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import { cn } from "@/lib/cn";

function useLockScroll(open: boolean) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
}

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
}

/** Foca o primeiro campo ao abrir e devolve o foco a quem abriu ao fechar. */
function useFocusReturn(open: boolean, panel: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const first = panel.current?.querySelector<HTMLElement>("input, select, textarea, button:not([data-close])");
    (first ?? panel.current)?.focus();
    return () => previous?.focus();
  }, [open, panel]);
}

function Portal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
}

/**
 * Painel lateral (side sheet). Preferido a modal pra formulários longos —
 * mantém o contexto da tela de trás visível.
 */
export function Drawer({
  open,
  onClose,
  title,
  description,
  footer,
  width = "md",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  footer?: ReactNode;
  width?: "sm" | "md" | "lg" | "xl";
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useLockScroll(open);
  useEscape(open, onClose);
  useFocusReturn(open, panel);
  if (!open) return null;
  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };
  return (
    <Portal>
      <div className="ui-backdrop-enter fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-overlay" onClick={onClose} aria-hidden />
        <div
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className={cn("ui-drawer-enter relative flex h-full w-full flex-col bg-surface-raised shadow-pop outline-none", widths[width])}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
            <div>
              <h2 id={titleId} className="text-lg font-semibold text-text">{title}</h2>
              {description && <p className="mt-0.5 text-sm text-text-muted">{description}</p>}
            </div>
            <button data-close type="button" onClick={onClose} aria-label="Fechar" className="rounded-md p-1.5 text-text-muted hover:bg-surface hover:text-text">
              <Add size={18} aria-hidden className="rotate-45" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer && <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-3">{footer}</div>}
        </div>
      </div>
    </Portal>
  );
}

/** Diálogo centralizado — confirmações curtas e formulários pequenos. */
export function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  size = "md",
  icon: Icon,
  tone = "accent",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  icon?: IconType;
  tone?: "accent" | "danger" | "warning";
  children?: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useLockScroll(open);
  useEscape(open, onClose);
  useFocusReturn(open, panel);
  if (!open) return null;
  const sizes = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-3xl" };
  return (
    <Portal>
      <div className="ui-backdrop-enter fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-overlay" onClick={onClose} aria-hidden />
        <div
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className={cn("ui-dialog-enter relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl bg-surface-raised shadow-pop outline-none", sizes[size])}
        >
          <div className="flex items-start gap-4 px-6 pt-5">
            {Icon && (
              <IconCircle tone={tone} size="lg">
                <Icon size={20} aria-hidden />
              </IconCircle>
            )}
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-lg font-semibold text-text">{title}</h2>
              {description && <p className="mt-1 text-base text-text-muted">{description}</p>}
            </div>
            <button data-close type="button" onClick={onClose} aria-label="Fechar" className="rounded-md p-1.5 text-text-muted hover:bg-surface hover:text-text">
              <Add size={18} aria-hidden className="rotate-45" />
            </button>
          </div>
          {children && <div className="overflow-y-auto px-6 py-4">{children}</div>}
          {footer && <div className={cn("flex items-center justify-end gap-2 px-6 py-4", children ? "border-t border-border" : "")}>{footer}</div>}
        </div>
      </div>
    </Portal>
  );
}

export interface MenuItem {
  label: string;
  icon?: IconType;
  onSelect?: () => void;
  href?: string;
  danger?: boolean;
  divider?: boolean;
  shortcut?: string;
}

/** Menu suspenso simples, abre abaixo do gatilho. */
export function DropdownMenu({
  trigger,
  items,
  align = "end",
  label,
}: {
  trigger: (props: { onClick: () => void; "aria-expanded": boolean; "aria-haspopup": "menu" }) => ReactNode;
  items: MenuItem[];
  align?: "start" | "end";
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative inline-flex">
      {trigger({ onClick: () => setOpen((v) => !v), "aria-expanded": open, "aria-haspopup": "menu" })}
      {open && (
        <div
          role="menu"
          aria-label={label}
          className={cn(
            "ui-menu-enter absolute top-full z-40 mt-1.5 min-w-52 rounded-xl border border-border bg-surface-raised p-1 shadow-pop",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {items.map((item, i) => {
            if (item.divider) return <div key={`d-${i}`} role="separator" className="my-1 h-px bg-border" />;
            const Icon = item.icon;
            const cls = cn(
              "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-base",
              item.danger ? "text-danger hover:bg-danger-bg" : "text-text hover:bg-surface",
            );
            const inner = (
              <>
                {Icon && <Icon size={16} variant="Linear" aria-hidden className={item.danger ? "" : "text-text-muted"} />}
                <span className="flex-1">{item.label}</span>
                {item.shortcut && <span className="text-xs text-text-subtle">{item.shortcut}</span>}
              </>
            );
            return item.href ? (
              <Link key={item.label} role="menuitem" to={item.href} className={cls} onClick={() => setOpen(false)}>
                {inner}
              </Link>
            ) : (
              <button
                key={item.label}
                role="menuitem"
                type="button"
                className={cls}
                onClick={() => {
                  item.onSelect?.();
                  setOpen(false);
                }}
              >
                {inner}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Interruptor liga/desliga acessível (role=switch). */
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <label htmlFor={id} className="flex flex-col">
        <span className="text-base font-medium text-text">{label}</span>
        {description && <span className="text-sm text-text-muted">{description}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-50",
          checked ? "bg-accent" : "bg-border-strong",
        )}
      >
        <span
          aria-hidden
          className={cn("inline-block h-4 w-4 rounded-full bg-surface-raised shadow-card transition-transform", checked ? "translate-x-[18px]" : "translate-x-0.5")}
        />
      </button>
    </div>
  );
}
