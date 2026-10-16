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

/** Curva cúbica monótona: respeita os pontos reais e não cria picos artificiais. */
function monotonePath(points: { x: number; y: number }[]): string {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  const slopes = points.slice(1).map((point, index) => {
    const prev = points[index];
    return (point.y - prev.y) / (point.x - prev.x || 1);
  });
  const tangents = points.map((_, index) => {
    if (index === 0) return slopes[0];
    if (index === points.length - 1) return slopes[slopes.length - 1];
    const a = slopes[index - 1], b = slopes[index];
    return a * b <= 0 ? 0 : (2 * a * b) / (a + b);
  });
  return points.slice(1).reduce((path, point, index) => {
    const prev = points[index];
    const delta = (point.x - prev.x) / 3;
    return path + ` C ${prev.x + delta} ${prev.y + tangents[index] * delta}, ${point.x - delta} ${point.y - tangents[index + 1] * delta}, ${point.x} ${point.y}`;
  }, `M ${points[0].x} ${points[0].y}`);
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

export function FinancialFlowChart({ data }: { data: FlowPoint[] }) {
  const [view, setView] = useState<View>("ambas");
  const [hover, setHover] = useState<number | null>(null);
  const [container, width] = useContainerWidth();
  const gradientId = useId().replace(/:/g, "");
  const visible = LINE_SERIES.filter((series) => view === "ambas" || series.key === view);
  const plot = { left: width < 420 ? 56 : 74, right: 12, top: 22, bottom: 40 };
  const height = width < 420 ? 274 : 308;
  const plotWidth = Math.max(0, width - plot.left - plot.right);
  const plotHeight = height - plot.top - plot.bottom;
  const max = roundedMax(Math.max(1, ...data.flatMap((item) => visible.map((s) => item[s.key]))));
  const x = (index: number) => plot.left + (data.length < 2 ? plotWidth / 2 : index * plotWidth / (data.length - 1));
  const y = (value: number) => plot.top + plotHeight - value / max * plotHeight;
  const ticks = [0, .25, .5, .75, 1].map((part) => part * max);
  const labelsEvery = Math.max(1, Math.ceil(data.length / Math.max(1, Math.floor(plotWidth / 60))));
  const point = hover !== null ? data[hover] : null;
  const totals = {
    receitas: data.reduce((sum, point) => sum + point.receitas, 0),
    despesas: data.reduce((sum, point) => sum + point.despesas, 0),
  };

  function onPointerMove(event: PointerEvent<SVGRectElement>) {
    if (!data.length || !plotWidth) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    setHover(Math.round(ratio * (data.length - 1)));
  }

  return (
    <figure className="ms-finance-flow min-w-0" aria-label="Gráfico de evolução diária de receitas e despesas">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-label="Legenda do gráfico">
          {LINE_SERIES.map((series) => (
            <span key={series.key} className={cn("inline-flex items-center gap-2 text-xs font-medium", view !== "ambas" && view !== series.key ? "text-text-subtle" : "text-text-muted")}>
              <span aria-hidden className="h-[3px] w-5 rounded-full" style={{ backgroundColor: series.color }} />
              {series.label}
            </span>
          ))}
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
          <svg className="block overflow-visible" width={width} height={height} role="img" aria-label="Valores reais por dia, sem suavização dos picos">
            <defs>
              {visible.map((series) => (
                <linearGradient key={series.key} id={gradientId + "-" + series.key} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={series.color} stopOpacity={series.key === "receitas" ? .18 : .10} />
                  <stop offset="100%" stopColor={series.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>

            {ticks.map((tick) => (
              <g key={tick}>
                <line x1={plot.left} x2={width - plot.right} y1={y(tick)} y2={y(tick)} stroke="var(--c-chart-grid)" strokeWidth={1} strokeDasharray={tick === 0 ? undefined : "3 5"} />
                <text x={plot.left - 12} y={y(tick)} textAnchor="end" dominantBaseline="middle" fill="var(--c-text-subtle)" fontSize="11">
                  {shortMoney(tick)}
                </text>
              </g>
            ))}

            {data.map((d, index) => index % labelsEvery === 0 || index === data.length - 1
              ? <text key={d.iso} x={x(index)} y={height - 10} textAnchor="middle" fill="var(--c-text-subtle)" fontSize="11">{d.label}</text>
              : null)}

            {visible.map((series) => {
              if (!data.length) return null;
              const points = data.map((d, index) => ({ x: x(index), y: y(d[series.key]) }));
              const line = monotonePath(points);
              const area = line + " L " + x(data.length - 1) + " " + y(0) +
                " L " + x(0) + " " + y(0) + " Z";
              return (
                <g key={series.key}>
                  {data.length > 1 && <path d={area} fill={"url(#" + gradientId + "-" + series.key + ")"} />}
                  <path d={line} fill="none" stroke={series.color} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                  {(hover !== null || data.length === 1) && (
                    <circle
                      cx={x(hover ?? 0)}
                      cy={y(data[hover ?? 0][series.key])}
                      r={5}
                      fill={series.color}
                      stroke="var(--c-surface-raised)"
                      strokeWidth={3}
                    />
                  )}
                </g>
              );
            })}

            {hover !== null && (
              <line x1={x(hover)} x2={x(hover)} y1={plot.top} y2={plot.top + plotHeight} stroke="var(--c-chart-axis)" strokeWidth={1.2} strokeDasharray="4 4" />
            )}
            <rect
              x={plot.left} y={plot.top} width={plotWidth} height={plotHeight}
              fill="transparent"
              onPointerMove={onPointerMove}
              onPointerLeave={() => setHover(null)}
            />
            {data.map((d, index) => (
              <circle
                key={d.iso} cx={x(index)} cy={plot.top + plotHeight / 2} r={2}
                opacity={0} tabIndex={0}
                aria-label={dateShort(d.iso) + ": receitas " + brl(d.receitas * 100) + ", despesas " + brl(d.despesas * 100)}
                onFocus={() => setHover(index)}
                onBlur={() => setHover(null)}
                className="focus-visible:outline-none"
              />
            ))}
          </svg>
        )}

        {point && width > 0 && (
          <div
            aria-hidden
            className="pointer-events-none absolute z-10 w-[182px] rounded-lg border border-border bg-surface-raised p-3.5 shadow-pop"
            style={{
              left: Math.max(0, Math.min(width - 182, x(hover ?? 0) - 91)),
              top: Math.max(0, Math.min(height - 132, y(Math.max(...visible.map((s) => point[s.key]))) - 125)),
            }}
          >
            <p className="mb-2 text-xs font-semibold text-text">{dateShort(point.iso)}</p>
            {visible.map((s) => (
              <div key={s.key} className="mb-1.5 flex items-center justify-between gap-2 text-xs last:mb-0">
                <span className="inline-flex items-center gap-1.5 text-text-muted"><span aria-hidden className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.label}</span>
                <strong className="whitespace-nowrap font-semibold text-text">{brl(point[s.key] * 100)}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-text-subtle">As curvas passam pelos valores diários registrados. Selecione uma série para analisar valores menores com a escala ajustada.</p>
      <table className="sr-only">
        <caption>Receitas e despesas por dia</caption>
        <thead><tr><th>Data</th><th>Receitas</th><th>Despesas</th></tr></thead>
        <tbody>{data.map((d) => (
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
