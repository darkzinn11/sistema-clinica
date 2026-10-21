/**
 * Estado compartilhado da fila de senhas (chamada de atendimento). Vive num
 * único Provider (montado no AppShell) para que a tela "Chamar senha" e o
 * widget flutuante global leiam e alterem exatamente o mesmo estado.
 */

import { type ReactNode, useState } from "react";
import { NOW_TIME } from "@/lib/mock/core";
import { GUICHES, type Senha, type TicketTypeCode, TICKET_TYPES, initialSenhas, waitMinutes } from "@/lib/mock/recepcao";
import { SenhasQueueContext, type SenhasQueueValue } from "@/lib/senhas-queue-context";

const HISTORY_LIMIT = 8;

function initialCurrentId(senhas: Senha[]): string | null {
  const called = senhas.filter((s) => s.status === "chamado" || s.status === "atendido" || s.status === "nao_compareceu");
  return called.sort((a, b) => (b.calledAt ?? "").localeCompare(a.calledAt ?? ""))[0]?.id ?? null;
}

export function SenhasQueueProvider({ children }: { children: ReactNode }) {
  const [senhas, setSenhas] = useState<Senha[]>(initialSenhas);
  const [guiche, setGuiche] = useState<number>(GUICHES[0]);
  const [fila, setFila] = useState<"todas" | TicketTypeCode>("todas");
  const [currentId, setCurrentId] = useState<string | null>(() => initialCurrentId(initialSenhas));

  const current = senhas.find((s) => s.id === currentId) ?? null;
  const waiting = senhas.filter((s) => s.status === "esperando");

  const queueStats = TICKET_TYPES.map((t) => {
    const items = waiting.filter((s) => s.type === t.code);
    const longest = items.length ? Math.max(...items.map((s) => waitMinutes(s.createdAt))) : 0;
    return { ...t, count: items.length, longest };
  });

  const history = senhas
    .filter((s) => s.status === "chamado" || s.status === "atendido" || s.status === "nao_compareceu")
    .sort((a, b) => (b.calledAt ?? "").localeCompare(a.calledAt ?? ""))
    .slice(0, HISTORY_LIMIT);

  function chamarProxima() {
    const pool = waiting
      .filter((s) => fila === "todas" || s.type === fila)
      .sort((a, b) => Number(b.preferential) - Number(a.preferential) || a.createdAt.localeCompare(b.createdAt));
    const next = pool[0];
    if (!next) return;
    setSenhas((prev) => prev.map((s) => (s.id === next.id ? { ...s, status: "chamado", calledAt: NOW_TIME, guiche } : s)));
    setCurrentId(next.id);
  }

  function chamarNovamente() {
    if (!current) return;
    setSenhas((prev) => prev.map((s) => (s.id === current.id ? { ...s, calledAt: NOW_TIME, guiche } : s)));
  }

  function naoCompareceu() {
    if (!current) return;
    setSenhas((prev) => prev.map((s) => (s.id === current.id ? { ...s, status: "nao_compareceu" } : s)));
    setCurrentId(null);
  }

  function rechamar(id: string) {
    setSenhas((prev) => prev.map((s) => (s.id === id ? { ...s, status: "chamado", calledAt: NOW_TIME, guiche } : s)));
    setCurrentId(id);
  }

  function remover(id: string) {
    setSenhas((prev) => prev.filter((s) => s.id !== id));
    if (currentId === id) setCurrentId(null);
  }

  const value: SenhasQueueValue = {
    senhas, guiche, setGuiche, fila, setFila, current, waiting, queueStats, history,
    chamarProxima, chamarNovamente, naoCompareceu, rechamar, remover,
  };

  return <SenhasQueueContext.Provider value={value}>{children}</SenhasQueueContext.Provider>;
}
