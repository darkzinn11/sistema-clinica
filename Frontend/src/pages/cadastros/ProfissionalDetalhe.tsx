import { useRef, useState } from "react";
import { useParams } from "react-router";
import { Add, Camera, CloseCircle, Copy, TickCircle, Trash } from "iconsax-reactjs";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Checkbox, Radio } from "@/components/ui/input";
import { Switch } from "@/components/ui/overlay";
import LiquidTabs from "@/components/pinui/LiquidTabs";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DescriptionList, FormColumns, FormSection } from "@/components/ui/misc";
import { Table, TBody, TD, THead, TH, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { SaveBar } from "@/components/configuracoes/SaveBar";
import { useSettingsState } from "@/components/configuracoes/useSettingsState";
import { brl } from "@/lib/format";
import { clinic, insurances, procedureById, professionalById, professionals } from "@/lib/mock/core";
import {
  ANAMNESE_MODELS,
  CONSELHO_TYPES,
  COST_CENTER_NAMES,
  EVOLUCAO_MODELS,
  MEDICAL_RECORD_TABS,
  PERMISSION_CATEGORIES,
  PROFESSIONAL_GROUPS,
  PROFILE_PERMISSIONS,
  SPECIALTY_NAMES,
  TISS_PARTICIPATION_DEGREES,
  WEEKDAYS,
  defaultWeekSchedule,
  professionalAccess,
  professionalInsurances,
  professionalPersonalInfo,
  professionalProcedures,
  professionalProfile,
  professionalRepasse,
  type DaySchedule,
  type ProfessionalRegistration,
  type ProfessionalSubspecialty,
  type ScheduleBlock,
} from "@/lib/mock/cadastros";

interface DadosDraft {
  name: string;
  photoUrl?: string;
  title: string;
  socialName?: string;
  gender: "Masculino" | "Feminino";
  birthDate: string;
  cpf: string;
  cns: string;
  active: boolean;
  agendaColor: number;
  specialty: string;
  rqe?: string;
  registrations: ProfessionalRegistration[];
  subspecialties: ProfessionalSubspecialty[];
  address: { cep: string; street: string; number: string; complement?: string; neighborhood: string; city: string; state: string; country: string };
  phone: string;
  celular: string;
  secondaryPhone?: string;
  email: string;
  secondaryEmail?: string;
  defaultAnamnese?: string;
  defaultEvolution?: string;
  tissParticipationDegree?: string;
  costCenter?: string;
  group: string;
  medicalRecordTab: string;
  minAge?: number;
  maxAge?: number;
  hideFromAgenda: boolean;
  agendaMessage?: string;
  units: string[];
  agendaAccess: string[];
  notes?: string;
  digitalSignature: boolean;
}

const EMPTY_DADOS_DRAFT: DadosDraft = {
  name: "",
  title: "",
  gender: "Feminino",
  birthDate: "",
  cpf: "",
  cns: "",
  active: true,
  agendaColor: 0,
  specialty: "",
  registrations: [],
  subspecialties: [],
  address: { cep: "", street: "", number: "", neighborhood: "", city: "", state: "", country: "Brasil" },
  phone: "",
  celular: "",
  email: "",
  group: "",
  medicalRecordTab: "",
  hideFromAgenda: false,
  units: [],
  agendaAccess: [],
  digitalSignature: false,
};

function buildDadosDraft(prof: ReturnType<typeof professionalById>): DadosDraft {
  if (!prof) return EMPTY_DADOS_DRAFT;
  const personal = professionalPersonalInfo(prof);
  const profile = professionalProfile(prof);
  return {
    name: prof.name,
    title: profile.title,
    socialName: profile.socialName,
    gender: profile.gender,
    birthDate: personal.birthDate,
    cpf: personal.cpf,
    cns: profile.cns,
    active: profile.active,
    agendaColor: prof.color,
    specialty: prof.specialty,
    rqe: profile.rqe,
    registrations: profile.registrations,
    subspecialties: profile.subspecialties,
    address: profile.address,
    phone: personal.phone,
    celular: profile.celular,
    secondaryPhone: profile.secondaryPhone,
    email: personal.email,
    secondaryEmail: profile.secondaryEmail,
    defaultAnamnese: profile.defaultAnamnese,
    defaultEvolution: profile.defaultEvolution,
    tissParticipationDegree: profile.tissParticipationDegree,
    costCenter: profile.costCenter,
    group: profile.group,
    medicalRecordTab: profile.medicalRecordTab,
    minAge: profile.minAge,
    maxAge: profile.maxAge,
    hideFromAgenda: profile.hideFromAgenda,
    agendaMessage: profile.agendaMessage,
    units: profile.units,
    agendaAccess: profile.agendaAccess,
    notes: profile.notes,
    digitalSignature: personal.hasDigitalSignature,
  };
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

export default function ProfissionalDetalhe() {
  const { id = "" } = useParams();
  const prof = professionalById(id);

  const [schedule, setSchedule] = useState<DaySchedule[]>(() => (prof ? defaultWeekSchedule(prof) : []));
  const [copyFrom, setCopyFrom] = useState("");
  const [acceptedInsurances, setAcceptedInsurances] = useState<string[]>(() => (prof ? professionalInsurances(prof.id) : []));
  const [repasseMode, setRepasseMode] = useState<"percentual" | "fixo">(() => (prof ? professionalRepasse(prof.id).mode : "percentual"));
  const [repasseValue, setRepasseValue] = useState(() => (prof ? professionalRepasse(prof.id).value : 40));
  const [accessEnabled, setAccessEnabled] = useState(() => (prof ? professionalAccess(prof).hasLogin : true));
  const dados = useSettingsState<DadosDraft>(buildDadosDraft(prof));
  const d = dados.value;
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState<string | null>(null);

  function patchDados(patch: Partial<DadosDraft>) {
    dados.set((prev) => ({ ...prev, ...patch }));
  }

  function patchAddress(patch: Partial<DadosDraft["address"]>) {
    dados.set((prev) => ({ ...prev, address: { ...prev.address, ...patch } }));
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => patchDados({ photoUrl: String(reader.result) });
    reader.readAsDataURL(file);
  }

  function toggleListValue(key: "units" | "agendaAccess", value: string) {
    dados.set((prev) => ({ ...prev, [key]: prev[key].includes(value) ? prev[key].filter((v) => v !== value) : [...prev[key], value] }));
  }

  function addRegistration() {
    dados.set((prev) => ({ ...prev, registrations: [...prev.registrations, { conselho: "CRM", registro: "", uf: prev.registrations[0]?.uf ?? "MA" }] }));
  }

  function updateRegistration(index: number, patch: Partial<ProfessionalRegistration>) {
    dados.set((prev) => ({ ...prev, registrations: prev.registrations.map((r, i) => (i === index ? { ...r, ...patch } : r)) }));
  }

  function removeRegistration(index: number) {
    dados.set((prev) => ({ ...prev, registrations: prev.registrations.filter((_, i) => i !== index) }));
  }

  function addSubspecialty() {
    dados.set((prev) => ({ ...prev, subspecialties: [...prev.subspecialties, { name: "", note: "" }] }));
  }

  function updateSubspecialty(index: number, patch: Partial<ProfessionalSubspecialty>) {
    dados.set((prev) => ({ ...prev, subspecialties: prev.subspecialties.map((s, i) => (i === index ? { ...s, ...patch } : s)) }));
  }

  function removeSubspecialty(index: number) {
    dados.set((prev) => ({ ...prev, subspecialties: prev.subspecialties.filter((_, i) => i !== index) }));
  }

  const access = prof ? professionalAccess(prof) : undefined;
  const procedureRows = prof ? professionalProcedures(prof.id) : [];
  const repasseInit = prof ? professionalRepasse(prof.id) : undefined;

  function notify(msg: string) {
    setSaved(msg);
    setTimeout(() => setSaved(null), 3500);
  }

  if (!prof) {
    return (
      <div className="mx-auto max-w-7xl">
        <PageHeader card title="Profissional" breadcrumbs={[{ label: "Cadastros", href: "/cadastros" }, { label: "Profissionais", href: "/cadastros/profissionais" }, { label: "Não encontrado" }]} />
        <Card>
          <EmptyState title="Profissional não encontrado" description="Verifique o link ou volte para a lista de profissionais." />
        </Card>
      </div>
    );
  }

  function updateDay(day: number, patch: Partial<DaySchedule>) {
    setSchedule((prev) => prev.map((d, i) => (i === day ? { ...d, ...patch } : d)));
  }

  function updateBlock(day: number, blockIndex: number, patch: Partial<ScheduleBlock>) {
    setSchedule((prev) =>
      prev.map((d, i) => (i === day ? { ...d, blocks: d.blocks.map((b, bi) => (bi === blockIndex ? { ...b, ...patch } : b)) } : d)),
    );
  }

  function addBlock(day: number) {
    const slotMin = prof?.slotMin ?? 20;
    setSchedule((prev) => prev.map((d, i) => (i === day ? { ...d, blocks: [...d.blocks, { start: "14:00", end: "18:00", slotMin, maxEncaixes: 2 }] } : d)));
  }

  function removeBlock(day: number, blockIndex: number) {
    setSchedule((prev) => prev.map((d, i) => (i === day ? { ...d, blocks: d.blocks.filter((_, bi) => bi !== blockIndex) } : d)));
  }

  function copySchedule() {
    const source = professionals.find((p) => p.id === copyFrom);
    if (!source) return;
    setSchedule(defaultWeekSchedule(source));
    notify(`Horários copiados de ${source.name}.`);
  }

  const totalMinutes = schedule.reduce((sum, d) => sum + (d.enabled ? d.blocks.reduce((s, b) => s + Math.max(0, toMinutes(b.end) - toMinutes(b.start)), 0) : 0), 0);
  const totalSlots = schedule.reduce((sum, d) => sum + (d.enabled ? d.blocks.reduce((s, b) => s + Math.floor(Math.max(0, toMinutes(b.end) - toMinutes(b.start)) / Math.max(1, b.slotMin)), 0) : 0), 0);
  const allBlocks = schedule.flatMap((d) => (d.enabled ? d.blocks : []));
  const avgDuration = allBlocks.length ? Math.round(allBlocks.reduce((s, b) => s + b.slotMin, 0) / allBlocks.length) : 0;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        card
        title={prof.name}
        description={`${prof.specialty} · ${prof.council}`}
        breadcrumbs={[{ label: "Cadastros", href: "/cadastros" }, { label: "Profissionais", href: "/cadastros/profissionais" }, { label: prof.name }]}
      />

      {saved && (
        <div role="status" className="mb-5 flex items-center gap-2 rounded-lg border border-success-bg bg-success-bg px-4 py-2.5 text-sm text-success">
          <TickCircle size={16} aria-hidden />
          {saved}
        </div>
      )}

      <LiquidTabs
        label="Seções do cadastro"
        tabs={[{ label: "Dados" }, { label: "Horários de atendimento" }, { label: "Procedimentos e valores" }, { label: "Convênios aceitos" }, { label: "Repasse" }, { label: "Acesso" }]}
      >
        {(active) => {
          if (active === 0) {
            return (
              <div className="flex flex-col">
                <section className="flex flex-col items-center gap-6 border-b border-border pb-6 lg:flex-row lg:items-center lg:gap-10">
                  <div className="flex w-60 shrink-0 flex-col items-center gap-4">
                    {d.photoUrl ? (
                      <img src={d.photoUrl} alt={`Foto de ${d.name}`} className="h-[186px] w-[186px] rounded-full border border-border bg-surface object-cover" />
                    ) : (
                      <Avatar name={d.name || prof.name} size="hero" />
                    )}
                    <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                    <div className="flex items-center gap-1">
                      <Button variant="subtle" size="sm" icon={d.photoUrl ? Camera : Add} onClick={() => photoInputRef.current?.click()}>
                        {d.photoUrl ? "Trocar foto" : "Adicionar foto"}
                      </Button>
                      {d.photoUrl && <Button variant="ghost" size="sm" iconOnly icon={Trash} aria-label="Remover foto" onClick={() => patchDados({ photoUrl: undefined })} />}
                    </div>
                  </div>
                  <div className="flex w-full min-w-0 flex-1 flex-col gap-4">
                    <div className="flex flex-wrap items-start gap-8">
                      <div className="flex flex-col gap-1.5">
                        <p className="text-sm font-medium text-text">Cor na agenda</p>
                        <div className="flex items-center gap-1.5">
                          {Array.from({ length: 8 }, (_, i) => (
                            <button
                              key={i}
                              type="button"
                              aria-label={`Cor ${i + 1} na agenda`}
                              aria-pressed={d.agendaColor === i}
                              onClick={() => patchDados({ agendaColor: i })}
                              className="h-5 w-5 rounded-full transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                              style={{ background: `var(--c-series-${i + 1})`, boxShadow: d.agendaColor === i ? "0 0 0 2px var(--c-surface-raised), 0 0 0 4px var(--c-text)" : undefined }}
                            />
                          ))}
                        </div>
                      </div>
                      <Switch labelOnTop checked={d.active} onChange={(v) => patchDados({ active: v })} label="Ativo" />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <Select label="Título" value={d.title} onChange={(e) => patchDados({ title: e.target.value })} options={[{ value: "Dr.", label: "Dr." }, { value: "Dra.", label: "Dra." }, { value: "", label: "Nenhum" }]} />
                      <Input label="Nome completo" value={d.name} onChange={(e) => patchDados({ name: e.target.value })} wrapperClassName="sm:col-span-2" required />
                      <Input label="Nome social" placeholder="Se usar outro nome" value={d.socialName ?? ""} onChange={(e) => patchDados({ socialName: e.target.value || undefined })} />
                      <Select label="Sexo" value={d.gender} onChange={(e) => patchDados({ gender: e.target.value as DadosDraft["gender"] })} options={[{ value: "Feminino", label: "Feminino" }, { value: "Masculino", label: "Masculino" }]} />
                      <Input label="Nascimento" type="date" value={d.birthDate} onChange={(e) => patchDados({ birthDate: e.target.value })} />
                      <Input label="CPF" placeholder="000.000.000-00" inputMode="numeric" value={d.cpf} onChange={(e) => patchDados({ cpf: e.target.value })} required />
                      <Input label="CNS" placeholder="15 dígitos" inputMode="numeric" value={d.cns} onChange={(e) => patchDados({ cns: e.target.value })} />
                    </div>
                  </div>
                </section>

                <FormColumns
                  className="pt-6"
                  left={
                    <>
                      <FormSection variant="stacked" title="Registro profissional">
                        <div className="grid grid-cols-1 gap-3 @md:grid-cols-2">
                          <Select label="Especialidade" value={d.specialty} onChange={(e) => patchDados({ specialty: e.target.value })} options={SPECIALTY_NAMES.map((s) => ({ value: s, label: s }))} required />
                          <Input label="RQE" placeholder="Registro de especialista, se tiver" value={d.rqe ?? ""} onChange={(e) => patchDados({ rqe: e.target.value || undefined })} />
                        </div>
                        <div className="flex flex-col gap-2">
                          {d.registrations.map((reg, i) => (
                            <div key={i} className="flex flex-wrap items-end gap-2">
                              <Select label={i === 0 ? "Conselho" : undefined} aria-label={i === 0 ? undefined : "Conselho"} value={reg.conselho} onChange={(e) => updateRegistration(i, { conselho: e.target.value })} options={CONSELHO_TYPES.map((c) => ({ value: c, label: c }))} wrapperClassName="w-28" />
                              <Input label={i === 0 ? "Registro" : undefined} aria-label={i === 0 ? undefined : "Registro"} placeholder="Número" value={reg.registro} onChange={(e) => updateRegistration(i, { registro: e.target.value })} wrapperClassName="flex-1 min-w-28" />
                              <Input label={i === 0 ? "UF" : undefined} aria-label={i === 0 ? undefined : "UF"} placeholder="UF" value={reg.uf} maxLength={2} onChange={(e) => updateRegistration(i, { uf: e.target.value.toUpperCase() })} wrapperClassName="w-16" />
                              {d.registrations.length > 1 && <Button variant="ghost" size="sm" iconOnly icon={CloseCircle} aria-label="Remover registro" onClick={() => removeRegistration(i)} className="mb-1" />}
                            </div>
                          ))}
                          {d.subspecialties.map((sub, i) => (
                            <div key={i} className="flex flex-wrap items-end gap-2">
                              <Input label={i === 0 ? "Subespecialidade" : undefined} aria-label={i === 0 ? undefined : "Subespecialidade"} placeholder="Ex.: Ultrassom obstétrico" value={sub.name} onChange={(e) => updateSubspecialty(i, { name: e.target.value })} wrapperClassName="flex-1 min-w-40" />
                              <Input label={i === 0 ? "Observações" : undefined} aria-label={i === 0 ? undefined : "Observações"} placeholder="Opcional" value={sub.note ?? ""} onChange={(e) => updateSubspecialty(i, { note: e.target.value })} wrapperClassName="flex-1 min-w-40" />
                              <Button variant="ghost" size="sm" iconOnly icon={CloseCircle} aria-label="Remover subespecialidade" onClick={() => removeSubspecialty(i)} className="mb-1" />
                            </div>
                          ))}
                          <div className="flex flex-wrap gap-2">
                            <Button variant="subtle" size="sm" icon={Add} onClick={addRegistration}>Outro registro</Button>
                            <Button variant="subtle" size="sm" icon={Add} onClick={addSubspecialty}>Subespecialidade</Button>
                          </div>
                        </div>
                      </FormSection>

                      <FormSection variant="stacked" title="Padrões clínicos">
                        <div className="grid grid-cols-1 gap-3 @md:grid-cols-2 @2xl:grid-cols-3">
                          <Select label="Anamnese padrão" placeholder="Nenhuma" value={d.defaultAnamnese ?? ""} onChange={(e) => patchDados({ defaultAnamnese: e.target.value || undefined })} options={ANAMNESE_MODELS.map((m) => ({ value: m, label: m }))} />
                          <Select label="Evolução padrão" placeholder="Nenhuma" value={d.defaultEvolution ?? ""} onChange={(e) => patchDados({ defaultEvolution: e.target.value || undefined })} options={EVOLUCAO_MODELS.map((m) => ({ value: m, label: m }))} />
                          <Select label="Grau de participação (TISS)" placeholder="Nenhum" value={d.tissParticipationDegree ?? ""} onChange={(e) => patchDados({ tissParticipationDegree: e.target.value || undefined })} options={TISS_PARTICIPATION_DEGREES.map((m) => ({ value: m, label: m }))} />
                          <Select label="Centro de custo" placeholder="Nenhum" value={d.costCenter ?? ""} onChange={(e) => patchDados({ costCenter: e.target.value || undefined })} options={COST_CENTER_NAMES.map((m) => ({ value: m, label: m }))} />
                          <Select label="Grupo" value={d.group} onChange={(e) => patchDados({ group: e.target.value })} options={PROFESSIONAL_GROUPS.map((m) => ({ value: m, label: m }))} />
                          <Select label="Aba do prontuário" value={d.medicalRecordTab} onChange={(e) => patchDados({ medicalRecordTab: e.target.value })} options={MEDICAL_RECORD_TABS.map((m) => ({ value: m, label: m }))} />
                        </div>
                      </FormSection>

                      <FormSection variant="stacked" title="Observações e assinatura">
                        <Textarea label="Observações" placeholder="Notas internas, visíveis só para a equipe" value={d.notes ?? ""} onChange={(e) => patchDados({ notes: e.target.value || undefined })} />
                        <Switch
                          checked={d.digitalSignature}
                          onChange={(v) => patchDados({ digitalSignature: v })}
                          label="Assinatura digital habilitada"
                          description={d.digitalSignature ? "Certificado configurado e válido." : "Nenhum certificado configurado."}
                        />
                      </FormSection>
                    </>
                  }
                  right={
                    <>
                      <FormSection variant="stacked" title="Endereço e contato">
                        <div className="grid grid-flow-dense grid-cols-2 gap-3 @2xl:grid-cols-4">
                          <Input label="CEP" placeholder="00000-000" inputMode="numeric" value={d.address.cep} onChange={(e) => patchAddress({ cep: e.target.value })} />
                          <Input label="Endereço" placeholder="Rua, avenida…" value={d.address.street} onChange={(e) => patchAddress({ street: e.target.value })} wrapperClassName="col-span-2" />
                          <Input label="Número" value={d.address.number} onChange={(e) => patchAddress({ number: e.target.value })} />
                          <Input label="Complemento" placeholder="Sala, bloco…" value={d.address.complement ?? ""} onChange={(e) => patchAddress({ complement: e.target.value || undefined })} />
                          <Input label="Bairro" value={d.address.neighborhood} onChange={(e) => patchAddress({ neighborhood: e.target.value })} />
                          <Input label="Cidade" value={d.address.city} onChange={(e) => patchAddress({ city: e.target.value })} />
                          <Input label="Estado" placeholder="UF" value={d.address.state} maxLength={2} onChange={(e) => patchAddress({ state: e.target.value.toUpperCase() })} />
                          <Input label="País" value={d.address.country} onChange={(e) => patchAddress({ country: e.target.value })} />
                          <Input label="Telefone" placeholder="(00) 0000-0000" inputMode="tel" value={d.phone} onChange={(e) => patchDados({ phone: e.target.value })} />
                          <Input label="Celular" placeholder="(00) 00000-0000" inputMode="tel" value={d.celular} onChange={(e) => patchDados({ celular: e.target.value })} />
                          <Input label="2º telefone" placeholder="(00) 00000-0000" inputMode="tel" value={d.secondaryPhone ?? ""} onChange={(e) => patchDados({ secondaryPhone: e.target.value || undefined })} />
                          <Input label="E-mail" type="email" placeholder="nome@exemplo.com" value={d.email} onChange={(e) => patchDados({ email: e.target.value })} wrapperClassName="col-span-2" />
                          <Input label="E-mail secundário" type="email" placeholder="nome@exemplo.com" value={d.secondaryEmail ?? ""} onChange={(e) => patchDados({ secondaryEmail: e.target.value || undefined })} wrapperClassName="col-span-2" />
                        </div>
                      </FormSection>

                      <FormSection variant="stacked" title="Agenda">
                        <fieldset className="flex flex-col gap-2">
                          <legend className="mb-2 text-sm font-medium text-text">Unidades</legend>
                          <div className="flex flex-wrap gap-x-4 gap-y-2">
                            {clinic.units.map((u) => (
                              <Checkbox key={u.id} label={u.name} checked={d.units.includes(u.id)} onChange={() => toggleListValue("units", u.id)} />
                            ))}
                          </div>
                        </fieldset>
                        <fieldset className="flex flex-col gap-2">
                          <legend className="mb-2 text-sm font-medium text-text">Acesso às agendas de outros profissionais</legend>
                          <div className="flex flex-wrap gap-x-4 gap-y-2">
                            {professionals.filter((p) => p.id !== prof.id).map((p) => (
                              <Checkbox key={p.id} label={p.name} checked={d.agendaAccess.includes(p.id)} onChange={() => toggleListValue("agendaAccess", p.id)} />
                            ))}
                          </div>
                        </fieldset>
                        <div className="grid grid-cols-1 gap-3 @md:grid-cols-2">
                          <Input label="Idade mínima" type="number" min={0} placeholder="Sem limite" suffix="anos" value={d.minAge ?? ""} onChange={(e) => patchDados({ minAge: e.target.value ? Number(e.target.value) : undefined })} />
                          <Input label="Idade máxima" type="number" min={0} placeholder="Sem limite" suffix="anos" value={d.maxAge ?? ""} onChange={(e) => patchDados({ maxAge: e.target.value ? Number(e.target.value) : undefined })} />
                        </div>
                        <Switch checked={d.hideFromAgenda} onChange={(v) => patchDados({ hideFromAgenda: v })} label="Não exibir o profissional na agenda" description="Agenda continua ativa, mas fica oculta na visão geral." />
                        <Input label="Mensagem informativa na agenda" placeholder="Ex.: chegar 15 minutos antes, em jejum" value={d.agendaMessage ?? ""} onChange={(e) => patchDados({ agendaMessage: e.target.value || undefined })} hint="Exibida no agendamento." />
                      </FormSection>
                    </>
                  }
                />
              </div>
            );
          }

          if (active === 1) {
            return (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
                <FormSection
                  variant="stacked"
                  title="Agenda semanal"
                  description="Dias e horários em que o profissional atende."
                  actions={
                    <div className="flex items-center gap-2">
                      <Select wrapperClassName="w-64" aria-label="Copiar horários de outro profissional" value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} placeholder="Copiar de outro profissional" options={professionals.filter((p) => p.id !== prof.id).map((p) => ({ value: p.id, label: p.name }))} />
                      <Button variant="secondary" size="sm" icon={Copy} onClick={copySchedule} disabled={!copyFrom}>
                        Copiar
                      </Button>
                    </div>
                  }
                >
                  <div className="flex flex-col gap-5">
                    {schedule.map((day, dayIndex) => (
                      <div key={WEEKDAYS[dayIndex]} className="flex flex-col gap-3 border-b border-border pb-5 last:border-0 last:pb-0">
                        <Switch checked={day.enabled} onChange={(v) => updateDay(dayIndex, { enabled: v, blocks: v && day.blocks.length === 0 ? [{ start: "08:00", end: "18:00", slotMin: prof.slotMin, maxEncaixes: 2 }] : day.blocks })} label={WEEKDAYS[dayIndex]} />
                        {day.enabled && (
                          <div className="flex flex-col gap-3">
                            {day.blocks.map((block, blockIndex) => (
                              <div key={blockIndex} className="flex flex-wrap items-end gap-2 rounded-lg bg-surface p-3">
                                <Input label="Início" type="time" value={block.start} onChange={(e) => updateBlock(dayIndex, blockIndex, { start: e.target.value })} wrapperClassName="w-28" />
                                <Input label="Fim" type="time" value={block.end} onChange={(e) => updateBlock(dayIndex, blockIndex, { end: e.target.value })} wrapperClassName="w-28" />
                                <Input label="Duração do slot" type="number" min={5} step={5} suffix="min" value={block.slotMin} onChange={(e) => updateBlock(dayIndex, blockIndex, { slotMin: Number(e.target.value) || block.slotMin })} wrapperClassName="w-32" />
                                <Input label="Máx. encaixes/dia" type="number" min={0} value={block.maxEncaixes} onChange={(e) => updateBlock(dayIndex, blockIndex, { maxEncaixes: Number(e.target.value) || 0 })} wrapperClassName="w-36" />
                                {day.blocks.length > 1 && (
                                  <Button variant="ghost" size="sm" iconOnly icon={CloseCircle} aria-label="Remover horário" onClick={() => removeBlock(dayIndex, blockIndex)} className="mb-1" />
                                )}
                              </div>
                            ))}
                            <Button variant="subtle" size="sm" icon={Add} onClick={() => addBlock(dayIndex)} className="self-start">
                              Adicionar horário
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </FormSection>
                <aside className="flex h-fit flex-col gap-4 rounded-lg bg-surface p-5 lg:sticky lg:top-24">
                  <h3 className="text-md font-semibold text-text">Capacidade semanal</h3>
                  <div>
                    <p className="text-sm text-text-muted">Horas por semana</p>
                    <p className="font-display text-2xl font-semibold text-text">{(totalMinutes / 60).toFixed(1).replace(".", ",")}h</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted">Vagas por semana</p>
                    <p className="font-display text-2xl font-semibold text-text">{totalSlots.toLocaleString("pt-BR")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted">Duração média do slot</p>
                    <p className="font-display text-2xl font-semibold text-text">{avgDuration} min</p>
                  </div>
                </aside>
              </div>
            );
          }

          if (active === 2) {
            return (
              <FormSection variant="stacked" title="Procedimentos e valores" description="Procedimentos que este profissional realiza e o valor particular cobrado.">
                <div className="-mx-4">
                  <Table>
                    <THead>
                      <tr>
                        <TH>Procedimento</TH>
                        <TH>Duração</TH>
                        <TH align="right">Valor particular</TH>
                      </tr>
                    </THead>
                    <TBody>
                      {procedureRows.map((row) => {
                        const proc = procedureById(row.procedureId);
                        if (!proc) return null;
                        return (
                          <TR key={row.procedureId}>
                            <TD>{proc.name}</TD>
                            <TD className="text-text-muted">{proc.durationMin} min</TD>
                            <TD numeric>{brl(row.priceCents)}</TD>
                          </TR>
                        );
                      })}
                    </TBody>
                  </Table>
                </div>
              </FormSection>
            );
          }

          if (active === 3) {
            return (
              <FormSection
                variant="stacked"
                title="Convênios aceitos"
                description="Convênios em que este profissional atende."
                actions={<Button size="sm" variant="primary" onClick={() => notify("Convênios atualizados.")}>Salvar alterações</Button>}
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {insurances.map((ins) => (
                    <Checkbox
                      key={ins.id}
                      label={ins.name}
                      description={ins.id === "i0" ? "Sempre disponível" : `Registro ANS ${ins.ans}`}
                      checked={acceptedInsurances.includes(ins.id)}
                      disabled={ins.id === "i0"}
                      onChange={(e) => setAcceptedInsurances((prev) => (e.target.checked ? [...prev, ins.id] : prev.filter((id) => id !== ins.id)))}
                    />
                  ))}
                </div>
              </FormSection>
            );
          }

          if (active === 4) {
            return (
              <div className="flex flex-col">
                <FormSection
                  variant="stacked"
                  title="Regra padrão de repasse"
                  description="Como calcular o repasse deste profissional por padrão."
                  actions={<Button size="sm" variant="primary" onClick={() => notify("Regra de repasse salva.")}>Salvar</Button>}
                >
                  <div className="flex flex-wrap items-center gap-6">
                    <Radio name="repasse-mode" label="Percentual sobre o valor" checked={repasseMode === "percentual"} onChange={() => setRepasseMode("percentual")} />
                    <Radio name="repasse-mode" label="Valor fixo por atendimento" checked={repasseMode === "fixo"} onChange={() => setRepasseMode("fixo")} />
                  </div>
                  <Input
                    label={repasseMode === "percentual" ? "Percentual de repasse" : "Valor fixo"}
                    type="number"
                    suffix={repasseMode === "percentual" ? "%" : "R$"}
                    value={repasseMode === "percentual" ? repasseValue : Math.round(repasseValue / 100)}
                    onChange={(e) => setRepasseValue(repasseMode === "percentual" ? Number(e.target.value) || 0 : (Number(e.target.value) || 0) * 100)}
                    wrapperClassName="max-w-xs"
                  />
                </FormSection>
                {repasseInit && repasseInit.overrides.length > 0 && (
                  <FormSection variant="stacked" title="Exceções por procedimento" description="Procedimentos com regra de repasse diferente da padrão.">
                    <div className="-mx-4">
                      <Table>
                        <THead>
                          <tr>
                            <TH>Procedimento</TH>
                            <TH>Tipo</TH>
                            <TH align="right">Valor</TH>
                          </tr>
                        </THead>
                        <TBody>
                          {repasseInit.overrides.map((o) => (
                            <TR key={o.procedureId}>
                              <TD>{procedureById(o.procedureId)?.name ?? "—"}</TD>
                              <TD className="text-text-muted">{o.mode === "percentual" ? "Percentual" : "Fixo"}</TD>
                              <TD numeric>{o.mode === "percentual" ? `${o.value}%` : brl(o.value)}</TD>
                            </TR>
                          ))}
                        </TBody>
                      </Table>
                    </div>
                  </FormSection>
                )}
              </div>
            );
          }

          return (
            <div className="flex flex-col">
              <FormSection variant="stacked" title="Usuário vinculado">
                <DescriptionList
                  columns={2}
                  items={[
                    { label: "Usuário", value: access?.username },
                    { label: "Perfil de acesso", value: access?.profileName },
                    { label: "Último acesso", value: access?.lastAccess },
                    { label: "Status", value: <Badge tone={accessEnabled ? "success" : "neutral"} dot>{accessEnabled ? "Ativo" : "Inativo"}</Badge> },
                  ]}
                />
                <Switch checked={accessEnabled} onChange={(v) => { setAccessEnabled(v); notify(v ? "Acesso ao sistema habilitado." : "Acesso ao sistema revogado."); }} label="Acesso ao sistema habilitado" description="Permite login com e-mail e senha." />
              </FormSection>
              <FormSection
                variant="stacked"
                title="Permissões do perfil"
                description="Permissões do perfil “Profissional de saúde”, aplicadas a todos com esse perfil."
                actions={<ButtonLink to="/cadastros/funcionarios?tab=perfis&perfil=profissional" variant="secondary" size="sm">Gerenciar permissões</ButtonLink>}
              >
                <div className="-mx-4">
                  <Table>
                    <THead>
                      <tr>
                        <TH>Funcionalidade</TH>
                        <TH align="center">Ver</TH>
                        <TH align="center">Criar</TH>
                        <TH align="center">Editar</TH>
                        <TH align="center">Excluir</TH>
                      </tr>
                    </THead>
                    <TBody>
                      {PERMISSION_CATEGORIES.flatMap((cat) => [
                        <TR key={cat.key} className="bg-surface">
                          <TD colSpan={5} className="text-xs font-semibold tracking-wide text-text-muted uppercase">
                            {cat.label}
                          </TD>
                        </TR>,
                        ...cat.items.map((item) => {
                          const p = PROFILE_PERMISSIONS.profissional[item.key];
                          return (
                            <TR key={item.key}>
                              <TD>{item.label}</TD>
                              {(["ver", "criar", "editar", "excluir"] as const).map((k) => (
                                <TD key={k} align="center">
                                  {p[k] ? <TickCircle size={16} aria-label="Sim" className="mx-auto text-success" /> : <CloseCircle size={16} aria-label="Não" className="mx-auto text-text-subtle" />}
                                </TD>
                              ))}
                            </TR>
                          );
                        }),
                      ])}
                    </TBody>
                  </Table>
                </div>
              </FormSection>
            </div>
          );
        }}
      </LiquidTabs>

      <SaveBar dirty={dados.dirty} onDiscard={dados.discard} onSave={dados.save} />
    </div>
  );
}
