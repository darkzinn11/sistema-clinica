import { BarChart, DonutChart, LineChart } from "@/components/ui/charts";
import type { ChartSpec } from "@/components/relatorios/report-types";

/** Renderiza o gráfico apropriado a partir do ChartSpec gerado pelo relatório. */
export function ReportChart({ chart }: { chart: ChartSpec }) {
  if (chart.type === "none") return null;
  if (chart.type === "bar") {
    return <BarChart data={chart.data} series={chart.series} stacked={chart.stacked} format={chart.format} title={chart.title} />;
  }
  if (chart.type === "line") {
    return <LineChart data={chart.data} series={chart.series} area={chart.area} format={chart.format} title={chart.title} />;
  }
  if (chart.type === "donut") {
    return <DonutChart data={chart.data} format={chart.format} centerLabel={chart.centerLabel} centerValue={chart.centerValue} title={chart.title} />;
  }
  // donut2
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <DonutChart data={chart.left.data} centerLabel={chart.left.centerLabel} centerValue={chart.left.centerValue} title={chart.left.title} size={140} />
      <DonutChart data={chart.right.data} centerLabel={chart.right.centerLabel} centerValue={chart.right.centerValue} title={chart.right.title} size={140} />
    </div>
  );
}
