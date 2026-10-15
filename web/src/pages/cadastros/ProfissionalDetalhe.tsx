import { useMemo, useState } from "react";
import { useParams } from "react-router";
import { Add, CloseCircle, Copy, TickCircle } from "iconsax-reactjs";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Checkbox, Radio } from "@/components/ui/input";
import { Switch } from "@/components/ui/overlay";
import { Tabs } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DescriptionList, FormSection } from "@/components/ui/misc";
import { Table, TBody, TD, THead, TH, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { brl, dateBR } from "@/lib/format";
import { insurances, procedureById, professionalById, professionals } from "@/lib/mock/core";
import {
  PERMISSION_MODULES,
  PROFILE_PERMISSIONS,
  WEEKDAYS,
  defaultWeekSchedule,
  professionalAccess,
  professionalInsurances,
  professionalPersonalInfo,
  professionalProcedures,
  professionalRepasse,
  type DaySchedule,
  type ScheduleBlock,
} from "@/lib/mock/cadastros";

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

export default function ProfissionalDetalhe() {
  const { id = "" } = useParams();
  const prof = professionalById(id);

  const [schedule, setSchedule] = useState<DaySchedule[]>(() => (prof ? defaultWeekSchedule(prof) : []));
  const [copyFrom, setCopyFrom] = useState("");
  const [signature, setSignature] = useState(() => (prof ? professionalPersonalInfo(prof).hasDigitalSignature : false));
  const [acceptedInsurances, setAcceptedInsurances] = useState<string[]>(() => (prof ? professionalInsurances(prof.id) : []));
  const [repasseMode, setRepasseMode] = useState<"percentual" | "fixo">(() => (prof ? professionalRepasse(prof.id).mode : "percentual"));
  const [repasseValue, setRepasseValue] = useState(() => (prof ? professionalRepasse(prof.id).value : 40));
  const [accessEnabled, setAccessEnabled] = useState(() => (prof ? professionalAccess(prof).hasLogin : true));
  const [saved, setSaved] = useState<string | null>(null);

  const personal = useMemo(() => (prof ? professionalPersonalInfo(prof) : undefined), [prof]);
  const access = useMemo(() => (prof ? professionalAccess(prof) : undefined), [prof]);
  const procedureRows = useMemo(() => (prof ? professionalProcedures(prof.id) : []), [prof]);
  const repasseInit = useMemo(() => (prof ? professionalRepasse(prof.id) : undefined), [prof]);

  function notify(msg: string) {
    setSaved(msg);
    setTimeout(() => setSaved(null), 3500);
  }

  if (!prof) {
    return (
      <div className="mx-auto max-w-7xl">
        <PageHeader title="Profissional" breadcrumbs={[{ label: "Cadastros", href: "/cadastros" }, { label: "Profissionais", href: "/cadastros/profissionais" }, { label: "Não encontrado" }]} />
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
        title={prof.name}
        description={`${prof.specialty} · ${prof.council}`}
        breadcrumbs={[{ label: "Cadastros", href: "/cadastros" }, { label: "Profissionais", href: "/cadastros/profissionais" }, { label: prof.name }]}
        meta={
          <span className="flex h-9 items-center gap-2 rounded-full bg-surface px-1 pr-3">
            <Avatar name={prof.name} size="xs" />
            <span className="text-sm text-text-muted">{procedureRows.length} procedimentos</span>
          </span>
        }
      />

      {saved && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-success-bg bg-success-bg px-4 py-2.5 text-sm text-success">
          <TickCircle size={16} aria-hidden />
          {saved}
        </div>
      )}

      <Tabs
        tabs={[{ label: "Dados" }, { label: "Horários de atendimento" }, { label: "Procedimentos e valores" }, { label: "Convênios aceitos" }, { label: "Repasse" }, { label: "Acesso" }]}
      >
        {(active) => {
          if (active === 0) {
            return (
              <div className="flex flex-col gap-6">
                <Card>
                  <CardHeader title="Dados pessoais" />
                  <CardBody>
                    <DescriptionList
                      columns={2}
                      items={[
                        { label: "Nome completo", value: prof.name },
                        { label: "CPF", value: personal?.cpf },
                        { label: "Data de nascimento", value: personal ? dateBR(personal.birthDate) : undefined },
                        { label: "Telefone", value: personal?.phone },
                        { label: "E-mail", value: personal?.email },
                      ]}
                    />
                  </CardBody>
                </Card>
                <Card>
                  <CardHeader title="Conselho profissional" />
                  <CardBody>
                    <DescriptionList columns={2} items={[{ label: "Especialidade", value: prof.specialty }, { label: "Registro", value: prof.council }]} />
                  </CardBody>
                </Card>
                <Card>
                  <CardHeader title="Assinatura digital" description="Usada em laudos, atestados e prescrições emitidos pelo sistema." />
                  <CardBody>
                    <Switch checked={signature} onChange={(v) => { setSignature(v); notify(v ? "Assinatura digital habilitada." : "Assinatura digital desabilitada."); }} label="Assinatura digital habilitada" description={signature ? "Certificado configurado e válido." : "Nenhum certificado configurado."} />
                  </CardBody>
                </Card>
              </div>
            );
          }

          if (active === 1) {
            return (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
                <Card>
                  <CardHeader
                    title="Agenda semanal"
                    description="Dias e horários em que o profissional atende."
                    actions={
                      <div className="flex items-center gap-2">
                        <Select wrapperClassName="w-48" value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} placeholder="Copiar de outro profissional" options={professionals.filter((p) => p.id !== prof.id).map((p) => ({ value: p.id, label: p.name }))} />
                        <Button variant="secondary" size="sm" icon={Copy} onClick={copySchedule} disabled={!copyFrom}>
                          Copiar
                        </Button>
                      </div>
                    }
                  />
                  <CardBody className="flex flex-col gap-5">
                    {schedule.map((day, dayIndex) => (
                      <div key={WEEKDAYS[dayIndex]} className="flex flex-col gap-3 border-b border-border pb-5 last:border-0 last:pb-0">
                        <Switch checked={day.enabled} onChange={(v) => updateDay(dayIndex, { enabled: v, blocks: v && day.blocks.length === 0 ? [{ start: "08:00", end: "18:00", slotMin: prof.slotMin, maxEncaixes: 2 }] : day.blocks })} label={WEEKDAYS[dayIndex]} />
                        {day.enabled && (
                          <div className="flex flex-col gap-3 pl-1">
                            {day.blocks.map((block, blockIndex) => (
                              <div key={blockIndex} className="flex flex-wrap items-end gap-2 rounded-lg bg-surface p-3">
                                <Input label="Início" type="time" value={block.start} onChange={(e) => updateBlock(dayIndex, blockIndex, { start: e.target.value })} wrapperClassName="w-28" />
                                <Input label="Fim" type="time" value={block.end} onChange={(e) => updateBlock(dayIndex, blockIndex, { end: e.target.value })} wrapperClassName="w-28" />
                                <Input label="Duração do slot" type="number" min={5} step={5} suffix="min" value={block.slotMin} onChange={(e) => updateBlock(dayIndex, blockIndex, { slotMin: Number(e.target.value) || block.slotMin })} wrapperClassName="w-32" />
                                <Input label="Máx. encaixes/dia" type="number" min={0} value={block.maxEncaixes} onChange={(e) => updateBlock(dayIndex, blockIndex, { maxEncaixes: Number(e.target.value) || 0 })} wrapperClassName="w-36" />
                                {day.blocks.length > 1 && (
                                  <Button variant="ghost" size="sm" iconOnly icon={CloseCircle} aria-label="Remover horário" onClick={() => removeBlock(dayIndex, blockIndex)} />
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
                  </CardBody>
                </Card>
                <Card className="h-fit">
                  <CardHeader title="Capacidade semanal" />
                  <CardBody className="flex flex-col gap-4">
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
                  </CardBody>
                </Card>
              </div>
            );
          }

          if (active === 2) {
            return (
              <Card>
                <CardHeader title="Procedimentos e valores" description="Procedimentos que este profissional realiza e o valor particular cobrado." />
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
              </Card>
            );
          }

          if (active === 3) {
            return (
              <Card>
                <CardHeader title="Convênios aceitos" description="Convênios em que este profissional atende." actions={<Button size="sm" variant="primary" onClick={() => notify("Convênios atualizados.")}>Salvar alterações</Button>} />
                <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                </CardBody>
              </Card>
            );
          }

          if (active === 4) {
            return (
              <div className="flex flex-col gap-6">
                <Card>
                  <CardHeader title="Regra padrão de repasse" actions={<Button size="sm" variant="primary" onClick={() => notify("Regra de repasse salva.")}>Salvar</Button>} />
                  <CardBody>
                    <FormSection title="Modelo" description="Como calcular o repasse deste profissional por padrão.">
                      <div className="flex items-center gap-6">
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
                  </CardBody>
                </Card>
                {repasseInit && repasseInit.overrides.length > 0 && (
                  <Card>
                    <CardHeader title="Exceções por procedimento" description="Procedimentos com regra de repasse diferente da padrão." />
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
                  </Card>
                )}
              </div>
            );
          }

          return (
            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader title="Usuário vinculado" />
                <CardBody className="flex flex-col gap-4">
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
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Permissões do perfil" description="Permissões padrão do perfil “Profissional de saúde” — para alterar, edite o perfil em Funcionários e usuários." />
                <Table>
                  <THead>
                    <tr>
                      <TH>Módulo</TH>
                      <TH align="center">Ver</TH>
                      <TH align="center">Criar</TH>
                      <TH align="center">Editar</TH>
                      <TH align="center">Excluir</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {PERMISSION_MODULES.map((mod) => {
                      const p = PROFILE_PERMISSIONS.profissional[mod];
                      return (
                        <TR key={mod}>
                          <TD>{mod}</TD>
                          {(["ver", "criar", "editar", "excluir"] as const).map((k) => (
                            <TD key={k} align="center">
                              {p[k] ? <TickCircle size={16} aria-hidden className="mx-auto text-success" /> : <CloseCircle size={16} aria-hidden className="mx-auto text-text-subtle" />}
                            </TD>
                          ))}
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              </Card>
            </div>
          );
        }}
      </Tabs>
    </div>
  );
}
