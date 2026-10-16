import { IconCircle } from "@/components/ui/icon-circle";
import { Box1, CalendarRemove, SearchNormal1 } from "iconsax-reactjs";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { StatCard } from "@/components/ui/charts";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/input";
import { Meter } from "@/components/ui/misc";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR, TableFooter } from "@/components/ui/table";
import { addDaysIso, brl, dateBR } from "@/lib/format";
import { TODAY } from "@/lib/mock/core";
import { CATEGORIAS, produtos, proximoVencimento } from "@/lib/mock/estoque";

export default function PosicaoEstoque() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [categoria, setCategoria] = useState("");

  const limite30 = addDaysIso(TODAY, 30);

  const itensVencendo = useMemo(
    () => produtos.filter((p) => {
      const v = proximoVencimento(p.id);
      return v && v <= limite30;
    }),
    [limite30],
  );

  const abaixoMinimo = produtos.filter((p) => p.saldoAtual < p.estoqueMinimo);
  const valorEstoque = produtos.reduce((s, p) => s + p.saldoAtual * p.custoUnitCents, 0);

  const filtered = produtos.filter((p) => {
    if (categoria && p.categoria !== categoria) return false;
    if (search && !p.nome.toLowerCase().includes(search.toLowerCase()) && !p.codigo.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Posição do estoque" description="Saldo atual de todos os produtos da clínica." breadcrumbs={[{ label: "Estoque" }]} />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4 ui-stat-strip" data-columns="4">
        <StatCard label="Itens cadastrados" value={produtos.length} />
        <StatCard label="Abaixo do mínimo" value={abaixoMinimo.length} />
        <StatCard label="Vencendo em 30 dias" value={itensVencendo.length} />
        <StatCard label="Valor em estoque" value={brl(valorEstoque)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardBody className="flex flex-wrap items-center gap-2 border-b border-border">
            <Input icon={SearchNormal1} placeholder="Buscar por produto ou código" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar produtos" wrapperClassName="min-w-56 flex-1" />
            <Select aria-label="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Todas as categorias" wrapperClassName="w-52" options={CATEGORIAS.map((c) => ({ value: c, label: c }))} />
          </CardBody>
          {filtered.length === 0 ? (
            <EmptyState title="Nenhum produto encontrado" description="Ajuste os filtros de busca." />
          ) : (
            <>
              <Table>
                <THead>
                  <TR><TH>Produto</TH><TH>Categoria</TH><TH>Saldo vs. mínimo</TH><TH>Unidade</TH><TH>Próximo vencimento</TH><TH>Local</TH></TR>
                </THead>
                <TBody>
                  {filtered.slice(0, 30).map((p) => {
                    const venc = proximoVencimento(p.id);
                    const abaixo = p.saldoAtual < p.estoqueMinimo;
                    const alerta = !abaixo && p.saldoAtual < p.estoqueMinimo * 1.3;
                    const tone = abaixo ? "danger" : alerta ? "warning" : "success";
                    return (
                      <TR key={p.id} interactive onClick={() => navigate(`/estoque/produtos/${p.id}`)}>
                        <TD className="font-medium text-text">{p.nome}</TD>
                        <TD className="text-text-muted">{p.categoria}</TD>
                        <TD className="min-w-40">
                          <Meter value={p.saldoAtual} max={Math.max(p.estoqueMaximo, p.saldoAtual)} tone={tone} label="" showValue={`${p.saldoAtual} / mín. ${p.estoqueMinimo}`} />
                        </TD>
                        <TD className="text-text-muted">{p.unidade}</TD>
                        <TD className={venc && venc <= limite30 ? "text-warning" : "text-text-muted"}>{venc ? dateBR(venc) : "—"}</TD>
                        <TD className="text-text-muted">{p.local}</TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
              <TableFooter total={filtered.length} pageSize={30} label="produtos" />
            </>
          )}
        </Card>

        <Card>
          <CardHeader title="Alertas" description="Itens que precisam de atenção" />
          <CardBody className="flex flex-col gap-1">
            {abaixoMinimo.length === 0 && itensVencendo.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-muted">Nenhum alerta no momento.</p>
            ) : (
              <>
                {abaixoMinimo.map((p) => (
                  <Link key={`min-${p.id}`} to={`/estoque/produtos/${p.id}`} className="flex items-center gap-3 rounded-full px-2 py-2 text-sm hover:bg-surface">
                    <IconCircle tone="danger" size="xs"><Box1 size={14} aria-hidden /></IconCircle>
                    <span className="flex-1 text-text">{p.nome}</span>
                    <span className="tabular text-text-muted">{p.saldoAtual} {p.unidade}</span>
                  </Link>
                ))}
                {itensVencendo.map((p) => (
                  <Link key={`venc-${p.id}`} to={`/estoque/produtos/${p.id}`} className="flex items-center gap-3 rounded-full px-2 py-2 text-sm hover:bg-surface">
                    <IconCircle tone="warning" size="xs"><CalendarRemove size={14} aria-hidden /></IconCircle>
                    <span className="flex-1 text-text">{p.nome}</span>
                    <span className="tabular text-text-muted">{dateBR(proximoVencimento(p.id)!)}</span>
                  </Link>
                ))}
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
