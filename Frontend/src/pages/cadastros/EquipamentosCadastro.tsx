import { Add, Edit2 } from "iconsax-reactjs";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Checkbox, Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/misc";
import { Modal, Switch } from "@/components/ui/overlay";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ApiError } from "@/lib/api/client";
import { useApiProcedures } from "@/lib/api/agenda";
import { useEquipment, useRooms, useSaveEquipment, type Equipment } from "@/lib/api/salas";
import { useAuth } from "@/lib/auth/auth";

const message = (error: unknown) => (error instanceof ApiError ? error.message : "Não foi possível concluir. Tente de novo.");

export default function Page() {
  const { can } = useAuth();
  const equipment = useEquipment();
  const rooms = useRooms();
  const procedures = useApiProcedures();
  const save = useSaveEquipment();
  const [editing, setEditing] = useState<Equipment | "new" | null>(null);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [roomId, setRoomId] = useState("");
  const [active, setActive] = useState(true);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const canEdit = can("agenda:configurar");
  const procedureName = new Map((procedures.data ?? []).map((p) => [p.id, p.nome]));

  function open(target: Equipment | "new") {
    setEditing(target);
    setName(target === "new" ? "" : target.nome);
    setQuantity(target === "new" ? "1" : String(target.quantidade));
    setRoomId(target === "new" ? "" : target.salaId ?? "");
    setActive(target === "new" ? true : target.ativo);
    setChosen(new Set(target === "new" ? [] : target.procedimentoIds));
    setError(null);
  }

  function toggle(id: string) {
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submit() {
    setError(null);
    save.mutateAsync({
      id: editing === "new" || editing === null ? undefined : editing.id,
      nome: name, quantidade: Number(quantity), salaId: roomId || null, ativo: active, procedimentoIds: [...chosen],
    }).then(() => setEditing(null)).catch((e) => setError(message(e)));
  }

  const valid = name.trim() !== "" && Number.isInteger(Number(quantity)) && Number(quantity) >= 1 && Number(quantity) <= 99;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Equipamentos"
        breadcrumbs={[{ label: "Cadastros", href: "/cadastros" }, { label: "Equipamentos" }]}
        description="Os aparelhos da unidade, quantas unidades há de cada um e quais procedimentos os ocupam. Dois exames não usam a mesma unidade ao mesmo tempo."
        actions={canEdit ? <Button variant="primary" icon={Add} onClick={() => open("new")}>Novo equipamento</Button> : undefined}
      />

      <Card>
        {equipment.isPending ? (
          <div className="p-5"><Skeleton className="h-40 w-full" /></div>
        ) : equipment.isError ? (
          <EmptyState title="Não foi possível carregar os equipamentos." description={equipment.error.message} />
        ) : equipment.data.length === 0 ? (
          <EmptyState title="Nenhum equipamento cadastrado" description="Cadastre os aparelhos e os procedimentos que usam cada um." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Equipamento</TH>
                <TH>Sala</TH>
                <TH align="right">Unidades</TH>
                <TH>Procedimentos que usam</TH>
                <TH>Situação</TH>
                <TH align="right">Ação</TH>
              </TR>
            </THead>
            <TBody>
              {equipment.data.map((e) => (
                <TR key={e.id}>
                  <TD>{e.nome}</TD>
                  <TD className="text-text-muted">{e.salaNome ?? "—"}</TD>
                  <TD align="right" numeric>{e.quantidade}</TD>
                  <TD className="max-w-xs truncate text-text-muted">{e.procedimentoIds.map((id) => procedureName.get(id)).filter(Boolean).join(", ") || "Nenhum"}</TD>
                  <TD><Badge tone={e.ativo ? "success" : "neutral"} dot size="sm">{e.ativo ? "Ativo" : "Inativo"}</Badge></TD>
                  <TD align="right">{canEdit && <Button size="sm" variant="ghost" icon={Edit2} onClick={() => open(e)}>Editar</Button>}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Novo equipamento" : "Editar equipamento"}
        size="md"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button variant="primary" size="sm" disabled={!valid} loading={save.isPending} onClick={submit}>Salvar</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input label="Nome do equipamento" required value={name} onChange={(e) => setName(e.target.value)} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Quantas unidades" type="number" min={1} max={99} required value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            <Select
              label="Sala"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              options={[{ value: "", label: "Sem sala" }, ...(rooms.data ?? []).filter((r) => r.ativo).map((r) => ({ value: r.id, label: r.nome }))]}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text">Procedimentos que usam este equipamento</span>
            <div className="grid max-h-56 grid-cols-1 gap-0.5 overflow-y-auto rounded-lg bg-surface p-2 sm:grid-cols-2">
              {(procedures.data ?? []).map((p) => (
                <Checkbox key={p.id} label={p.nome} checked={chosen.has(p.id)} onChange={() => toggle(p.id)} />
              ))}
            </div>
          </div>
          {editing !== "new" && <Switch checked={active} onChange={setActive} label="Equipamento ativo" description="Inativo deixa de aparecer no uso do dia." />}
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        </div>
      </Modal>
    </div>
  );
}
