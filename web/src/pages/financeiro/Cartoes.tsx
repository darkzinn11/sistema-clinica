import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, StatCard } from "@/components/ui/charts";
import { brl, dateBR } from "@/lib/format";
import { cheques, recebiveisFuturosPorSemana, transacoesCartao, type Cheque, type TransacaoCartao } from "@/lib/mock/financeiro";

const TIPO_LABEL: Record<TransacaoCartao["tipo"], string> = { credito: "Crédito", debito: "Débito", parcelado: "Parcelado" };
const CHEQUE_STATUS_LABEL: Record<Cheque["status"], string> = { em_carteira: "Em carteira", depositado: "Depositado", devolvido: "Devolvido" };
const CHEQUE_STATUS_TONE: Record<Cheque["status"], "info" | "success" | "danger"> = { em_carteira: "info", depositado: "success", devolvido: "danger" };

export default function Cartoes() {
  const totalBruto = transacoesCartao.reduce((s, t) => s + t.brutoCents, 0);
  const totalLiquido = transacoesCartao.reduce((s, t) => s + t.liquidoCents, 0);
  const naoConciliadas = transacoesCartao.filter((t) => !t.conciliado).length;
  const recebiveis = recebiveisFuturosPorSemana();

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Cartões e cheques"
        description="Transações de cartão, taxas de maquininha, recebíveis futuros e cheques recebidos."
        breadcrumbs={[{ label: "Financeiro", href: "/financeiro" }, { label: "Cartões e cheques" }]}
      />

      <Card>
        <CardBody>
          <Tabs tabs={[{ label: "Cartões" }, { label: "Cheques" }]}>
            {(active) =>
              active === 0 ? (
                <div className="flex flex-col gap-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 ui-stat-strip" data-columns="3">
                    <StatCard label="Bruto no período" value={brl(totalBruto)} />
                    <StatCard label="Líquido no período" value={brl(totalLiquido)} />
                    <StatCard label="Não conciliadas" value={String(naoConciliadas)} />
                  </div>

                  <Card>
                    <CardHeader title="Recebíveis futuros" description="Previsão de recebimento por semana, já descontadas as taxas." />
                    <CardBody>
                      <BarChart title="Recebíveis futuros por semana" data={recebiveis} series={[{ key: "value", label: "Previsto" }]} format={brl} height={220} />
                    </CardBody>
                  </Card>

                  <Card>
                    <CardHeader title="Transações" />
                    <Table>
                      <THead>
                        <TR>
                          <TH>Data</TH>
                          <TH>Bandeira</TH>
                          <TH>Tipo</TH>
                          <TH align="right">Bruto</TH>
                          <TH align="right">Taxa</TH>
                          <TH align="right">Líquido</TH>
                          <TH>Previsão</TH>
                          <TH>Conciliado</TH>
                        </TR>
                      </THead>
                      <TBody>
                        {transacoesCartao.slice(0, 20).map((t) => (
                          <TR key={t.id}>
                            <TD>{dateBR(t.data)}</TD>
                            <TD>{t.bandeira}</TD>
                            <TD>
                              {TIPO_LABEL[t.tipo]}
                              {t.parcelas ? ` ${t.parcelas}x` : ""}
                            </TD>
                            <TD numeric>{brl(t.brutoCents)}</TD>
                            <TD numeric className="text-text-muted">{t.taxaPercent.toFixed(2)}%</TD>
                            <TD numeric className="font-medium">{brl(t.liquidoCents)}</TD>
                            <TD>{dateBR(t.previsaoRecebimento)}</TD>
                            <TD>
                              <Badge tone={t.conciliado ? "success" : "neutral"} dot size="sm">
                                {t.conciliado ? "Sim" : "Não"}
                              </Badge>
                            </TD>
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardHeader title="Cheques recebidos" />
                  <Table>
                    <THead>
                      <TR>
                        <TH>Número</TH>
                        <TH>Banco</TH>
                        <TH>Emitente</TH>
                        <TH align="right">Valor</TH>
                        <TH>Bom para</TH>
                        <TH>Status</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {cheques.map((c) => (
                        <TR key={c.id}>
                          <TD className="tabular">{c.numero}</TD>
                          <TD>{c.banco}</TD>
                          <TD className="max-w-48 truncate">{c.emitente}</TD>
                          <TD numeric className="font-medium">{brl(c.valorCents)}</TD>
                          <TD>{dateBR(c.bomPara)}</TD>
                          <TD>
                            <Badge tone={CHEQUE_STATUS_TONE[c.status]} dot size="sm">{CHEQUE_STATUS_LABEL[c.status]}</Badge>
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </Card>
              )
            }
          </Tabs>
        </CardBody>
      </Card>
    </div>
  );
}
