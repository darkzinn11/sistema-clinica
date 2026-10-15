"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  callNextTicketAction,
  callTicketAction,
  getOperatorPanelAction,
  recallTicketAction,
  removeTicketAction,
} from "@/lib/actions";
import type { Counter, TicketType } from "@/lib/types";

interface QueueItem {
  id: string;
  code: string;
  createdAt: string;
  ticketTypeId: string;
}
interface CalledItem {
  id: string;
  code: string;
  counterId?: string;
}

interface PanelData {
  ticketTypes: TicketType[];
  counters: Counter[];
  queue: QueueItem[];
  current: CalledItem | null;
  lastCalled: CalledItem[];
}

export function OperatorPanel({ initial }: { initial: PanelData }) {
  const [data, setData] = useState(initial);
  const [ticketTypeFilter, setTicketTypeFilter] = useState("");
  const [counterId, setCounterId] = useState(initial.counters[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      const next = await getOperatorPanelAction();
      setData(next);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  function counterName(id?: string) {
    if (!id) return "—";
    return data.counters.find((c) => c.id === id)?.name ?? "—";
  }

  const filteredQueue = ticketTypeFilter ? data.queue.filter((q) => q.ticketTypeId === ticketTypeFilter) : data.queue;

  function refresh() {
    startTransition(async () => {
      setData(await getOperatorPanelAction());
    });
  }

  async function onCallNext() {
    setError(null);
    const result = await callNextTicketAction(counterId, ticketTypeFilter || undefined);
    if (!result.ok) setError(result.error);
    refresh();
  }

  async function onCallSpecific(ticketId: string) {
    await callTicketAction(ticketId, counterId);
    refresh();
  }

  async function onRecall(ticketId: string) {
    await recallTicketAction(ticketId);
    refresh();
  }

  async function onRemove(ticketId: string) {
    await removeTicketAction(ticketId);
    refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
          Fila ({filteredQueue.length})
        </h2>
        {filteredQueue.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-base text-text-muted">
            Nenhuma senha na fila.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface-raised">
            {filteredQueue.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="text-base font-medium text-text">{item.code}</span>
                <Button size="sm" onClick={() => onCallSpecific(item.id)}>
                  Chamar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-md border border-border bg-surface-raised p-4 text-center">
          <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Senha atual</span>
          <p className="text-display font-bold text-text">{data.current?.code ?? "-"}</p>
          {data.current && <p className="text-sm text-text-muted">{counterName(data.current.counterId)}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="filtro-tipo" className="text-xs font-medium text-text-muted">
            Filtro para tipo de senha
          </label>
          <select
            id="filtro-tipo"
            value={ticketTypeFilter}
            onChange={(e) => setTicketTypeFilter(e.target.value)}
            className="h-10 rounded-md border border-border-input bg-bg px-3 text-base text-text"
          >
            <option value="">Todos os tipos de senha</option>
            {data.ticketTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <label htmlFor="guiche" className="text-xs font-medium text-text-muted">
            Guichê
          </label>
          <select
            id="guiche"
            value={counterId}
            onChange={(e) => setCounterId(e.target.value)}
            className="h-10 rounded-md border border-border-input bg-bg px-3 text-base text-text"
          >
            {data.counters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <Button onClick={onCallNext} disabled={filteredQueue.length === 0 || !counterId} loading={isPending}>
            Chamar próxima
          </Button>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-text-muted">Últimas senhas chamadas</h3>
          <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface-raised">
            {data.lastCalled.length === 0 && (
              <li className="px-3 py-2 text-sm text-text-muted">Nenhuma chamada ainda.</li>
            )}
            {data.lastCalled.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="text-sm text-text">
                  {item.code} <span className="text-text-muted">· {counterName(item.counterId)}</span>
                </span>
                <div className="flex gap-2">
                  <button
                    aria-label={`Chamar ${item.code} novamente`}
                    className="text-accent"
                    onClick={() => onRecall(item.id)}
                  >
                    🔔
                  </button>
                  <button
                    aria-label={`Remover ${item.code}`}
                    className="text-danger"
                    onClick={() => onRemove(item.id)}
                  >
                    🗑
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
