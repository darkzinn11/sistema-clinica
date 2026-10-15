/** Cores de série em ordem fixa (instância validada da skill dataviz). Nunca ciclar além de 8. */
export const SERIES = [
  "var(--c-series-1)",
  "var(--c-series-2)",
  "var(--c-series-3)",
  "var(--c-series-4)",
  "var(--c-series-5)",
  "var(--c-series-6)",
  "var(--c-series-7)",
  "var(--c-series-8)",
];

/** 1.284 / 12 mil / 4,2 mi — números grandes compactos pra eixo e indicador. */
export function compact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (Math.abs(n) >= 10_000) return `${(n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  return n.toLocaleString("pt-BR");
}
