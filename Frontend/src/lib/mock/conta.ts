/**
 * Dados fictícios dos módulos Conta (Perfil, Notificações, Arquivos, Logs).
 * Determinístico via `rng` do core — mesma entrada, mesma saída.
 */
import { notifications as coreNotifications, patients, professionals, rng, TODAY } from "@/lib/mock/core";

/** Soma (ou subtrai) dias a uma data ISO, em UTC — evita depender de fuso local. */
function addDaysIso(dateIso: string, days: number): string {
  const d = new Date(`${dateIso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// --- arquivos ---------------------------------------------------------------

export type FileKind = "pdf" | "image" | "doc" | "sheet" | "xml" | "other";

export interface FileFolder {
  id: string;
  name: string;
  count: number;
}

export const fileFolders: FileFolder[] = [
  { id: "todos", name: "Todos os arquivos", count: 0 },
  { id: "laudos", name: "Laudos e exames", count: 0 },
  { id: "contratos", name: "Contratos", count: 0 },
  { id: "tiss", name: "Guias TISS", count: 0 },
  { id: "modelos", name: "Modelos e impressos", count: 0 },
  { id: "marketing", name: "Marketing e branding", count: 0 },
];

export interface ClinicFile {
  id: string;
  name: string;
  kind: FileKind;
  folderId: string;
  sizeKb: number;
  owner: string;
  updatedAt: string;
}

function makeFiles(): ClinicFile[] {
  const r = rng(77);
  const owners = ["Ana Ribeiro", "Dra. Camila Esteves", "Dr. Henrique Lacerda", "Equipe financeira", "Recepção"];
  const specs: { name: string; kind: FileKind; folderId: string }[] = [
    { name: "Laudo US abdome total.pdf", kind: "pdf", folderId: "laudos" },
    { name: "Laudo ecocardiograma.pdf", kind: "pdf", folderId: "laudos" },
    { name: "Raio-X tórax.jpg", kind: "image", folderId: "laudos" },
    { name: "Contrato locação — Unidade Centro.pdf", kind: "pdf", folderId: "contratos" },
    { name: "Contrato convênio Saúde Bem Estar.pdf", kind: "pdf", folderId: "contratos" },
    { name: "Aditivo contratual 2026.doc", kind: "doc", folderId: "contratos" },
    { name: "Lote TISS #2026-118.xml", kind: "xml", folderId: "tiss" },
    { name: "Lote TISS #2026-121.xml", kind: "xml", folderId: "tiss" },
    { name: "Guia SP/SADT — modelo.pdf", kind: "pdf", folderId: "tiss" },
    { name: "Atestado médico — modelo.doc", kind: "doc", folderId: "modelos" },
    { name: "Receituário — modelo.doc", kind: "doc", folderId: "modelos" },
    { name: "Termo de consentimento.pdf", kind: "pdf", folderId: "modelos" },
    { name: "Planilha de repasses.xlsx", kind: "sheet", folderId: "contratos" },
    { name: "Logo clínica — alta resolução.png", kind: "image", folderId: "marketing" },
    { name: "Manual de identidade visual.pdf", kind: "pdf", folderId: "marketing" },
    { name: "Banner recepção.jpg", kind: "image", folderId: "marketing" },
    { name: "Planilha de estoque mínimo.xlsx", kind: "sheet", folderId: "contratos" },
    { name: "Política de privacidade (LGPD).pdf", kind: "pdf", folderId: "modelos" },
  ];
  return specs.map((s, i) => ({
    id: `f${i + 1}`,
    name: s.name,
    kind: s.kind,
    folderId: s.folderId,
    sizeKb: Math.round(80 + r() * 4200),
    owner: owners[Math.floor(r() * owners.length)],
    updatedAt: addDaysIso(TODAY, -Math.floor(r() * 90)),
  }));
}

export const clinicFiles: ClinicFile[] = makeFiles();
for (const f of fileFolders) f.count = f.id === "todos" ? clinicFiles.length : clinicFiles.filter((x) => x.folderId === f.id).length;

export const storageUsedGb = 18.4;
export const storageLimitGb = 50;

// --- registro de atividades (logs) ------------------------------------------

export interface AuditLog {
  id: string;
  datetime: string;
  user: string;
  action: string;
  module: string;
  record: string;
  ip: string;
  before?: Record<string, string>;
  after?: Record<string, string>;
}

const USERS = ["Ana Ribeiro", "Dra. Camila Esteves", "Dr. Henrique Lacerda", "Equipe financeira", "Admin do sistema"];

function makeLogs(): AuditLog[] {
  const r = rng(301);
  const out: AuditLog[] = [];
  const templates: { action: string; module: string; record: () => string; diff?: boolean }[] = [
    { action: "Reagendou atendimento", module: "Agenda", record: () => `Agendamento de ${patients[Math.floor(r() * patients.length)].name}`, diff: true },
    { action: "Cancelou atendimento", module: "Agenda", record: () => `Agendamento de ${patients[Math.floor(r() * patients.length)].name}` },
    { action: "Atualizou cadastro de paciente", module: "Pacientes", record: () => patients[Math.floor(r() * patients.length)].name, diff: true },
    { action: "Criou paciente", module: "Pacientes", record: () => patients[Math.floor(r() * patients.length)].name },
    { action: "Registrou pagamento", module: "Financeiro", record: () => `Recebimento de ${patients[Math.floor(r() * patients.length)].name}`, diff: true },
    { action: "Fechou caixa", module: "Financeiro", record: () => "Caixa da recepção" },
    { action: "Enviou lote para convênio", module: "Faturamento TISS", record: () => `Lote #2026-${100 + Math.floor(r() * 40)}` },
    { action: "Registrou glosa", module: "Faturamento TISS", record: () => `Guia #${10000 + Math.floor(r() * 900)}`, diff: true },
    { action: "Ajustou estoque", module: "Estoque", record: () => "Luva de procedimento (caixa 100un)", diff: true },
    { action: "Cadastrou produto", module: "Estoque", record: () => "Seringa descartável 10ml" },
    { action: "Alterou horário de profissional", module: "Cadastros", record: () => professionals[Math.floor(r() * professionals.length)].name, diff: true },
    { action: "Alterou configuração", module: "Configurações", record: () => "Agendamento online", diff: true },
    { action: "Encerrou sessão", module: "Configurações", record: () => "Sessão em Dell Inspiron" },
    { action: "Exportou dados do paciente", module: "Pacientes", record: () => patients[Math.floor(r() * patients.length)].name },
  ];
  for (let i = 0; i < 46; i += 1) {
    const t = templates[Math.floor(r() * templates.length)];
    const daysAgo = Math.floor(r() * 21);
    const h = String(7 + Math.floor(r() * 12)).padStart(2, "0");
    const m = String(Math.floor(r() * 60)).padStart(2, "0");
    out.push({
      id: `log-${i + 1}`,
      datetime: `${addDaysIso(TODAY, -daysAgo)}T${h}:${m}:00`,
      user: USERS[Math.floor(r() * USERS.length)],
      action: t.action,
      module: t.module,
      record: t.record(),
      ip: `191.32.44.${10 + Math.floor(r() * 80)}`,
      before: t.diff ? { status: "Confirmado", valor: "R$ 220,00" } : undefined,
      after: t.diff ? { status: "Remarcado", valor: "R$ 250,00" } : undefined,
    });
  }
  return out.sort((a, b) => b.datetime.localeCompare(a.datetime));
}

export const auditLogs: AuditLog[] = makeLogs();

// --- notificações (lista completa, agrupada) --------------------------------

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  module: string;
  day: "Hoje" | "Ontem" | "Esta semana" | "Mais antigas";
  time: string;
  unread: boolean;
  href: string;
}

export const allNotifications: AppNotification[] = [
  ...coreNotifications.map((n, i) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    module: ["Recepção", "Faturamento TISS", "Estoque", "Agenda", "Financeiro"][i % 5],
    day: (i < 3 ? "Hoje" : "Ontem") as AppNotification["day"],
    time: n.time,
    unread: n.unread,
    href: n.href,
  })),
  { id: "n6", title: "Novo paciente cadastrado via agendamento online", body: "Marina Albuquerque Sousa", module: "Pacientes", day: "Esta semana", time: "há 2 dias", unread: false, href: "/pacientes" },
  { id: "n7", title: "Certificado digital vence em 15 dias", body: "Assinatura digital (ICP-Brasil)", module: "Configurações", day: "Esta semana", time: "há 3 dias", unread: false, href: "/configuracoes/integracoes" },
  { id: "n8", title: "5 propostas aguardando aprovação do paciente", body: "Financeiro · Propostas", module: "Financeiro", day: "Esta semana", time: "há 4 dias", unread: false, href: "/financeiro/propostas" },
  { id: "n9", title: "Backup semanal concluído com sucesso", body: "Sistema", module: "Configurações", day: "Mais antigas", time: "há 9 dias", unread: false, href: "/configuracoes" },
  { id: "n10", title: "Nova avaliação recebida no agendamento online", body: "5 estrelas · Dra. Larissa Moura", module: "Agenda", day: "Mais antigas", time: "há 12 dias", unread: false, href: "/agenda" },
];
