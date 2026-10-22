import { useMemo } from "react";
import { Calendar1, CalendarSearch, Chart } from "iconsax-reactjs";
import { Link } from "react-router";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/charts";
import { Skeleton, Tooltip } from "@/components/ui/misc";
import { addDaysIso, dateShort, pct, weekdayShort } from "@/lib/format";
import { useOccupancy } from "@/lib/api/agenda";
import { AgendaCatalogProvider, useCatalog } from "@/lib/agenda/provider";
import { todayIso } from "@/lib/agenda/time";

const STEPS = 6;
const DAYS = 14;

function stepFor(p: number) {
  return Math.min(STEPS, Math.max(1, Math.ceil(p * STEPS) || (p > 0 ? 1 : 0)));
}

export default function Page() {
  return (
    <AgendaCatalogProvider>
      <MapaView />
    </AgendaCatalogProvider>
  );
}

function MapaView() {
  const { professionals } = useCatalog();
  const today = todayIso();
  const dates = useMemo(() => Array.from({ length: DAYS }, (_, i) => addDaysIso(today, i)), [today]);
  const occupancy = useOccupancy(dates[0], dates[DAYS - 1]);

  // Por profissional e dia: fração ocupada, ou null quando o profissional não atende naquele dia.
  const matrix = useMemo(() => {
    const byKey = new Map((occupancy.data ?? []).map((o) => [`${o.profissionalId}|${o.data}`, o]));
    return professionals.map((prof) => ({
      prof,
      days: dates.map((date) => {
        const o = byKey.get(`${prof.id}|${date}`);
        return { date, pct: o && o.blocos > 0 ? Math.min(1, o.ocupados / o.blocos) : null };
      }),
    }));
  }, [occupancy.data, professionals, dates]);

  const cells = matrix.flatMap((row) => row.days.map((d) => d.pct).filter((v): v is number => v !== null));
  const avgPct = cells.reduce((s, v) => s + v, 0) / (cells.length || 1);
  const withVacancy = cells.filter((v) => v < 0.5).length;
  let busiest: { date: string; pct: number } | null = null;
  dates.forEach((date, i) => {
    const values = matrix.map((row) => row.days[i].pct).filter((v): v is number => v !== null);
    if (!values.length) return;
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    if (!busiest || avg > busiest.pct) busiest = { date, pct: avg };
  });
  const busiestDay = busiest as { date: string; pct: number } | null;

  return (
    <div className="mx-auto max-w-7xl">
      <style>{`
        .mapa-ocupacao .heat-ink { color: #11151c; }
        .mapa-ocupacao .heat-paper { color: #f4f6f9; }
        :root[data-theme="dark"] .mapa-ocupacao .heat-ink { color: #f4f6f9; }
        :root[data-theme="dark"] .mapa-ocupacao .heat-paper { color: #11151c; }
      `}</style>
      <PageHeader
        title="Mapa de ocupação"
        breadcrumbs={[{ label: "Agenda", href: "/agenda" }, { label: "Mapa de ocupação" }]}
        description="Ocupação por profissional nos próximos 14 dias (blocos da grade tomados), pra enxergar rápido onde ainda há vaga."
      />

      {occupancy.isPending ? (
        <Skeleton className="h-96 w-full" />
      ) : occupancy.isError ? (
        <Card><EmptyState title="Não foi possível carregar a ocupação." description={occupancy.error.message} /></Card>
      ) : professionals.length === 0 ? (
        <Card><EmptyState title="Nenhum profissional na agenda desta unidade" description="Cadastre profissionais e grades em Cadastros." /></Card>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3 ui-stat-strip" data-columns="3">
            <StatCard icon={<Chart />} label="Ocupação média (14 dias)" value={pct(avgPct * 100)} />
            <StatCard icon={<CalendarSearch />} label="Dias-profissional com vaga livre" value={withVacancy.toLocaleString("pt-BR")} footer={<p className="text-sm text-text-muted">ocupação abaixo de 50%</p>} />
            <StatCard icon={<Calendar1 />} label="Dia mais cheio" value={busiestDay ? dateShort(busiestDay.date) : "—"} footer={<p className="text-sm text-text-muted">{busiestDay ? `${pct(busiestDay.pct * 100)} de ocupação média` : "Sem grades nos próximos dias"}</p>} />
          </div>

          <Card className="mapa-ocupacao">
            <CardHeader title="Ocupação por profissional" description="Passe o mouse para ver o detalhe do dia; clique para abrir a agenda daquele dia." />
            <CardBody>
              <div className="overflow-x-auto">
                <div role="table" className="grid min-w-max gap-1.5 text-sm" style={{ gridTemplateColumns: `auto repeat(${DAYS}, minmax(2.75rem, 1fr))` }}>
                  <div role="row" className="contents">
                    <div role="columnheader" className="sticky left-0 z-10 flex items-end bg-surface-raised pb-1 pr-3 text-xs font-semibold uppercase tracking-wide text-text-muted">Profissional</div>
                    {dates.map((iso) => (
                      <div role="columnheader" key={iso} className="pb-1 text-center text-[11px] font-medium leading-tight text-text-muted">
                        <div className="capitalize">{weekdayShort(iso)}</div>
                        <div className="tabular whitespace-nowrap text-text-subtle">{dateShort(iso)}</div>
                      </div>
                    ))}
                  </div>
                  {matrix.map((row) => (
                    <div role="row" key={row.prof.id} className="contents">
                      <div role="rowheader" className="sticky left-0 z-10 flex items-center gap-2 bg-surface-raised pr-3 text-text">
                        <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: row.prof.colorCss }} />
                        <span className="whitespace-nowrap">{row.prof.name}</span>
                      </div>
                      {row.days.map((d) =>
                        d.pct === null ? (
                          <div role="cell" key={d.date}>
                            <div aria-label={`${row.prof.name} não atende em ${dateShort(d.date)}`} className="flex h-9 w-full items-center justify-center rounded-md text-[11px] text-text-subtle">—</div>
                          </div>
                        ) : (
                          <div role="cell" key={d.date}>
                            <Tooltip content={`${row.prof.name} · ${dateShort(d.date)} · ${pct(d.pct * 100)} ocupado`} className="block w-full">
                              <Link
                                to={`/agenda?data=${d.date}`}
                                className={`flex h-9 w-full items-center justify-center rounded-md text-[11px] font-semibold tabular transition-transform hover:scale-105 ${stepFor(d.pct) <= 3 ? "heat-ink" : "heat-paper"}`}
                                style={{ background: `var(--c-seq-${stepFor(d.pct)})` }}
                              >
                                {Math.round(d.pct * 100)}
                              </Link>
                            </Tooltip>
                          </div>
                        ),
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4 text-xs text-text-muted">
                <span>Menos ocupado</span>
                {Array.from({ length: STEPS }, (_, i) => i + 1).map((s) => (
                  <span key={s} aria-hidden className="h-3 w-6 rounded-sm" style={{ background: `var(--c-seq-${s})` }} />
                ))}
                <span>Mais ocupado</span>
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
