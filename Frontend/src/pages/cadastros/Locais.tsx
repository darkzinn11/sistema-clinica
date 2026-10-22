import { Add, Edit2 } from "iconsax-reactjs";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/misc";
import { Modal, Switch } from "@/components/ui/overlay";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ApiError } from "@/lib/api/client";
import { useApiProfessionals } from "@/lib/api/agenda";
import { useProfessionalRooms, useRooms, useSaveRoom, useSetProfessionalRoom, type Room } from "@/lib/api/salas";
import { useAuth } from "@/lib/auth/auth";

const message = (error: unknown) => (error instanceof ApiError ? error.message : "Não foi possível concluir. Tente de novo.");

export default function Page() {
  const { can, session } = useAuth();
  const unitId = session?.usuario.unidadeId ?? "";
  const rooms = useRooms();
  const professionalRooms = useProfessionalRooms();
  const professionals = useApiProfessionals();
  const save = useSaveRoom();
  const setRoom = useSetProfessionalRoom();
  const [editing, setEditing] = useState<Room | "new" | null>(null);
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canEdit = can("agenda:configurar");
  const canAssign = can("profissionais:editar");

  function open(target: Room | "new") {
    setEditing(target);
    setName(target === "new" ? "" : target.nome);
    setActive(target === "new" ? true : target.ativo);
    setError(null);
  }

  function submit() {
    setError(null);
    save.mutateAsync({ id: editing === "new" || editing === null ? undefined : editing.id, nome: name, ativo: active })
      .then(() => setEditing(null))
      .catch((e) => setError(message(e)));
  }

  const roomByProfessional = new Map((professionalRooms.data ?? []).map((r) => [r.profissionalId, r.salaId]));
  const unitProfessionals = (professionals.data ?? []).filter((p) => p.unidadeIds.includes(unitId));
  const activeRooms = (rooms.data ?? []).filter((r) => r.ativo);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Locais e salas"
        breadcrumbs={[{ label: "Cadastros", href: "/cadastros" }, { label: "Locais e salas" }]}
        description="As salas desta unidade. A sala padrão de cada profissional alimenta a agenda por sala."
        actions={canEdit ? <Button variant="primary" icon={Add} onClick={() => open("new")}>Nova sala</Button> : undefined}
      />

      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader title="Salas da unidade" description={rooms.data ? `${rooms.data.length} cadastrada(s)` : undefined} />
          {rooms.isPending ? (
            <div className="p-5"><Skeleton className="h-32 w-full" /></div>
          ) : rooms.isError ? (
            <EmptyState title="Não foi possível carregar as salas." description={rooms.error.message} />
          ) : rooms.data.length === 0 ? (
            <EmptyState title="Nenhuma sala cadastrada" description="Cadastre as salas e consultórios desta unidade." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Sala</TH>
                  <TH>Situação</TH>
                  <TH align="right">Ação</TH>
                </TR>
              </THead>
              <TBody>
                {rooms.data.map((r) => (
                  <TR key={r.id}>
                    <TD>{r.nome}</TD>
                    <TD><Badge tone={r.ativo ? "success" : "neutral"} dot size="sm">{r.ativo ? "Ativa" : "Inativa"}</Badge></TD>
                    <TD align="right">
                      {canEdit && <Button size="sm" variant="ghost" icon={Edit2} onClick={() => open(r)}>Editar</Button>}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader title="Sala padrão dos profissionais" description="Onde cada profissional atende nesta unidade." />
          {professionals.isPending || professionalRooms.isPending ? (
            <div className="p-5"><Skeleton className="h-32 w-full" /></div>
          ) : professionals.isError ? (
            <EmptyState title="Não foi possível carregar os profissionais." description={professionals.error.message} />
          ) : (
            <CardBody className="flex flex-col gap-3">
              {setRoom.isError && <p role="alert" className="text-sm text-danger">{message(setRoom.error)}</p>}
              {unitProfessionals.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm text-text">{p.nome}</span>
                  <Select
                    aria-label={`Sala de ${p.nome}`}
                    value={roomByProfessional.get(p.id) ?? ""}
                    disabled={!canAssign || setRoom.isPending}
                    onChange={(e) => setRoom.mutate({ profissionalId: p.id, salaId: e.target.value || null })}
                    options={[{ value: "", label: "Sem sala padrão" }, ...activeRooms.map((r) => ({ value: r.id, label: r.nome }))]}
                    wrapperClassName="w-60"
                  />
                </div>
              ))}
            </CardBody>
          )}
        </Card>
      </div>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Nova sala" : "Editar sala"}
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button variant="primary" size="sm" disabled={!name.trim()} loading={save.isPending} onClick={submit}>Salvar</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input label="Nome da sala" required value={name} onChange={(e) => setName(e.target.value)} />
          {editing !== "new" && <Switch checked={active} onChange={setActive} label="Sala ativa" description="Sala inativa não aparece para escolher." />}
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        </div>
      </Modal>
    </div>
  );
}
