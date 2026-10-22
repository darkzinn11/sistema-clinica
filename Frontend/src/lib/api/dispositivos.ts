import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

export interface Device { id: string; nome: string; ativo: boolean; tipo?: "totem" | "painel" }
export interface CreatedDevice { dispositivo: Device; token: string; expiraEm: string }

export function useDevices() {
  return useQuery({ queryKey: ["dispositivos"], queryFn: () => api<Device[]>("/dispositivos"), staleTime: 30_000 });
}

export function useCreateDevice() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (input: { nome: string; tipo: "totem" | "painel" }) => api<CreatedDevice>("/dispositivos", { method: "POST", body: input }), onSuccess: () => client.invalidateQueries({ queryKey: ["dispositivos"] }) });
}

export function useRevokeDevice() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api<void>(`/dispositivos/${id}`, { method: "DELETE" }), onSuccess: () => client.invalidateQueries({ queryKey: ["dispositivos"] }) });
}
