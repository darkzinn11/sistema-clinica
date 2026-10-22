import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

export interface TicketType {
  id: string;
  nome: string;
  prefixo: string;
  preferencial: boolean;
  ativo: boolean;
}

export interface CounterType { tipoId: string; tipoNome: string; ordem: number }
export interface Counter { id: string; nome: string; ativo: boolean; tipos: CounterType[] }
export interface Ticket {
  id: string;
  codigo: string;
  tipoId: string;
  tipoNome: string;
  preferencial: boolean;
  status: "aguardando" | "chamada" | "em_atendimento" | "finalizada" | "ausente" | "cancelada";
  criadaEm: string;
  guicheId: string | null;
  guicheNome: string | null;
  chamadas: number;
  ultimaChamadaEm: string | null;
  pacienteId: string | null;
  dia: string;
}
export interface Queue { aguardando: Ticket[]; total: number; ultimasChamadas: Ticket[] }
export interface TotemType { id: string; nome: string; preferencial: boolean }
export interface TotemTicket { codigo: string; tipoNome: string; preferencial: boolean }

export function useTicketTypes() {
  return useQuery({ queryKey: ["recepcao", "tipos-senha"], queryFn: () => api<TicketType[]>("/tipos-senha"), staleTime: 60_000 });
}

export function useSaveTicketType() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { id?: string; nome: string; prefixo: string; preferencial: boolean; ativo: boolean }) => api<TicketType>(input.id ? `/tipos-senha/${input.id}` : "/tipos-senha", { method: input.id ? "PUT" : "POST", body: input }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["recepcao", "tipos-senha"] }),
  });
}

export function useCounters() {
  return useQuery({ queryKey: ["recepcao", "guiches"], queryFn: () => api<Counter[]>("/guiches"), staleTime: 60_000 });
}

export function useSaveCounter() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { id?: string; nome: string; ativo: boolean; tipos: { tipoId: string; ordem: number }[] }) => api<Counter>(input.id ? `/guiches/${input.id}` : "/guiches", { method: input.id ? "PUT" : "POST", body: input }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["recepcao", "guiches"] }),
  });
}

export function useQueue(typeId?: string, counterId?: string) {
  return useQuery({
    queryKey: ["recepcao", "fila", typeId ?? "todas", counterId ?? "todos"],
    queryFn: () => api<Queue>("/senhas/fila", { query: { tipoId: typeId, guicheId: counterId } }),
    refetchInterval: 5_000,
  });
}

export function useCurrentTicket(counterId: string | undefined) {
  return useQuery({
    queryKey: ["recepcao", "guiche", counterId, "atual"],
    queryFn: () => api<Ticket>(`/guiches/${counterId}/atual`),
    enabled: Boolean(counterId),
    refetchInterval: 5_000,
  });
}

function invalidateQueue(client: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    client.invalidateQueries({ queryKey: ["recepcao", "fila"] }),
    client.invalidateQueries({ queryKey: ["recepcao", "guiche"] }),
  ]);
}

export function useCallNext() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (counterId: string) => api<Ticket>(`/guiches/${counterId}/chamar-proxima`, { method: "POST" }), onSuccess: () => invalidateQueue(client) });
}

export function useRecallTicket() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (ticketId: string) => api<Ticket>(`/senhas/${ticketId}/rechamar`, { method: "POST" }), onSuccess: () => invalidateQueue(client) });
}

export function useTicketAction(action: "finalizar" | "ausente" | "cancelar") {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo?: string }) => api<Ticket>(`/senhas/${id}/${action}`, { method: "POST", body: action === "cancelar" ? { motivo } : undefined }),
    onSuccess: () => invalidateQueue(client),
  });
}

export function useTotemTypes(token?: string) {
  return useQuery({ queryKey: ["recepcao", "totem", "tipos", token ?? "sem-token"], queryFn: () => api<TotemType[]>("/totem/tipos", { token }), enabled: Boolean(token), staleTime: 60_000 });
}

export function useGenerateTotemTicket() {
  return useMutation({ mutationFn: (input: { tipoId: string; cpf?: string; token: string }) => api<TotemTicket>("/totem/senhas", { method: "POST", body: { tipoId: input.tipoId, cpf: input.cpf }, token: input.token }) });
}
