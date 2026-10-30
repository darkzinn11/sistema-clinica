/** Cores dos gráficos em ordem fixa (tokens --c-chart-*). Nunca ciclar além de 8. */
export const SERIES = [
  "var(--c-chart-1)",
  "var(--c-chart-2)",
  "var(--c-chart-3)",
  "var(--c-chart-4)",
  "var(--c-chart-5)",
  "var(--c-chart-6)",
  "var(--c-chart-7)",
  "var(--c-chart-8)",
];

/** 1.284 / 12 mil / 4,2 mi — números grandes compactos pra eixo e indicador. */
export function compact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (Math.abs(n) >= 10_000) return `${(n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  return n.toLocaleString("pt-BR");
}
