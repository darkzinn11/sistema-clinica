import { useEffect, useId, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { cn } from "@/lib/cn";
import { brl, dateShort } from "@/lib/format";

type FlowPoint = {
  label: string;
  iso: string;
  receitas: number;
  despesas: number;
};
type SeriesKey = "receitas" | "despesas";
type View = "ambas" | SeriesKey;

const LINE_SERIES: { key: SeriesKey; label: string; color: string }[] = [
  { key: "receitas", label: "Receitas", color: "var(--c-finance-revenue)" },
  { key: "despesas", label: "Despesas", color: "var(--c-finance-expense)" },
];
const PAYMENT_COLORS = [
  "var(--c-finance-pay-1)", "var(--c-finance-pay-2)",
  "var(--c-finance-pay-3)", "var(--c-finance-pay-4)",
  "var(--c-finance-pay-5)", "var(--c-finance-pay-6)",
  "var(--c-finance-pay-7)", "var(--c-finance-pay-8)",
];
const numberFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

function shortMoney(value: number): string {
  const absolute = Math.abs(value);
  if (absolute >= 1000) return "R$ " + numberFormat.format(value / 1000) + " mil";
  return "R$ " + numberFormat.format(value);
}

function roundedMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const scaled = value / magnitude;
  return (scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 2.5 ? 2.5 : scaled <= 5 ? 5 : 10) * magnitude;
}

function useContainerWidth() {
  const element = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!element.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element.current);
    return () => observer.disconnect();
  }, []);
  return [element, width] as const;
}

type Bucket = { label: string; from: string; to: string; receitas: number; despesas: number };

/** Até 12 dias, uma barra por dia; acima disso, por semana — barras largas e legíveis (um mês vira 4–5 barras). */
function toBuckets(days: FlowPoint[]): Bucket[] {
  const size = days.length > 12 ? 7 : 1;
  const out: Bucket[] = [];
  for (let i = 0; i < days.length; i += size) {
    const chunk = days.slice(i, i + size);
    const first = chunk[0], last = chunk[chunk.length - 1];
    out.push({
      label: chunk.length > 1 ? `${first.label}–${last.label}` : first.label,
      from: first.iso,
      to: last.iso,
      receitas: chunk.reduce((sum, d) => sum + d.receitas, 0),
      despesas: chunk.reduce((sum, d) => sum + d.despesas, 0),
    });
  }
  return out;
}

const bucketDate = (b: Bucket) => (b.from === b.to ? dateShort(b.from) : `${dateShort(b.from)} – ${dateShort(b.to)}`);

/**
 * Receitas × despesas em barras arredondadas, uma por dia ou por semana (duas lado a lado em "Ambas").
 * Os dias acima da média do período ficam no degradê da cor da série; os demais, em barras claras com contorno.
 * A média aparece como uma linha tracejada com um ponto no início. Ao passar o mouse, o dia inteiro fica em
 * destaque e um balão escuro mostra a data e os valores.
 */
export function FinancialFlowChart({ data: days }: { data: FlowPoint[] }) {
  const data = toBuckets(days);
  const weekly = days.length > 12;
  const [view, setView] = useState<View>("ambas");
  const [hover, setHover] = useState<number | null>(null);
  const [container, width] = useContainerWidth();
  const gradientId = useId().replace(/:/g, "");
  const visible = LINE_SERIES.filter((series) => view === "ambas" || series.key === view);
  const plot = { left: width < 420 ? 56 : 74, right: 12, top: 22, bottom: 40 };
  const height = width < 420 ? 274 : 308;
  const plotWidth = Math.max(0, width - plot.left - plot.right);
  const plotHeight = height - plot.top - plot.bottom;
  // Escala em passos redondos (1, 2, 2,5 ou 5 × 10ⁿ), com no máximo 5 faixas: nada de "R$ 1,3 mil".
  const peak = Math.max(1, ...data.flatMap((item) => visible.map((s) => item[s.key])));
  const step = roundedMax(peak / 5);
  const max = Math.ceil(peak / step) * step;
  const slot = data.length ? plotWidth / data.length : 0;
  const center = (index: number) => plot.left + (index + 0.5) * slot;
  const y = (value: number) => plot.top + plotHeight - value / max * plotHeight;
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  const labelsEvery = Math.max(1, Math.ceil(data.length / Math.max(1, Math.floor(plotWidth / 60))));
  const point = hover !== null ? data[hover] : null;
  const totals = {
    receitas: days.reduce((sum, point) => sum + point.receitas, 0),
    despesas: days.reduce((sum, point) => sum + point.despesas, 0),
  };
  const average = {
    receitas: data.length ? totals.receitas / data.length : 0,
    despesas: data.length ? totals.despesas / data.length : 0,
  };
  // Barras ocupam ~62% da faixa de cada dia; em "Ambas" a faixa se divide em duas com um respiro entre elas.
  const groupWidth = Math.min(slot * 0.62, visible.length > 1 ? 120 : 96);
  const gap = visible.length > 1 ? Math.max(2, groupWidth * 0.1) : 0;
  const barWidth = Math.max(2, (groupWidth - gap * (visible.length - 1)) / visible.length);
  const radius = Math.min(18, barWidth * 0.3);
  // dias sem movimento ainda mostram um tracinho claro, para manter o ritmo das barras
  const MIN_BAR = 4;

  function onPointerMove(event: PointerEvent<SVGRectElement>) {
    if (!data.length || !plotWidth) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(0.9999, (event.clientX - rect.left) / rect.width));
    setHover(Math.floor(ratio * data.length));
  }

  const tooltipW = 196;
  const tooltipLeft = hover !== null ? center(hover) + groupWidth / 2 + 14 : 0;
  const tooltipFlip = tooltipLeft + tooltipW > width;

  return (
    <figure className="ms-finance-flow min-w-0" aria-label="Gráfico de evolução diária de receitas e despesas">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-label="Legenda do gráfico">
          {LINE_SERIES.map((series) => (
            <span key={series.key} className={cn("inline-flex items-center gap-2 text-xs font-medium", view !== "ambas" && view !== series.key ? "text-text-subtle" : "text-text-muted")}>
              <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: `linear-gradient(135deg, ${series.color}, color-mix(in srgb, ${series.color} 45%, white))` }} />
              {series.label}
            </span>
          ))}
          <span className="inline-flex items-center gap-2 text-xs font-medium text-text-muted">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full border border-border-strong bg-surface" />
            Abaixo da média
          </span>
        </div>
        <div className="inline-flex max-w-full items-center rounded-full bg-surface p-1" role="group" aria-label="Séries exibidas">
          {([
            ["ambas", "Ambas"], ["receitas", "Receitas"], ["despesas", "Despesas"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={view === value}
              onClick={() => { setView(value); setHover(null); }}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                view === value ? "bg-surface-raised text-text shadow-card" : "text-text-muted hover:text-text",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="ms-finance-flow-summary mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {LINE_SERIES.map((series) => (
          <div key={series.key} className="ms-finance-flow-summary-item rounded-lg px-4 py-3">
            <span className="flex items-center gap-2 text-xs font-medium text-text-muted">
              <span className="h-2 w-2 rounded-full" style={{ background: series.color }} aria-hidden />
              {series.key === "receitas" ? "Recebido no período" : "Pago no período"}
            </span>
            <strong className="mt-1 block text-lg font-semibold tracking-tight tabular-nums text-text">
              {brl(totals[series.key] * 100)}
            </strong>
          </div>
        ))}
      </div>
      <div ref={container} className="relative mt-3 w-full" style={{ height }}>
        {width > 0 && (
          <svg className="block overflow-visible" width={width} height={height} role="img" aria-label="Valores por dia; em destaque, os dias acima da média do período">
            <defs>
              {visible.map((series) => (
                // diagonal: cor cheia no alto à esquerda, clareando para baixo à direita
                <linearGradient key={series.key} id={gradientId + "-" + series.key} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={series.color} />
                  <stop offset="100%" stopColor={series.color} stopOpacity={0.38} />
                </linearGradient>
              ))}
            </defs>

            {ticks.map((tick) => (
              <g key={tick}>
                <text x={plot.left - 12} y={y(tick)} textAnchor="end" dominantBaseline="middle" fill="var(--c-text-subtle)" fontSize="11">
                  {shortMoney(tick)}
                </text>
              </g>
            ))}

            {data.map((d, index) => index % labelsEvery === 0 || index === data.length - 1
              ? <text key={d.from} x={center(index)} y={height - 10} textAnchor="middle" fill={hover === index ? "var(--c-text)" : "var(--c-text-subtle)"} fontSize="11">{d.label}</text>
              : null)}

            {data.map((d, index) => (
              <g key={d.from}>
                {visible.map((series, k) => {
                  const value = d[series.key];
                  const h = Math.max(MIN_BAR, plot.top + plotHeight - y(value));
                  const x0 = center(index) - groupWidth / 2 + k * (barWidth + gap);
                  const strong = hover === index || (value > 0 && value >= average[series.key]);
                  return (
                    <rect
                      key={series.key}
                      x={x0}
                      y={plot.top + plotHeight - h}
                      width={barWidth}
                      height={h}
                      rx={Math.min(radius, h / 2)}
                      fill={strong ? "url(#" + gradientId + "-" + series.key + ")" : "var(--c-surface)"}
                      stroke={strong ? "none" : "var(--c-border-strong)"}
                      strokeWidth={1}
                      opacity={hover !== null && hover !== index ? 0.55 : 1}
                    />
                  );
                })}
              </g>
            ))}

            {/* média do período: tracejada, com um ponto no início */}
            {visible.map((series) => average[series.key] > 0 && (
              <g key={series.key} aria-hidden>
                <line x1={plot.left} x2={width - plot.right} y1={y(average[series.key])} y2={y(average[series.key])} stroke={series.color} strokeWidth={1.4} strokeDasharray="5 5" opacity={0.75} />
                <circle cx={plot.left} cy={y(average[series.key])} r={4.5} fill={series.color} stroke="var(--c-surface-raised)" strokeWidth={2} />
              </g>
            ))}

            <rect
              x={plot.left} y={plot.top} width={plotWidth} height={plotHeight}
              fill="transparent"
              onPointerMove={onPointerMove}
              onPointerLeave={() => setHover(null)}
            />
            {data.map((d, index) => (
              <circle
                key={d.from} cx={center(index)} cy={plot.top + plotHeight / 2} r={2}
                opacity={0} tabIndex={0}
                aria-label={bucketDate(d) + ": receitas " + brl(d.receitas * 100) + ", despesas " + brl(d.despesas * 100)}
                onFocus={() => setHover(index)}
                onBlur={() => setHover(null)}
                className="focus-visible:outline-none"
              />
            ))}
          </svg>
        )}

        {point && hover !== null && width > 0 && (
          // balão escuro ao lado da barra, com a setinha apontando para ela
          <div
            aria-hidden
            className="pointer-events-none absolute z-10 rounded-xl bg-text px-3.5 py-3 text-surface-raised shadow-pop"
            style={{
              width: tooltipW,
              left: tooltipFlip ? center(hover) - groupWidth / 2 - 14 - tooltipW : tooltipLeft,
              top: Math.max(0, Math.min(height - 96, y(Math.max(...visible.map((s) => point[s.key]))) - 8)),
            }}
          >
            <span
              className="absolute top-4 h-3 w-3 rotate-45 rounded-[2px] bg-text"
              style={tooltipFlip ? { right: -5 } : { left: -5 }}
            />
            <p className="mb-1.5 text-xs font-medium opacity-70">{bucketDate(point)}</p>
            {visible.map((s) => (
              <div key={s.key} className="mb-1 flex items-center justify-between gap-2 text-xs last:mb-0">
                <span className="inline-flex items-center gap-1.5 opacity-90"><span aria-hidden className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.label}</span>
                <strong className="whitespace-nowrap font-semibold">{brl(point[s.key] * 100)}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-text-subtle">
        {weekly ? "Totais por semana. Em destaque, as semanas acima da média do período" : "Em destaque, os dias acima da média do período"} (linha tracejada). Selecione uma série para ver a escala ajustada a ela.
      </p>
      <table className="sr-only">
        <caption>Receitas e despesas por dia</caption>
        <thead><tr><th>Data</th><th>Receitas</th><th>Despesas</th></tr></thead>
        <tbody>{days.map((d) => (
          <tr key={d.iso}><th>{dateShort(d.iso)}</th><td>{brl(d.receitas * 100)}</td><td>{brl(d.despesas * 100)}</td></tr>
        ))}</tbody>
      </table>
    </figure>
  );
}

export function FinancialPaymentChart({ data }: { data: { label: string; value: number }[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const active = hovered ?? selected;
  const toggle = (index: number) => setSelected((current) => current === index ? null : index);
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const nonzero = total > 0 ? total : 1;
  const size = 224;
  const radius = 81;
  const length = 2 * Math.PI * radius;
  const gap = 6;
  const arcs = data.map((item, index) => {
    const segment = item.value / nonzero * length;
    const dash = Math.max(0, segment - gap);
    const position = data.slice(0, index).reduce((sum, preceding) => sum + preceding.value, 0) / nonzero * length + gap / 2;
    return { ...item, dash, position };
  });

  return (
    <figure className="ms-finance-payments flex min-w-0 flex-col items-center">
      <div className="relative mt-1 flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
        <svg viewBox={"0 0 " + size + " " + size} width={size} height={size} role="img" aria-label="Distribuição da receita por forma de pagamento">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--c-surface)" strokeWidth={20} />
          {arcs.map((arc, index) => (
            <circle
              key={arc.label}
              cx={size / 2} cy={size / 2} r={radius}
              fill="none"
              stroke={PAYMENT_COLORS[index % PAYMENT_COLORS.length]}
              strokeWidth={active === index ? 24 : 20}
              strokeLinecap="round"
              strokeDasharray={arc.dash + " " + (length - arc.dash)}
              strokeDashoffset={-arc.position}
              transform={"rotate(-90 " + size / 2 + " " + size / 2 + ")"}
              opacity={active !== null && active !== index ? .32 : 1}
              tabIndex={0}
              role="button"
              aria-pressed={selected === index}
              aria-label={arc.label + ": " + brl(arc.value) + ", " + Math.round(arc.value / nonzero * 100) + " por cento"}
              onPointerEnter={() => setHovered(index)}
              onPointerLeave={() => setHovered(null)}
              onFocus={() => setHovered(index)}
              onBlur={() => setHovered(null)}
              onClick={() => toggle(index)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  toggle(index);
                }
              }}
              className="cursor-pointer outline-none focus-visible:stroke-[26px]"
              style={{ transition: "opacity 180ms ease, stroke-width 180ms ease" }}
            />
          ))}
        </svg>
        <div aria-hidden className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 px-12 text-center">
          <span className="max-w-full text-[11px] font-medium text-text-muted">{active !== null ? data[active].label : "Total recebido"}</span>
          <strong className="max-w-full whitespace-nowrap text-[18px] font-semibold tracking-[-0.045em] text-text">{brl(active !== null ? data[active].value : total)}</strong>
          <span className="text-[11px] font-medium text-text-subtle">{active !== null ? Math.round(data[active].value / nonzero * 100) + "% do total" : data.length + " formas de pagamento"}</span>
        </div>
      </div>
      <div className="mt-4 w-full border-t border-border pt-3">
        <div className="mb-2 flex items-center justify-between gap-2 px-2 text-xs font-medium text-text-muted">
          <span>Forma de pagamento</span>
          <span>Participação</span>
        </div>
        <ul aria-label="Detalhamento por forma de pagamento" className="grid gap-1">
          {data.map((item, index) => (
            <li key={item.label}>
              <button
                type="button"
                onPointerEnter={() => setHovered(index)}
                onPointerLeave={() => setHovered(null)}
                onFocus={() => setHovered(index)}
                onBlur={() => setHovered(null)}
                onClick={() => toggle(index)}
                aria-pressed={selected === index}
                className={cn(
                  "ms-finance-payments-legend flex w-full min-w-0 flex-col gap-2 rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  active === index ? "bg-surface" : "hover:bg-surface",
                )}
              >
                <span className="flex w-full min-w-0 items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2 text-xs text-text-muted">
                    <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: PAYMENT_COLORS[index % PAYMENT_COLORS.length] }} />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-right text-xs">
                    <strong className="font-semibold tabular-nums text-text">{Math.round(item.value / nonzero * 100)}%</strong>
                    <span className="ml-2 text-text-muted">{brl(item.value)}</span>
                  </span>
                </span>
                <span className="h-1 w-full overflow-hidden rounded-full bg-surface" aria-hidden>
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: (item.value / nonzero * 100) + "%",
                      backgroundColor: PAYMENT_COLORS[index % PAYMENT_COLORS.length],
                    }}
                  />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <table className="sr-only">
        <caption>Recebimentos por forma de pagamento</caption>
        <thead><tr><th>Forma de pagamento</th><th>Valor</th><th>Participação</th></tr></thead>
        <tbody>{data.map((d) => (
          <tr key={d.label}><th>{d.label}</th><td>{brl(d.value)}</td><td>{Math.round(d.value / nonzero * 100)}%</td></tr>
        ))}</tbody>
      </table>
    </figure>
  );
}
