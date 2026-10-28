import { ArrowLeft2, ArrowRight2, Home2, type Icon as IconType } from "iconsax-reactjs";
import { Link, useLocation } from "react-router";
import { type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ALL_ITEMS, findSection, normalizeTrail } from "@/lib/nav";

export interface Crumb {
  label: string;
  href?: string;
  /** Ícone do nível (a casa e a seção do menu já vêm com o seu). */
  icon?: IconType;
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
  icon,
  card,
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
  /** Ícone antes do título. Por padrão, o da seção do menu lateral (Agenda, Pacientes…); null tira o ícone. */
  icon?: IconType | null;
  /** Telas de cadastro (um registro): cabeçalho num card branco, sem ícone da seção — o título é o nome do registro. */
  card?: boolean;
}) {
  const { pathname } = useLocation();
  const Icon = icon === undefined ? (card ? null : findSection(pathname)?.icon) : icon;
  const trail = normalizeTrail(breadcrumbs ?? [], title);
  return (
    <header className={cn("flex flex-col gap-4", card ? "ui-surface-card mb-6 bg-surface-raised p-6 shadow-card" : "pb-6", className)}>
      {trail.length > 0 && <Breadcrumbs trail={trail} />}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="ui-page-title flex items-center gap-2.5 font-display text-2xl font-semibold tracking-tight text-text">
              {/* Bulk: parte de cima no verde da marca e o corpo no mesmo verde, mais claro. */}
              {Icon && <Icon size={28} variant="Bulk" aria-hidden className="shrink-0 text-accent-strong" />}
              {title}
            </h1>
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

const crumbLink = "rounded-sm transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

/**
 * Trilha de navegação: ícone preenchido + nome em cada nível, separados por setas.
 * A página atual fica no verde da marca; os níveis de cima, em cinza suave e clicáveis.
 * A casa e a seção do menu (Cadastros, Recepção…) trazem o ícone sozinhas; outros níveis mostram ícone se a tela passar um.
 * Nomes longos são cortados com reticências (o nome inteiro no title). No celular vira só um "‹ voltar" para o nível de cima.
 */
function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  const parent = [...trail].slice(0, -1).reverse().find((c) => c.href);
  return (
    <nav aria-label="Você está em" className="text-base font-medium">
      {parent?.href && (
        <Link to={parent.href} className={cn(crumbLink, "inline-flex items-center gap-1 text-text-muted sm:hidden")}>
          <ArrowLeft2 size={16} aria-hidden className="shrink-0" />
          {parent.label}
        </Link>
      )}
      <ol className={cn("min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1", parent ? "hidden sm:flex" : "flex")}>
        <li className="flex shrink-0">
          <Link to="/inicio" aria-label="Início" title="Início" className={cn(crumbLink, "flex items-center text-text-subtle")}>
            <Home2 size={18} variant="Bold" aria-hidden className="shrink-0 opacity-80" />
          </Link>
        </li>
        {trail.map((c, i) => {
          const last = i === trail.length - 1;
          const CrumbIcon = c.icon ?? (i === 0 ? ALL_ITEMS.find((item) => item.label === c.label)?.icon : undefined);
          const content = (
            <>
              {CrumbIcon && <CrumbIcon size={18} variant="Bold" aria-hidden className={cn("shrink-0", !last && "opacity-80")} />}
              <span className="truncate">{c.label}</span>
            </>
          );
          return (
            <li key={`${c.label}-${i}`} className={cn("flex min-w-0 items-center gap-2.5", !last && "shrink-0")}>
              <ArrowRight2 size={14} aria-hidden className="shrink-0 text-text-subtle opacity-60" />
              {last ? (
                <span aria-current="page" title={c.label} className="flex min-w-0 items-center gap-2 text-accent">{content}</span>
              ) : c.href ? (
                <Link to={c.href} title={c.label} className={cn(crumbLink, "flex max-w-[24ch] items-center gap-2 text-text-muted")}>{content}</Link>
              ) : (
                <span title={c.label} className="flex max-w-[24ch] items-center gap-2 text-text-subtle">{content}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
