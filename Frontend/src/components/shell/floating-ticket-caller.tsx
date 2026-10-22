import { ArrowRotateLeft, Call, CloseCircle, Monitor, Scan, VolumeHigh } from "iconsax-reactjs";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";
import { useCallNext, useCounters, useCurrentTicket, useQueue, useRecallTicket, useTicketAction, useTicketTypes } from "@/lib/api/recepcao";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/cn";

function formatCallTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : "Não foi possível carregar a fila.";
}

/** Acesso rápido ao chamador de senha real, fixo em qualquer tela do sistema. */
export function FloatingTicketCaller() {
  const [open, setOpen] = useState(false);
  const [counterId, setCounterId] = useState("");
  const [typeId, setTypeId] = useState("");
  const counters = useCounters();
  const types = useTicketTypes();
  const queue = useQueue(typeId || undefined, counterId || undefined);
  const allQueue = useQueue(undefined, counterId || undefined);
  const currentTicket = useCurrentTicket(counterId || undefined);
  const callNext = useCallNext();
  const recall = useRecallTicket();
  const absent = useTicketAction("ausente");
  const current = counterId ? currentTicket.data ?? null : null;
  const error = counters.error ?? types.error ?? queue.error ?? currentTicket.error ?? callNext.error ?? recall.error ?? absent.error;
  const activeCounters = (counters.data ?? []).filter((counter) => counter.ativo);
  const activeTypes = (types.data ?? []).filter((type) => type.ativo);
  const waiting = allQueue.data?.aguardando ?? [];
  const history = allQueue.data?.ultimasChamadas ?? [];

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const queueStats = activeTypes.map((type) => ({
    ...type,
    count: waiting.filter((ticket) => ticket.tipoId === type.id).length,
  }));

  return (
    <>
      {!open && <button type="button" onClick={() => setOpen(true)} aria-label={`Chamador de senha, ${waiting.length} aguardando`} title="Chamador de senha" className="ui-button ms-gradient-button fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-pop"><VolumeHigh size={24} variant="Bold" aria-hidden />{waiting.length > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[11px] font-semibold text-surface-raised">{waiting.length}</span>}</button>}

      {open && <div role="dialog" aria-label="Chamador de senha" className="ui-side-panel-enter fixed bottom-4 right-4 top-20 z-40 flex w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-pop">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3"><ButtonLink to="/senhas" onClick={() => setOpen(false)} variant="ghost" size="sm">Tela completa</ButtonLink><div className="flex gap-1"><ButtonLink to="/totem" target="_blank" rel="noreferrer" variant="ghost" size="sm" iconOnly aria-label="Abrir totem" icon={Scan} /><ButtonLink to="/tv" target="_blank" rel="noreferrer" variant="ghost" size="sm" iconOnly aria-label="Abrir painel de TV" icon={Monitor} /></div></div>

        <div className="ui-scrollbar flex-1 overflow-y-auto px-4 py-4">
          {error && <p role="alert" className="mb-3 text-sm text-danger">{errorMessage(error)}</p>}
          <div className="flex flex-col items-center gap-3 rounded-xl bg-surface py-6 text-center">{current ? <><p className="font-display text-3xl font-semibold tracking-tight text-text">{current.codigo}</p><p className="text-sm text-text-muted">{current.guicheNome ?? "Guichê"} · chamado às {formatCallTime(current.ultimaChamadaEm)}</p></> : <EmptyState title="Nenhuma senha chamada" compact className="px-0 py-0" />}</div>

          <div className="mt-4 grid grid-cols-2 gap-2.5"><Select label="Fila" value={typeId} onChange={(event) => setTypeId(event.target.value)} options={[{ value: "", label: "Todas" }, ...activeTypes.map((type) => ({ value: type.id, label: type.nome }))]} wrapperClassName="[&_label]:text-xs" /><Select label="Guichê" value={counterId} onChange={(event) => setCounterId(event.target.value)} options={[{ value: "", label: "Escolha o guichê" }, ...activeCounters.map((counter) => ({ value: counter.id, label: counter.nome }))]} wrapperClassName="[&_label]:text-xs" /></div>

          <div className="mt-3 flex flex-col gap-2"><Button variant="primary" icon={Call} disabled={!counterId || callNext.isPending} loading={callNext.isPending} onClick={() => callNext.mutate(counterId)}>Chamar próxima</Button><div className="flex gap-2"><Button variant="secondary" icon={ArrowRotateLeft} onClick={() => current && recall.mutate(current.id)} disabled={!current || recall.isPending} loading={recall.isPending} className="flex-1">Repetir</Button><Button variant="danger" icon={CloseCircle} onClick={() => current && absent.mutate({ id: current.id })} disabled={!current || absent.isPending} loading={absent.isPending} className="flex-1">Não veio</Button></div></div>

          <div className="mt-5 border-t border-border pt-4"><p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.07em] text-text-subtle">Filas aguardando</p><div className="flex flex-col gap-1.5">{queueStats.map((type) => <button key={type.id} type="button" onClick={() => setTypeId(type.id)} className={cn("flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors", typeId === type.id ? "bg-accent-muted text-text" : "text-text-muted hover:bg-surface")}><span>{type.nome}</span><Badge tone={type.count > 0 ? "accent" : "neutral"}>{type.count}</Badge></button>)}{queue.isLoading && <p className="px-3 py-2 text-sm text-text-muted">Atualizando fila…</p>}</div></div>

          <div className="mt-5 border-t border-border pt-4"><p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.07em] text-text-subtle">Últimos chamados</p>{history.length === 0 ? <p className="px-1 text-sm text-text-muted">Nenhuma chamada ainda.</p> : <div className="flex flex-col gap-1">{history.map((ticket) => <div key={ticket.id} className="flex items-center gap-2 rounded-lg px-1 py-1.5 text-sm"><span className="w-14 shrink-0 font-semibold text-text">{ticket.codigo}</span><span className="min-w-0 flex-1 truncate text-text-muted">{ticket.tipoNome}</span><Badge tone={ticket.status === "ausente" ? "danger" : "accent"} size="sm">{formatCallTime(ticket.ultimaChamadaEm)}</Badge><Button size="xs" variant="ghost" iconOnly aria-label={`Chamar novamente a senha ${ticket.codigo}`} icon={ArrowRotateLeft} onClick={() => recall.mutate(ticket.id)} /></div>)}</div>}</div>
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-border px-4 py-3.5"><div className="flex items-center gap-2"><VolumeHigh size={18} variant="Bulk" className="text-accent" aria-hidden /><p className="text-base font-semibold text-text">Chamador de senha</p></div><Button variant="ghost" size="sm" iconOnly aria-label="Fechar" icon={CloseCircle} onClick={() => setOpen(false)} /></div>
      </div>}
    </>
  );
}
