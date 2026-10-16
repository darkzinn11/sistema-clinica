import { Edit2 } from "iconsax-reactjs";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Drawer, Modal } from "@/components/ui/overlay";
import { PageHeader } from "@/components/ui/page-header";
import { procedureById } from "@/lib/mock/core";
import { type Kit, kits, produtoById } from "@/lib/mock/estoque";

export default function Kits() {
  const [editing, setEditing] = useState<Kit | null>(null);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);

  function abrirEdicao(kit: Kit) {
    setEditing(kit);
    setNome(kit.nome);
    setDescricao(kit.descricao);
  }

  function salvar() {
    setEditing(null);
    setConfirm(`Kit "${nome}" atualizado.`);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Kits" description="Conjuntos de produtos consumidos por procedimento." breadcrumbs={[{ label: "Estoque", href: "/estoque" }, { label: "Kits" }]} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {kits.map((kit) => (
          <Card key={kit.id}>
            <CardHeader title={kit.nome} description={kit.descricao} actions={<Button size="sm" variant="secondary" icon={Edit2} onClick={() => abrirEdicao(kit)}>Editar</Button>} />
            <CardBody className="flex flex-col gap-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Componentes</p>
                <ul className="flex flex-col gap-1.5">
                  {kit.componentes.map((c) => {
                    const produto = produtoById(c.produtoId);
                    return (
                      <li key={c.produtoId} className="flex items-center justify-between text-sm">
                        <span className="text-text">{produto?.nome ?? "—"}</span>
                        <span className="tabular text-text-muted">{c.quantidade} {produto?.unidade}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              {kit.procedureIds.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Procedimentos vinculados</p>
                  <div className="flex flex-wrap gap-1.5">
                    {kit.procedureIds.map((pid) => (
                      <Badge key={pid} tone="accent">{procedureById(pid)?.name ?? pid}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        ))}
      </div>

      <Drawer
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Editar kit"
        description={editing?.nome}
        footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button><Button variant="primary" onClick={salvar}>Salvar</Button></>}
      >
        {editing && (
          <div className="flex flex-col gap-4">
            <Input label="Nome do kit" required value={nome} onChange={(e) => setNome(e.target.value)} />
            <Textarea label="Descrição" rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            <div>
              <p className="mb-2 text-sm font-medium text-text">Componentes</p>
              <ul className="flex flex-col gap-1.5 rounded-lg bg-surface p-3">
                {editing.componentes.map((c) => {
                  const produto = produtoById(c.produtoId);
                  return (
                    <li key={c.produtoId} className="flex items-center justify-between text-sm">
                      <span className="text-text">{produto?.nome}</span>
                      <span className="tabular text-text-muted">{c.quantidade} {produto?.unidade}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </Drawer>

      <Modal open={Boolean(confirm)} onClose={() => setConfirm(null)} title="Kit atualizado" description={confirm ?? undefined} footer={<Button variant="primary" onClick={() => setConfirm(null)}>Entendi</Button>} />
    </div>
  );
}
