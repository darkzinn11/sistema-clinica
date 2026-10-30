import { IconCircle } from "@/components/ui/icon-circle";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ArchiveBox, DocumentText1, MoneyRecive, ReceiptItem, Wallet2, Warning2 } from "iconsax-reactjs";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Segmented } from "@/components/ui/tabs";
import { Select } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatCard, BarList } from "@/components/ui/charts";
import { FinancialFlowChart, FinancialPaymentChart } from "@/components/financeiro/financial-charts";
import { EmptyState } from "@/components/ui/empty-state";
import { addDaysIso, brl, dateShort } from "@/lib/format";
import { TODAY, clinic } from "@/lib/mock/core";
import {
  STATUS_LABEL,
  STATUS_TONE,
  fluxoDiario,
  historicoCaixas,
  lancamentosPagar,
  lancamentosReceber,
  receitaPorFormaPagamento,
  topProcedimentosPorReceita,
} from "@/lib/mock/financeiro";

type Periodo = "hoje" | "7d" | "30d" | "mes";

const PERIODO_DIAS: Record<Periodo, number> = { hoje: 1, "7d": 7, "30d": 30, mes: 30 };

export default function FinanceiroVisao() {
  const [periodo, setPeriodo] = useState<Periodo>("30d");
  const [unidade, setUnidade] = useState<string>("todas");

  const dias = PERIODO_DIAS[periodo];
  const serie = useMemo(() => fluxoDiario(dias).map((d, index) => ({
    label: d.label,
    iso: addDaysIso(TODAY, index - dias + 1),
    receitas: d.receitas / 100,
    despesas: d.despesas / 100,
  })), [dias]);

  const receitasPeriodo = serie.reduce((s, d) => s + d.receitas, 0) * 100;
  const despesasPeriodo = serie.reduce((s, d) => s + d.despesas, 0) * 100;
  const saldoPeriodo = receitasPeriodo - despesasPeriodo;
  const vencidosReceber = lancamentosReceber.filter((l) => l.status === "vencido").reduce((s, l) => s + l.valorCents, 0);

  const donutData = receitaPorFormaPagamento();
  const topProcs = topProcedimentosPorReceita();

  const proximos7 = Array.from({ length: 7 }, (_, i) => addDaysIso(TODAY, i));
  const aVencer = [...lancamentosReceber, ...lancamentosPagar]
    .filter((l) => (l.status === "em_aberto" || l.status === "vencido") && proximos7.includes(l.vencimento))
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
    .slice(0, 8);

  const ultimoCaixaComDiferenca = historicoCaixas.find((c) => c.contadoCents !== c.esperadoCents);
  const notasComErro = 2;
  const repassesPendentes = 3;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Financeiro"
        description="Visão geral das receitas, despesas e pendências da clínica."
        breadcrumbs={[{ label: "Financeiro" }]}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            label="Período"
            value={periodo}
            onChange={setPeriodo}
            options={[
              { value: "hoje", label: "Hoje" },
              { value: "7d", label: "7 dias" },
              { value: "30d", label: "30 dias" },
              { value: "mes", label: "Mês" },
            ]}
          />
          <Select
            aria-label="Unidade"
            wrapperClassName="w-56"
            value={unidade}
            onChange={(e) => setUnidade(e.target.value)}
            options={[{ value: "todas", label: "Todas as unidades" }, ...clinic.units.map((u) => ({ value: u.id, label: u.name }))]}
          />
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 ui-stat-strip" data-columns="4">
        <StatCard label="Receitas no período" value={brl(receitasPeriodo)} icon={<MoneyRecive size={18} />} delta={{ value: 8, period: "vs. período anterior", goodWhenUp: true }} />
        <StatCard label="Despesas no período" value={brl(despesasPeriodo)} icon={<ReceiptItem size={18} />} delta={{ value: 3, period: "vs. período anterior", goodWhenUp: false }} />
        <StatCard label="Saldo do período" value={brl(saldoPeriodo)} icon={<Wallet2 size={18} />} delta={{ value: 12, period: "vs. período anterior", goodWhenUp: true }} />
        <StatCard label="Vencidos a receber" value={brl(vencidosReceber)} icon={<Warning2 size={18} />} delta={{ value: 2, period: "vs. semana passada", goodWhenUp: false, suffix: " contas" }} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Os dois cards têm a mesma altura: o gráfico ocupa o espaço que a lista de formas de pagamento abre. */}
        <Card className="flex min-w-0 flex-col xl:col-span-2">
          <CardHeader
            className="border-b-0 pb-0"
            title="Fluxo de caixa"
            description="Entradas, saídas e saldo no período selecionado."
          />
          <CardBody className="flex flex-1 flex-col pt-3">
            <FinancialFlowChart data={serie} />
          </CardBody>
        </Card>
        <Card className="min-w-0 self-start">
          <CardHeader
            className="border-b-0 pb-0"
            title="Receita por forma de pagamento"
            description="Distribuição dos recebimentos registrados no histórico."
          />
          <CardBody className="pt-2">
            <FinancialPaymentChart data={donutData} />
          </CardBody>
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card>
          <CardHeader title="Top procedimentos por receita" />
          <CardBody>
            <BarList title="Top procedimentos por receita" data={topProcs} format={brl} />
          </CardBody>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="A vencer nos próximos 7 dias" description="Contas a pagar e a receber." />
          {aVencer.length === 0 ? (
            <EmptyState title="Nada a vencer nos próximos 7 dias" description="Os próximos lançamentos em aberto aparecerão aqui." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Vencimento</TH>
                  <TH>Descrição</TH>
                  <TH>Tipo</TH>
                  <TH align="right">Valor</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {aVencer.map((l) => (
                  <TR key={l.id}>
                    <TD>{dateShort(l.vencimento)}</TD>
                    <TD className="max-w-56 truncate">{l.descricao}</TD>
                    <TD>
                      <Badge tone={l.tipo === "receita" ? "success" : "danger"} size="sm">
                        {l.tipo === "receita" ? "A receber" : "A pagar"}
                      </Badge>
                    </TD>
                    <TD numeric className={l.tipo === "receita" ? "text-success" : "text-danger"}>
                      {l.tipo === "receita" ? "+" : "−"}
                      {brl(l.valorCents)}
                    </TD>
                    <TD>
                      <Badge tone={STATUS_TONE[l.status]} dot size="sm">
                        {STATUS_LABEL[l.status]}
                      </Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader title="Alertas" description="Pontos que precisam de atenção agora." />
        <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AlertTile icon={Warning2} tone="danger" title={`${lancamentosReceber.filter((l) => l.status === "vencido").length} contas vencidas`} description="A receber, aguardando cobrança." href="/financeiro/receber" />
          {ultimoCaixaComDiferenca ? (
            <AlertTile icon={ArchiveBox} tone="warning" title="Caixa fechado com diferença" description={`${dateShort(ultimoCaixaComDiferenca.data)} · ${brl(ultimoCaixaComDiferenca.contadoCents - ultimoCaixaComDiferenca.esperadoCents)}`} href="/financeiro/caixa" />
          ) : null}
          <AlertTile icon={Wallet2} tone="info" title={`${repassesPendentes} repasses pendentes`} description="Aguardando aprovação da competência." href="/financeiro/repasses" />
          <AlertTile icon={DocumentText1} tone="danger" title={`${notasComErro} NFS-e com erro`} description="Precisam ser reemitidas." href="/financeiro/notas-fiscais" />
        </CardBody>
      </Card>
    </div>
  );
}

function AlertTile({
  icon: Icon,
  tone,
  title,
  description,
  href,
}: {
  icon: typeof Warning2;
  tone: "danger" | "warning" | "info";
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link to={href} className="flex items-start gap-3 rounded-lg bg-surface p-3.5 transition-colors hover:bg-surface-raised hover:shadow-card">
      <IconCircle tone={tone} size="md">
        <Icon size={18} aria-hidden />
      </IconCircle>
      <div className="min-w-0">
        <p className="text-sm font-medium text-text">{title}</p>
        <p className="mt-0.5 text-sm text-text-muted">{description}</p>
      </div>
    </Link>
  );
}
