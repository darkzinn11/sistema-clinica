import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { BackendStatus } from "./status-map";

// ---- tipos que o backend devolve ----

export interface AgendaItem {
  id: string;
  data: string;
  inicio: string;
  fim: string;
  status: BackendStatus;
  versao: number;
  canal: string;
  observacao: string | null;
  remarcadoDe: string | null;
  profissionalId: string;
  profissionalNome: string;
  profissionalCor: string | null;
  pacienteId: string;
  pacienteNome: string;
  pacienteCelular: string | null;
  procedimentoId: string;
  procedimentoNome: string;
  procedimentoTipo: "consulta" | "exame" | "procedimento";
  valorCentavos: number | null;
  chegadaEm: string | null;
}

export interface ApiProfessional {
  id: string;
  nome: string;
  conselho: string | null;
  conselhoNum: string | null;
  corAgenda: string | null;
  ocultoNaAgenda: boolean;
  ativo: boolean;
  especialidades: { id: string; nome: string; principal: boolean }[];
  unidadeIds: string[];
}

export interface ApiProcedure {
  id: string;
  nome: string;
  tipo: "consulta" | "exame" | "procedimento";
  duracaoMin: number | null;
  valorCentavos: number | null;
  ativo: boolean;
}

export interface ApiGrade {
  id: string;
  profissionalId: string;
  unidadeId: string;
  diaSemana: number;
  inicio: string;
  fim: string;
  duracaoBlocoMin: number;
  vigenciaInicio: string;
  vigenciaFim: string | null;
  ativo: boolean;
}

export interface ApiSlot { inicio: string; fim: string }
export interface ApiMotive { id: number; nome: string; origem: string }
export interface ApiEnabledProcedure { id: string; nome: string; tipo: string; ativo: boolean }

export interface ApiPatientSummary {
  id: string;
  nome: string;
  nomeSocial: string | null;
  cpf: string | null;
  celular: string | null;
  nascimento: string | null;
  numeroProntuario: number | null;
}

// ---- consultas ----

export function useAgendaItems(from: string, to: string, professionalId?: string) {
  return useQuery({
    queryKey: ["agenda", "itens", from, to, professionalId ?? "todos"],
    queryFn: () => api<AgendaItem[]>("/agenda/agendamentos", { query: { de: from, ate: to, profissionalId: professionalId } }),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
}

export function useApiProfessionals() {
  return useQuery({
    queryKey: ["profissionais", "agenda"],
    queryFn: () => api<ApiProfessional[]>("/profissionais", { query: { ativo: true, naAgenda: true, tamanho: 200 } }),
    staleTime: 5 * 60_000,
  });
}

export function useApiProcedures() {
  return useQuery({
    queryKey: ["procedimentos", "ativos"],
    queryFn: () => api<ApiProcedure[]>("/procedimentos", { query: { ativo: true, tamanho: 200 } }),
    staleTime: 5 * 60_000,
  });
}

export function useApiGrades() {
  return useQuery({ queryKey: ["grades"], queryFn: () => api<ApiGrade[]>("/grades"), staleTime: 5 * 60_000 });
}

export function useMotives() {
  return useQuery({ queryKey: ["agendamento-motivos"], queryFn: () => api<ApiMotive[]>("/agendamento-motivos"), staleTime: Infinity });
}

export function useEnabledProcedures(professionalId: string | undefined) {
  return useQuery({
    queryKey: ["profissionais", professionalId, "procedimentos"],
    queryFn: () => api<ApiEnabledProcedure[]>(`/profissionais/${professionalId}/procedimentos`),
    enabled: Boolean(professionalId),
    staleTime: 5 * 60_000,
  });
}

/** Horários livres do profissional para o procedimento naquele dia (o backend já considera grade, bloqueios e agendamentos). */
export function useAvailability(professionalId: string | undefined, procedureId: string | undefined, date: string | undefined) {
  return useQuery({
    queryKey: ["agenda", "disponibilidade", professionalId, procedureId, date],
    queryFn: () => api<ApiSlot[]>("/agenda/disponibilidade", { query: { profissionalId: professionalId, procedimentoId: procedureId, de: date, ate: date } }),
    enabled: Boolean(professionalId && procedureId && date),
    staleTime: 0,
  });
}

export function usePatientSearch(term: string) {
  const clean = term.trim();
  return useQuery({
    queryKey: ["pacientes", "busca", clean],
    queryFn: () => api<ApiPatientSummary[]>("/pacientes", { query: { busca: clean, limite: 8 } }),
    enabled: clean.length >= 2,
    staleTime: 10_000,
  });
}

// ---- ações ----

export interface CreateAppointmentInput {
  unidadeId: string;
  profissionalId: string;
  pacienteId: string;
  procedimentoId: string;
  inicio: string;
  observacao?: string;
  canal?: "clinica" | "online" | "telefone" | "whatsapp";
}

/** Qualquer mudança em agendamento invalida a agenda, o Início e a disponibilidade. */
function useInvalidateAgenda() {
  const queryClient = useQueryClient();
  return () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["agenda"] }),
    queryClient.invalidateQueries({ queryKey: ["inicio"] }),
  ]);
}

export function useCreateAppointment() {
  const invalidate = useInvalidateAgenda();
  return useMutation({
    mutationFn: (input: CreateAppointmentInput) => api("/agendamentos", { method: "POST", body: input }),
    onSuccess: invalidate,
  });
}

export function useChangeStatus() {
  const invalidate = useInvalidateAgenda();
  return useMutation({
    mutationFn: (input: { id: string; status: BackendStatus; versao: number }) =>
      api(`/agendamentos/${input.id}/status`, { method: "POST", body: { status: input.status, versao: input.versao } }),
    onSuccess: invalidate,
  });
}

export function useCancelAppointment() {
  const invalidate = useInvalidateAgenda();
  return useMutation({
    mutationFn: (input: { id: string; versao: number; motivoId: number; observacao?: string }) =>
      api(`/agendamentos/${input.id}/cancelar`, { method: "POST", body: { motivoId: input.motivoId, versao: input.versao, observacao: input.observacao } }),
    onSuccess: invalidate,
  });
}

export function useRescheduleAppointment() {
  const invalidate = useInvalidateAgenda();
  return useMutation({
    mutationFn: (input: { id: string; versao: number; motivoId: number; inicio: string; observacao?: string }) =>
      api(`/agendamentos/${input.id}/remarcar`, { method: "POST", body: { motivoId: input.motivoId, versao: input.versao, inicio: input.inicio, observacao: input.observacao } }),
    onSuccess: invalidate,
  });
}

export interface QuickPatientInput { nome: string; celular: string; cpf?: string }

/** Cadastro rápido feito dentro do agendamento: o completo (todos os campos) é a tela de Pacientes. */
export function useQuickPatient() {
  return useMutation({
    mutationFn: (input: QuickPatientInput) =>
      api<{ id: string; nome: string; celular: string | null }>("/pacientes", {
        method: "POST",
        body: { nome: input.nome, celular: input.celular, cpf: input.cpf || undefined, semCpf: input.cpf ? undefined : true },
      }),
  });
}
