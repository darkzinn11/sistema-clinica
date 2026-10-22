import { createContext, useContext } from "react";
import type { Senha, TicketTypeCode } from "@/lib/mock/recepcao";

export interface SenhasQueueValue {
  senhas: Senha[];
  guiche: number;
  setGuiche: (g: number) => void;
  fila: "todas" | TicketTypeCode;
  setFila: (f: "todas" | TicketTypeCode) => void;
  current: Senha | null;
  waiting: Senha[];
  queueStats: { code: TicketTypeCode; label: string; longLabel: string; count: number; longest: number }[];
  history: Senha[];
  chamarProxima: () => void;
  chamarNovamente: () => void;
  naoCompareceu: () => void;
  rechamar: (id: string) => void;
  remover: (id: string) => void;
}

export const SenhasQueueContext = createContext<SenhasQueueValue | null>(null);

export function useSenhasQueue(): SenhasQueueValue {
  const ctx = useContext(SenhasQueueContext);
  if (!ctx) throw new Error("useSenhasQueue precisa estar dentro de <SenhasQueueProvider>");
  return ctx;
}
