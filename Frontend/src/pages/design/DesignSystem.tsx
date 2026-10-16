import { useState } from "react";
import { IconCircle, type IconCircleTone } from "@/components/ui/icon-circle";
import {
  Add,
  ArrowLeft2,
  ArrowRight2,
  Bank,
  Calendar,
  Camera,
  Chart2,
  CloseCircle,
  Copy,
  Cpu,
  Danger,
  DocumentText,
  Edit2,
  Export,
  Eye,
  EyeSlash,
  Filter,
  Gallery,
  Global,
  Health,
  Home2,
  Hospital,
  Import,
  InfoCircle,
  Lock,
  Microscope,
  Moon,
  NotificationBing,
  People,
  Printer,
  Profile2User,
  ReceiptText,
  SearchNormal1,
  Setting2,
  Sort,
  Sun1,
  TickCircle,
  Trash,
  Verify,
  Wallet,
  Wallet2,
  Warning2,
  Moneys,
} from "iconsax-reactjs";
import { WhatsappIcon } from "@/components/ui/whatsapp-icon";
import type { Icon as IconType } from "iconsax-reactjs";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, type Tone } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { APPOINTMENT_STATUS, type AppointmentStatus } from "@/lib/status";
import { Avatar } from "@/components/ui/avatar";
import { Input, Select, Textarea, Checkbox, Radio } from "@/components/ui/input";
import { Drawer, DropdownMenu, Modal, Switch } from "@/components/ui/overlay";
import { Segmented, Tabs } from "@/components/ui/tabs";
import { Table, TBody, TD, TH, THead, TR, TableFooter } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { DescriptionList, Meter, Steps, Timeline } from "@/components/ui/misc";
import { BarChart, BarList, DonutChart, LineChart, StatCard } from "@/components/ui/charts";
import { brl } from "@/lib/format";
import { cn } from "@/lib/cn";
import { usePreferences } from "@/components/shell/preferences";

const COLOR_GROUPS: { title: string; tokens: string[] }[] = [
  { title: "Superfícies", tokens: ["bg", "surface", "surface-raised", "border", "border-strong", "border-input"] },
  { title: "Texto", tokens: ["text", "text-muted", "text-subtle"] },
  { title: "Marca", tokens: ["accent", "accent-strong", "accent-muted", "on-accent"] },
  { title: "Estado", tokens: ["success", "success-bg", "warning", "warning-bg", "danger", "danger-bg", "info", "info-bg"] },
  { title: "Identificação", tokens: ["aux", "aux-bg"] },
  { title: "Ícones sólidos do dashboard", tokens: ["icon-danger", "icon-warning", "icon-info", "icon-success"] },
  { title: "Preenchimento de indicadores", tokens: ["warning-fill", "danger-fill"] },
  { title: "Overlay", tokens: ["overlay"] },
  { title: "Séries de gráfico", tokens: ["series-1", "series-2", "series-3", "series-4", "series-5", "series-6", "series-7", "series-8"] },
  { title: "Sequencial (mapas de calor)", tokens: ["seq-1", "seq-2", "seq-3", "seq-4", "seq-5", "seq-6"] },
  { title: "Eixos de gráfico", tokens: ["chart-grid", "chart-axis"] },
];

const TYPE_SCALE: { cls: string; label: string }[] = [
  { cls: "text-xs", label: "text-xs · 12px" },
  { cls: "text-sm", label: "text-sm · 13px" },
  { cls: "text-base", label: "text-base · 14px (corpo)" },
  { cls: "text-md", label: "text-md · 16px" },
  { cls: "text-lg", label: "text-lg · 18px" },
  { cls: "text-xl", label: "text-xl · 22px" },
  { cls: "text-2xl", label: "text-2xl · 28px" },
  { cls: "text-display", label: "text-display · 40px" },
];

const ICONS: { name: string; icon: IconType }[] = [
  { name: "Calendar", icon: Calendar },
  { name: "SearchNormal1", icon: SearchNormal1 },
  { name: "Home2", icon: Home2 },
  { name: "People", icon: People },
  { name: "Wallet2", icon: Wallet2 },
  { name: "DocumentText", icon: DocumentText },
  { name: "Setting2", icon: Setting2 },
  { name: "NotificationBing", icon: NotificationBing },
  { name: "Add", icon: Add },
  { name: "Trash", icon: Trash },
  { name: "Edit2", icon: Edit2 },
  { name: "TickCircle", icon: TickCircle },
  { name: "CloseCircle", icon: CloseCircle },
  { name: "InfoCircle", icon: InfoCircle },
  { name: "Danger", icon: Danger },
  { name: "Warning2", icon: Warning2 },
  { name: "Eye", icon: Eye },
  { name: "EyeSlash", icon: EyeSlash },
  { name: "Lock", icon: Lock },
  { name: "ArrowRight2", icon: ArrowRight2 },
  { name: "ArrowLeft2", icon: ArrowLeft2 },
  { name: "Copy", icon: Copy },
  { name: "Printer", icon: Printer },
  { name: "Export", icon: Export },
  { name: "Import", icon: Import },
  { name: "Filter", icon: Filter },
  { name: "Sort", icon: Sort },
  { name: "Camera", icon: Camera },
  { name: "Gallery", icon: Gallery },
  { name: "Chart2", icon: Chart2 },
  { name: "Health", icon: Health },
  { name: "Hospital", icon: Hospital },
  { name: "Profile2User", icon: Profile2User },
  { name: "Wallet", icon: Wallet },
  { name: "Bank", icon: Bank },
  { name: "ReceiptText", icon: ReceiptText },
  { name: "Whatsapp", icon: WhatsappIcon },
  { name: "Global", icon: Global },
  { name: "Microscope", icon: Microscope },
  { name: "Verify", icon: Verify },
  { name: "Cpu", icon: Cpu },
];

const BAR_DATA = [
  { label: "Seg", receita: 4200, despesa: 2100 },
  { label: "Ter", receita: 3800, despesa: 1900 },
  { label: "Qua", receita: 5100, despesa: 2400 },
  { label: "Qui", receita: 4700, despesa: 2000 },
  { label: "Sex", receita: 6200, despesa: 2600 },
  { label: "Sáb", receita: 2600, despesa: 1200 },
];
const LINE_DATA = [
  { label: "Abr", ocupacao: 72 },
  { label: "Mai", ocupacao: 78 },
  { label: "Jun", ocupacao: 74 },
  { label: "Jul", ocupacao: 81 },
  { label: "Ago", ocupacao: 85 },
  { label: "Set", ocupacao: 88 },
];
const DONUT_DATA = [
  { label: "Particular", value: 38 },
  { label: "Saúde Bem Estar", value: 26 },
  { label: "Vida Plena Saúde", value: 19 },
  { label: "Outros convênios", value: 17 },
];
const BAR_LIST_DATA = [
  { label: "Consulta clínica", value: 182 },
  { label: "US obstétrico", value: 96 },
  { label: "Consulta cardiológica", value: 74 },
  { label: "Eletrocardiograma", value: 51 },
];

function SectionNav({ sections }: { sections: string[] }) {
  return (
    <nav aria-label="Seções do guia" className="sticky top-24 hidden shrink-0 flex-col gap-0.5 lg:flex lg:w-52">
      {sections.map((s) => (
        <a key={s} href={`#${s.toLowerCase().replace(/\s+/g, "-")}`} className="rounded-full px-3 py-1.5 text-sm text-text-muted hover:bg-surface hover:text-text">
          {s}
        </a>
      ))}
    </nav>
  );
}

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="font-display text-xl font-semibold text-text">{title}</h2>
      {description && <p className="mt-1 max-w-2xl text-sm text-text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Swatch({ token }: { token: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="h-14 rounded-lg border border-border" style={{ background: `var(--c-${token})` }} />
      <code className="text-xs text-text-muted">--c-{token}</code>
    </div>
  );
}

function IconSample({ name, Icon }: { name: string; Icon: IconType }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-border p-3">
      <div className="flex items-center gap-3 text-text">
        <Icon size={22} variant="Linear" aria-hidden />
        <Icon size={22} variant="Bulk" aria-hidden />
      </div>
      <span className="text-[11px] text-text-muted">{name}</span>
    </div>
  );
}

export default function DesignSystem() {
  const { theme, density, setTheme, setDensity } = usePreferences();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const sections = [
    "Cores", "Tipografia", "Botões", "Campos", "Badges", "Avatar", "Card",
    "Tabs e Segmented", "Tabela", "EmptyState", "Overlays", "Timeline", "Meter", "Steps", "Gráficos", "Ícones de destaque", "Ícones",
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <PageHeader
        title="Design system"
        description="Guia vivo dos tokens e componentes do protótipo — tudo aqui vem direto dos componentes reais do app."
        actions={
          <div className="flex items-center gap-3">
            <Segmented
              label="Tema"
              size="sm"
              value={theme === "dark" ? "dark" : "light"}
              onChange={(v) => setTheme(v)}
              options={[
                { value: "light", label: "Claro", icon: Sun1 },
                { value: "dark", label: "Escuro", icon: Moon },
              ]}
            />
            <Segmented
              label="Densidade"
              size="sm"
              value={density}
              onChange={(v) => setDensity(v)}
              options={[
                { value: "comfortable", label: "Confortável" },
                { value: "compact", label: "Compacto" },
              ]}
            />
          </div>
        }
      />

      <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
        <SectionNav sections={sections} />
        <div className="flex min-w-0 flex-1 flex-col gap-12">
          <Section id="cores" title="Cores" description="Papéis de cor — nunca hex cru nos componentes, só estes tokens.">
            <div className="flex flex-col gap-6">
              {COLOR_GROUPS.map((g) => (
                <div key={g.title}>
                  <h3 className="mb-2 text-sm font-semibold text-text">{g.title}</h3>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                    {g.tokens.map((t) => (
                      <Swatch key={t} token={t} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section id="tipografia" title="Tipografia" description="Plus Jakarta Sans no corpo, Gilroy ExtraBold (font-display) em títulos e números grandes.">
            <Card>
              <CardBody className="flex flex-col gap-3">
                {TYPE_SCALE.map((t) => (
                  <div key={t.cls} className="flex items-baseline gap-4">
                    <span className={cn(t.cls, "text-text")}>Clínica Vida Plena</span>
                    <code className="text-xs text-text-subtle">{t.label}</code>
                  </div>
                ))}
                <p className="font-display text-2xl font-semibold text-text">R$ 48.200 — font-display</p>
              </CardBody>
            </Card>
          </Section>

          <Section id="botões" title="Botões" description="Variantes × tamanhos, mais estados de carregamento e desabilitado.">
            <Card>
              <CardBody className="flex flex-col gap-5">
                {(["primary", "secondary", "ghost", "danger", "subtle"] as const).map((variant) => (
                  <div key={variant} className="flex flex-wrap items-center gap-3">
                    <span className="w-20 shrink-0 text-xs uppercase tracking-wide text-text-subtle">{variant}</span>
                    {(["xs", "sm", "md", "lg"] as const).map((size) => (
                      <Button key={size} variant={variant} size={size} icon={Add}>
                        Botão
                      </Button>
                    ))}
                    <Button variant={variant} loading>Carregando</Button>
                    <Button variant={variant} disabled>Desabilitado</Button>
                  </div>
                ))}
                <div className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-xs uppercase tracking-wide text-text-subtle">link</span>
                  <ButtonLink to="/design" variant="secondary" icon={ArrowRight2}>ButtonLink</ButtonLink>
                  <Button variant="secondary" iconOnly icon={Trash} aria-label="Excluir" />
                </div>
              </CardBody>
            </Card>
          </Section>

          <Section id="campos" title="Campos" description="Input, Select, Textarea, Checkbox, Radio e Switch — com estado de erro.">
            <Card>
              <CardBody className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Input label="Nome do paciente" placeholder="Digite o nome" icon={SearchNormal1} />
                <Input label="E-mail" error="E-mail inválido" defaultValue="paciente@" />
                <Select label="Convênio" placeholder="Selecione" options={[{ value: "p", label: "Particular" }, { value: "c", label: "Convênio" }]} />
                <Input label="Valor" suffix="BRL" defaultValue="250,00" />
                <Textarea label="Observações" placeholder="Anotações da consulta" className="sm:col-span-2" />
                <div className="flex flex-col gap-2">
                  <Checkbox label="Paciente gestante" description="Ativa protocolo de triagem específico" />
                  <Checkbox label="Opção desabilitada" disabled />
                </div>
                <div className="flex flex-col gap-2">
                  <Radio name="ds-radio" label="Masculino" defaultChecked />
                  <Radio name="ds-radio" label="Feminino" />
                </div>
                <Switch label="Notificar por WhatsApp" description="Envia lembretes automáticos" checked={true} onChange={() => {}} />
              </CardBody>
            </Card>
          </Section>

          <Section id="badges" title="Badges & StatusBadge" description="Tons de badge e os 11 status de agendamento usados na agenda.">
            <Card>
              <CardBody className="flex flex-col gap-5">
                <div className="flex flex-wrap gap-2">
                  {(["neutral", "accent", "success", "warning", "danger", "info"] as Tone[]).map((t) => (
                    <Badge key={t} tone={t} dot>{t}</Badge>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(APPOINTMENT_STATUS) as AppointmentStatus[]).map((st) => (
                    <StatusBadge key={st} status={st} />
                  ))}
                </div>
              </CardBody>
            </Card>
          </Section>

          <Section id="avatar" title="Avatar" description="Iniciais geradas a partir do nome, cor estável por hash.">
            <Card>
              <CardBody className="flex flex-wrap items-end gap-4">
                {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
                  <Avatar key={size} name="Camila Esteves" size={size} />
                ))}
              </CardBody>
            </Card>
          </Section>

          <Section id="card" title="Card" description="Container padrão — header, body e footer.">
            <Card className="max-w-sm">
              <CardHeader title="Título do cartão" description="Descrição curta de apoio." actions={<Button size="sm" variant="ghost">Ação</Button>} />
              <CardBody>
                <p className="text-sm text-text-muted">Conteúdo do cartão, pode ser texto, lista ou formulário.</p>
              </CardBody>
            </Card>
          </Section>

          <Section id="tabs-e-segmented" title="Tabs e Segmented" description="Abas de estado local e controle segmentado.">
            <Card>
              <CardBody className="flex flex-col gap-6">
                <Tabs tabs={[{ label: "Visão geral" }, { label: "Detalhes", count: 3 }]}>
                  {(active) => <p className="text-sm text-text-muted">{active === 0 ? "Conteúdo da primeira aba." : "Conteúdo da segunda aba, com contador."}</p>}
                </Tabs>
                <DemoSegmented />
              </CardBody>
            </Card>
          </Section>

          <Section id="tabela" title="Tabela" description="Cabeçalho sutil, números tabulares, rodapé com paginação.">
            <Card>
              <CardBody className="p-0">
                <Table>
                  <THead>
                    <TR>
                      <TH sortable>Procedimento</TH>
                      <TH align="right">Qtde.</TH>
                      <TH align="right">Valor</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {BAR_LIST_DATA.map((d) => (
                      <TR key={d.label} interactive>
                        <TD>{d.label}</TD>
                        <TD numeric>{d.value}</TD>
                        <TD numeric>{brl(d.value * 15000)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </CardBody>
              <TableFooter total={42} page={1} pageSize={4} />
            </Card>
          </Section>

          <Section id="emptystate" title="EmptyState" description="Estado vazio com ícone, título, descrição e ação.">
            <Card>
              <CardBody>
                <EmptyState title="Nenhum resultado encontrado" description="Ajuste os filtros ou crie um novo registro." action={<Button variant="secondary" icon={Add}>Novo registro</Button>} />
              </CardBody>
            </Card>
          </Section>

          <Section id="overlays" title="Overlays" description="Drawer, Modal e Dropdown — clique para abrir.">
            <Card>
              <CardBody className="flex flex-wrap gap-3">
                <Button variant="secondary" onClick={() => setDrawerOpen(true)}>Abrir Drawer</Button>
                <Button variant="secondary" onClick={() => setModalOpen(true)}>Abrir Modal</Button>
                <DropdownMenu
                  label="Menu de exemplo"
                  trigger={(p) => <button {...p} className="inline-flex h-9 items-center gap-2 rounded-full border border-border-strong bg-surface-raised px-3.5 text-base text-text hover:bg-surface">Abrir Dropdown</button>}
                  items={[
                    { label: "Editar", icon: Edit2, onSelect: () => {} },
                    { label: "Duplicar", icon: Copy, onSelect: () => {} },
                    { divider: true, label: "" },
                    { label: "Excluir", icon: Trash, danger: true, onSelect: () => {} },
                  ]}
                />
              </CardBody>
            </Card>
            <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Exemplo de Drawer" description="Painel lateral para formulários longos.">
              <p className="text-sm text-text-muted">Conteúdo do drawer.</p>
            </Drawer>
            <Modal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              title="Exemplo de Modal"
              description="Diálogo centralizado para confirmações."
              icon={InfoCircle}
              footer={<Button variant="primary" onClick={() => setModalOpen(false)}>Entendi</Button>}
            />
          </Section>

          <Section id="timeline" title="Timeline" description="Linha do tempo vertical — prontuário, histórico, auditoria.">
            <Card>
              <CardBody>
                <Timeline
                  entries={[
                    { id: "1", icon: TickCircle, tone: "success", title: "Consulta realizada", meta: "09:40", body: "Retorno agendado em 30 dias." },
                    { id: "2", icon: Calendar, tone: "accent", title: "Agendamento confirmado", meta: "ontem" },
                    { id: "3", icon: InfoCircle, tone: "info", title: "Cadastro atualizado", meta: "há 3 dias" },
                  ]}
                />
              </CardBody>
            </Card>
          </Section>

          <Section id="meter" title="Meter" description="Medidor de progresso — trilho no tom claro da mesma cor.">
            <Card>
              <CardBody className="flex flex-col gap-4">
                <Meter value={72} label="Ocupação da agenda" tone="accent" showValue="72%" />
                <Meter value={18.4} max={50} label="Armazenamento" tone="success" showValue="18,4 GB de 50 GB" />
                <Meter value={92} label="Estoque crítico" tone="danger" showValue="92%" />
              </CardBody>
            </Card>
          </Section>

          <Section id="steps" title="Steps" description="Passos de um fluxo, ex.: emissão de guia.">
            <Card>
              <CardBody>
                <Steps steps={["Paciente", "Procedimentos", "Revisão", "Envio"]} current={1} />
              </CardBody>
            </Card>
          </Section>

          <Section id="gráficos" title="Gráficos" description="StatCard, BarChart, LineChart, DonutChart e BarList — regras da skill dataviz já aplicadas.">
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard icon={<Moneys />} label="Faturamento do mês" value={brl(4820000)} delta={{ value: 12, period: "vs. mês anterior" }} trend={[20, 24, 22, 28, 30, 34, 38]} />
                <StatCard icon={<CloseCircle />} label="Taxa de não comparecimento" value="6,4%" delta={{ value: -2, period: "vs. mês anterior", goodWhenUp: false }} />
                <StatCard icon={<People />} label="Pacientes ativos" value="1.284" footer={<DescriptionList columns={1} items={[{ label: "Novos este mês", value: "86" }]} />} />
              </div>
              <Card>
                <CardHeader title="Receita × despesa (semana)" />
                <CardBody>
                  <BarChart title="Receita × despesa" data={BAR_DATA} series={[{ key: "receita", label: "Receita" }, { key: "despesa", label: "Despesa" }]} format={(n) => brl(n * 100)} />
                </CardBody>
              </Card>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader title="Ocupação da agenda" />
                  <CardBody>
                    <LineChart title="Ocupação" data={LINE_DATA} series={[{ key: "ocupacao", label: "Ocupação" }]} area format={(n) => `${n}%`} />
                  </CardBody>
                </Card>
                <Card>
                  <CardHeader title="Pacientes por convênio" />
                  <CardBody>
                    <DonutChart title="Por convênio" data={DONUT_DATA} centerLabel="Total" centerValue="100%" format={(n) => `${n}%`} />
                  </CardBody>
                </Card>
              </div>
              <Card>
                <CardHeader title="Top procedimentos do mês" />
                <CardBody>
                  <BarList title="Top procedimentos" data={BAR_LIST_DATA} />
                </CardBody>
              </Card>
            </div>
          </Section>

          <Section id="ícones de destaque" title="Ícones de destaque" description="Somente o verde institucional usa desenho branco. Cores auxiliares têm fundo pastel no modo claro e escuro no modo escuro, com desenho colorido. O sinal de adição permanece outline.">
            <Card>
              <CardBody className="flex flex-col gap-5">
                <div className="flex flex-wrap gap-6">
                  {(["accent", "success", "warning", "danger", "info", "neutral"] as IconCircleTone[]).map((tone) => (
                    <div key={tone} className="flex min-w-20 flex-col items-center gap-2">
                      <IconCircle tone={tone} size="2xl"><Calendar size={22} aria-hidden /></IconCircle>
                      <span className="text-xs text-text-muted">{tone}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-end gap-5 border-t border-border pt-4">
                  {(["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "hero"] as const).map((size) => (
                    <div key={size} className="flex flex-col items-center gap-2">
                      <IconCircle size={size}><Add size={size === "xs" ? 15 : size === "sm" ? 18 : size === "hero" ? 40 : 24} variant="Linear" aria-hidden /></IconCircle>
                      <span className="text-xs text-text-muted">{size}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </Section>

          <Section id="ícones" title="Ícones" description="Iconsax — variante Linear (padrão) e Bulk (ênfase), lado a lado.">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
              {ICONS.map(({ name, icon }) => (
                <IconSample key={name} name={name} Icon={icon} />
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function DemoSegmented() {
  const [value, setValue] = useState<"dia" | "semana" | "mes">("semana");
  return (
    <Segmented
      label="Período de exemplo"
      value={value}
      onChange={setValue}
      options={[
        { value: "dia", label: "Dia" },
        { value: "semana", label: "Semana" },
        { value: "mes", label: "Mês" },
      ]}
    />
  );
}
