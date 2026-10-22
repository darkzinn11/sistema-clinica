import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { Me } from "@/lib/auth/types";

export interface SessionInfo { id: string; criadaEm: string; expiraEm: string; unidadeNome: string; atual: boolean }

export function useUpdateMe() {
  return useMutation({ mutationFn: (nome: string) => api<Me>("/auth/me", { method: "PUT", body: { nome } }) });
}

/** Senha atual errada volta como 400 (não 401): a pessoa continua logada. As outras sessões são encerradas pelo servidor. */
export function useChangePassword() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { senhaAtual: string; novaSenha: string }) => api<void>("/auth/senha", { method: "POST", body: input }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["conta", "sessoes"] }),
  });
}

export function useSessions() {
  return useQuery({ queryKey: ["conta", "sessoes"], queryFn: () => api<SessionInfo[]>("/auth/sessoes") });
}

export function useRevokeSession() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/auth/sessoes/${id}`, { method: "DELETE" }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["conta", "sessoes"] }),
  });
}

export function useRevokeOtherSessions() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>("/auth/sessoes/encerrar-outras", { method: "POST" }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["conta", "sessoes"] }),
  });
}
