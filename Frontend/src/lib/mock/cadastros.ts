/**
 * Dados fictícios do módulo Cadastros — complementam src/lib/mock/core.ts
 * (profissionais, procedimentos, convênios, locais, equipamentos) com os
 * detalhes que as telas de cadastro precisam: horários de atendimento,
 * repasse, acesso de usuários, e os catálogos "genéricos" (fornecedores,
 * plano de contas, feriados etc.). Tudo determinístico via rng(seed).
 */

import {
  type Professional,
  equipment,
  insurances,
  leadSources,
  locations,
  procedureById,
  procedures,
  professionalById,
  professionals,
  rng,
} from "@/lib/mock/core";
import type { Icon as IconType } from "iconsax-reactjs";
import {
  Bank,
  Buildings2,
  Calendar,
  Card,
  ClipboardTick,
  Diagram,
  DocumentText,
  Location,
  Monitor,
  People,
  Profile2User,
  ReceiptText,
  Routing,
  ShieldTick,
  Tag2,
  TicketDiscount,
  Truck,
  UserTick,
  Wallet2,
} from "iconsax-reactjs";

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h || 1;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// --- Profissionais: horários de atendimento --------------------------------

export interface ScheduleBlock {
  start: string;
  end: string;
  slotMin: number;
  maxEncaixes: number;
}

export interface DaySchedule {
  enabled: boolean;
  blocks: ScheduleBlock[];
}

export const WEEKDAYS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

/** Agenda semanal padrão de um profissional, a partir da faixa de horário em core.ts. */
export function defaultWeekSchedule(prof: Professional): DaySchedule[] {
  const r = rng(hashId(prof.id) + 100);
  return WEEKDAYS.map((_, day) => {
    if (day === 0) return { enabled: false, blocks: [] };
    if (day === 6) {
      if (r() > 0.4) return { enabled: false, blocks: [] };
      return { enabled: true, blocks: [{ start: `${pad2(prof.startHour)}:00`, end: "12:00", slotMin: prof.slotMin, maxEncaixes: 2 }] };
    }
    return { enabled: true, blocks: [{ start: `${pad2(prof.startHour)}:00`, end: `${pad2(prof.endHour)}:00`, slotMin: prof.slotMin, maxEncaixes: 3 }] };
  });
}

// --- Profissionais: procedimentos, convênios, repasse, acesso --------------

export interface ProfessionalProcedure {
  procedureId: string;
  priceCents: number;
}

export function professionalProcedures(profId: string): ProfessionalProcedure[] {
  const prof = professionalById(profId);
  if (!prof) return [];
  return procedures
    .filter((p) => p.specialty === prof.specialty || (prof.specialty === "Clínica geral" && (p.id === "pr20" || p.id === "pr1")))
    .map((p) => ({ procedureId: p.id, priceCents: p.priceCents }));
}

export function professionalInsurances(profId: string): string[] {
  const r = rng(hashId(profId) + 200);
  return insurances.filter((i) => i.id === "i0" || r() < 0.7).map((i) => i.id);
}

export interface RepasseOverride {
  procedureId: string;
  mode: "percentual" | "fixo";
  value: number;
}

export interface RepasseRule {
  mode: "percentual" | "fixo";
  value: number;
  overrides: RepasseOverride[];
}

export function professionalRepasse(profId: string): RepasseRule {
  const r = rng(hashId(profId) + 300);
  const mode: "percentual" | "fixo" = r() < 0.75 ? "percentual" : "fixo";
  const value = mode === "percentual" ? Math.round(35 + r() * 25) : Math.round(8000 + r() * 12000);
  const overrides = professionalProcedures(profId)
    .slice(0, 2)
    .map((p) => ({ procedureId: p.procedureId, mode: "percentual" as const, value: Math.round(30 + r() * 30) }));
  return { mode, value, overrides };
}

export interface ProfessionalPersonalInfo {
  cpf: string;
  birthDate: string;
  phone: string;
  email: string;
  hasDigitalSignature: boolean;
}

export function professionalPersonalInfo(prof: Professional): ProfessionalPersonalInfo {
  const r = rng(hashId(prof.id) + 350);
  const digits = (n: number) => Array.from({ length: n }, () => Math.floor(r() * 10)).join("");
  const year = 1968 + Math.floor(r() * 32);
  const month = 1 + Math.floor(r() * 12);
  const day = 1 + Math.floor(r() * 28);
  const first = prof.name.replace(/^(Dra?\.)\s+/, "").split(" ")[0].toLowerCase();
  const last = prof.name.split(" ").slice(-1)[0].toLowerCase();
  const c = digits(11);
  return {
    cpf: `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}`,
    birthDate: `${year}-${pad2(month)}-${pad2(day)}`,
    phone: `(98) 9${digits(4)}-${digits(4)}`,
    email: `${first}.${last}@vidaplena.com.br`,
    hasDigitalSignature: r() > 0.4,
  };
}

export interface ProfessionalAccess {
  username: string;
  profileName: string;
  lastAccess: string;
  hasLogin: boolean;
}

export function professionalAccess(prof: Professional): ProfessionalAccess {
  const r = rng(hashId(prof.id) + 400);
  const first = prof.name.replace(/^(Dra?\.)\s+/, "").split(" ")[0].toLowerCase();
  const last = prof.name.split(" ").slice(-1)[0].toLowerCase();
  return {
    username: `${first}.${last}`,
    profileName: "Profissional de saúde",
    lastAccess: r() < 0.7 ? "Hoje, 08:4" + Math.floor(r() * 9) : "Ontem",
    hasLogin: r() > 0.1,
  };
}

// --- Funcionários e usuários -------------------------------------------------

export interface AccessProfile {
  id: string;
  name: string;
  description: string;
}

export const ACCESS_PROFILES: AccessProfile[] = [
  { id: "admin", name: "Administrador", description: "Acesso total ao sistema, incluindo configurações." },
  { id: "recepcao", name: "Recepção", description: "Agenda, check-in, pacientes e caixa." },
  { id: "financeiro", name: "Financeiro", description: "Contas a pagar/receber, caixa e relatórios financeiros." },
  { id: "profissional", name: "Profissional de saúde", description: "Agenda própria, prontuário e atendimento." },
  { id: "gerencia", name: "Gerência", description: "Relatórios e cadastros, sem acesso a dados financeiros sensíveis." },
];

export const PERMISSION_MODULES = ["Agenda", "Pacientes", "Prontuário", "Faturamento", "Financeiro", "Estoque", "Relatórios", "Cadastros"];

export interface ModulePermission {
  ver: boolean;
  criar: boolean;
  editar: boolean;
  excluir: boolean;
}

function perm(ver: boolean, criar: boolean, editar: boolean, excluir: boolean): ModulePermission {
  return { ver, criar, editar, excluir };
}

const ALL = perm(true, true, true, true);
const NONE = perm(false, false, false, false);

export const PROFILE_PERMISSIONS: Record<string, Record<string, ModulePermission>> = {
  admin: Object.fromEntries(PERMISSION_MODULES.map((m) => [m, ALL])),
  recepcao: {
    Agenda: ALL,
    Pacientes: perm(true, true, true, false),
    Prontuário: perm(true, false, false, false),
    Faturamento: perm(true, true, false, false),
    Financeiro: perm(true, false, false, false),
    Estoque: NONE,
    Relatórios: perm(true, false, false, false),
    Cadastros: NONE,
  },
  financeiro: {
    Agenda: perm(true, false, false, false),
    Pacientes: perm(true, false, false, false),
    Prontuário: NONE,
    Faturamento: ALL,
    Financeiro: ALL,
    Estoque: perm(true, false, false, false),
    Relatórios: perm(true, false, false, false),
    Cadastros: perm(true, true, true, false),
  },
  profissional: {
    Agenda: perm(true, true, true, false),
    Pacientes: perm(true, false, true, false),
    Prontuário: ALL,
    Faturamento: perm(true, false, false, false),
    Financeiro: NONE,
    Estoque: perm(true, false, false, false),
    Relatórios: perm(true, false, false, false),
    Cadastros: NONE,
  },
  gerencia: {
    Agenda: perm(true, true, true, false),
    Pacientes: perm(true, true, true, false),
    Prontuário: perm(true, false, false, false),
    Faturamento: perm(true, false, false, false),
    Financeiro: perm(true, false, false, false),
    Estoque: perm(true, true, true, false),
    Relatórios: ALL,
    Cadastros: perm(true, true, true, false),
  },
};

export interface SystemUser {
  id: string;
  name: string;
  role: string;
  email: string;
  profileId: string;
  lastAccess: string;
  twoFactor: boolean;
  active: boolean;
  professionalId?: string;
}

function makeUsers(): SystemUser[] {
  const r = rng(555);
  const staff: { name: string; role: string; profileId: string }[] = [
    { name: "Ana Ribeiro", role: "Recepcionista", profileId: "recepcao" },
    { name: "Carla Dias", role: "Recepcionista", profileId: "recepcao" },
    { name: "Marcos Vieira", role: "Analista financeiro", profileId: "financeiro" },
    { name: "Juliana Prado", role: "Gerente administrativa", profileId: "gerencia" },
    { name: "Patrícia Lemos", role: "Coordenadora de atendimento", profileId: "gerencia" },
    { name: "Roberto Cunha", role: "Administrador do sistema", profileId: "admin" },
  ];
  const out: SystemUser[] = staff.map((s, i) => ({
    id: `u-${i + 1}`,
    name: s.name,
    role: s.role,
    email: `${s.name.split(" ")[0].toLowerCase()}.${s.name.split(" ").slice(-1)[0].toLowerCase()}@vidaplena.com.br`,
    profileId: s.profileId,
    lastAccess: r() < 0.6 ? "Hoje" : "Ontem",
    twoFactor: r() < 0.55,
    active: r() > 0.08,
  }));
  for (const prof of professionals) {
    const access = professionalAccess(prof);
    out.push({
      id: `u-prof-${prof.id}`,
      name: prof.name,
      role: prof.specialty,
      email: `${access.username}@vidaplena.com.br`,
      profileId: "profissional",
      lastAccess: access.lastAccess,
      twoFactor: r() < 0.4,
      active: access.hasLogin,
      professionalId: prof.id,
    });
  }
  return out;
}

export const USERS: SystemUser[] = makeUsers();

// --- Procedimentos: preparo e preços por convênio ---------------------------

export function procedurePreparo(procId: string): string {
  const proc = procedureById(procId);
  if (!proc) return "";
  if (proc.kind === "exame" && proc.specialty === "Ultrassonografia") return "Bexiga cheia (beber 1L de água 1h antes). Jejum não é necessário.";
  if (proc.kind === "exame" && proc.specialty === "Cardiologia") return "Evitar café, bebidas energéticas e cigarro nas 2h anteriores ao exame.";
  if (proc.kind === "procedimento") return "Chegar 15 minutos antes. Informar uso de anticoagulantes ou alergias antes do procedimento.";
  if (proc.kind === "sessao") return "Trazer encaminhamento, se houver, e relatos de sessões anteriores.";
  return "Nenhum preparo específico — apenas trazer documento com foto e carteirinha do convênio, se houver.";
}

export function procedurePricesByInsurance(procId: string): { insuranceId: string; priceCents: number }[] {
  const proc = procedureById(procId);
  if (!proc) return [];
  const r = rng(hashId(procId) + 600);
  return insurances
    .filter((i) => i.id !== "i0")
    .map((i) => ({ insuranceId: i.id, priceCents: Math.round(proc.priceCents * (0.55 + r() * 0.3)) }));
}

// --- Convênios: planos e regras de faturamento ------------------------------

export interface InsurancePlan {
  id: string;
  name: string;
  tabela: string;
}

export interface InsuranceBilling {
  prazoPagamentoDias: number;
  versaoTiss: string;
  ativo: boolean;
  prazoEnvioDias: number;
  diaFechamento: number;
  exigeAutorizacao: string[];
  contato: { nome: string; telefone: string; email: string };
}

const PLAN_TIERS = ["Básico", "Intermediário", "Premium"];

export function insurancePlans(insId: string): InsurancePlan[] {
  if (insId === "i0") return [];
  const r = rng(hashId(insId) + 700);
  const count = 2 + Math.floor(r() * 2);
  return PLAN_TIERS.slice(0, count).map((tier, i) => ({ id: `${insId}-plano-${i}`, name: `${tier}`, tabela: `Tabela ${tier} 2026` }));
}

export function insuranceBilling(insId: string): InsuranceBilling {
  const r = rng(hashId(insId) + 800);
  const authProcs = procedures.filter((p) => p.kind === "exame" || p.kind === "procedimento");
  const exige = authProcs.filter(() => r() < 0.35).slice(0, 4).map((p) => p.name);
  return {
    prazoPagamentoDias: 30 + Math.floor(r() * 30),
    versaoTiss: ["3.05.00", "4.01.00", "4.02.00"][Math.floor(r() * 3)],
    ativo: insId === "i0" ? true : r() > 0.08,
    prazoEnvioDias: 5 + Math.floor(r() * 10),
    diaFechamento: 1 + Math.floor(r() * 28),
    exigeAutorizacao: exige,
    contato: { nome: "Central de Relacionamento", telefone: "0800 " + (700 + Math.floor(r() * 299)) + "-" + (1000 + Math.floor(r() * 8999)), email: `credenciados@${insId}.com.br` },
  };
}

// --- Cadastros genéricos (/cadastros/:entity) --------------------------------

export interface EntityField {
  key: string;
  label: string;
  type: "text" | "email" | "tel" | "number" | "select" | "textarea" | "checkbox" | "date";
  options?: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  suffix?: string;
}

export interface EntityColumn {
  key: string;
  label: string;
  numeric?: boolean;
}

export type EntityRow = Record<string, string | number | boolean> & { id: string };

export interface EntityConfig {
  title: string;
  description: string;
  icon: IconType;
  newLabel: string;
  columns: EntityColumn[];
  fields: EntityField[];
  rows: EntityRow[];
  searchKeys: string[];
  tree?: boolean;
  singleForm?: boolean;
}

const STATUS_FIELD: EntityField = { key: "status", label: "Status", type: "select", options: [{ value: "Ativo", label: "Ativo" }, { value: "Inativo", label: "Inativo" }] };

function rngFor(seed: number) {
  return rng(seed);
}

// Locais e salas (a partir de core.locations)
const LOCAL_TIPOS = ["Consultório", "Sala de exame", "Sala de procedimento", "Sala de espera"];
const locaisRows: EntityRow[] = (() => {
  const r = rngFor(901);
  return locations.map((l) => ({
    id: l.id,
    nome: l.name,
    tipo: l.name.toLowerCase().includes("ultrassom") || l.name.toLowerCase().includes("exames") ? "Sala de exame" : l.name.toLowerCase().includes("procedimentos") ? "Sala de procedimento" : "Consultório",
    capacidade: 1 + Math.floor(r() * 2),
    status: "Ativo",
  }));
})();

// Equipamentos (a partir de core.equipment)
const equipamentosRows: EntityRow[] = (() => {
  const r = rngFor(902);
  const statuses = ["Disponível", "Em uso", "Manutenção"];
  return equipment.map((e, i) => ({
    id: e.id,
    nome: e.name,
    local: locations.find((l) => l.id === e.location)?.name ?? "—",
    status: statuses[Math.floor(r() * statuses.length)],
    numeroSerie: `EQ-${2000 + i * 13}-${Math.floor(r() * 900 + 100)}`,
  }));
})();

// Fornecedores
const fornecedoresRows: EntityRow[] = [
  { id: "forn-1", nome: "Distribuidora MedSupply", categoria: "Materiais médicos", telefone: "(98) 3233-1100", email: "contato@medsupply.com.br", cidade: "São Luís", status: "Ativo" },
  { id: "forn-2", nome: "Higiclean Produtos de Limpeza", categoria: "Limpeza", telefone: "(98) 3233-2200", email: "vendas@higiclean.com.br", cidade: "São Luís", status: "Ativo" },
  { id: "forn-3", nome: "TechMed Equipamentos", categoria: "Tecnologia", telefone: "(98) 3233-3300", email: "suporte@techmed.com.br", cidade: "São Luís", status: "Ativo" },
  { id: "forn-4", nome: "Contabilidade Terceirizada MA", categoria: "Serviços", telefone: "(98) 3233-4400", email: "contato@contabilma.com.br", cidade: "São Luís", status: "Ativo" },
  { id: "forn-5", nome: "Papelaria Central", categoria: "Materiais de escritório", telefone: "(98) 3233-5500", email: "vendas@papelariacentral.com.br", cidade: "São Luís", status: "Inativo" },
  { id: "forn-6", nome: "Gráfica Impressul", categoria: "Serviços", telefone: "(98) 3233-6600", email: "orcamento@impressul.com.br", cidade: "São José de Ribamar", status: "Ativo" },
];

// Contatos
const contatosRows: EntityRow[] = [
  { id: "cont-1", nome: "Fernanda Castro", empresa: "Distribuidora MedSupply", cargo: "Representante comercial", telefone: "(98) 99122-3344", email: "fernanda.castro@medsupply.com.br" },
  { id: "cont-2", nome: "Paulo Henrique Souza", empresa: "Contabilidade Terceirizada MA", cargo: "Contador responsável", telefone: "(98) 99133-4455", email: "paulo.souza@contabilma.com.br" },
  { id: "cont-3", nome: "Renata Alves", empresa: "Saúde Bem Estar", cargo: "Gerente de credenciamento", telefone: "(98) 99144-5566", email: "renata.alves@saudebemestar.com.br" },
  { id: "cont-4", nome: "Diego Martins", empresa: "TechMed Equipamentos", cargo: "Técnico de manutenção", telefone: "(98) 99155-6677", email: "diego.martins@techmed.com.br" },
  { id: "cont-5", nome: "Camila Rezende", empresa: "Vida Plena Saúde", cargo: "Analista de relacionamento", telefone: "(98) 99166-7788", email: "camila.rezende@vidaplenasaude.com.br" },
];

// Tabelas de preço
const tabelasDePrecoRows: EntityRow[] = [
  { id: "tab-1", nome: "Particular padrão", vinculadaA: "Particular", itens: procedures.length, status: "Ativo" },
  { id: "tab-2", nome: "Convênios — padrão", vinculadaA: "Convênios", itens: procedures.length, status: "Ativo" },
  { id: "tab-3", nome: "Promocional — Outubro Rosa", vinculadaA: "Particular", itens: 6, status: "Ativo" },
  { id: "tab-4", nome: "Tabela Premium", vinculadaA: "Convênios", itens: 12, status: "Inativo" },
];

// Formas de recebimento
const formasDeRecebimentoRows: EntityRow[] = [
  { id: "fr-1", nome: "Dinheiro", taxa: "0%", prazoCompensacao: "Imediato", status: "Ativo" },
  { id: "fr-2", nome: "Cartão de crédito", taxa: "3,2%", prazoCompensacao: "30 dias", status: "Ativo" },
  { id: "fr-3", nome: "Cartão de débito", taxa: "1,8%", prazoCompensacao: "1 dia útil", status: "Ativo" },
  { id: "fr-4", nome: "Pix", taxa: "0%", prazoCompensacao: "Imediato", status: "Ativo" },
  { id: "fr-5", nome: "Boleto bancário", taxa: "R$ 3,50", prazoCompensacao: "2 dias úteis", status: "Ativo" },
  { id: "fr-6", nome: "Convênio", taxa: "0%", prazoCompensacao: "Conforme contrato", status: "Ativo" },
  { id: "fr-7", nome: "Cheque", taxa: "0%", prazoCompensacao: "1 dia útil", status: "Inativo" },
];

// Plano de contas (árvore)
const planoDeContasRows: EntityRow[] = [
  { id: "pc-1", parentId: "", codigo: "1", nome: "Receitas", tipo: "Receita" },
  { id: "pc-1-1", parentId: "pc-1", codigo: "1.1", nome: "Receita de serviços", tipo: "Receita" },
  { id: "pc-1-2", parentId: "pc-1", codigo: "1.2", nome: "Receita de produtos", tipo: "Receita" },
  { id: "pc-1-3", parentId: "pc-1", codigo: "1.3", nome: "Outras receitas", tipo: "Receita" },
  { id: "pc-2", parentId: "", codigo: "2", nome: "Despesas", tipo: "Despesa" },
  { id: "pc-2-1", parentId: "pc-2", codigo: "2.1", nome: "Despesas administrativas", tipo: "Despesa" },
  { id: "pc-2-1-1", parentId: "pc-2-1", codigo: "2.1.1", nome: "Folha de pagamento", tipo: "Despesa" },
  { id: "pc-2-1-2", parentId: "pc-2-1", codigo: "2.1.2", nome: "Aluguel e condomínio", tipo: "Despesa" },
  { id: "pc-2-2", parentId: "pc-2", codigo: "2.2", nome: "Despesas operacionais", tipo: "Despesa" },
  { id: "pc-2-2-1", parentId: "pc-2-2", codigo: "2.2.1", nome: "Fornecedores e insumos", tipo: "Despesa" },
  { id: "pc-2-2-2", parentId: "pc-2-2", codigo: "2.2.2", nome: "Manutenção e equipamentos", tipo: "Despesa" },
  { id: "pc-2-3", parentId: "pc-2", codigo: "2.3", nome: "Impostos e taxas", tipo: "Despesa" },
];

// Centros de custo
const centrosDeCustoRows: EntityRow[] = [
  { id: "cc-1", nome: "Administrativo", responsavel: "Juliana Prado", orcamentoMensal: "R$ 28.000,00", status: "Ativo" },
  { id: "cc-2", nome: "Comercial", responsavel: "Patrícia Lemos", orcamentoMensal: "R$ 9.000,00", status: "Ativo" },
  { id: "cc-3", nome: "Clínico", responsavel: "Dra. Camila Esteves", orcamentoMensal: "R$ 42.000,00", status: "Ativo" },
  { id: "cc-4", nome: "Operacional", responsavel: "Marcos Vieira", orcamentoMensal: "R$ 15.000,00", status: "Ativo" },
  { id: "cc-5", nome: "Recepção", responsavel: "Ana Ribeiro", orcamentoMensal: "R$ 6.500,00", status: "Ativo" },
];

// Contas correntes
const contasCorrentesRows: EntityRow[] = [
  { id: "conta-1", banco: "Banco do Brasil", agencia: "3421-5", conta: "18.294-0", saldo: "R$ 48.230,00", status: "Ativo" },
  { id: "conta-2", banco: "Itaú", agencia: "0921", conta: "72.104-8", saldo: "R$ 12.880,00", status: "Ativo" },
  { id: "conta-3", banco: "Bradesco", agencia: "1187-2", conta: "0003-9921", saldo: "R$ 5.420,00", status: "Inativo" },
];

// Regras de repasse
const regrasDeRepasseRows: EntityRow[] = [
  { id: "rr-1", nome: "Padrão 40%", tipo: "Percentual", valor: "40%", aplicadoA: "Todos os profissionais" },
  { id: "rr-2", nome: "Especialistas 50%", tipo: "Percentual", valor: "50%", aplicadoA: "Cardiologia, Ortopedia" },
  { id: "rr-3", nome: "Fixo por procedimento", tipo: "Fixo", valor: "R$ 80,00", aplicadoA: "Ultrassonografia" },
  { id: "rr-4", nome: "Convênios 35%", tipo: "Percentual", valor: "35%", aplicadoA: "Atendimentos via convênio" },
];

// Origens de pacientes (a partir de core.leadSources)
const origensRows: EntityRow[] = (() => {
  const r = rngFor(903);
  return leadSources.map((o, i) => ({ id: `origem-${i + 1}`, origem: o, pacientesCaptados: 20 + Math.floor(r() * 180), status: "Ativo" }));
})();

// Feriados
const feriadosRows: EntityRow[] = [
  { id: "fer-1", nome: "Confraternização Universal", data: "01/01/2026", tipo: "Nacional", fechaClinica: true },
  { id: "fer-2", nome: "Carnaval", data: "17/02/2026", tipo: "Nacional", fechaClinica: true },
  { id: "fer-3", nome: "Sexta-feira Santa", data: "03/04/2026", tipo: "Nacional", fechaClinica: true },
  { id: "fer-4", nome: "Tiradentes", data: "21/04/2026", tipo: "Nacional", fechaClinica: false },
  { id: "fer-5", nome: "Dia do Trabalho", data: "01/05/2026", tipo: "Nacional", fechaClinica: true },
  { id: "fer-6", nome: "Adesão do Maranhão à Independência", data: "28/07/2026", tipo: "Estadual", fechaClinica: false },
  { id: "fer-7", nome: "Independência do Brasil", data: "07/09/2026", tipo: "Nacional", fechaClinica: true },
  { id: "fer-8", nome: "Nossa Senhora Aparecida", data: "12/10/2026", tipo: "Nacional", fechaClinica: true },
  { id: "fer-9", nome: "Finados", data: "02/11/2026", tipo: "Nacional", fechaClinica: true },
  { id: "fer-10", nome: "Proclamação da República", data: "15/11/2026", tipo: "Nacional", fechaClinica: false },
  { id: "fer-11", nome: "Natal", data: "25/12/2026", tipo: "Nacional", fechaClinica: true },
];

// Modelos e impressos
const modelosRows: EntityRow[] = [
  { id: "mod-1", nome: "Anamnese inicial", tipo: "Formulário", ultimaAtualizacao: "12/08/2026", status: "Ativo" },
  { id: "mod-2", nome: "Termo de consentimento — procedimento", tipo: "Impresso", ultimaAtualizacao: "03/07/2026", status: "Ativo" },
  { id: "mod-3", nome: "Laudo de ultrassonografia", tipo: "Laudo", ultimaAtualizacao: "22/09/2026", status: "Ativo" },
  { id: "mod-4", nome: "Atestado médico", tipo: "Atestado", ultimaAtualizacao: "30/06/2026", status: "Ativo" },
  { id: "mod-5", nome: "Receituário simples", tipo: "Impresso", ultimaAtualizacao: "15/05/2026", status: "Ativo" },
  { id: "mod-6", nome: "Triagem de risco", tipo: "Formulário", ultimaAtualizacao: "28/04/2026", status: "Inativo" },
  { id: "mod-7", nome: "Laudo de eletrocardiograma", tipo: "Laudo", ultimaAtualizacao: "10/09/2026", status: "Ativo" },
];

// Vouchers
const vouchersRows: EntityRow[] = [
  { id: "vou-1", codigo: "BEMVINDO10", desconto: "10%", validade: "31/12/2026", usos: 134, status: "Ativo" },
  { id: "vou-2", codigo: "OUTUBRO ROSA", desconto: "15%", validade: "31/10/2026", usos: 58, status: "Ativo" },
  { id: "vou-3", codigo: "INDICACAO20", desconto: "20%", validade: "31/12/2026", usos: 21, status: "Ativo" },
  { id: "vou-4", codigo: "BLACKFRIDAY", desconto: "25%", validade: "30/11/2025", usos: 212, status: "Inativo" },
];

export const ENTITY_CONFIGS: Record<string, EntityConfig> = {
  locais: {
    title: "Locais e salas",
    description: "Consultórios e salas usados na agenda e nos atendimentos.",
    icon: Location,
    newLabel: "Novo local",
    columns: [{ key: "nome", label: "Nome" }, { key: "tipo", label: "Tipo" }, { key: "capacidade", label: "Capacidade", numeric: true }, { key: "status", label: "Status" }],
    fields: [
      { key: "nome", label: "Nome", type: "text", required: true },
      { key: "tipo", label: "Tipo", type: "select", options: LOCAL_TIPOS.map((t) => ({ value: t, label: t })) },
      { key: "capacidade", label: "Capacidade", type: "number" },
      STATUS_FIELD,
    ],
    rows: locaisRows,
    searchKeys: ["nome", "tipo"],
  },
  equipamentos: {
    title: "Equipamentos",
    description: "Equipamentos clínicos e sua alocação por sala.",
    icon: Monitor,
    newLabel: "Novo equipamento",
    columns: [{ key: "nome", label: "Equipamento" }, { key: "local", label: "Local" }, { key: "status", label: "Status" }, { key: "numeroSerie", label: "Nº de série" }],
    fields: [
      { key: "nome", label: "Nome do equipamento", type: "text", required: true },
      { key: "local", label: "Local", type: "select", options: locations.map((l) => ({ value: l.name, label: l.name })) },
      { key: "status", label: "Status", type: "select", options: ["Disponível", "Em uso", "Manutenção"].map((s) => ({ value: s, label: s })) },
      { key: "numeroSerie", label: "Número de série", type: "text" },
    ],
    rows: equipamentosRows,
    searchKeys: ["nome", "local"],
  },
  fornecedores: {
    title: "Fornecedores",
    description: "Empresas que fornecem produtos e serviços para a clínica.",
    icon: Truck,
    newLabel: "Novo fornecedor",
    columns: [{ key: "nome", label: "Fornecedor" }, { key: "categoria", label: "Categoria" }, { key: "telefone", label: "Telefone" }, { key: "cidade", label: "Cidade" }, { key: "status", label: "Status" }],
    fields: [
      { key: "nome", label: "Razão social", type: "text", required: true },
      { key: "categoria", label: "Categoria", type: "select", options: ["Materiais médicos", "Limpeza", "Tecnologia", "Serviços", "Alimentação", "Materiais de escritório"].map((c) => ({ value: c, label: c })) },
      { key: "telefone", label: "Telefone", type: "tel" },
      { key: "email", label: "E-mail", type: "email" },
      { key: "cidade", label: "Cidade", type: "text" },
      STATUS_FIELD,
    ],
    rows: fornecedoresRows,
    searchKeys: ["nome", "categoria", "cidade"],
  },
  contatos: {
    title: "Contatos",
    description: "Representantes, contadores e outros contatos úteis da clínica.",
    icon: Profile2User,
    newLabel: "Novo contato",
    columns: [{ key: "nome", label: "Nome" }, { key: "empresa", label: "Empresa" }, { key: "cargo", label: "Cargo" }, { key: "telefone", label: "Telefone" }],
    fields: [
      { key: "nome", label: "Nome", type: "text", required: true },
      { key: "empresa", label: "Empresa", type: "text" },
      { key: "cargo", label: "Cargo", type: "text" },
      { key: "telefone", label: "Telefone", type: "tel" },
      { key: "email", label: "E-mail", type: "email" },
    ],
    rows: contatosRows,
    searchKeys: ["nome", "empresa", "cargo"],
  },
  "tabelas-de-preco": {
    title: "Tabelas de preço",
    description: "Tabelas de valores usadas em procedimentos particulares e de convênio.",
    icon: Tag2,
    newLabel: "Nova tabela",
    columns: [{ key: "nome", label: "Nome" }, { key: "vinculadaA", label: "Vinculada a" }, { key: "itens", label: "Itens", numeric: true }, { key: "status", label: "Status" }],
    fields: [
      { key: "nome", label: "Nome da tabela", type: "text", required: true },
      { key: "vinculadaA", label: "Vinculada a", type: "select", options: [{ value: "Particular", label: "Particular" }, { value: "Convênios", label: "Convênios" }] },
      STATUS_FIELD,
    ],
    rows: tabelasDePrecoRows,
    searchKeys: ["nome", "vinculadaA"],
  },
  "formas-de-recebimento": {
    title: "Formas de recebimento",
    description: "Meios de pagamento aceitos no caixa e na recepção.",
    icon: Card,
    newLabel: "Nova forma",
    columns: [{ key: "nome", label: "Nome" }, { key: "taxa", label: "Taxa" }, { key: "prazoCompensacao", label: "Prazo de compensação" }, { key: "status", label: "Status" }],
    fields: [
      { key: "nome", label: "Nome", type: "text", required: true },
      { key: "taxa", label: "Taxa", type: "text", placeholder: "Ex.: 2,5%" },
      { key: "prazoCompensacao", label: "Prazo de compensação", type: "text" },
      STATUS_FIELD,
    ],
    rows: formasDeRecebimentoRows,
    searchKeys: ["nome"],
  },
  "plano-de-contas": {
    title: "Plano de contas",
    description: "Estrutura de contas usada para classificar receitas e despesas.",
    icon: Diagram,
    newLabel: "Nova conta",
    columns: [{ key: "codigo", label: "Código" }, { key: "nome", label: "Nome" }, { key: "tipo", label: "Tipo" }],
    fields: [
      { key: "codigo", label: "Código", type: "text", required: true },
      { key: "nome", label: "Nome da conta", type: "text", required: true },
      { key: "tipo", label: "Tipo", type: "select", options: [{ value: "Receita", label: "Receita" }, { value: "Despesa", label: "Despesa" }] },
    ],
    rows: planoDeContasRows,
    searchKeys: ["nome", "codigo"],
    tree: true,
  },
  "centros-de-custo": {
    title: "Centros de custo",
    description: "Divisões internas usadas para apurar custos por área.",
    icon: ReceiptText,
    newLabel: "Novo centro de custo",
    columns: [{ key: "nome", label: "Nome" }, { key: "responsavel", label: "Responsável" }, { key: "orcamentoMensal", label: "Orçamento mensal" }, { key: "status", label: "Status" }],
    fields: [
      { key: "nome", label: "Nome", type: "text", required: true },
      { key: "responsavel", label: "Responsável", type: "text" },
      { key: "orcamentoMensal", label: "Orçamento mensal", type: "text", placeholder: "R$ 0,00" },
      STATUS_FIELD,
    ],
    rows: centrosDeCustoRows,
    searchKeys: ["nome", "responsavel"],
  },
  "contas-correntes": {
    title: "Contas correntes",
    description: "Contas bancárias usadas para conciliação financeira.",
    icon: Bank,
    newLabel: "Nova conta",
    columns: [{ key: "banco", label: "Banco" }, { key: "agencia", label: "Agência" }, { key: "conta", label: "Conta" }, { key: "saldo", label: "Saldo" }, { key: "status", label: "Status" }],
    fields: [
      { key: "banco", label: "Banco", type: "text", required: true },
      { key: "agencia", label: "Agência", type: "text" },
      { key: "conta", label: "Conta", type: "text" },
      { key: "saldo", label: "Saldo inicial", type: "text", placeholder: "R$ 0,00" },
      STATUS_FIELD,
    ],
    rows: contasCorrentesRows,
    searchKeys: ["banco"],
  },
  "regras-de-repasse": {
    title: "Regras de repasse",
    description: "Modelos de repasse aplicáveis a profissionais e procedimentos.",
    icon: Wallet2,
    newLabel: "Nova regra",
    columns: [{ key: "nome", label: "Nome" }, { key: "tipo", label: "Tipo" }, { key: "valor", label: "Valor" }, { key: "aplicadoA", label: "Aplicado a" }],
    fields: [
      { key: "nome", label: "Nome da regra", type: "text", required: true },
      { key: "tipo", label: "Tipo", type: "select", options: [{ value: "Percentual", label: "Percentual" }, { value: "Fixo", label: "Fixo" }] },
      { key: "valor", label: "Valor", type: "text", placeholder: "Ex.: 40% ou R$ 80,00" },
      { key: "aplicadoA", label: "Aplicado a", type: "text" },
    ],
    rows: regrasDeRepasseRows,
    searchKeys: ["nome", "aplicadoA"],
  },
  origens: {
    title: "Origens de pacientes",
    description: "Como os pacientes chegaram até a clínica.",
    icon: Routing,
    newLabel: "Nova origem",
    columns: [{ key: "origem", label: "Origem" }, { key: "pacientesCaptados", label: "Pacientes captados", numeric: true }, { key: "status", label: "Status" }],
    fields: [{ key: "origem", label: "Nome da origem", type: "text", required: true }, STATUS_FIELD],
    rows: origensRows,
    searchKeys: ["origem"],
  },
  feriados: {
    title: "Feriados",
    description: "Datas em que a agenda é bloqueada automaticamente.",
    icon: Calendar,
    newLabel: "Novo feriado",
    columns: [{ key: "nome", label: "Nome" }, { key: "data", label: "Data" }, { key: "tipo", label: "Tipo" }, { key: "fechaClinica", label: "Fecha a clínica" }],
    fields: [
      { key: "nome", label: "Nome do feriado", type: "text", required: true },
      { key: "data", label: "Data", type: "date" },
      { key: "tipo", label: "Tipo", type: "select", options: ["Nacional", "Estadual", "Municipal"].map((t) => ({ value: t, label: t })) },
      { key: "fechaClinica", label: "Fecha a clínica", type: "checkbox" },
    ],
    rows: feriadosRows,
    searchKeys: ["nome", "tipo"],
  },
  modelos: {
    title: "Modelos e impressos",
    description: "Formulários, impressos, laudos e atestados padronizados.",
    icon: DocumentText,
    newLabel: "Novo modelo",
    columns: [{ key: "nome", label: "Nome" }, { key: "tipo", label: "Tipo" }, { key: "ultimaAtualizacao", label: "Última atualização" }, { key: "status", label: "Status" }],
    fields: [
      { key: "nome", label: "Nome do modelo", type: "text", required: true },
      { key: "tipo", label: "Tipo", type: "select", options: ["Formulário", "Impresso", "Laudo", "Atestado"].map((t) => ({ value: t, label: t })) },
      { key: "conteudo", label: "Conteúdo", type: "textarea", placeholder: "Texto base do modelo…" },
      STATUS_FIELD,
    ],
    rows: modelosRows,
    searchKeys: ["nome", "tipo"],
  },
  vouchers: {
    title: "Vouchers",
    description: "Cupons de desconto usados em vendas particulares.",
    icon: TicketDiscount,
    newLabel: "Novo voucher",
    columns: [{ key: "codigo", label: "Código" }, { key: "desconto", label: "Desconto" }, { key: "validade", label: "Validade" }, { key: "usos", label: "Usos", numeric: true }, { key: "status", label: "Status" }],
    fields: [
      { key: "codigo", label: "Código", type: "text", required: true },
      { key: "desconto", label: "Desconto", type: "text", placeholder: "Ex.: 10%" },
      { key: "validade", label: "Validade", type: "date" },
      STATUS_FIELD,
    ],
    rows: vouchersRows,
    searchKeys: ["codigo"],
  },
  empresa: {
    title: "Dados da empresa",
    description: "Informações cadastrais usadas em documentos e notas fiscais.",
    icon: Buildings2,
    newLabel: "",
    columns: [],
    fields: [
      { key: "razaoSocial", label: "Razão social", type: "text", required: true },
      { key: "nomeFantasia", label: "Nome fantasia", type: "text", required: true },
      { key: "cnpj", label: "CNPJ", type: "text" },
      { key: "telefone", label: "Telefone", type: "tel" },
      { key: "email", label: "E-mail", type: "email" },
      { key: "endereco", label: "Endereço", type: "text" },
      { key: "cidade", label: "Cidade/UF", type: "text" },
      { key: "inscricaoEstadual", label: "Inscrição estadual", type: "text" },
      { key: "inscricaoMunicipal", label: "Inscrição municipal", type: "text" },
      { key: "regimeTributario", label: "Regime tributário", type: "select", options: ["Simples Nacional", "Lucro Presumido", "Lucro Real"].map((r) => ({ value: r, label: r })) },
    ],
    rows: [],
    searchKeys: [],
    singleForm: true,
  },
};

export const ENTITY_GROUPS: { id: string; label: string; description: string; icon: IconType; items: { entity: string; href: string }[] }[] = [
  {
    id: "pessoas",
    label: "Pessoas",
    description: "Quem atende, quem usa o sistema e com quem a clínica se relaciona.",
    icon: People,
    items: [
      { entity: "profissionais", href: "/cadastros/profissionais" },
      { entity: "funcionarios", href: "/cadastros/funcionarios" },
      { entity: "fornecedores", href: "/cadastros/fornecedores" },
      { entity: "contatos", href: "/cadastros/contatos" },
    ],
  },
  {
    id: "atendimento",
    label: "Atendimento",
    description: "O que a clínica oferece, onde atende e como a agenda funciona.",
    icon: ClipboardTick,
    items: [
      { entity: "procedimentos", href: "/cadastros/procedimentos" },
      { entity: "convenios", href: "/cadastros/convenios" },
      { entity: "locais", href: "/cadastros/locais" },
      { entity: "equipamentos", href: "/cadastros/equipamentos" },
      { entity: "feriados", href: "/cadastros/feriados" },
      { entity: "origens", href: "/cadastros/origens" },
    ],
  },
  {
    id: "financeiro",
    label: "Financeiro",
    description: "Preços, recebimentos, contas e repasses.",
    icon: Wallet2,
    items: [
      { entity: "tabelas-de-preco", href: "/cadastros/tabelas-de-preco" },
      { entity: "formas-de-recebimento", href: "/cadastros/formas-de-recebimento" },
      { entity: "regras-de-repasse", href: "/cadastros/regras-de-repasse" },
      { entity: "contas-correntes", href: "/cadastros/contas-correntes" },
      { entity: "plano-de-contas", href: "/cadastros/plano-de-contas" },
      { entity: "centros-de-custo", href: "/cadastros/centros-de-custo" },
      { entity: "vouchers", href: "/cadastros/vouchers" },
    ],
  },
  {
    id: "clinica",
    label: "Clínica e documentos",
    description: "Dados da empresa e modelos usados em impressos.",
    icon: Buildings2,
    items: [
      { entity: "empresa", href: "/cadastros/empresa" },
      { entity: "modelos", href: "/cadastros/modelos" },
    ],
  },
];

export const ENTITY_ICON: Record<string, IconType> = {
  profissionais: UserTick,
  funcionarios: Profile2User,
  procedimentos: ClipboardTick,
  convenios: ShieldTick,
  ...Object.fromEntries(Object.entries(ENTITY_CONFIGS).map(([k, v]) => [k, v.icon])),
};

export const ENTITY_RECORD_COUNTS: Record<string, number> = {
  profissionais: professionals.length,
  funcionarios: USERS.length,
  procedimentos: procedures.length,
  convenios: insurances.length,
  ...Object.fromEntries(Object.entries(ENTITY_CONFIGS).map(([k, v]) => [k, v.rows.length])),
};

export const ENTITY_DESCRIPTIONS: Record<string, string> = {
  profissionais: "Médicos e profissionais de saúde, horários e repasse.",
  funcionarios: "Usuários do sistema, perfis e permissões de acesso.",
  procedimentos: "Catálogo de consultas, exames e procedimentos.",
  convenios: "Operadoras de saúde, planos e regras de faturamento.",
};
