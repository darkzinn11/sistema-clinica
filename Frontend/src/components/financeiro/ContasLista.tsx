import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { Add, ArrowDown2, CalendarTick, CardTick, Clock, Danger, Edit2, Eye, MoneyRecive, MoneySend, SearchNormal1, TickCircle, Trash } from "iconsax-reactjs";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select } from "@/components/ui/input";
import { Segmented } from "@/components/ui/tabs";
import { Table, TBody, TD, TH, THead, TR, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, Modal } from "@/components/ui/overlay";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/charts";
import { brl, dateShort } from "@/lib/format";
import { TODAY } from "@/lib/mock/core";
import { LancamentoFormDrawer } from "@/components/financeiro/LancamentoFormDrawer";
import { LancamentoDetailDrawer } from "@/components/financeiro/LancamentoDetailDrawer";
import {
  CATEGORIAS_DESPESA,
  CATEGORIAS_RECEITA,
  CENTROS_CUSTO,
  CONTAS,
  STATUS_LABEL,
  STATUS_TONE,
  kpisLancamentos,
  lancamentosPagar,
  lancamentosReceber,
  type Lancamento,
  type LancamentoStatus,
} from "@/lib/mock/financeiro";

type StatusFiltro = "todos" | "abertos" | "vencidos" | "pagos";

export function ContasLista({ tipo }: { tipo: "receita" | "despesa" }) {
  const isReceita = tipo === "receita";
  const base = isReceita ? lancamentosReceber : lancamentosPagar;
  const categorias = isReceita ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;

  const [searchParams, setSearchParams] = useSearchParams();
  const [overrides, setOverrides] = useState<Record<string, LancamentoStatus>>({});
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFiltro>("todos");
  const [categoria, setCategoria] = useState("");
  const [centroCusto, setCentroCusto] = useState("");
  const [conta, setConta] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [novoOpen, setNovoOpen] = useState(isReceita && searchParams.get("novo") === "1");
  const [cancelAlvo, setCancelAlvo] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function flashToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3000);
  }

  const effective: Lancamento[] = useMemo(() => base.map((l) => (overrides[l.id] ? { ...l, status: overrides[l.id], dataPagamento: overrides[l.id] === "pago" ? (l.dataPagamento ?? TODAY) : l.dataPagamento } : l)), [base, overrides]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return effective.filter((l) => {
      if (status === "abertos" && !(l.status === "em_aberto" || l.status === "parcial")) return false;
      if (status === "vencidos" && l.status !== "vencido") return false;
      if (status === "pagos" && l.status !== "pago") return false;
      if (categoria && l.categoria !== categoria) return false;
      if (centroCusto && l.centroCusto !== centroCusto) return false;
      if (conta && l.conta !== conta) return false;
      if (q && !l.descricao.toLowerCase().includes(q) && !l.contraparteNome.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [effective, search, status, categoria, centroCusto, conta]);

  const kpis = kpisLancamentos(effective);
  const totalFiltrado = filtered.reduce((s, l) => s + l.valorCents, 0);
  const detail = effective.find((l) => l.id === detailId) ?? null;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((l) => l.id)));
  }

  function baixarSelecionados() {
    setOverrides((prev) => {
      const next = { ...prev };
      for (const id of selected) next[id] = "pago";
      return next;
    });
    flashToast(`${selected.size} lançamento(s) ${isReceita ? "baixado(s) como recebido(s)" : "baixado(s) como pago(s)"}.`);
    setSelected(new Set());
  }

  function confirmarCancelamento() {
    if (!cancelAlvo) return;
    setOverrides((prev) => ({ ...prev, [cancelAlvo]: "cancelado" }));
    setCancelAlvo(null);
    flashToast("Lançamento cancelado.");
  }

  function handleCloseNovo() {
    setNovoOpen(false);
    if (searchParams.get("novo")) {
      const next = new URLSearchParams(searchParams);
      next.delete("novo");
      setSearchParams(next, { replace: true });
    }
  }

  const title = isReceita ? "Contas a receber" : "Contas a pagar";

  return (
    <div className="flex flex-col gap-5">
      {toast && (
        <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success-bg px-4 py-2.5 text-sm text-success">
          <TickCircle size={16} aria-hidden />
          {toast}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 ui-stat-strip" data-columns="4">
        <StatCard icon={<Clock />} label="Em aberto" value={brl(kpis.emAberto)} />
        <StatCard icon={<Danger />} label="Vencido" value={brl(kpis.vencido)} />
        <StatCard icon={isReceita ? <MoneyRecive /> : <MoneySend />} label={isReceita ? "Recebido no mês" : "Pago no mês"} value={brl(kpis.noMes)} />
        <StatCard icon={<CalendarTick />} label="Previsto para 30 dias" value={brl(kpis.previsto30)} />
      </div>

      <Card>
        <CardHeader
          title={title}
          description={isReceita ? "Lançamentos a receber de pacientes e convênios." : "Lançamentos a pagar a fornecedores e prestadores."}
          actions={
            <Button variant="primary" icon={Add} onClick={() => setNovoOpen(true)}>
              Novo lançamento
            </Button>
          }
        />
        <CardBody className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input icon={SearchNormal1} placeholder={isReceita ? "Buscar por paciente ou convênio…" : "Buscar por fornecedor…"} value={search} onChange={(e) => setSearch(e.target.value)} wrapperClassName="w-64" aria-label="Buscar lançamentos" />
            <Segmented
              label="Status"
              value={status}
              onChange={setStatus}
              options={[
                { value: "todos", label: "Todos" },
                { value: "abertos", label: "Em aberto" },
                { value: "vencidos", label: "Vencidos" },
                { value: "pagos", label: "Pagos" },
              ]}
            />
            <Select aria-label="Categoria" placeholder="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} options={categorias.map((c) => ({ value: c, label: c }))} wrapperClassName="w-48" />
            <Select aria-label="Centro de custo" placeholder="Centro de custo" value={centroCusto} onChange={(e) => setCentroCusto(e.target.value)} options={CENTROS_CUSTO.map((c) => ({ value: c, label: c }))} wrapperClassName="w-48" />
            <Select aria-label="Conta" placeholder="Conta" value={conta} onChange={(e) => setConta(e.target.value)} options={CONTAS.map((c) => ({ value: c, label: c }))} wrapperClassName="w-48" />
          </div>

          {selected.size > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-accent/30 bg-accent-muted px-4 py-2.5">
              <p className="text-sm font-medium text-accent">{selected.size} selecionado(s)</p>
              <div className="flex gap-2">
                <Button size="sm" variant="primary" icon={CardTick} onClick={baixarSelecionados}>
                  Baixar selecionados
                </Button>
                <Button size="sm" variant="secondary" icon={ArrowDown2} onClick={() => flashToast("Exportação gerada (simulada neste protótipo).")}>
                  Exportar
                </Button>
              </div>
            </div>
          )}

          {filtered.length === 0 ? (
            <EmptyState title="Nenhum lançamento encontrado" description="Ajuste os filtros ou crie um novo lançamento." action={<Button variant="secondary" icon={Add} onClick={() => setNovoOpen(true)}>Novo lançamento</Button>} />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH className="w-10">
                    <Checkbox label="" aria-label="Selecionar todos" checked={selected.size === filtered.length} onChange={toggleSelectAll} />
                  </TH>
                  <TH>Vencimento</TH>
                  <TH>Descrição</TH>
                  <TH>{isReceita ? "Paciente / convênio" : "Fornecedor"}</TH>
                  <TH>Categoria</TH>
                  <TH>Conta</TH>
                  <TH align="right">Valor</TH>
                  <TH>Status</TH>
                  <TH className="w-10" />
                </TR>
              </THead>
              <TBody>
                {filtered.map((l) => (
                  <TR key={l.id} interactive onClick={() => setDetailId(l.id)}>
                    <TD onClick={(e) => e.stopPropagation()}>
                      <Checkbox label="" aria-label={`Selecionar ${l.descricao}`} checked={selected.has(l.id)} onChange={() => toggleSelect(l.id)} />
                    </TD>
                    <TD>{dateShort(l.vencimento)}</TD>
                    <TD className="max-w-56 truncate">{l.descricao}</TD>
                    <TD className="max-w-48 truncate">{l.contraparteNome}</TD>
                    <TD>{l.categoria}</TD>
                    <TD className="whitespace-nowrap">{l.conta}</TD>
                    <TD numeric className={isReceita ? "text-success" : "text-danger"}>
                      {brl(l.valorCents)}
                    </TD>
                    <TD>
                      <Badge tone={STATUS_TONE[l.status]} dot size="sm">
                        {STATUS_LABEL[l.status]}
                      </Badge>
                    </TD>
                    <TD onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu
                        label="Ações"
                        trigger={(p) => (
                          <button {...p} aria-label="Mais ações" className="rounded-full p-1.5 text-text-muted hover:bg-surface hover:text-text">
                            <ArrowDown2 size={16} aria-hidden />
                          </button>
                        )}
                        items={[
                          { label: "Ver detalhes", icon: Eye, onSelect: () => setDetailId(l.id) },
                          { label: "Editar", icon: Edit2, onSelect: () => setDetailId(l.id) },
                          { label: "Cancelar lançamento", icon: Trash, danger: true, divider: true, onSelect: () => setCancelAlvo(l.id) },
                        ]}
                      />
                    </TD>
                  </TR>
                ))}
              </TBody>
              <tfoot>
                <tr className="border-t border-border-strong bg-surface/60 font-semibold text-text">
                  <td colSpan={6} className="px-4 py-2.5 text-sm">
                    Total filtrado
                  </td>
                  <td className="tabular px-4 py-2.5 text-right text-sm">{brl(totalFiltrado)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </Table>
          )}
          <TableFooter total={filtered.length} label="lançamentos" />
        </CardBody>
      </Card>

      <LancamentoFormDrawer open={novoOpen} onClose={handleCloseNovo} tipoInicial={tipo} />
      <LancamentoDetailDrawer
        lancamento={detail}
        open={Boolean(detail)}
        onClose={() => setDetailId(null)}
        onRegistrarPagamento={(id) => {
          setOverrides((prev) => ({ ...prev, [id]: "pago" }));
          setDetailId(null);
          flashToast(isReceita ? "Recebimento registrado." : "Pagamento registrado.");
        }}
      />
      <Modal
        open={Boolean(cancelAlvo)}
        onClose={() => setCancelAlvo(null)}
        title="Cancelar lançamento"
        description="Esta ação marca o lançamento como cancelado. Você pode reverter criando um novo lançamento depois."
        tone="danger"
        icon={Trash}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCancelAlvo(null)}>Voltar</Button>
            <Button variant="danger" onClick={confirmarCancelamento}>Cancelar lançamento</Button>
          </>
        }
      />
    </div>
  );
}
