import { ArrowRotateLeft, Call, CloseCircle, Monitor, Scan } from "iconsax-reactjs";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { useCallNext, useCounters, useCurrentTicket, useQueue, useRecallTicket, useTicketAction, useTicketTypes } from "@/lib/api/recepcao";
import { ApiError } from "@/lib/api/client";

function ErrorMessage({ error }: { error: unknown }) {
  if (!error) return null;
  return <p role="alert" className="text-sm text-danger">{error instanceof ApiError ? error.message : "Não foi possível carregar a fila."}</p>;
}

export default function ChamarSenha() {
  const counters = useCounters();
  const types = useTicketTypes();
  const [counterId, setCounterId] = useState("");
  const [typeId, setTypeId] = useState("");
  const queue = useQueue(typeId || undefined, counterId || undefined);
  const callNext = useCallNext();
  const recall = useRecallTicket();
  const absent = useTicketAction("ausente");
  const finish = useTicketAction("finalizar");
  // A senha em atendimento DESTE guichê (as "últimas chamadas" são de todos os guichês e não servem para isso). Sem guichê, nada.
  const currentTicket = useCurrentTicket(counterId || undefined);
  const current = counterId ? currentTicket.data ?? null : null;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Chamar senha" description="Opere a fila da recepção em tempo real." breadcrumbs={[{ label: "Recepção" }, { label: "Chamar senha" }]} actions={<><ButtonLink to="/totem" target="_blank" rel="noreferrer" variant="secondary" icon={Scan}>Abrir totem</ButtonLink><ButtonLink to="/tv" target="_blank" rel="noreferrer" variant="secondary" icon={Monitor}>Abrir painel de TV</ButtonLink></>} />
      <ErrorMessage error={counters.error ?? queue.error ?? callNext.error ?? recall.error ?? absent.error ?? finish.error} />
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select label="Guichê" value={counterId} onChange={(e) => setCounterId(e.target.value)} options={[{ value: "", label: "Escolha o guichê" }, ...(counters.data ?? []).filter((c) => c.ativo).map((c) => ({ value: c.id, label: c.nome }))]} />
        <Select label="Fila" value={typeId} onChange={(e) => setTypeId(e.target.value)} options={[{ value: "", label: "Todas as filas" }, ...(types.data ?? []).filter((t) => t.ativo).map((t) => ({ value: t.id, label: t.nome }))]} />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.1fr]">
        <Card><CardHeader title="Senha atual" description="A senha chamada aparece no painel público." /><CardBody className="flex flex-col items-center gap-5 py-10 text-center">
          {current ? <><p className="font-display text-display font-semibold text-accent">{current.codigo}</p><p className="text-lg text-text-muted">{current.guicheNome ?? "Guichê"}</p><div className="flex flex-wrap justify-center gap-2"><Button variant="secondary" icon={ArrowRotateLeft} onClick={() => recall.mutate(current.id)} loading={recall.isPending}>Chamar novamente</Button><Button variant="danger" icon={CloseCircle} onClick={() => absent.mutate({ id: current.id })} loading={absent.isPending}>Não compareceu</Button><Button variant="primary" onClick={() => finish.mutate({ id: current.id })} loading={finish.isPending}>Finalizar</Button></div></> : <EmptyState title="Nenhuma senha chamada" description="Escolha um guichê e chame a próxima senha." compact />}
          <Button variant="primary" size="lg" icon={Call} disabled={!counterId || callNext.isPending} loading={callNext.isPending} onClick={() => callNext.mutate(counterId)}>Chamar próxima</Button>
        </CardBody></Card>
        <Card><CardHeader title="Fila aguardando" description={`${queue.data?.total ?? 0} senha(s) na fila.`} /><CardBody className="flex flex-col gap-2">
          {(queue.data?.aguardando ?? []).length === 0 ? <EmptyState title="Fila vazia" description="As novas senhas aparecerão aqui automaticamente." compact /> : queue.data?.aguardando.map((ticket) => <div key={ticket.id} className="flex items-center justify-between rounded-lg bg-surface p-4"><div><p className="font-display text-xl font-semibold">{ticket.codigo}</p><p className="text-sm text-text-muted">{ticket.tipoNome}</p></div>{ticket.preferencial && <Badge tone="warning">Preferencial</Badge>}</div>)}
        </CardBody></Card>
      </div>
    </div>
  );
}
