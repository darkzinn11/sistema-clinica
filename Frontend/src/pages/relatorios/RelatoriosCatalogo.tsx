import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowRight2, Clock, SearchNormal1, Star } from "iconsax-reactjs";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import { CATEGORIES, CATEGORY_ICON, REPORTS, reportBySlug, type ReportCategory, type ReportDef } from "@/lib/mock/relatorios";
import { useFavoriteReports, useRecentReports } from "@/components/relatorios/use-favorites";

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

function ReportRow({
  report, favorite, onToggleFavorite, compact = false,
}: {
  report: ReportDef;
  favorite: boolean;
  onToggleFavorite: () => void;
  compact?: boolean;
}) {
  const Icon = CATEGORY_ICON[report.category];
  return (
    <div className="group flex min-w-0 items-center gap-2.5 border-b border-border/70 px-2 py-1 last:border-b-0 sm:px-3">
      <Link
        to={"/relatorios/" + report.slug}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45"
      >
        <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface text-text-muted transition-colors group-hover:bg-accent-muted group-hover:text-accent">
          <Icon size={19} variant="Linear" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-text">{report.name}</span>
          <span className={cn("mt-0.5 block text-xs leading-snug text-text-muted", compact ? "truncate" : "line-clamp-2")}>
            {report.description}
          </span>
        </span>
        <ArrowRight2 aria-hidden size={17} className="shrink-0 text-text-subtle opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-within:opacity-100" />
      </Link>
      <button
        type="button"
        onClick={onToggleFavorite}
        aria-label={(favorite ? "Remover " : "Adicionar ") + report.name + (favorite ? " dos favoritos" : " aos favoritos")}
        aria-pressed={favorite}
        title={favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
          favorite ? "text-warning hover:bg-warning-bg" : "text-text-subtle hover:bg-surface hover:text-warning",
        )}
      >
        <Star size={19} variant={favorite ? "Bold" : "Linear"} aria-hidden />
      </button>
    </div>
  );
}

function ShortcutCard({
  title, subtitle, icon: Icon, reports, isFavorite, onToggleFavorite,
}: {
  title: string;
  subtitle: string;
  icon: typeof Star;
  reports: ReportDef[];
  isFavorite: (slug: string) => boolean;
  onToggleFavorite: (slug: string) => void;
}) {
  return (
    <Card className="min-w-0 overflow-hidden border border-border/70">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-muted text-accent">
            <Icon size={19} variant="Linear" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-text">{title}</h2>
            <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-xs font-medium tabular-nums text-text-muted">{reports.length}</span>
      </div>
      <div className="px-2 pb-1 pt-1">
        {reports.map((report) => (
          <ReportRow
            key={report.slug}
            report={report}
            compact
            favorite={isFavorite(report.slug)}
            onToggleFavorite={() => onToggleFavorite(report.slug)}
          />
        ))}
      </div>
    </Card>
  );
}

export default function RelatoriosCatalogo() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<ReportCategory | "all">("all");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const { favorites, isFavorite, toggle } = useFavoriteReports();
  const { recents } = useRecentReports();

  const query = normalized(search);
  const filtered = useMemo(
    () => REPORTS.filter((report) => (
      (activeCategory === "all" || report.category === activeCategory)
      && (!favoriteOnly || favorites.includes(report.slug))
      && (!query || normalized(report.name + " " + report.description + " " + report.category).includes(query))
    )),
    [activeCategory, favoriteOnly, favorites, query],
  );
  const favoriteReports = favorites.map(reportBySlug).filter((r): r is ReportDef => Boolean(r));
  const recentReports = recents.map(reportBySlug).filter((r): r is ReportDef => Boolean(r));
  const showShortcuts = !query && activeCategory === "all" && !favoriteOnly;
  const filterActive = !!query || activeCategory !== "all" || favoriteOnly;
  const grouped = CATEGORIES
    .map((category) => ({ category, reports: filtered.filter((report) => report.category === category) }))
    .filter((group) => group.reports.length > 0);

  function clearFilters() {
    setSearch("");
    setActiveCategory("all");
    setFavoriteOnly(false);
  }

  return (
    <div className="w-full min-w-0">
      <PageHeader
        title="Relatórios"
        description="Encontre, consulte e acompanhe os indicadores da clínica em um só lugar."
        meta={<span className="rounded-full bg-accent-muted px-3 py-1 text-xs font-semibold text-accent">{REPORTS.length} disponíveis</span>}
      />

      <div className="flex w-full min-w-0 flex-col gap-6">
        <Card className="border border-border/70 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-[1_1_340px]">
              <Input
                icon={SearchNormal1}
                aria-label="Buscar relatórios"
                placeholder="Buscar por nome, categoria ou assunto..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-11"
              />
            </div>
            <span aria-live="polite" className="whitespace-nowrap text-sm text-text-muted">
              <strong className="font-semibold tabular-nums text-text">{filtered.length}</strong> de {REPORTS.length} relatórios
            </span>
            <button
              type="button"
              onClick={() => setFavoriteOnly((value) => !value)}
              aria-pressed={favoriteOnly}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                favoriteOnly ? "border-accent/30 bg-accent-muted text-accent" : "border-border-strong bg-surface-raised text-text-muted hover:border-accent/30 hover:text-text",
              )}
            >
              <Star size={17} variant={favoriteOnly ? "Bold" : "Linear"} aria-hidden />
              Favoritos
              <span className="text-xs tabular-nums opacity-70">{favoriteReports.length}</span>
            </button>
            {filterActive && (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-full px-3 py-2 text-sm font-medium text-accent hover:bg-accent-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                Limpar filtros
              </button>
            )}
          </div>

          <div role="group" aria-label="Filtrar relatórios por categoria" className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              aria-pressed={activeCategory === "all"}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                activeCategory === "all" ? "border-accent/30 bg-accent-muted text-accent" : "border-border-strong bg-surface-raised text-text-muted hover:border-accent/30 hover:text-text",
              )}
            >
              Todas <span className="text-xs tabular-nums opacity-70">{REPORTS.length}</span>
            </button>
            {CATEGORIES.map((category) => {
              const Icon = CATEGORY_ICON[category];
              const active = activeCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setActiveCategory(active ? "all" : category)}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                    active ? "border-accent/30 bg-accent-muted text-accent" : "border-border-strong bg-surface-raised text-text-muted hover:border-accent/30 hover:text-text",
                  )}
                >
                  <Icon size={15} variant="Linear" aria-hidden />
                  {category}
                  <span className="text-xs tabular-nums opacity-70">{REPORTS.filter((r) => r.category === category).length}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {showShortcuts && (favoriteReports.length > 0 || recentReports.length > 0) && (
          <section aria-label="Acessos rápidos aos relatórios">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="text-base font-semibold text-text">Acesso rápido</h2>
              <span className="text-xs text-text-muted">Continue de onde parou</span>
            </div>
            <div className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-2">
              {favoriteReports.length > 0 && (
                <ShortcutCard
                  title="Seus favoritos"
                  subtitle="Relatórios salvos para acesso rápido"
                  icon={Star}
                  reports={favoriteReports}
                  isFavorite={isFavorite}
                  onToggleFavorite={toggle}
                />
              )}
              {recentReports.length > 0 && (
                <ShortcutCard
                  title="Acessados recentemente"
                  subtitle="Seus últimos relatórios visualizados"
                  icon={Clock}
                  reports={recentReports}
                  isFavorite={isFavorite}
                  onToggleFavorite={toggle}
                />
              )}
            </div>
          </section>
        )}

        <section aria-label="Catálogo de relatórios">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-text">{filterActive ? "Resultados da busca" : "Explorar por categoria"}</h2>
              <p className="mt-0.5 text-xs text-text-muted">
                {filterActive
                  ? filtered.length + " relatório" + (filtered.length === 1 ? "" : "s") + " encontrado" + (filtered.length === 1 ? "" : "s")
                  : "Selecione um relatório para visualizar seus indicadores e filtros."}
              </p>
            </div>
            {!filterActive && <span className="text-xs text-text-muted">{CATEGORIES.length} categorias</span>}
          </div>

          {grouped.length === 0 ? (
            <Card className="border border-border/70">
              <EmptyState
                icon={SearchNormal1}
                title="Nenhum relatório encontrado"
                description="Tente outra busca ou remova os filtros selecionados."
                action={
                  <button type="button" onClick={clearFilters} className="ms-gradient-button rounded-full bg-accent px-4 py-2 text-sm font-semibold text-on-accent hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                    Ver todos os relatórios
                  </button>
                }
              />
            </Card>
          ) : (
            <div className="columns-1 gap-4 xl:columns-2">
              {grouped.map(({ category, reports }) => {
                const Icon = CATEGORY_ICON[category];
                return (
                  <Card key={category} className="mb-4 inline-block w-full min-w-0 break-inside-avoid overflow-hidden border border-border/70 align-top">
                    <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                      <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-muted text-accent">
                        <Icon size={20} variant="Linear" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-text">{category}</h3>
                        <p className="mt-0.5 text-xs text-text-muted">{reports.length} relatório{reports.length === 1 ? "" : "s"}</p>
                      </div>
                      <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium tabular-nums text-text-muted">{reports.length}</span>
                    </div>
                    <div className="px-2 pb-1 pt-1">
                      {reports.map((report) => (
                        <ReportRow
                          key={report.slug}
                          report={report}
                          favorite={isFavorite(report.slug)}
                          onToggleFavorite={() => toggle(report.slug)}
                        />
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
