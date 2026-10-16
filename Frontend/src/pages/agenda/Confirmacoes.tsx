import { Add, MessageText, Send2 } from "iconsax-reactjs";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Checkbox, Select, Textarea } from "@/components/ui/input";
import { Meter } from "@/components/ui/misc";
import { Drawer } from "@/components/ui/overlay";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { addDaysIso, dateLong } from "@/lib/format";
import { DEFAULT_TEMPLATE, MESSAGE_STATUS, type MessageStatus, initialMessageStatus } from "@/lib/mock/agenda";
import { appointmentsOn, patientById, procedureById, professionalById, TODAY } from "@/lib/mock/core";

const VARIABLES = ["{paciente}", "{data}", "{hora}", "{profissional}"];
const CHANNELS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "sms", label: "SMS" },
  { value: "email", label: "E-mail" },
];

export default function Page() {
  const days = [addDaysIso(TODAY, 1), addDaysIso(TODAY, 2)];
  const [statuses, setStatuses] = useState<Record<string, MessageStatus>>(() => {
    const map: Record<string, MessageStatus> = {};
    for (const d of days) for (const a of appointmentsOn(d)) map[a.id] = initialMessageStatus(a);
    return map;
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [channel, setChannel] = useState("whatsapp");
  const [templateOpen, setTemplateOpen] = useState(false);
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function sendSelected() {
    setStatuses((prev) => {
      const next = { ...prev };
      for (const id of selected) next[id] = "enviado";
      return next;
    });
    setSelected(new Set());
  }

  function insertVariable(v: string) {
    setTemplate((t) => `${t} ${v}`.trim());
  }

  const sample = appointmentsOn(days[0])[0];
  const previewText = sample
    ? template
        .replace("{paciente}", patientById(sample.patientId)?.name.split(" ")[0] ?? "Paciente")
        .replace("{data}", dateLong(sample.date))
        .replace("{hora}", sample.start)
        .replace("{profissional}", professionalById(sample.professionalId)?.name ?? "")
    : template;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Confirmações"
        breadcrumbs={[{ label: "Agenda", href: "/agenda" }, { label: "Confirmações" }]}
        description="Confirmação dos agendamentos dos próximos dois dias."
        actions={
          <Button variant="secondary" icon={MessageText} onClick={() => setTemplateOpen(true)}>
            Modelo de mensagem
          </Button>
        }
      />

      <div className="flex flex-col gap-5">
        {days.map((day) => {
          const appts = appointmentsOn(day).sort((a, b) => a.start.localeCompare(b.start));
          const confirmedCount = appts.filter((a) => statuses[a.id] === "confirmado").length;
          const pct = appts.length ? Math.round((confirmedCount / appts.length) * 100) : 0;
          return (
            <Card key={day}>
              <CardHeader
                title={dateLong(day)}
                description={`${appts.length} agendamentos`}
                actions={<div className="w-44"><Meter value={pct} label="Confirmados" showValue={`${pct}%`} tone={pct >= 70 ? "success" : pct >= 40 ? "warning" : "danger"} /></div>}
              />
              <CardBody className="flex items-center justify-between gap-3 border-b border-border py-3">
                <Select value={channel} onChange={(e) => setChannel(e.target.value)} options={CHANNELS} wrapperClassName="w-40" aria-label="Canal de envio" />
                <Button
                  size="sm"
                  icon={Send2}
                  disabled={selected.size === 0}
                  onClick={sendSelected}
                >
                  Enviar confirmação ({selected.size})
                </Button>
              </CardBody>
              <Table>
                <THead>
                  <TR>
                    <TH />
                    <TH>Horário</TH>
                    <TH>Paciente</TH>
                    <TH>Profissional</TH>
                    <TH>Procedimento</TH>
                    <TH>Status da mensagem</TH>
                  </TR>
                </THead>
                <TBody>
                  {appts.map((a) => {
                    const patient = patientById(a.patientId);
                    const status = statuses[a.id];
                    const info = MESSAGE_STATUS[status];
                    return (
                      <TR key={a.id}>
                        <TD>
                          <Checkbox label="" aria-label={`Selecionar ${patient?.name}`} checked={selected.has(a.id)} onChange={() => toggle(a.id)} />
                        </TD>
                        <TD className="tabular">{a.start}</TD>
                        <TD>{patient?.name}</TD>
                        <TD className="text-text-muted">{professionalById(a.professionalId)?.name}</TD>
                        <TD className="text-text-muted">{procedureById(a.procedureId)?.name}</TD>
                        <TD>
                          <Badge tone={info.tone} dot size="sm">{info.label}</Badge>
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </Card>
          );
        })}
      </div>

      <Drawer
        open={templateOpen}
        onClose={() => setTemplateOpen(false)}
        title="Modelo de mensagem"
        description="Editável — use as variáveis para personalizar automaticamente."
        width="md"
        footer={
          <Button variant="primary" size="sm" onClick={() => setTemplateOpen(false)}>
            Salvar modelo
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <Textarea label="Mensagem" value={template} onChange={(e) => setTemplate(e.target.value)} rows={5} />
          <div className="flex flex-wrap gap-1.5">
            {VARIABLES.map((v) => (
              <button key={v} type="button" onClick={() => insertVariable(v)} className="h-7 rounded-full border border-border-strong bg-surface px-3 text-xs font-medium text-text-muted hover:text-text">
                <Add size={16} variant="Linear" className="mr-1 inline" aria-hidden />
                {v}
              </button>
            ))}
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-text">Pré-visualização</p>
            <div className="mx-auto max-w-[260px] rounded-lg border border-border bg-surface p-3">
              <div className="rounded-lg rounded-tl-sm bg-success-bg px-3 py-2 text-sm text-text shadow-card">{previewText}</div>
            </div>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
