import { useState } from "react";
import { Calendar1, CalendarSearch, Chart } from "iconsax-reactjs";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/charts";
import { Tooltip } from "@/components/ui/misc";
import { addDaysIso, dateShort, pct, weekdayShort } from "@/lib/format";
import { occupancyNextDays } from "@/lib/mock/agenda";
import { TODAY, professionals } from "@/lib/mock/core";

const STEPS = 6;

function stepFor(p: number) {
  return Math.min(STEPS, Math.max(1, Math.ceil(p * STEPS) || (p > 0 ? 1 : 0)));
}

export default function Page() {
  const [hover, setHover] = useState<{ prof: string; day: string } | null>(null);
  const days = Array.from({ length: 14 }, (_, i) => i);
  const dayIsoAt = (i: number) => addDaysIso(TODAY, i);
  const matrix = professionals.map((p) => ({ prof: p, days: occupancyNextDays(p, TODAY, 14) }));

  const allPct = matrix.flatMap((row) => row.days.map((d) => d.pct));
  const avgPct = allPct.reduce((s, v) => s + v, 0) / (allPct.length || 1);
  const freeSlotsCount = matrix.reduce((s, row) => s + row.days.filter((d) => d.pct < 0.5).length, 0);
  let busiest = { date: TODAY, pct: 0 };
  for (let i = 0; i < 14; i += 1) {
    const iso = dayIsoAt(i);
    const avg = matrix.reduce((s, row) => s + row.days[i].pct, 0) / matrix.length;
    if (avg > busiest.pct) busiest = { date: iso, pct: avg };
  }

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
        description="Ocupação por profissional nos próximos 14 dias, pra enxergar rápido onde ainda há vaga."
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3 ui-stat-strip" data-columns="3">
        <StatCard icon={<Chart />} label="Ocupação média (14 dias)" value={pct(avgPct * 100)} />
        <StatCard icon={<CalendarSearch />} label="Dias-profissional com vaga livre" value={freeSlotsCount.toLocaleString("pt-BR")} footer={<p className="text-sm text-text-muted">ocupação abaixo de 50%</p>} />
        <StatCard icon={<Calendar1 />} label="Dia mais cheio" value={dateShort(busiest.date)} footer={<p className="text-sm text-text-muted">{pct(busiest.pct * 100)} de ocupação média</p>} />
      </div>

      <Card className="mapa-ocupacao">
        <CardHeader title="Ocupação por profissional" description="Clique não é necessário — passe o mouse pra ver o detalhe do dia." />
        <CardBody>
          <div className="overflow-x-auto">
            <div
              role="table"
              className="grid min-w-max gap-1.5 text-sm"
              style={{ gridTemplateColumns: `auto repeat(${days.length}, minmax(2.75rem, 1fr))` }}
            >
              <div role="row" className="contents">
                <div role="columnheader" className="sticky left-0 z-10 flex items-end bg-surface-raised pb-1 pr-3 text-xs font-semibold uppercase tracking-wide text-text-muted">Profissional</div>
                {days.map((i) => {
                  const iso = dayIsoAt(i);
                  return (
                    <div role="columnheader" key={iso} className="pb-1 text-center text-[11px] font-medium leading-tight text-text-muted">
                      <div className="capitalize">{weekdayShort(iso)}</div>
                      <div className="tabular whitespace-nowrap text-text-subtle">{dateShort(iso)}</div>
                    </div>
                  );
                })}
              </div>
              {matrix.map((row) => (
                <div role="row" key={row.prof.id} className="contents">
                  <div role="rowheader" className="sticky left-0 z-10 flex items-center gap-2 bg-surface-raised pr-3 text-text">
                    <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: `var(--c-series-${row.prof.color + 1})` }} />
                    <span className="whitespace-nowrap">{row.prof.name}</span>
                  </div>
                  {row.days.map((d) => {
                    const step = stepFor(d.pct);
                    const isHover = hover?.prof === row.prof.id && hover.day === d.date;
                    return (
                      <div role="cell" key={d.date}>
                        <Tooltip content={`${row.prof.name} · ${dateShort(d.date)} · ${pct(d.pct * 100)} ocupado`} className="block w-full">
                          <button
                            type="button"
                            onMouseEnter={() => setHover({ prof: row.prof.id, day: d.date })}
                            onMouseLeave={() => setHover(null)}
                            onFocus={() => setHover({ prof: row.prof.id, day: d.date })}
                            onBlur={() => setHover(null)}
                            className={`flex h-9 w-full items-center justify-center rounded-md text-[11px] font-semibold tabular transition-transform ${step <= 3 ? "heat-ink" : "heat-paper"} ${isHover ? "scale-105 ring-2 ring-accent" : ""}`}
                            style={{ background: step === 0 ? "var(--c-surface)" : `var(--c-seq-${step})` }}
                          >
                            {Math.round(d.pct * 100)}
                          </button>
                        </Tooltip>
                      </div>
                    );
                  })}
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
    </div>
  );
}
