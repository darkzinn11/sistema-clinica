import { Add, MessageText, TickCircle } from "iconsax-reactjs";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/input";
import { Meter, Skeleton } from "@/components/ui/misc";
import { Modal } from "@/components/ui/overlay";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { WhatsappIcon } from "@/components/ui/whatsapp-icon";
import { ApiError } from "@/lib/api/client";
import { useAgendaItems, useChangeStatus } from "@/lib/api/agenda";
import { toAppointment, type AgendaAppointment } from "@/lib/agenda/model";
import { todayIso } from "@/lib/agenda/time";
import { addDaysIso, dateLong } from "@/lib/format";

const VARIABLES = ["{paciente}", "{data}", "{hora}", "{profissional}"];
const DEFAULT_TEMPLATE = "Olá, {paciente}! Passando para confirmar sua consulta com {profissional} em {data}, às {hora}. Pode confirmar sua presença?";
const TEMPLATE_KEY = "multisaude.modeloConfirmacao";

function loadTemplate(): string {
  try { return localStorage.getItem(TEMPLATE_KEY) || DEFAULT_TEMPLATE; } catch { return DEFAULT_TEMPLATE; }
}

function fill(template: string, a: AgendaAppointment): string {
  return template
    .replaceAll("{paciente}", a.patientName.split(" ")[0])
    .replaceAll("{data}", dateLong(a.date))
    .replaceAll("{hora}", a.start)
    .replaceAll("{profissional}", a.professionalName);
}

/** Abre a conversa no WhatsApp com a mensagem pronta (não há envio automático: quem clica envia). */
function whatsappLink(phone: string | null, text: string): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  const full = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}

const CONFIRMED = ["confirmado", "check_in", "em_atendimento", "atendido"];

export default function Page() {
  const today = todayIso();
  const days = [addDaysIso(today, 1), addDaysIso(today, 2)];
  const items = useAgendaItems(days[0], days[1]);
  const changeStatus = useChangeStatus();
  const [templateOpen, setTemplateOpen] = useState(false);
  const [template, setTemplate] = useState(loadTemplate);
  const [error, setError] = useState<string | null>(null);
  const appointments = useMemo(
    () => (items.data ?? []).map(toAppointment).filter((a) => a.backendStatus !== "cancelado" && a.backendStatus !== "remarcado"),
    [items.data],
  );

  function confirm(a: AgendaAppointment) {
    setError(null);
    changeStatus.mutateAsync({ id: a.id, status: "confirmado", versao: a.version })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Não foi possível confirmar."));
  }

  function saveTemplate() {
    try { localStorage.setItem(TEMPLATE_KEY, template); } catch { /* sem armazenamento: vale nesta sessão */ }
    setTemplateOpen(false);
  }

  const sample = appointments[0];
  const preview = sample ? fill(template, sample) : template;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Confirmações"
        breadcrumbs={[{ label: "Agenda", href: "/agenda" }, { label: "Confirmações" }]}
        description="Agendamentos de amanhã e depois de amanhã. Chame o paciente pelo WhatsApp e confirme aqui."
        actions={
          <Button variant="secondary" icon={MessageText} onClick={() => setTemplateOpen(true)}>
            Modelo de mensagem
          </Button>
        }
      />

      {error && <p role="alert" className="mb-4 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>}

      {items.isPending ? (
        <Skeleton className="h-96 w-full" />
      ) : items.isError ? (
        <Card><EmptyState title="Não foi possível carregar os agendamentos." description={items.error.message} /></Card>
      ) : (
        <div className="flex flex-col gap-5">
          {days.map((day) => {
            const appts = appointments.filter((a) => a.date === day);
            const confirmed = appts.filter((a) => CONFIRMED.includes(a.backendStatus)).length;
            const pct = appts.length ? Math.round((confirmed / appts.length) * 100) : 0;
            return (
              <Card key={day}>
                <CardHeader
                  title={dateLong(day)}
                  description={`${appts.length} agendamentos`}
                  actions={<div className="w-44"><Meter value={pct} label="Confirmados" showValue={`${pct}%`} tone={pct >= 70 ? "success" : pct >= 40 ? "warning" : "danger"} /></div>}
                />
                {appts.length === 0 ? (
                  <EmptyState title="Nenhum agendamento neste dia" compact className="py-6" />
                ) : (
                  <Table>
                    <THead>
                      <TR>
                        <TH>Horário</TH>
                        <TH>Paciente</TH>
                        <TH>Telefone</TH>
                        <TH>Profissional</TH>
                        <TH>Procedimento</TH>
                        <TH>Situação</TH>
                        <TH align="right">Ação</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {appts.map((a) => {
                        const link = whatsappLink(a.patientPhone, fill(template, a));
                        const needsConfirmation = a.backendStatus === "agendado";
                        return (
                          <TR key={a.id}>
                            <TD className="tabular">{a.start}</TD>
                            <TD>{a.patientName}</TD>
                            <TD className="tabular text-text-muted">{a.patientPhone ?? "—"}</TD>
                            <TD className="text-text-muted">{a.professionalName}</TD>
                            <TD className="text-text-muted">{a.procedureName}</TD>
                            <TD><StatusBadge status={a.status} size="sm" /></TD>
                            <TD align="right">
                              <span className="inline-flex items-center gap-1.5">
                                {link ? (
                                  <a href={link} target="_blank" rel="noopener noreferrer" className="ui-button inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-text hover:bg-accent-muted">
                                    <WhatsappIcon size={15} aria-hidden /> WhatsApp
                                  </a>
                                ) : (
                                  <Badge tone="neutral" size="sm">Sem telefone</Badge>
                                )}
                                {needsConfirmation && (
                                  <Button size="sm" variant="primary" icon={TickCircle} disabled={changeStatus.isPending} onClick={() => confirm(a)}>
                                    Confirmar
                                  </Button>
                                )}
                              </span>
                            </TD>
                          </TR>
                        );
                      })}
                    </TBody>
                  </Table>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={templateOpen}
        onClose={() => setTemplateOpen(false)}
        title="Modelo de mensagem"
        description="Use as variáveis para personalizar. O modelo fica salvo neste navegador."
        size="md"
        footer={
          <Button variant="primary" size="sm" onClick={saveTemplate}>
            Salvar modelo
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <Textarea label="Mensagem" value={template} onChange={(e) => setTemplate(e.target.value)} rows={5} />
          <div className="flex flex-wrap gap-1.5">
            {VARIABLES.map((v) => (
              <button key={v} type="button" onClick={() => setTemplate((t) => `${t} ${v}`.trim())} className="h-7 rounded-full border border-border-strong bg-surface px-3 text-xs font-medium text-text-muted hover:text-text">
                <Add size={16} variant="Linear" className="mr-1 inline" aria-hidden />
                {v}
              </button>
            ))}
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-text">Pré-visualização</p>
            <div className="mx-auto max-w-[260px] rounded-lg border border-border bg-surface p-3">
              <div className="rounded-lg rounded-tl-sm bg-success-bg px-3 py-2 text-sm text-text shadow-card">{preview}</div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
