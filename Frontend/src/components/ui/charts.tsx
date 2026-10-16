
/**
 * Gráficos do sistema — specs da skill dataviz (replica/design):
 * barras <=24px com ponta arredondada de 4px e base reta, linhas de 2px,
 * gap de 2px na cor da superfície entre marcas encostadas, grade hairline
 * sólida e recessiva, tooltip no hover/foco (valor primeiro, rótulo depois),
 * legenda sempre que houver 2+ séries, texto nunca na cor da série, e uma
 * tabela escondida pra leitor de tela. Cores de série em ordem fixa.
 */

import { ArrowDown, ArrowUp, Minus } from "iconsax-reactjs";
import { type ReactNode, cloneElement, isValidElement, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { SERIES, compact } from "@/lib/chart-utils";

export interface Series {
  key: string;
  label: string;
}

export type Datum = { label: string } & Record<string, number | string>;

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / exp;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * exp;
}

export function Legend({ series, shape = "rect" }: { series: Series[]; shape?: "rect" | "line" }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-text-muted">
      {series.map((s, i) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={shape === "rect" ? "h-2.5 w-2.5 rounded-sm" : "h-0.5 w-3.5 rounded-full"}
            style={{ background: SERIES[i % SERIES.length] }}
          />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

function SrTable({ data, series, format }: { data: Datum[]; series: Series[]; format: (n: number) => string }) {
  return (
    <table className="sr-only">
      <thead>
        <tr>
          <th>Categoria</th>
          {series.map((s) => (
            <th key={s.key}>{s.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((d) => (
          <tr key={d.label}>
            <th>{d.label}</th>
            {series.map((s) => (
              <td key={s.key}>{format(Number(d[s.key] ?? 0))}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Tip({ x, y, title, rows, width }: { x: number; y: number; title: string; rows: { color: string; label: string; value: string }[]; width: number }) {
  const left = Math.min(Math.max(x, 80), width - 80);
  return (
    <div
      className="pointer-events-none absolute z-10 min-w-36 -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-surface-raised px-3 py-2 shadow-pop"
      style={{ left, top: y - 8 }}
    >
      <p className="mb-1 text-xs text-text-muted">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-2 text-sm">
          <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: r.color }} />
          <span className="tabular font-semibold text-text">{r.value}</span>
          <span className="text-text-muted">{r.label}</span>
        </p>
      ))}
    </div>
  );
}

const PAD = { top: 12, right: 8, bottom: 26, left: 44 };

/** Colunas verticais — agrupadas ou empilhadas. */
export function BarChart({
  data,
  series,
  height = 240,
  stacked,
  format = (n) => n.toLocaleString("pt-BR"),
  title,
}: {
  data: Datum[];
  series: Series[];
  height?: number;
  stacked?: boolean;
  format?: (n: number) => string;
  /** Usado como rótulo acessível do gráfico. */
  title: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const totals = data.map((d) => (stacked ? series.reduce((s, ser) => s + Number(d[ser.key] ?? 0), 0) : Math.max(...series.map((ser) => Number(d[ser.key] ?? 0)))));
  const max = niceMax(Math.max(...totals, 1));
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = height - PAD.top - PAD.bottom;
  const band = data.length ? innerW / data.length : 0;
  const groupCount = stacked ? 1 : series.length;
  const barW = Math.min(24, Math.max(4, (band * 0.7 - (groupCount - 1) * 2) / groupCount));
  const groupW = barW * groupCount + (groupCount - 1) * 2;
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(1, Math.floor(innerW / 56))));

  return (
    <figure className="flex flex-col gap-3">
      {series.length > 1 && <Legend series={series} />}
      <div ref={ref} className="relative w-full" style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={title}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--c-chart-grid)" strokeWidth={1} />
                <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="tabular fill-text-subtle text-[11px]">
                  {compact(t)}
                </text>
              </g>
            ))}
            {data.map((d, i) => {
              const gx = PAD.left + band * i + (band - groupW) / 2;
              let acc = 0;
              return (
                <g key={d.label} opacity={hover === null || hover === i ? 1 : 0.55}>
                  {series.map((s, si) => {
                    const v = Number(d[s.key] ?? 0);
                    if (v <= 0) return null;
                    const x = stacked ? gx : gx + si * (barW + 2);
                    const top = stacked ? y(acc + v) : y(v);
                    const bottom = stacked ? y(acc) : y(0);
                    const isTop = !stacked || si === series.length - 1 || series.slice(si + 1).every((n) => Number(d[n.key] ?? 0) <= 0);
                    acc += v;
                    const h = Math.max(0, bottom - top - (stacked && si > 0 ? 2 : 0));
                    const r = isTop ? Math.min(4, barW / 2, h) : 0;
                    const path = `M${x},${top + h} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${top + h} Z`;
                    return <path key={s.key} d={path} fill={SERIES[si % SERIES.length]} />;
                  })}
                  {i % labelEvery === 0 && (
                    <text x={PAD.left + band * i + band / 2} y={height - 8} textAnchor="middle" className="fill-text-subtle text-[11px]">
                      {d.label}
                    </text>
                  )}
                  <rect
                    x={PAD.left + band * i}
                    y={PAD.top}
                    width={band}
                    height={innerH}
                    fill="transparent"
                    tabIndex={0}
                    aria-label={`${d.label}: ${series.map((s) => `${s.label} ${format(Number(d[s.key] ?? 0))}`).join(", ")}`}
                    onPointerEnter={() => setHover(i)}
                    onPointerLeave={() => setHover(null)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                    className="outline-none"
                  />
                </g>
              );
            })}
            <line x1={PAD.left} x2={width - PAD.right} y1={y(0)} y2={y(0)} stroke="var(--c-chart-axis)" strokeWidth={1} />
          </svg>
        )}
        {hover !== null && width > 0 && (
          <Tip
            x={PAD.left + band * hover + band / 2}
            y={y(totals[hover])}
            width={width}
            title={data[hover].label}
            rows={series.map((s, si) => ({ color: SERIES[si % SERIES.length], label: s.label, value: format(Number(data[hover][s.key] ?? 0)) }))}
          />
        )}
      </div>
      <SrTable data={data} series={series} format={format} />
    </figure>
  );
}

/** Linhas ao longo do tempo, com crosshair e área opcional. */
export function LineChart({
  data,
  series,
  height = 240,
  area,
  format = (n) => n.toLocaleString("pt-BR"),
  title,
}: {
  data: Datum[];
  series: Series[];
  height?: number;
  area?: boolean;
  format?: (n: number) => string;
  title: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const gid = useId().replace(/:/g, "");
  const all = data.flatMap((d) => series.map((s) => Number(d[s.key] ?? 0)));
  const max = niceMax(Math.max(...all, 1));
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(1, Math.floor(innerW / 64))));

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - rect.left) / rect.width;
    setHover(Math.round(rel * (data.length - 1)));
  }

  return (
    <figure className="flex flex-col gap-3">
      {series.length > 1 && <Legend series={series} shape="line" />}
      <div ref={ref} className="relative w-full" style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={title}>
            <defs>
              {series.map((s, si) => (
                <linearGradient key={s.key} id={`${gid}-${si}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={SERIES[si]} stopOpacity={0.14} />
                  <stop offset="100%" stopColor={SERIES[si]} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--c-chart-grid)" strokeWidth={1} />
                <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="tabular fill-text-subtle text-[11px]">
                  {compact(t)}
                </text>
              </g>
            ))}
            {data.map((d, i) =>
              i % labelEvery === 0 ? (
                <text key={d.label} x={x(i)} y={height - 8} textAnchor="middle" className="fill-text-subtle text-[11px]">
                  {d.label}
                </text>
              ) : null,
            )}
            {series.map((s, si) => {
              const pts = data.map((d, i) => `${x(i)},${y(Number(d[s.key] ?? 0))}`);
              return (
                <g key={s.key}>
                  {area && <path d={`M${x(0)},${y(0)} L${pts.join(" L")} L${x(data.length - 1)},${y(0)} Z`} fill={`url(#${gid}-${si})`} />}
                  <polyline points={pts.join(" ")} fill="none" stroke={SERIES[si]} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                  {data.length > 0 && (
                    <circle cx={x(data.length - 1)} cy={y(Number(data[data.length - 1][s.key] ?? 0))} r={4} fill={SERIES[si]} stroke="var(--c-surface-raised)" strokeWidth={2} />
                  )}
                </g>
              );
            })}
            {hover !== null && (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--c-chart-axis)" strokeWidth={1} />
                {series.map((s, si) => (
                  <circle key={s.key} cx={x(hover)} cy={y(Number(data[hover][s.key] ?? 0))} r={4} fill={SERIES[si]} stroke="var(--c-surface-raised)" strokeWidth={2} />
                ))}
              </g>
            )}
            <rect
              x={PAD.left}
              y={PAD.top}
              width={innerW}
              height={innerH}
              fill="transparent"
              onPointerMove={onMove}
              onPointerLeave={() => setHover(null)}
            />
          </svg>
        )}
        {hover !== null && width > 0 && (
          <Tip
            x={x(hover)}
            y={y(Math.max(...series.map((s) => Number(data[hover][s.key] ?? 0))))}
            width={width}
            title={data[hover].label}
            rows={series.map((s, si) => ({ color: SERIES[si], label: s.label, value: format(Number(data[hover][s.key] ?? 0)) }))}
          />
        )}
      </div>
      <SrTable data={data} series={series} format={format} />
    </figure>
  );
}

/** Rosca pra parte-do-todo com poucas categorias (até ~5). Legenda com valores. */
export function DonutChart({
  data,
  format = (n) => n.toLocaleString("pt-BR"),
  centerLabel,
  centerValue,
  title,
  size = 168,
}: {
  data: { label: string; value: number }[];
  format?: (n: number) => string;
  centerLabel?: string;
  centerValue?: string;
  title: string;
  size?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = size / 2;
  const inner = r * 0.64;
  const gap = data.length > 1 ? 0.025 : 0;
  const starts = data.map((_, i) => -Math.PI / 2 + (data.slice(0, i).reduce((s, d) => s + d.value, 0) / total) * Math.PI * 2);
  const arcs = data.map((d, i) => {
    const sweep = (d.value / total) * Math.PI * 2;
    const a0 = starts[i] + gap / 2;
    const a1 = starts[i] + sweep - gap / 2;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const p = (rad: number, a: number) => `${r + rad * Math.cos(a)},${r + rad * Math.sin(a)}`;
    return `M${p(r, a0)} A${r},${r} 0 ${large} 1 ${p(r, a1)} L${p(inner, a1)} A${inner},${inner} 0 ${large} 0 ${p(inner, a0)} Z`;
  });
  return (
    <figure className="flex flex-wrap items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} role="img" aria-label={title}>
          {arcs.map((d, i) => (
            <path
              key={data[i].label}
              d={d}
              fill={SERIES[i % SERIES.length]}
              opacity={hover === null || hover === i ? 1 : 0.45}
              tabIndex={0}
              aria-label={`${data[i].label}: ${format(data[i].value)}`}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="outline-none transition-opacity"
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-lg font-semibold text-text">{hover !== null ? format(data[hover].value) : centerValue}</span>
          <span className="max-w-[60%] text-xs text-text-muted">{hover !== null ? data[hover].label : centerLabel}</span>
        </div>
      </div>
      <ul className="flex min-w-40 flex-1 flex-col gap-2">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-text-muted">
              <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES[i % SERIES.length] }} />
              {d.label}
            </span>
            <span className="tabular font-medium text-text">
              {format(d.value)} <span className="font-normal text-text-subtle">({Math.round((d.value / total) * 100)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

/** Ranking em barras horizontais (top procedimentos, convênios...). Valor na ponta. */
export function BarList({ data, format = (n) => n.toLocaleString("pt-BR"), title }: { data: { label: string; value: number }[]; format?: (n: number) => string; title: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul aria-label={title} className="flex flex-col gap-3">
      {data.map((d) => (
        <li key={d.label} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-text">{d.label}</span>
            <span className="tabular shrink-0 font-medium text-text">{format(d.value)}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-surface">
            <div className="h-2 rounded-r-full rounded-l-sm" style={{ width: `${(d.value / max) * 100}%`, background: SERIES[0] }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Mini-linha de tendência, tom recessivo com o ponto atual em destaque. */
export function Sparkline({ values, width = 96, height = 28 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (width - 4) + 2, height - 3 - ((v - min) / span) * (height - 6)]);
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} aria-hidden>
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="var(--c-border-strong)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={3} fill="var(--c-series-1)" stroke="var(--c-surface-raised)" strokeWidth={1.5} />
    </svg>
  );
}

/** Indicador (KPI): mesmo cartão da Início — rótulo, ícone em círculo, valor, variação e rodapé. */
export function StatCard({
  label,
  value,
  delta,
  trend,
  icon,
  footer,
  className,
}: {
  label: string;
  value: ReactNode;
  /** Ex.: { value: 12, period: "vs semana passada", goodWhenUp: true } */
  delta?: { value: number; period: string; goodWhenUp?: boolean; suffix?: string };
  trend?: number[];
  icon?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const up = delta ? delta.value > 0 : false;
  const down = delta ? delta.value < 0 : false;
  const favorable = delta ? delta.value === 0 || up === (delta.goodWhenUp ?? true) : true;
  const DeltaIcon = up ? ArrowUp : down ? ArrowDown : Minus;
  const currency = typeof value === "string" && value.includes("R$");
  // Ícones chegam em tamanhos variados das telas; no círculo seguem o padrão da Início (21px, Bold).
  const iconEl = isValidElement<{ size?: number; variant?: string }>(icon)
    ? cloneElement(icon, { size: 21, variant: "Bold" })
    : icon;
  return (
    <article className={cn("ms-home-metric ms-stat-card", className)}>
      <p className="ms-home-metric__label">{label}</p>
      {iconEl && <span aria-hidden className="ms-home-metric__icon ms-home-metric__icon--dark">{iconEl}</span>}
      <div className="ms-home-metric__value-row">
        <p className={cn("ms-home-metric__value tabular-nums", currency && "ms-home-metric__value--currency")}>{value}</p>
        {delta && (
          <span className={cn("ms-home-metric__change", favorable ? "ms-home-metric__change--positive" : "ms-home-metric__change--negative")}>
            <DeltaIcon size={12} variant="Linear" aria-hidden />
            {up ? "+" : ""}
            {delta.value.toLocaleString("pt-BR")}
            {delta.suffix ?? "%"}
          </span>
        )}
        {trend && <span className="ml-auto"><Sparkline values={trend} /></span>}
      </div>
      {(footer || delta) && <div className="ms-home-metric__footer pt-3">{footer ?? delta?.period}</div>}
    </article>
  );
}
