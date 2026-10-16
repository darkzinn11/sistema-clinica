import { ArrowRight2 } from "iconsax-reactjs";
import { Link } from "react-router";
import { type ReactNode, useEffect } from "react";
import { cn } from "@/lib/cn";

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * Cabeçalho padrão de toda tela: breadcrumbs, título, descrição curta,
 * ações à direita e (opcional) uma faixa de abas/filtros embaixo.
 */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  meta,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
  /** Linha pequena ao lado do título (ex.: badge de status, contagem). */
  meta?: ReactNode;
  /** Abas ou filtros logo abaixo do título. */
  children?: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (typeof title === "string") document.title = `${title} · MultiSaúde`;
  }, [title]);
  return (
    <header className={cn("flex flex-col gap-4 pb-6", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Você está em" className="flex flex-wrap items-center gap-1 text-sm text-text-muted">
          {breadcrumbs.map((c, i) => (
            <span key={`${c.label}-${i}`} className="flex items-center gap-1">
              {i > 0 && <ArrowRight2 size={14} aria-hidden className="text-text-subtle" />}
              {c.href ? (
                <Link to={c.href} className="rounded hover:text-text hover:underline">{c.label}</Link>
              ) : (
                <span aria-current="page" className="text-text">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="ui-page-title font-display text-2xl font-semibold tracking-tight text-text">{title}</h1>
            {meta}
          </div>
          {description && <p className="mt-1 max-w-3xl text-base text-text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}
