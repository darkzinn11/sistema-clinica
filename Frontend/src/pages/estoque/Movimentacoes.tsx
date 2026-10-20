import { Add } from "iconsax-reactjs";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/overlay";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/tabs";
import { Table, TBody, TD, TH, THead, TR, TableFooter } from "@/components/ui/table";
import { dateBR } from "@/lib/format";
import { currentUser } from "@/lib/mock/core";
import { FORNECEDORES, LOCAIS_ESTOQUE, MOVIMENTO_TIPO_META, type Movimentacao, type MovimentoTipo, lotesDoProduto, movimentacoes, produtoById, produtos } from "@/lib/mock/estoque";

const MOTIVOS_AJUSTE = ["Contagem de inventário", "Perda por validade vencida", "Produto danificado", "Divergência de conferência"];

export default function Movimentacoes() {
  const [extras, setExtras] = useState<Movimentacao[]>([]);
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [produtoFiltro, setProdutoFiltro] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);

  const [tipo, setTipo] = useState<MovimentoTipo>("entrada");
  const [produtoId, setProdutoId] = useState("");
  const [loteId, setLoteId] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [documento, setDocumento] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [destino, setDestino] = useState("");

  const all = useMemo(() => [...extras, ...movimentacoes], [extras]);
  const filtered = all.filter((m) => {
    if (tipoFiltro && m.tipo !== tipoFiltro) return false;
    if (produtoFiltro && m.produtoId !== produtoFiltro) return false;
    return true;
  });

  const lotesDisponiveis = produtoId ? lotesDoProduto(produtoId) : [];

  function resetForm() {
    setTipo("entrada");
    setProdutoId("");
    setLoteId("");
    setQuantidade(1);
    setDocumento("");
    setFornecedor("");
    setMotivo("");
    setDestino("");
  }

  function salvar() {
    const produto = produtoById(produtoId);
    const nova: Movimentacao = {
      id: `mov-novo-${Date.now()}`,
      tipo,
      produtoId,
      loteId: loteId || undefined,
      quantidade,
      documento: tipo === "entrada" ? documento : undefined,
      fornecedor: tipo === "entrada" ? fornecedor : undefined,
      motivo: tipo === "ajuste" ? motivo : tipo === "transferencia" ? `Transferência para ${destino}` : undefined,
      usuario: currentUser.name,
      data: new Date().toISOString().slice(0, 10),
    };
    setExtras((prev) => [nova, ...prev]);
    setDrawerOpen(false);
    setConfirm(`${MOVIMENTO_TIPO_META[tipo].label} de ${quantidade} ${produto?.unidade ?? "unidade(s)"} de ${produto?.nome ?? "produto"} registrada.`);
    resetForm();
  }

  const podeSalvar = Boolean(produtoId && quantidade > 0 && (tipo !== "ajuste" || motivo) && (tipo !== "transferencia" || destino));

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Movimentações"
        description="Entradas, saídas, ajustes e transferências de estoque."
        breadcrumbs={[{ label: "Estoque", href: "/estoque" }, { label: "Movimentações" }]}
        actions={<Button variant="primary" icon={Add} onClick={() => setDrawerOpen(true)}>Nova movimentação</Button>}
      />

      <Card>
        <CardBody className="flex flex-wrap items-center gap-2 border-b border-border">
          <Select aria-label="Tipo" value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)} placeholder="Todos os tipos" wrapperClassName="w-48" options={(Object.keys(MOVIMENTO_TIPO_META) as MovimentoTipo[]).map((t) => ({ value: t, label: MOVIMENTO_TIPO_META[t].label }))} />
          <Select aria-label="Produto" value={produtoFiltro} onChange={(e) => setProdutoFiltro(e.target.value)} placeholder="Todos os produtos" wrapperClassName="w-60" options={produtos.map((p) => ({ value: p.id, label: p.nome }))} />
        </CardBody>
        {filtered.length === 0 ? (
          <EmptyState title="Nenhuma movimentação encontrada" description="Ajuste os filtros ou registre uma nova movimentação." />
        ) : (
          <>
            <Table>
              <THead><TR><TH>Tipo</TH><TH>Produto</TH><TH align="right">Qtd.</TH><TH>Documento</TH><TH>Usuário</TH><TH>Data</TH></TR></THead>
              <TBody>
                {filtered.slice(0, 30).map((m) => (
                  <TR key={m.id}>
                    <TD><Badge tone={MOVIMENTO_TIPO_META[m.tipo as MovimentoTipo].tone} dot>{MOVIMENTO_TIPO_META[m.tipo as MovimentoTipo].label}</Badge></TD>
                    <TD className="font-medium text-text">{produtoById(m.produtoId)?.nome ?? "—"}</TD>
                    <TD numeric>{m.quantidade}</TD>
                    <TD className="text-text-muted">{m.documento ?? m.motivo ?? "—"}</TD>
                    <TD className="text-text-muted">{m.usuario}</TD>
                    <TD className="text-text-muted">{dateBR(m.data)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <TableFooter total={filtered.length} pageSize={30} label="movimentações" />
          </>
        )}
      </Card>

      <Modal
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Nova movimentação"
        footer={<><Button variant="secondary" onClick={() => setDrawerOpen(false)}>Cancelar</Button><Button variant="primary" onClick={salvar} disabled={!podeSalvar}>Registrar</Button></>}
      >
        <div className="flex flex-col gap-4">
          <div>
            <span className="mb-1.5 block text-sm font-medium text-text">Tipo de movimentação</span>
            <Segmented
              label="Tipo de movimentação"
              value={tipo}
              onChange={setTipo}
              options={[
                { value: "entrada", label: "Entrada" },
                { value: "saida", label: "Saída" },
                { value: "ajuste", label: "Ajuste" },
                { value: "transferencia", label: "Transferência" },
              ]}
            />
          </div>
          <Select label="Produto" required placeholder="Selecione o produto" value={produtoId} onChange={(e) => { setProdutoId(e.target.value); setLoteId(""); }} options={produtos.map((p) => ({ value: p.id, label: p.nome }))} />
          {lotesDisponiveis.length > 0 && (
            <Select label="Lote" placeholder="Selecione o lote (opcional)" value={loteId} onChange={(e) => setLoteId(e.target.value)} options={lotesDisponiveis.map((l) => ({ value: l.id, label: `${l.lote} · venc. ${dateBR(l.validade)}` }))} />
          )}
          <Input type="number" min={1} label="Quantidade" required value={quantidade} onChange={(e) => setQuantidade(Math.max(1, Number(e.target.value)))} />
          {tipo === "entrada" && (
            <>
              <Input label="Documento / NF" value={documento} onChange={(e) => setDocumento(e.target.value)} placeholder="NF-12345" />
              <Select label="Fornecedor" placeholder="Selecione o fornecedor" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} options={FORNECEDORES.map((f) => ({ value: f, label: f }))} />
            </>
          )}
          {tipo === "ajuste" && (
            <Select label="Motivo do ajuste" required placeholder="Selecione o motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} options={MOTIVOS_AJUSTE.map((m) => ({ value: m, label: m }))} />
          )}
          {tipo === "transferencia" && (
            <Select label="Local de destino" required placeholder="Selecione o destino" value={destino} onChange={(e) => setDestino(e.target.value)} options={LOCAIS_ESTOQUE.map((l) => ({ value: l, label: l }))} />
          )}
        </div>
      </Modal>

      <Modal open={Boolean(confirm)} onClose={() => setConfirm(null)} title="Movimentação registrada" description={confirm ?? undefined} footer={<Button variant="primary" onClick={() => setConfirm(null)}>Entendi</Button>} />
    </div>
  );
}
