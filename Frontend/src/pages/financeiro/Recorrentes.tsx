import { useState } from "react";
import { Add, CalendarTick, MoneyRecive, ReceiptItem } from "iconsax-reactjs";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { StatCard, BarChart } from "@/components/ui/charts";
import { brl, dateBR } from "@/lib/format";
import { recorrentes as recorrentesIniciais, projecao12Meses } from "@/lib/mock/financeiro";

export default function Recorrentes() {
  const [recorrentes, setRecorrentes] = useState(recorrentesIniciais);

  function toggleAtivo(id: string) {
    setRecorrentes((prev) => prev.map((r) => (r.id === id ? { ...r, ativo: !r.ativo } : r)));
  }

  const receitasFixas = recorrentes.filter((r) => r.tipo === "receita" && r.ativo).reduce((s, r) => s + (r.frequencia === "mensal" ? r.valorCents : r.valorCents / 12), 0);
  const despesasFixas = recorrentes.filter((r) => r.tipo === "despesa" && r.ativo).reduce((s, r) => s + (r.frequencia === "mensal" ? r.valorCents : r.valorCents / 12), 0);
  const projecao = projecao12Meses();

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Lançamentos recorrentes"
        description="Receitas e despesas fixas que se repetem automaticamente — aluguel, folha, softwares e assinaturas."
        breadcrumbs={[{ label: "Financeiro", href: "/financeiro" }, { label: "Recorrentes" }]}
        actions={
          <Button variant="primary" icon={Add}>
            Nova recorrência
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 ui-stat-strip" data-columns="3">
        <StatCard label="Receitas fixas / mês" value={brl(Math.round(receitasFixas))} icon={<MoneyRecive size={18} />} />
        <StatCard label="Despesas fixas / mês" value={brl(Math.round(despesasFixas))} icon={<ReceiptItem size={18} />} />
        <StatCard label="Recorrências ativas" value={`${recorrentes.filter((r) => r.ativo).length} de ${recorrentes.length}`} icon={<CalendarTick size={18} />} />
      </div>

      <Card className="mt-5">
        <CardHeader title="Lançamentos recorrentes" description="Ative ou desative uma recorrência — o próximo lançamento deixa de ser gerado quando desativada." />
        <Table>
          <THead>
            <TR>
              <TH>Descrição</TH>
              <TH>Tipo</TH>
              <TH>Categoria</TH>
              <TH>Frequência</TH>
              <TH>Próximo lançamento</TH>
              <TH align="right">Valor</TH>
              <TH>Ativo</TH>
            </TR>
          </THead>
          <TBody>
            {recorrentes.map((r) => (
              <TR key={r.id} className={!r.ativo ? "opacity-60" : undefined}>
                <TD className="max-w-64 truncate font-medium">{r.descricao}</TD>
                <TD>
                  <Badge tone={r.tipo === "receita" ? "success" : "danger"} size="sm">
                    {r.tipo === "receita" ? "Receita" : "Despesa"}
                  </Badge>
                </TD>
                <TD>{r.categoria}</TD>
                <TD>{r.frequencia === "mensal" ? "Mensal" : "Anual"}</TD>
                <TD>{dateBR(r.proximoLancamento)}</TD>
                <TD numeric className={r.tipo === "receita" ? "text-success" : "text-danger"}>
                  {brl(r.valorCents)}
                </TD>
                <TD>
                  <Switch checked={r.ativo} onChange={() => toggleAtivo(r.id)} label="" />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>

      <Card className="mt-5">
        <CardHeader title="Projeção dos próximos 12 meses" description="Estimativa de receitas e despesas recorrentes, com variação esperada." />
        <CardBody>
          <BarChart
            title="Projeção de receitas e despesas"
            height={280}
            data={projecao.map((p) => ({ label: p.label, receitas: p.receitas / 100, despesas: p.despesas / 100 }))}
            series={[{ key: "receitas", label: "Receitas" }, { key: "despesas", label: "Despesas" }]}
            format={(n) => brl(n * 100)}
          />
        </CardBody>
      </Card>
    </div>
  );
}
