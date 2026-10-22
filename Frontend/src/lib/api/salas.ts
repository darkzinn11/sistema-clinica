import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

export interface Room { id: string; nome: string; ativo: boolean }

export interface Equipment {
  id: string;
  nome: string;
  quantidade: number;
  salaId: string | null;
  salaNome: string | null;
  ativo: boolean;
  procedimentoIds: string[];
}

export interface EquipmentUse {
  agendamentoId: string;
  inicio: string;
  fim: string;
  status: string;
  procedimentoNome: string;
  profissionalId: string;
  profissionalNome: string;
}

export interface EquipmentDay {
  id: string;
  nome: string;
  quantidade: number;
  salaId: string | null;
  salaNome: string | null;
  usos: EquipmentUse[];
}

export interface ProfessionalRoom { profissionalId: string; salaId: string }

export function useRooms() {
  return useQuery({ queryKey: ["salas"], queryFn: () => api<Room[]>("/salas"), staleTime: 60_000 });
}

export function useEquipment() {
  return useQuery({ queryKey: ["equipamentos"], queryFn: () => api<Equipment[]>("/equipamentos"), staleTime: 60_000 });
}

export function useProfessionalRooms() {
  return useQuery({ queryKey: ["profissionais-salas"], queryFn: () => api<ProfessionalRoom[]>("/profissionais-salas"), staleTime: 60_000 });
}

export function useEquipmentDay(date: string) {
  return useQuery({
    queryKey: ["agenda", "equipamentos", date],
    queryFn: () => api<{ data: string; equipamentos: EquipmentDay[] }>("/agenda/equipamentos", { query: { data: date } }),
    refetchInterval: 30_000,
  });
}

export function useSaveRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id?: string; nome: string; ativo?: boolean }) =>
      input.id
        ? api<Room>(`/salas/${input.id}`, { method: "PUT", body: { nome: input.nome, ativo: input.ativo } })
        : api<Room>("/salas", { method: "POST", body: { nome: input.nome } }),
    onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: ["salas"] }), queryClient.invalidateQueries({ queryKey: ["equipamentos"] })]),
  });
}

export interface EquipmentInput { id?: string; nome: string; quantidade: number; salaId: string | null; ativo?: boolean; procedimentoIds: string[] }

export function useSaveEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EquipmentInput) => {
      const { id, ...body } = input;
      return id ? api<Equipment>(`/equipamentos/${id}`, { method: "PUT", body }) : api<Equipment>("/equipamentos", { method: "POST", body });
    },
    onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: ["equipamentos"] }), queryClient.invalidateQueries({ queryKey: ["agenda", "equipamentos"] })]),
  });
}

export function useSetProfessionalRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { profissionalId: string; salaId: string | null }) =>
      api(`/profissionais/${input.profissionalId}/sala`, { method: "PUT", body: { salaId: input.salaId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profissionais-salas"] }),
  });
}
