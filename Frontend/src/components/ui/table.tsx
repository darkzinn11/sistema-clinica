import { ArrowLeft2, ArrowRight2, Sort } from "iconsax-reactjs";
import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * Tabela padrão. Envolve em rolagem horizontal própria (a página nunca
 * rola de lado), cabeçalho fixo sutil, números alinhados à direita.
 * A faixa do cabeçalho tem as pontas arredondadas (por isso border-separate: com border-collapse
 * o arredondamento das células não aparece; as divisórias ficam nas células, ver .ui-table no CSS).
 */
export function Table({ className, children, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("ui-table w-full border-separate border-spacing-0 text-left text-base", className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="ui-table-header">{children}</thead>;
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TH({
  className,
  align = "left",
  sortable,
  children,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" | "center"; sortable?: boolean }) {
  return (
    <th
      scope="col"
      className={cn(
        "whitespace-nowrap px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-muted",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
      {...props}
    >
      <span className={cn("inline-flex items-center gap-1", align === "right" && "flex-row-reverse")}>
        {children}
        {sortable && <Sort size={12} aria-hidden className="text-text-subtle" />}
      </span>
    </th>
  );
}

export function TR({ className, interactive, ...props }: HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean }) {
  return <tr className={cn(interactive && "ui-table-row cursor-pointer", className)} {...props} />;
}

export function TD({
  className,
  align = "left",
  numeric,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" | "center"; numeric?: boolean }) {
  return (
    <td
      className={cn(
        "px-4 py-3 align-middle text-text",
        (align === "right" || numeric) && "text-right",
        numeric && "tabular whitespace-nowrap",
        align === "center" && "text-center",
        className,
      )}
      {...props}
    />
  );
}

/** Rodapé com contagem + paginação (estática no protótipo). */
export function TableFooter({ total, page = 1, pageSize = 20, label = "registros" }: { total: number; page?: number; pageSize?: number; label?: string }) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-text-muted">
      <span className="tabular">
        {from}–{to} de {total} {label}
      </span>
      <div className="flex items-center gap-1">
        <button type="button" aria-label="Página anterior" disabled={page <= 1} className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-surface disabled:opacity-40">
          <ArrowLeft2 size={16} aria-hidden />
        </button>
        <span className="tabular px-2">
          {page} / {pages}
        </span>
        <button type="button" aria-label="Próxima página" disabled={page >= pages} className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-surface disabled:opacity-40">
          <ArrowRight2 size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}
