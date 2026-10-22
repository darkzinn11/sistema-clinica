import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiPage } from "./client";

// ---- tipos que o backend devolve ----

export interface PatientSummary {
  id: string;
  nome: string;
  nomeSocial: string | null;
  cpf: string | null;
  nascimento: string | null;
  celular: string | null;
  email: string | null;
  ativo: boolean;
  semCpf: boolean;
  estrangeiro: boolean;
  corIdentificacao: string | null;
  numeroProntuario: number | null;
  prioridadeId: string | null;
  avisoAtivo: boolean;
}

export interface Relative { id?: string; nome: string; responsavelFinanceiro: boolean; parentesco: string | null; cpf: string | null }

/** A ficha completa. Quem só vê pacientes vinculados (médico) recebe os campos sensíveis nulos e sem parentes. */
export interface Patient {
  id: string;
  nome: string;
  nomeSocial: string | null;
  cpf: string | null;
  semCpf: boolean;
  estrangeiro: boolean;
  nascimento: string | null;
  sexo: string | null;
  corIdentificacao: string | null;
  alturaCm: number | null;
  pesoKg: number | null;
  imc: number | null;
  numeroProntuario: number | null;
  prioridadeId: string | null;
  celular: string | null;
  celular2: string | null;
  telefone: string | null;
  telefone2: string | null;
  email: string | null;
  email2: string | null;
  cep: string | null;
  logradouro: string | null;
  numeroEndereco: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  pais: string | null;
  profissao: string | null;
  escolaridade: string | null;
  naturalidade: string | null;
  estadoCivil: string | null;
  nacionalidade: string | null;
  rg: string | null;
  origemId: string | null;
  indicacao: string | null;
  religiao: string | null;
  cns: string | null;
  corPele: string | null;
  observacoes: string | null;
  avisoAtivo: boolean;
  avisoTexto: string | null;
  ativo: boolean;
  inativadoMotivo: string | null;
  inativadoObservacao: string | null;
  inativadoEm: string | null;
  parentes: Relative[];
}

/** O que se envia ao criar ou editar (todos os campos do formulário; o número do prontuário nasce no servidor). */
export type PatientForm = Omit<Patient, "id" | "imc" | "numeroProntuario" | "ativo" | "inativadoMotivo" | "inativadoObservacao" | "inativadoEm" | "parentes"> & {
  parentes: Omit<Relative, "id">[];
};

export interface Lookup { id: string; nome: string; ativo: boolean }
export interface PatientStats { ativos: number; inativos: number; novosNoMes: number; aniversariantesSemana: number }
export interface Duplicate { paciente: PatientSummary; motivos: ("cpf" | "telefone" | "nome_nascimento")[] }
export interface PatientAppointment {
  id: string;
  data: string;
  inicio: string;
  fim: string;
  status: string;
  unidadeNome: string;
  profissionalId: string;
  profissionalNome: string;
  procedimentoNome: string;
  valorCentavos: number | null;
}
export interface PatientHistoryEntry { id: string; usuarioId: string | null; usuarioNome: string | null; campos: string[]; criadoEm: string }

// ---- consultas ----

export interface PatientQuery { busca: string; inicial: string; situacao: "ativos" | "inativos" | "todos"; pagina: number; tamanho: number }

export function usePatients(query: PatientQuery) {
  return useQuery({
    queryKey: ["pacientes", "lista", query],
    queryFn: () => apiPage<PatientSummary>("/pacientes", { query: { ...query } }),
    placeholderData: keepPreviousData,
  });
}

export function usePatientStats() {
  return useQuery({ queryKey: ["pacientes", "resumo"], queryFn: () => api<PatientStats>("/pacientes/resumo"), staleTime: 30_000 });
}

export function usePatient(id: string | undefined) {
  return useQuery({ queryKey: ["pacientes", "ficha", id], queryFn: () => api<Patient>(`/pacientes/${id}`), enabled: Boolean(id) });
}

export function usePatientAppointments(id: string | undefined) {
  return useQuery({ queryKey: ["pacientes", id, "agendamentos"], queryFn: () => api<PatientAppointment[]>(`/pacientes/${id}/agendamentos`), enabled: Boolean(id) });
}

export function usePatientHistory(id: string | undefined) {
  return useQuery({ queryKey: ["pacientes", id, "historico"], queryFn: () => api<PatientHistoryEntry[]>(`/pacientes/${id}/historico`), enabled: Boolean(id) });
}

export function usePriorities() {
  return useQuery({ queryKey: ["pacientes", "prioridades"], queryFn: () => api<Lookup[]>("/pacientes/prioridades"), staleTime: 5 * 60_000 });
}

export function useOrigins() {
  return useQuery({ queryKey: ["pacientes", "origens"], queryFn: () => api<Lookup[]>("/pacientes/origens-paciente"), staleTime: 5 * 60_000 });
}

export interface DuplicateQuery { nome?: string; nascimento?: string; cpf?: string; celular?: string }

/** Confere possíveis duplicados enquanto o cadastro é preenchido (só dispara com algo para conferir). */
export function useDuplicates(query: DuplicateQuery, enabled: boolean) {
  const has = Boolean(query.cpf || (query.celular && query.celular.length >= 10) || (query.nome && query.nome.length >= 4 && query.nascimento));
  return useQuery({
    queryKey: ["pacientes", "duplicados", query],
    queryFn: () => api<Duplicate[]>("/pacientes/duplicados", { query: { ...query } }),
    enabled: enabled && has,
    staleTime: 10_000,
  });
}

// ---- ações ----

function useInvalidatePatients() {
  const queryClient = useQueryClient();
  return () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["pacientes"] }),
    queryClient.invalidateQueries({ queryKey: ["inicio"] }),
  ]);
}

export function useSavePatient() {
  const invalidate = useInvalidatePatients();
  return useMutation({
    mutationFn: (input: { id?: string; form: PatientForm }) =>
      input.id ? api<Patient>(`/pacientes/${input.id}`, { method: "PUT", body: input.form }) : api<Patient>("/pacientes", { method: "POST", body: input.form }),
    onSuccess: invalidate,
  });
}

export function useDeactivatePatient() {
  const invalidate = useInvalidatePatients();
  return useMutation({
    mutationFn: (input: { id: string; motivo: "sem_vinculo" | "obito" | "sem_motivo"; observacao?: string }) =>
      api(`/pacientes/${input.id}/inativar`, { method: "POST", body: { motivo: input.motivo, observacao: input.observacao } }),
    onSuccess: invalidate,
  });
}

export function useReactivatePatient() {
  const invalidate = useInvalidatePatients();
  return useMutation({ mutationFn: (id: string) => api(`/pacientes/${id}/reativar`, { method: "POST" }), onSuccess: invalidate });
}
