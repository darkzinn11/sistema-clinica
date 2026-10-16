import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { DocumentDownload, ExportCurve, Refresh, Sms, TickCircle } from "iconsax-reactjs";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/input";
import { Segmented } from "@/components/ui/tabs";
import { DropdownMenu, Modal } from "@/components/ui/overlay";
import { Table, TBody, TD, THead, TH, TR, TableFooter } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/charts";
import { cn } from "@/lib/cn";
import { clinic, insurances, professionals } from "@/lib/mock/core";
import { CATEGORY_ICON, reportBySlug } from "@/lib/mock/relatorios";
import { getReportConfig } from "@/components/relatorios/report-configs";
import { PERIOD_OPTIONS, defaultFilters, type ReportFilters } from "@/components/relatorios/report-types";
import { ReportChart } from "@/components/relatorios/report-chart";
import { useRegisterRecentReport } from "@/components/relatorios/use-favorites";

const EXPORT_FORMATS = ["PDF", "Excel", "CSV"] as const;
const FREQUENCIES = [
  { value: "diario", label: "Diariamente" },
  { value: "semanal", label: "Semanalmente" },
  { value: "mensal", label: "Mensalmente" },
];

export default function Relatorio() {
  const { slug = "" } = useParams();
  const report = reportBySlug(slug);
  useRegisterRecentReport(report?.slug);
  const KpiIcon = report ? CATEGORY_ICON[report.category] : undefined;

  const [filters, setFilters] = useState<ReportFilters>(() => defaultFilters(clinic.units[0].id));
  const [refreshing, setRefreshing] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [emails, setEmails] = useState("");
  const [frequency, setFrequency] = useState("semanal");
  const [format, setFormat] = useState<(typeof EXPORT_FORMATS)[number]>("PDF");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const config = useMemo(() => (report ? getReportConfig(report.slug, filters) : undefined), [report, filters]);

  if (!report || !config) {
    return (
      <div className="mx-auto max-w-7xl">
        <PageHeader title="Relatório" breadcrumbs={[{ label: "Relatórios", href: "/relatorios" }, { label: "Não encontrado" }]} />
        <Card>
          <EmptyState title="Relatório não encontrado" description="Esse relatório não existe ou foi removido do catálogo." />
        </Card>
      </div>
    );
  }

  function handleExport(fmt: string) {
    setToast(`Relatório "${report?.name}" exportado em ${fmt}.`);
  }

  function handleSchedule() {
    setScheduleOpen(false);
    setToast(`Envio por e-mail agendado (${FREQUENCIES.find((f) => f.value === frequency)?.label.toLowerCase()}, formato ${format}) para: ${emails || "destinatários não informados"}.`);
  }

  function handleRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={report.name}
        description={config.statement ? "Demonstração do resultado do exercício no período selecionado." : report.description}
        breadcrumbs={[{ label: "Relatórios", href: "/relatorios" }, { label: report.category, href: "/relatorios" }, { label: report.name }]}
        meta={<span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-text-muted">{report.category}</span>}
        actions={
          <>
            <Button variant="secondary" size="sm" icon={Sms} onClick={() => setScheduleOpen(true)}>
              Agendar envio por e-mail
            </Button>
            <DropdownMenu
              label="Exportar relatório"
              trigger={(p) => (
                <Button variant="primary" size="sm" icon={ExportCurve} {...p}>
                  Exportar
                </Button>
              )}
              items={EXPORT_FORMATS.map((fmt) => ({ label: `Exportar ${fmt}`, icon: DocumentDownload, onSelect: () => handleExport(fmt) }))}
            />
          </>
        }
      />

      {toast && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-success-bg bg-success-bg px-4 py-2.5 text-sm text-success">
          <TickCircle size={16} aria-hidden />
          <span className="flex-1">{toast}</span>
          <button type="button" onClick={() => setToast(null)} aria-label="Fechar aviso" className="text-success hover:underline">
            Fechar
          </button>
        </div>
      )}

      <div className="flex flex-col gap-6">
        <Card>
          <CardBody className="flex flex-wrap items-end gap-3">
            <Segmented label="Período" size="sm" value={filters.period} onChange={(v) => setFilters((f) => ({ ...f, period: v }))} options={PERIOD_OPTIONS} />
            <Select
              label="Profissional"
              wrapperClassName="w-48"
              value={filters.professionalId}
              onChange={(e) => setFilters((f) => ({ ...f, professionalId: e.target.value }))}
              options={[{ value: "all", label: "Todos os profissionais" }, ...professionals.map((p) => ({ value: p.id, label: p.name }))]}
            />
            <Select
              label="Convênio"
              wrapperClassName="w-44"
              value={filters.insuranceId}
              onChange={(e) => setFilters((f) => ({ ...f, insuranceId: e.target.value }))}
              options={[{ value: "all", label: "Todos os convênios" }, ...insurances.map((i) => ({ value: i.id, label: i.name }))]}
            />
            <Select
              aria-label="Unidade"
              wrapperClassName="w-44"
              value={filters.unitId}
              onChange={(e) => setFilters((f) => ({ ...f, unitId: e.target.value }))}
              options={clinic.units.map((u) => ({ value: u.id, label: u.name }))}
            />
            <Button variant="secondary" size="sm" icon={Refresh} onClick={handleRefresh} loading={refreshing} className="ml-auto">
              Atualizar
            </Button>
          </CardBody>
        </Card>

        <div className="ui-stat-strip grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" data-columns="4">
          {config.kpis.map((kpi) => (
            <StatCard key={kpi.label} icon={KpiIcon && <KpiIcon />} label={kpi.label} value={kpi.value} delta={kpi.delta} />
          ))}
        </div>

        {config.chart.type !== "none" && (
          <Card>
            <CardHeader title="Visão gráfica" />
            <CardBody>
              <ReportChart chart={config.chart} />
            </CardBody>
          </Card>
        )}

        {config.statement ? (
          <Card>
            <CardHeader title="Demonstrativo" />
            <Table>
              <TBody>
                {config.statement.map((row, i) => (
                  <TR key={`${row.label}-${i}`} className={row.bold ? "bg-surface/40" : undefined}>
                    <TD className={cn(row.level === 1 && "pl-9", row.bold && "font-semibold text-text", row.muted && "text-text-muted")}>{row.label}</TD>
                    <TD numeric className={cn(row.bold && "font-semibold text-text", row.muted && "text-text-muted", row.value.startsWith("(") && "text-danger")}>
                      {row.value}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>
        ) : (
          <Card>
            <CardHeader title="Dados detalhados" />
            <Table>
              <THead>
                <tr>
                  {config.columns.map((c) => (
                    <TH key={c.key} align={c.numeric ? "right" : c.align}>
                      {c.label}
                    </TH>
                  ))}
                </tr>
              </THead>
              <TBody>
                {config.rows.length === 0 ? (
                  <tr>
                    <td colSpan={config.columns.length} className="px-4 py-10">
                      <EmptyState title="Sem dados para os filtros selecionados" description="Ajuste o período ou os filtros acima pra ver resultados." />
                    </td>
                  </tr>
                ) : (
                  config.rows.map((row, i) => (
                    <TR key={i}>
                      {config.columns.map((c) => (
                        <TD key={c.key} align={c.numeric ? "right" : c.align} numeric={c.numeric}>
                          {row[c.key]}
                        </TD>
                      ))}
                    </TR>
                  ))
                )}
                {config.totals && (
                  <TR className="bg-surface/60 font-semibold">
                    {config.columns.map((c) => (
                      <TD key={c.key} align={c.numeric ? "right" : c.align} numeric={c.numeric} className="text-text">
                        {config.totals?.[c.key]}
                      </TD>
                    ))}
                  </TR>
                )}
              </TBody>
            </Table>
            <TableFooter total={config.rows.length} pageSize={Math.max(config.rows.length, 1)} label={config.tableLabel ?? "registros"} />
          </Card>
        )}
      </div>

      <Modal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        title="Agendar envio por e-mail"
        description={`Receba "${report.name}" periodicamente, sem precisar abrir o sistema.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setScheduleOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" icon={Sms} onClick={handleSchedule}>
              Agendar envio
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Textarea label="Destinatários" placeholder="nome@clinica.com.br, outro@clinica.com.br" hint="Separe vários e-mails por vírgula." value={emails} onChange={(e) => setEmails(e.target.value)} rows={2} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Frequência" value={frequency} onChange={(e) => setFrequency(e.target.value)} options={FREQUENCIES} />
            <Select label="Formato" value={format} onChange={(e) => setFormat(e.target.value as (typeof EXPORT_FORMATS)[number])} options={EXPORT_FORMATS.map((f) => ({ value: f, label: f }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
