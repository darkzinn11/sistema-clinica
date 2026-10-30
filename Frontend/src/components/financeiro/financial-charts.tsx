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

function useContainerSize() {
  const element = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!element.current) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element.current);
    return () => observer.disconnect();
  }, []);
  return [element, size] as const;
}

type Bucket = { label: string; from: string; to: string; receitas: number; despesas: number; partial: boolean };

/** Até 12 dias, uma coluna por dia; acima disso, por semana (um mês vira 4–5 colunas). A última semana pode ficar incompleta. */
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
      partial: chunk.length < size,
    });
  }
  return out;
}

const bucketDate = (b: Bucket) => (b.from === b.to ? dateShort(b.from) : `${dateShort(b.from)} – ${dateShort(b.to)}`);

/**
 * Curva suave pelos pontos (cúbica monótona de Fritsch–Carlson): não passa do maior nem do menor valor
 * vizinho, então nunca afunda abaixo do zero nem inventa picos entre duas semanas.
 */
function smoothPath(points: [number, number][]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M${points[0][0]} ${points[0][1]}`;
  const n = points.length;
  const dx = points.slice(1).map((p, i) => p[0] - points[i][0]);
  const slope = points.slice(1).map((p, i) => (p[1] - points[i][1]) / dx[i]);
  const tangent = points.map((_, i) => {
    if (i === 0) return slope[0];
    if (i === n - 1) return slope[n - 2];
    return slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  });
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) { tangent[i] = 0; tangent[i + 1] = 0; continue; }
    const a = tangent[i] / slope[i], b = tangent[i + 1] / slope[i], h = Math.hypot(a, b);
    if (h > 3) { tangent[i] = 3 * a / h * slope[i]; tangent[i + 1] = 3 * b / h * slope[i]; }
  }
  let d = `M${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = points[i], [x1, y1] = points[i + 1], third = dx[i] / 3;
    d += ` C${x0 + third} ${y0 + tangent[i] * third} ${x1 - third} ${y1 - tangent[i + 1] * third} ${x1} ${y1}`;
  }
  return d;
}

/**
 * Receitas e despesas em curvas suaves com área esmaecida embaixo, uma por dia ou por semana.
 * Ao passar o mouse, uma linha vertical marca o ponto e o balão mostra receitas, despesas e saldo.
 * Os totais do período ficam nos cards do topo da página.
 */
export function FinancialFlowChart({ data: days }: { data: FlowPoint[] }) {
  const data = toBuckets(days);
  const gradientId = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  // O gráfico ocupa toda a altura que o card oferece (no mínimo 260): acompanha o card vizinho, sem vão embaixo.
  const [container, { width, height }] = useContainerSize();
  const plot = { left: width < 420 ? 52 : 64, right: 16, top: 16, bottom: 34 };
  const plotWidth = Math.max(0, width - plot.left - plot.right);
  const plotHeight = height - plot.top - plot.bottom;
  // Escala em passos redondos (1, 2, 2,5 ou 5 × 10ⁿ), com no máximo 5 faixas: nada de "R$ 1,3 mil".
  const peak = Math.max(1, ...data.flatMap((d) => [d.receitas, d.despesas]));
  const step = roundedMax(peak / 4);
  const max = Math.ceil(peak / step) * step;
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  // Um único ponto (hoje) fica no meio; com mais, a curva vai de ponta a ponta.
  const x = (index: number) => data.length > 1 ? plot.left + index / (data.length - 1) * plotWidth : plot.left + plotWidth / 2;
  const y = (value: number) => plot.top + plotHeight - value / max * plotHeight;
  const baseline = y(0);
  const labelsEvery = Math.max(1, Math.ceil(data.length / Math.max(1, Math.floor(plotWidth / 72))));
  const curves = LINE_SERIES.map((series) => {
    const line = smoothPath(data.map((d, index) => [x(index), y(d[series.key])]));
    const area = data.length > 1 ? `${line} L${x(data.length - 1)} ${baseline} L${x(0)} ${baseline} Z` : "";
    return { ...series, line, area };
  });
  const point = hover !== null ? data[hover] : null;

  function onPointerMove(event: PointerEvent<SVGRectElement>) {
    if (!data.length || !plotWidth) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    setHover(data.length > 1 ? Math.round(ratio * (data.length - 1)) : 0);
  }

  const tooltipW = 200;
  const tooltipRight = hover !== null && x(hover) + 16 + tooltipW > width;

  return (
    <figure className="ms-finance-flow flex min-w-0 flex-1 flex-col" aria-label="Receitas e despesas no período">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-text-muted" aria-label="Legenda do gráfico">
        {LINE_SERIES.map((series) => (
          <span key={series.key} className="inline-flex items-center gap-2">
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: series.color }} />
            {series.label}
          </span>
        ))}
      </div>

      <div ref={container} className="relative mt-4 min-h-[260px] w-full flex-1">
        {width > 0 && height > 0 && (
          <svg className="absolute inset-0 block overflow-visible" width={width} height={height} role="img" aria-label="Curvas de receitas e despesas">
            <defs>
              {LINE_SERIES.map((series) => (
                <linearGradient key={series.key} id={gradientId + series.key} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={series.color} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={series.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>

            {ticks.map((tick) => (
              <g key={tick}>
                <line x1={plot.left} x2={width - plot.right} y1={y(tick)} y2={y(tick)} stroke="var(--c-chart-grid)" strokeDasharray={tick === 0 ? undefined : "3 5"} />
                <text x={plot.left - 12} y={y(tick)} textAnchor="end" dominantBaseline="middle" fill="var(--c-text-subtle)" fontSize="11">
                  {tick === 0 ? "R$ 0" : shortMoney(tick)}
                </text>
              </g>
            ))}

            {data.map((d, index) => index % labelsEvery === 0 || index === data.length - 1 ? (
              <text key={d.from} x={x(index)} y={height - 8} textAnchor={data.length > 1 && index === 0 ? "start" : data.length > 1 && index === data.length - 1 ? "end" : "middle"} fill={hover === index ? "var(--c-text)" : "var(--c-text-subtle)"} fontSize="11">
                {d.label}{d.partial ? " (parcial)" : ""}
              </text>
            ) : null)}

            {curves.map((curve) => curve.area && <path key={curve.key + "-area"} d={curve.area} fill={`url(#${gradientId + curve.key})`} />)}
            {curves.map((curve) => (
              <path key={curve.key} d={curve.line} fill="none" stroke={curve.color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            ))}

            {hover !== null && point && (
              <g aria-hidden>
                <line x1={x(hover)} x2={x(hover)} y1={plot.top} y2={baseline} stroke="var(--c-border-input)" strokeDasharray="3 4" />
                {LINE_SERIES.map((series) => (
                  <circle key={series.key} cx={x(hover)} cy={y(point[series.key])} r={5} fill={series.color} stroke="var(--c-surface-raised)" strokeWidth={2.5} />
                ))}
              </g>
            )}
            {data.length === 1 && hover === null && LINE_SERIES.map((series) => (
              <circle key={series.key} cx={x(0)} cy={y(data[0][series.key])} r={4} fill={series.color} />
            ))}

            <rect
              x={plot.left - 8} y={plot.top} width={plotWidth + 16} height={plotHeight}
              fill="transparent"
              onPointerMove={onPointerMove}
              onPointerLeave={() => setHover(null)}
            />
            {data.map((d, index) => (
              <circle
                key={d.from} cx={x(index)} cy={baseline} r={2}
                opacity={0} tabIndex={0}
                aria-label={bucketDate(d) + (d.partial ? " (parcial)" : "") + ": receitas " + brl(d.receitas * 100) + ", despesas " + brl(d.despesas * 100) + ", saldo " + brl((d.receitas - d.despesas) * 100)}
                onFocus={() => setHover(index)}
                onBlur={() => setHover(null)}
                className="focus-visible:outline-none"
              />
            ))}
          </svg>
        )}

        {point && hover !== null && width > 0 && (
          <div
            aria-hidden
            className="pointer-events-none absolute top-2 z-10 rounded-xl bg-text px-3.5 py-3 text-surface-raised shadow-pop"
            style={{ width: tooltipW, left: tooltipRight ? x(hover) - 16 - tooltipW : x(hover) + 16 }}
          >
            <p className="mb-1.5 text-xs font-medium opacity-70">{bucketDate(point)}{point.partial ? " · parcial" : ""}</p>
            {LINE_SERIES.map((s) => (
              <div key={s.key} className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 opacity-90"><span aria-hidden className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.label}</span>
                <strong className="whitespace-nowrap font-semibold tabular-nums">{brl(point[s.key] * 100)}</strong>
              </div>
            ))}
            <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-surface-raised/20 pt-1.5 text-xs">
              <span className="opacity-90">Saldo</span>
              <strong className="whitespace-nowrap font-semibold tabular-nums">{brl((point.receitas - point.despesas) * 100)}</strong>
            </div>
          </div>
        )}
      </div>
      <table className="sr-only">
        <caption>Receitas, despesas e saldo</caption>
        <thead><tr><th>Período</th><th>Receitas</th><th>Despesas</th><th>Saldo</th></tr></thead>
        <tbody>{data.map((d) => (
          <tr key={d.from}><th>{bucketDate(d)}{d.partial ? " (parcial)" : ""}</th><td>{brl(d.receitas * 100)}</td><td>{brl(d.despesas * 100)}</td><td>{brl((d.receitas - d.despesas) * 100)}</td></tr>
        ))}</tbody>
      </table>
    </figure>
  );
}

/** Ponto do meio-anel: t = 0 na ponta esquerda, t = π na direita, passando pelo topo. */
const gaugePoint = (cx: number, cy: number, r: number, t: number) => [cx - r * Math.cos(t), cy - r * Math.sin(t)] as const;

/**
 * Segmento do meio-anel com cantos arredondados e vão de largura constante entre vizinhos. O contorno é
 * recuado pelo raio do canto e traçado com essa espessura e junções redondas: o desenho volta ao tamanho
 * certo já com os cantos suaves. As pontas do meio-anel não têm vão (assentam na base). Segmento estreito
 * demais para o vão vira nada (null).
 */
function gaugeSegment(cx: number, cy: number, inner: number, outer: number, from: number, to: number, gap: number, corner: number) {
  const end = (angle: number) => (angle <= 0 || angle >= Math.PI ? 0 : gap / 2) + corner;
  const ro = outer - corner;
  const ri = inner + corner;
  const [padFrom, padTo] = [end(from), end(to)];
  const [ao0, ao1, ai0, ai1] = [from + padFrom / ro, to - padTo / ro, from + padFrom / ri, to - padTo / ri];
  if (ai1 <= ai0) return null;
  const f = (n: number) => n.toFixed(2);
  const [x1, y1] = gaugePoint(cx, cy, ro, ao0);
  const [x2, y2] = gaugePoint(cx, cy, ro, ao1);
  const [x3, y3] = gaugePoint(cx, cy, ri, ai1);
  const [x4, y4] = gaugePoint(cx, cy, ri, ai0);
  return `M${f(x1)} ${f(y1)} A${f(ro)} ${f(ro)} 0 0 1 ${f(x2)} ${f(y2)} L${f(x3)} ${f(y3)} A${f(ri)} ${f(ri)} 0 0 0 ${f(x4)} ${f(y4)} Z`;
}

export function FinancialPaymentChart({ data }: { data: { label: string; value: number }[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const active = hovered ?? selected;
  const toggle = (index: number) => setSelected((current) => current === index ? null : index);
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const nonzero = total > 0 ? total : 1;
  const percent = (value: number) => Math.round(value / nonzero * 100);
  // Meio-anel do Figma: 252 de largura, anel de 42, vão de 6 e cantos de 6. A folga em volta acomoda o destaque.
  const outer = 126;
  const inner = 84;
  const lift = 5;
  const width = (outer + lift) * 2;
  const height = outer + lift;
  const cx = width / 2;
  const cy = height;
  // O valor precisa caber no vão do anel (168 de diâmetro): valores de milhões usam um corpo menor.
  const centerValue = brl(active !== null ? data[active].value : total);
  const arcs = data.map((item, index) => {
    const before = data.slice(0, index).reduce((sum, preceding) => sum + preceding.value, 0);
    return { ...item, from: before / nonzero * Math.PI, to: index === data.length - 1 ? Math.PI : (before + item.value) / nonzero * Math.PI };
  });

  return (
    <figure className="ms-finance-payments flex min-w-0 flex-col items-center">
      <div className="relative mt-4 shrink-0" style={{ width, height }}>
        <svg viewBox={"0 0 " + width + " " + height} width={width} height={height} role="img" aria-label="Distribuição da receita por forma de pagamento" className="overflow-visible">
          {arcs.map((arc, index) => {
            const isActive = active === index;
            const d = gaugeSegment(cx, cy, inner, isActive ? outer + lift : outer, arc.from, arc.to, 6, 6);
            if (!d) return null;
            const color = PAYMENT_COLORS[index % PAYMENT_COLORS.length];
            return (
              <path
                key={arc.label}
                d={d}
                fill={color}
                stroke={color}
                strokeWidth={12}
                strokeLinejoin="round"
                opacity={active !== null && !isActive ? .32 : 1}
                tabIndex={0}
                role="button"
                aria-pressed={selected === index}
                aria-label={arc.label + ": " + brl(arc.value) + ", " + percent(arc.value) + " por cento"}
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
                className="cursor-pointer outline-none"
              />
            );
          })}
        </svg>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 text-center" style={{ paddingInline: outer - inner + lift + 6 }}>
          <strong className={cn("max-w-full whitespace-nowrap font-semibold leading-tight tracking-[-0.03em] tabular-nums text-text", centerValue.length > 13 ? "text-[17px]" : "text-[20px]")}>{centerValue}</strong>
          <span className="max-w-full truncate text-[13px] text-text-muted">{active !== null ? data[active].label + " · " + percent(data[active].value) + "%" : "Total recebido"}</span>
        </div>
      </div>
      <div className="mt-8 w-full">
        <div className="mb-1 flex items-center justify-between gap-2 px-3 text-xs font-medium text-text-muted">
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
                  "ms-finance-payments-legend flex w-full min-w-0 flex-col gap-2.5 rounded-lg px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  active === index ? "bg-surface" : "hover:bg-surface",
                )}
              >
                <span className="flex w-full min-w-0 items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2 text-[13px] text-text-muted">
                    <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: PAYMENT_COLORS[index % PAYMENT_COLORS.length] }} />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-right text-[13px]">
                    <strong className="font-semibold tabular-nums text-text">{percent(item.value)}%</strong>
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
