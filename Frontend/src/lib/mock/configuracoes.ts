/**
 * Dados fictícios do módulo Configurações. Determinístico e local ao
 * protótipo — nada chega de rede, nada persiste além do estado de cada tela.
 */
import { Cpu, Gallery, Global, Microscope, ReceiptText, Verify } from "iconsax-reactjs";
import { WhatsappIcon } from "@/components/ui/whatsapp-icon";
import type { Icon as IconType } from "iconsax-reactjs";
import type { Tone } from "@/components/ui/badge";
import { locations, professionals } from "@/lib/mock/core";

export const WEEKDAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"] as const;

export interface BusinessHour {
  day: (typeof WEEKDAYS)[number];
  closed: boolean;
  open: string;
  close: string;
}

export const defaultBusinessHours: BusinessHour[] = [
  { day: "Segunda", closed: false, open: "07:00", close: "19:00" },
  { day: "Terça", closed: false, open: "07:00", close: "19:00" },
  { day: "Quarta", closed: false, open: "07:00", close: "19:00" },
  { day: "Quinta", closed: false, open: "07:00", close: "19:00" },
  { day: "Sexta", closed: false, open: "07:00", close: "18:00" },
  { day: "Sábado", closed: false, open: "08:00", close: "12:00" },
  { day: "Domingo", closed: true, open: "08:00", close: "12:00" },
];

export interface TicketType {
  id: string;
  name: string;
  /** índice da cor de série (0–7) — marca visual, nunca cor de texto corrido. */
  color: number;
  sigla: string;
  startNumber: number;
  preferential: boolean;
  active: boolean;
}

export const defaultTicketTypes: TicketType[] = [
  { id: "tt1", name: "Consulta particular", color: 0, sigla: "P", startNumber: 1, preferential: false, active: true },
  { id: "tt2", name: "Consulta convênio", color: 2, sigla: "C", startNumber: 1, preferential: false, active: true },
  { id: "tt3", name: "Exames", color: 4, sigla: "E", startNumber: 1, preferential: false, active: true },
  { id: "tt4", name: "Prioritário (idoso/gestante/PCD)", color: 3, sigla: "PR", startNumber: 1, preferential: true, active: true },
  { id: "tt5", name: "Retorno", color: 6, sigla: "R", startNumber: 1, preferential: false, active: false },
];

export interface Guiche {
  id: string;
  name: string;
  rooms: string[];
  active: boolean;
}

export const defaultGuiches: Guiche[] = [
  { id: "g1", name: "Guichê 1", rooms: [locations[0].id, locations[1].id], active: true },
  { id: "g2", name: "Guichê 2", rooms: [locations[2].id, locations[3].id], active: true },
  { id: "g3", name: "Guichê 3 — Exames", rooms: [locations[4].id, locations[5].id], active: true },
  { id: "g4", name: "Guichê 4 — Preferencial", rooms: [locations[6].id, locations[7].id], active: false },
];

export type IntegrationStatus = "conectado" | "nao_conectado" | "erro";

export interface Integration {
  id: string;
  name: string;
  description: string;
  status: IntegrationStatus;
  icon: IconType;
  lastSync?: string;
}

export const integrations: Integration[] = [
  { id: "whatsapp", name: "WhatsApp Business", description: "Confirmações, lembretes e avisos de chegada por WhatsApp.", status: "conectado", icon: WhatsappIcon, lastSync: "há 4 min" },
  { id: "api", name: "API pública", description: "Integração via API REST para sistemas de terceiros.", status: "conectado", icon: Global, lastSync: "há 1 h" },
  { id: "pacs", name: "PACS (imagens)", description: "Recebe e exibe laudos de imagem direto no prontuário.", status: "nao_conectado", icon: Gallery },
  { id: "lab", name: "Laboratório de apoio", description: "Troca de pedidos e resultados com laboratório parceiro.", status: "erro", icon: Microscope, lastSync: "falhou há 2 dias" },
  { id: "assinatura", name: "Assinatura digital (ICP-Brasil)", description: "Assinatura de laudos, receitas e atestados com certificado digital.", status: "conectado", icon: Verify, lastSync: "há 3 dias" },
  { id: "ia", name: "Assistente de IA", description: "Sugestões de evolução clínica e resumo de prontuário.", status: "nao_conectado", icon: Cpu },
  { id: "nfse", name: "NFS-e (prefeitura)", description: "Emissão automática de nota fiscal de serviço eletrônica.", status: "conectado", icon: ReceiptText, lastSync: "há 6 h" },
];

export interface ConnectedSession {
  id: string;
  user: string;
  device: string;
  browser: string;
  ip: string;
  location: string;
  lastActivity: string;
  current?: boolean;
}

export const connectedSessions: ConnectedSession[] = [
  { id: "s1", user: "Igor Leonardo", device: "MacBook Pro", browser: "Chrome 130 · macOS", ip: "191.32.44.10", location: "São Luís, MA", lastActivity: "agora", current: true },
  { id: "s2", user: "Igor Leonardo", device: "iPhone 15", browser: "App iOS", ip: "191.32.44.87", location: "São Luís, MA", lastActivity: "há 12 min" },
  { id: "s3", user: "Dra. Camila Esteves", device: "Dell Inspiron", browser: "Edge 128 · Windows", ip: "187.15.9.201", location: "São Luís, MA", lastActivity: "há 38 min" },
  { id: "s4", user: "Dr. Henrique Lacerda", device: "iPad Air", browser: "Safari · iPadOS", ip: "177.54.201.3", location: "São José de Ribamar, MA", lastActivity: "há 2 h" },
  { id: "s5", user: "Recepção — Totem", device: "Totem recepção 01", browser: "Navegador dedicado", ip: "10.0.0.14", location: "Unidade Centro", lastActivity: "há 5 h" },
];

export interface RiskLevel {
  id: string;
  name: string;
  tone: Tone;
  maxWaitMin: number;
  description: string;
}

export const defaultRiskLevels: RiskLevel[] = [
  { id: "r1", name: "Emergência", tone: "danger", maxWaitMin: 0, description: "Risco imediato de morte — atendimento sem espera." },
  { id: "r2", name: "Muito urgente", tone: "warning", maxWaitMin: 10, description: "Risco alto — atendimento prioritário em minutos." },
  { id: "r3", name: "Urgente", tone: "info", maxWaitMin: 30, description: "Necessita avaliação médica em tempo oportuno." },
  { id: "r4", name: "Pouco urgente", tone: "accent", maxWaitMin: 60, description: "Quadro estável, pode aguardar com conforto." },
  { id: "r5", name: "Não urgente", tone: "neutral", maxWaitMin: 120, description: "Atendimento de rotina, sem sinais de gravidade." },
];

export const defaultVitalSigns = [
  { id: "pa", label: "Pressão arterial", required: true },
  { id: "temp", label: "Temperatura", required: true },
  { id: "fc", label: "Frequência cardíaca", required: true },
  { id: "spo2", label: "Saturação de O₂", required: false },
  { id: "peso", label: "Peso e altura", required: false },
  { id: "glicemia", label: "Glicemia capilar", required: false },
];

export interface AgeRange {
  id: string;
  name: string;
  from: number;
  to: number;
}

export const defaultAgeRanges: AgeRange[] = [
  { id: "a1", name: "Recém-nascido", from: 0, to: 0 },
  { id: "a2", name: "Bebê", from: 0, to: 2 },
  { id: "a3", name: "Criança", from: 2, to: 12 },
  { id: "a4", name: "Adolescente", from: 12, to: 18 },
  { id: "a5", name: "Adulto", from: 18, to: 60 },
  { id: "a6", name: "Idoso", from: 60, to: 120 },
];

export const requiredFieldsMatrix: { field: string; cadastro: boolean; agendamento: boolean; guiaTiss: boolean }[] = [
  { field: "CPF", cadastro: true, agendamento: false, guiaTiss: true },
  { field: "Data de nascimento", cadastro: true, agendamento: false, guiaTiss: true },
  { field: "Telefone celular", cadastro: true, agendamento: true, guiaTiss: false },
  { field: "E-mail", cadastro: false, agendamento: false, guiaTiss: false },
  { field: "Endereço completo", cadastro: false, agendamento: false, guiaTiss: false },
  { field: "Convênio e matrícula", cadastro: false, agendamento: true, guiaTiss: true },
  { field: "Nome da mãe", cadastro: true, agendamento: false, guiaTiss: true },
  { field: "CNS (Cartão SUS)", cadastro: false, agendamento: false, guiaTiss: true },
  { field: "Indicação / origem", cadastro: false, agendamento: true, guiaTiss: false },
];

export const tvTemplates: { id: string; name: string; description: string }[] = [
  { id: "classico", name: "Clássico", description: "Lista de senhas chamadas com destaque para a última." },
  { id: "duplo", name: "Painel duplo", description: "Senha em destaque de um lado, histórico curto do outro." },
  { id: "minimal", name: "Minimalista", description: "Só a senha atual, tipografia enorme, sem lista." },
];

export const ipAllowlistDefault: string[] = ["191.32.44.0/24", "187.15.9.201", "10.0.0.0/16"];

export const purchaseApprovalTiers: { id: string; upToCents: number | null; approver: string }[] = [
  { id: "t1", upToCents: 50000, approver: "Qualquer gestor de estoque" },
  { id: "t2", upToCents: 300000, approver: "Coordenação administrativa" },
  { id: "t3", upToCents: null, approver: "Diretoria clínica" },
];

export const preferredSuppliers = ["Cirúrgica Fernandes", "MedCenter Distribuidora", "Hospidrogas MA", "Ortoflex Suprimentos"];

export const procedureAvailability = professionals.map((p) => ({ professionalId: p.id, name: p.name, onlineBooking: p.color % 4 !== 3 }));
