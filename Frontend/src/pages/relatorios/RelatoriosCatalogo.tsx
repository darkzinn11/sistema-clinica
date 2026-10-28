import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowRight2, Category, Clock, SearchNormal1, Star } from "iconsax-reactjs";
import { PageHeader } from "@/components/ui/page-header";
import LiquidTabs from "@/components/pinui/LiquidTabs";
import { IconCircle, type IconCircleTone } from "@/components/ui/icon-circle";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import { CATEGORIES, CATEGORY_ICON, REPORTS, reportBySlug, type ReportCategory, type ReportDef } from "@/lib/mock/relatorios";
import { useFavoriteReports, useRecentReports } from "@/components/relatorios/use-favorites";

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

/** Mesmo esquema de cores por área usado em Cadastros. */
const CATEGORY_TONE: Record<ReportCategory, IconCircleTone> = {
  Pacientes: "info",
  Agenda: "info",
  Prontuário: "success",
  Laboratório: "success",
  Faturamento: "warning",
  Caixa: "warning",
  Financeiro: "warning",
  Estoque: "neutral",
};

type Filter = ReportCategory | "all" | "favorites";

function ReportRow({ report, favorite, onToggleFavorite }: { report: ReportDef; favorite: boolean; onToggleFavorite: () => void }) {
  return (
    <li className="group flex items-center gap-2 rounded-lg pr-3 transition-colors hover:bg-surface/60">
      <Link
        to={"/relatorios/" + report.slug}
        className="flex min-w-0 flex-1 items-center gap-4 py-3.5 pl-5 focus-visible:bg-surface/60 focus-visible:outline-none"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-base font-medium text-text">{report.name}</span>
          <span className="block truncate text-sm text-text-muted">{report.description}</span>
        </span>
      </Link>
      <button
        type="button"
        onClick={onToggleFavorite}
        aria-label={(favorite ? "Remover " : "Adicionar ") + report.name + (favorite ? " dos favoritos" : " aos favoritos")}
        aria-pressed={favorite}
        title={favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          favorite ? "text-warning hover:bg-warning-bg" : "text-text-subtle hover:bg-surface hover:text-warning",
        )}
      >
        <Star size={18} variant={favorite ? "Bold" : "Linear"} aria-hidden />
      </button>
      <Link to={"/relatorios/" + report.slug} tabIndex={-1} aria-hidden className="flex h-9 w-6 shrink-0 items-center justify-center">
        <ArrowRight2 size={16} className="text-text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-text" />
      </Link>
    </li>
  );
}

export default function RelatoriosCatalogo() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const { favorites, isFavorite, toggle } = useFavoriteReports();
  const { recents } = useRecentReports();

  const query = normalized(search);
  const filtered = useMemo(
    () =>
      REPORTS.filter(
        (report) =>
          (filter === "all" || (filter === "favorites" ? favorites.includes(report.slug) : report.category === filter)) &&
          (!query || normalized(report.name + " " + report.description + " " + report.category).includes(query)),
      ),
    [filter, favorites, query],
  );
  const recentReports = recents.map(reportBySlug).filter((r): r is ReportDef => Boolean(r));
  const grouped = CATEGORIES.map((category) => ({ category, reports: filtered.filter((report) => report.category === category) })).filter(
    (group) => group.reports.length > 0,
  );
  const showRecents = !query && filter === "all" && recentReports.length > 0;

  const filters: { id: Filter; label: string; icon: typeof Star; count: number }[] = [
    { id: "all", label: "Todos", icon: Category, count: REPORTS.length },
    { id: "favorites", label: "Favoritos", icon: Star, count: favorites.length },
    ...CATEGORIES.map((c) => ({ id: c as Filter, label: c, icon: CATEGORY_ICON[c], count: REPORTS.filter((r) => r.category === c).length })),
  ];

  const searchInput = (
    <Input icon={SearchNormal1} aria-label="Buscar relatórios" placeholder="Buscar relatório…" value={search} onChange={(event) => setSearch(event.target.value)} />
  );

  function clearFilters() {
    setSearch("");
    setFilter("all");
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Relatórios" description="Indicadores da clínica organizados por área." breadcrumbs={[{ label: "Relatórios" }]} />

      <LiquidTabs
        label="Categorias de relatório"
        tabs={filters.map((f) => ({ label: f.label, count: f.count }))}
        active={Math.max(0, filters.findIndex((f) => f.id === filter))}
        onChange={(i) => setFilter(filters[i].id)}
        actions={<div className="hidden w-72 lg:block">{searchInput}</div>}
      >
        {() => (
          <div className="flex flex-col">
            {/* No celular a busca não cabe ao lado das abas: vem para o topo do conteúdo. */}
            <div className="mb-5 lg:hidden">{searchInput}</div>

            {showRecents && (
              <div className="mb-6 rounded-lg bg-surface px-4 py-3.5">
                <h2 className="mb-2.5 flex items-center gap-2 text-sm font-medium text-text-muted">
                  <Clock size={16} aria-hidden />
                  Acessados recentemente
                </h2>
                <div className="flex flex-wrap gap-2">
                  {recentReports.map((r) => (
                    <Link
                      key={r.slug}
                      to={"/relatorios/" + r.slug}
                      className="rounded-full bg-surface-raised px-3 py-1.5 text-sm text-text transition-colors hover:bg-accent-muted hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      {r.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {grouped.length === 0 ? (
              <EmptyState
                icon={filter === "favorites" && !query ? Star : SearchNormal1}
                title={filter === "favorites" && !query ? "Nenhum favorito ainda" : "Nenhum relatório encontrado"}
                description={filter === "favorites" && !query ? "Toque na estrela de um relatório para salvá-lo aqui." : "Tente outra busca ou escolha outra categoria."}
                action={
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="ms-gradient-button rounded-full bg-accent px-4 py-2 text-sm font-semibold text-on-accent hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Ver todos os relatórios
                  </button>
                }
              />
            ) : (
              <div className="flex flex-col">
                {grouped.map(({ category, reports }) => {
                  const Icon = CATEGORY_ICON[category];
                  return (
                    <section key={category} aria-label={category} className="border-b border-border pb-2 pt-6 first:pt-0 last:border-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <IconCircle tone={CATEGORY_TONE[category]} size="md">
                          <Icon size={16} aria-hidden />
                        </IconCircle>
                        <h2 className="flex-1 text-md font-semibold text-text">{category}</h2>
                        <span className="tabular text-sm text-text-muted">
                          {reports.length} relatório{reports.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <ul className="-mx-5 mt-2 divide-y divide-border">
                        {reports.map((report) => (
                          <ReportRow key={report.slug} report={report} favorite={isFavorite(report.slug)} onToggleFavorite={() => toggle(report.slug)} />
                        ))}
                      </ul>
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </LiquidTabs>
    </div>
  );
}
