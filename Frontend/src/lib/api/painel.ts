import { useQuery } from "@tanstack/react-query";
import { api } from "./client";

export interface PanelCall { codigo: string; tipoNome: string; preferencial: boolean; guicheNome: string | null; chamadas: number; ultimaChamadaEm: string }
export interface PanelCalls { clinicaNome: string; unidadeNome: string; atual: PanelCall | null; ultimas: PanelCall[] }

export function usePanelCalls(token: string | null) {
  return useQuery({ queryKey: ["painel-chamadas", token], queryFn: () => api<PanelCalls>("/painel/chamadas", { token: token ?? undefined }), enabled: Boolean(token), refetchInterval: 3000, retry: 1 });
}
