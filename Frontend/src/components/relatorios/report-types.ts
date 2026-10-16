import type { ReactNode } from "react";
import { TODAY, appointmentsOn } from "@/lib/mock/core";
import type { Appointment } from "@/lib/mock/core";
import { addDaysIso } from "@/lib/format";
import type { Datum } from "@/components/ui/charts";

/**
 * Tipos e utilitários compartilhados pelos geradores de dados de relatório
 * (report-configs-core.tsx e report-configs-extra.tsx). Tudo determinístico:
 * mesmo slug + mesmos filtros => mesmos números, sempre.
 */

export type Period = "hoje" | "7d" | "30d" | "mes" | "trimestre";

export const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "hoje", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "mes", label: "Este mês" },
  { value: "trimestre", label: "Trimestre" },
];

export interface ReportFilters {
  period: Period;
  professionalId: string; // "all" | id
  insuranceId: string; // "all" | id
  unitId: string;
}

export function defaultFilters(unitId: string): ReportFilters {
  return { period: "30d", professionalId: "all", insuranceId: "all", unitId };
}

export function periodDays(period: Period): number {
  switch (period) {
    case "hoje":
      return 1;
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "mes":
      return 30;
    case "trimestre":
      return 60;
  }
}

/** Hash determinístico simples (string -> inteiro positivo). */
export function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h || 1;
}

export function filterSeed(slug: string, filters: ReportFilters, salt = ""): number {
  return hashSeed(`${slug}|${filters.period}|${filters.professionalId}|${filters.insuranceId}|${filters.unitId}|${salt}`);
}

/** Variação percentual (uma casa decimal) entre dois valores. */
export function deltaPct(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** Formata um valor em reais (não em centavos) como moeda — pros gráficos, que trabalham em reais pra o eixo ficar legível. */
export function moneyFmt(reais: number): string {
  return reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Agendamentos dos últimos `days` dias terminando hoje (ou do bloco anterior
 * de mesmo tamanho, se `offset` = days), já filtrados por profissional/convênio.
 */
export function appointmentsInPeriod(days: number, filters: ReportFilters, offset = 0): Appointment[] {
  const out: Appointment[] = [];
  for (let d = days - 1 + offset; d >= offset; d -= 1) {
    const iso = addDaysIso(TODAY, -d);
    for (const a of appointmentsOn(iso)) {
      if (filters.professionalId !== "all" && a.professionalId !== filters.professionalId) continue;
      if (filters.insuranceId !== "all" && a.insuranceId !== filters.insuranceId) continue;
      out.push(a);
    }
  }
  return out;
}

export function shortName(name: string): string {
  return name.replace(/^(Dra?\.)\s+/, "");
}

export interface KpiDef {
  label: string;
  value: string;
  delta?: { value: number; period: string; goodWhenUp?: boolean; suffix?: string };
}

export interface TableColumn {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  numeric?: boolean;
}

export interface StatementRow {
  label: string;
  value: string;
  level: 0 | 1;
  bold?: boolean;
  muted?: boolean;
}

export type ChartSpec =
  | { type: "none" }
  | { type: "bar"; title: string; data: Datum[]; series: { key: string; label: string }[]; format?: (n: number) => string; stacked?: boolean }
  | { type: "line"; title: string; data: Datum[]; series: { key: string; label: string }[]; format?: (n: number) => string; area?: boolean }
  | { type: "donut"; title: string; data: { label: string; value: number }[]; format?: (n: number) => string; centerLabel?: string; centerValue?: string }
  | { type: "donut2"; left: { title: string; data: { label: string; value: number }[]; centerLabel?: string; centerValue?: string }; right: { title: string; data: { label: string; value: number }[]; centerLabel?: string; centerValue?: string } };

export interface ReportConfig {
  kpis: KpiDef[];
  chart: ChartSpec;
  columns: TableColumn[];
  rows: Record<string, ReactNode>[];
  totals?: Record<string, ReactNode>;
  tableLabel?: string;
  /** Presente só no DRE: tabela em formato de demonstrativo (indentado), substitui columns/rows. */
  statement?: StatementRow[];
}
