import { Add, CloseCircle, TickCircle, Trash } from "iconsax-reactjs";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/input";
import { Drawer, Modal } from "@/components/ui/overlay";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR, TableFooter } from "@/components/ui/table";
import { dateBR } from "@/lib/format";
import { currentUser } from "@/lib/mock/core";
import { REQUISICAO_STATUS_META, SETORES, type Requisicao, type RequisicaoStatus, produtoById, produtos, requisicoes } from "@/lib/mock/estoque";

export default function Requisicoes() {
  const [extras, setExtras] = useState<Requisicao[]>([]);
  const [respostas, setRespostas] = useState<Record<string, RequisicaoStatus>>({});
  const [statusFiltro, setStatusFiltro] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);

  const [setor, setSetor] = useState("");
  const [itens, setItens] = useState<{ produtoId: string; quantidade: number }[]>([]);
  const [produtoAtual, setProdutoAtual] = useState("");
  const [qtdAtual, setQtdAtual] = useState(1);

  const all = useMemo(() => [...extras, ...requisicoes].map((r) => ({ ...r, status: respostas[r.id] ?? r.status })), [extras, respostas]);
  const filtered = all.filter((r) => (statusFiltro ? r.status === statusFiltro : true));

  function addItem() {
    if (!produtoAtual || itens.some((i) => i.produtoId === produtoAtual)) return;
    setItens((prev) => [...prev, { produtoId: produtoAtual, quantidade: qtdAtual }]);
    setProdutoAtual("");
    setQtdAtual(1);
  }

  function removeItem(produtoId: string) {
    setItens((prev) => prev.filter((i) => i.produtoId !== produtoId));
  }

  function enviar() {
    const nova: Requisicao = {
      id: `req-novo-${Date.now()}`,
      setor,
      solicitante: currentUser.name,
      itens,
      status: "pendente",
      dataSolicitacao: new Date().toISOString().slice(0, 10),
    };
    setExtras((prev) => [nova, ...prev]);
    setDrawerOpen(false);
    setConfirm(`Requisição enviada para o setor ${setor}.`);
    setSetor("");
    setItens([]);
  }

  function responder(id: string, status: RequisicaoStatus) {
    setRespostas((prev) => ({ ...prev, [id]: status }));
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Requisições"
        description="Pedidos de materiais feitos pelos setores da clínica."
        breadcrumbs={[{ label: "Estoque", href: "/estoque" }, { label: "Requisições" }]}
        actions={<Button variant="primary" icon={Add} onClick={() => setDrawerOpen(true)}>Nova requisição</Button>}
      />

      <Card>
        <CardBody className="flex flex-wrap items-center gap-2 border-b border-border">
          <Select aria-label="Status" value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)} placeholder="Todos os status" wrapperClassName="w-52" options={(Object.keys(REQUISICAO_STATUS_META) as RequisicaoStatus[]).map((s) => ({ value: s, label: REQUISICAO_STATUS_META[s].label }))} />
        </CardBody>
        {filtered.length === 0 ? (
          <EmptyState title="Nenhuma requisição encontrada" />
        ) : (
          <>
            <Table>
              <THead><TR><TH>Setor</TH><TH>Solicitante</TH><TH>Itens</TH><TH>Status</TH><TH>Solicitado em</TH><TH>Ações</TH></TR></THead>
              <TBody>
                {filtered.slice(0, 30).map((r) => {
                  const meta = REQUISICAO_STATUS_META[r.status as RequisicaoStatus];
                  return (
                    <TR key={r.id}>
                      <TD className="font-medium text-text">{r.setor}</TD>
                      <TD className="text-text-muted">{r.solicitante}</TD>
                      <TD className="text-text-muted">{r.itens.map((i) => produtoById(i.produtoId)?.nome).filter(Boolean).join(", ")}</TD>
                      <TD><Badge tone={meta.tone} dot>{meta.label}</Badge></TD>
                      <TD className="text-text-muted">{dateBR(r.dataSolicitacao)}</TD>
                      <TD>
                        {r.status === "pendente" ? (
                          <div className="flex items-center gap-2">
                            <Button size="xs" variant="primary" icon={TickCircle} onClick={() => responder(r.id, "aprovada")}>Aprovar</Button>
                            <Button size="xs" variant="ghost" icon={CloseCircle} onClick={() => responder(r.id, "recusada")}>Recusar</Button>
                          </div>
                        ) : r.status === "aprovada" ? (
                          <Button size="xs" variant="secondary" onClick={() => responder(r.id, "atendida")}>Marcar como atendida</Button>
                        ) : (
                          <span className="text-sm text-text-subtle">—</span>
                        )}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
            <TableFooter total={filtered.length} pageSize={30} label="requisições" />
          </>
        )}
      </Card>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Nova requisição"
        footer={<><Button variant="secondary" onClick={() => setDrawerOpen(false)}>Cancelar</Button><Button variant="primary" onClick={enviar} disabled={!setor || itens.length === 0}>Enviar requisição</Button></>}
      >
        <div className="flex flex-col gap-4">
          <Select label="Setor" required placeholder="Selecione o setor" value={setor} onChange={(e) => setSetor(e.target.value)} options={SETORES.map((s) => ({ value: s, label: s }))} />
          <div className="flex flex-wrap items-end gap-2">
            <Select label="Produto" placeholder="Selecione o produto" value={produtoAtual} onChange={(e) => setProdutoAtual(e.target.value)} wrapperClassName="min-w-56 flex-1" options={produtos.map((p) => ({ value: p.id, label: p.nome }))} />
            <Input type="number" min={1} label="Qtd." value={qtdAtual} onChange={(e) => setQtdAtual(Math.max(1, Number(e.target.value)))} wrapperClassName="w-20" />
            <Button type="button" variant="secondary" icon={Add} onClick={addItem} disabled={!produtoAtual}>Adicionar</Button>
          </div>
          {itens.length > 0 && (
            <ul className="flex flex-col gap-1.5 rounded-md bg-surface p-3">
              {itens.map((i) => {
                const produto = produtoById(i.produtoId);
                return (
                  <li key={i.produtoId} className="flex items-center justify-between text-sm">
                    <span className="text-text">{produto?.nome}</span>
                    <span className="flex items-center gap-3">
                      <span className="tabular text-text-muted">{i.quantidade} {produto?.unidade}</span>
                      <Button type="button" size="xs" variant="ghost" iconOnly icon={Trash} aria-label={`Remover ${produto?.nome}`} onClick={() => removeItem(i.produtoId)} />
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Drawer>

      <Modal open={Boolean(confirm)} onClose={() => setConfirm(null)} title="Requisição enviada" description={confirm ?? undefined} footer={<Button variant="primary" onClick={() => setConfirm(null)}>Entendi</Button>} />
    </div>
  );
}
