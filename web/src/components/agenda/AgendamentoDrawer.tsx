import {
  CalendarEdit,
  CloseCircle,
  DocumentText,
  Flash,
  Health,
  Refresh2,
  TickCircle,
  UserAdd,
  Warning2,
  Whatsapp,
} from "iconsax-reactjs";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { DescriptionList } from "@/components/ui/misc";
import { Drawer, Modal } from "@/components/ui/overlay";
import { Select } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { age, brl, dateLong } from "@/lib/format";
import { findPatient, freeSlots, hm, toMin } from "@/lib/mock/agenda";
import { newAppointmentId } from "@/components/agenda/store";
import {
  NOW_TIME,
  insuranceName,
  locationName,
  professionalById,
  procedureById,
  type Appointment,
} from "@/lib/mock/core";
import { APPOINTMENT_STATUS, type AppointmentStatus } from "@/lib/status";

const CANCEL_REASONS: { value: AppointmentStatus; label: string }[] = [
  { value: "desmarcado_pelo_paciente", label: "Desmarcado pelo paciente" },
  { value: "cancelado_pelo_profissional", label: "Cancelado pela clínica" },
];

/**
 * Painel de detalhe de um agendamento — reaproveitado pela Agenda do dia, Por
 * sala e Semana. Todas as ações alteram apenas o estado local do protótipo.
 */
export function AgendamentoDrawer({
  appointment,
  onClose,
  update,
  add,
  apptsOn,
}: {
  appointment: Appointment | null;
  onClose: () => void;
  update: (id: string, patch: Partial<Appointment>) => void;
  add: (list: Appointment[]) => void;
  apptsOn: (date: string) => Appointment[];
}) {
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState<AppointmentStatus>("desmarcado_pelo_paciente");
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [repeated, setRepeated] = useState<string | null>(null);
  const [prevId, setPrevId] = useState<string | null>(appointment?.id ?? null);

  if (prevId !== (appointment?.id ?? null)) {
    setPrevId(appointment?.id ?? null);
    setRescheduling(false);
    setCancelOpen(false);
    setWhatsappSent(false);
    setRepeated(null);
    setRescheduleDate(appointment?.date ?? "");
    setRescheduleTime("");
  }

  if (!appointment) {
    return (
      <Drawer open={false} onClose={onClose} title="Agendamento">
        {null}
      </Drawer>
    );
  }

  const patient = findPatient(appointment.patientId);
  const professional = professionalById(appointment.professionalId);
  const proc = procedureById(appointment.procedureId);
  const canCheckIn = appointment.status === "confirmado" || appointment.status === "nao_confirmado";
  const canCancel = !["cancelado_pelo_profissional", "desmarcado_pelo_paciente", "nao_compareceu", "atendido"].includes(appointment.status);
  const slotMin = professional?.slotMin ?? 20;
  const rescheduleSlots = professional && rescheduleDate ? freeSlots(professional, rescheduleDate, apptsOn(rescheduleDate)) : [];

  function confirmReschedule() {
    if (!professional || !rescheduleTime || !appointment) return;
    const start = rescheduleTime;
    const end = hm(toMin(start) + slotMin);
    update(appointment.id, { status: "remarcado" });
    add([{ ...appointment, id: newAppointmentId(), date: rescheduleDate, start, end, status: "confirmado", arrivedAt: undefined }]);
    setRescheduling(false);
    onClose();
  }

  function repeatNextWeek() {
    if (!appointment) return;
    const nextIso = new Date(`${appointment.date}T12:00:00Z`);
    nextIso.setUTCDate(nextIso.getUTCDate() + 7);
    const date = nextIso.toISOString().slice(0, 10);
    add([{ ...appointment, id: newAppointmentId(), date, status: "confirmado", arrivedAt: undefined }]);
    setRepeated(date);
  }

  function confirmCancel() {
    if (!appointment) return;
    update(appointment.id, { status: cancelReason });
    setCancelOpen(false);
    onClose();
  }

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        title="Agendamento"
        description={`${dateLong(appointment.date)} às ${appointment.start}`}
        width="md"
        footer={
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <Button variant="danger" size="sm" icon={CloseCircle} disabled={!canCancel} onClick={() => setCancelOpen(true)}>
              Cancelar
            </Button>
            <Button variant="secondary" size="sm" icon={Refresh2} onClick={repeatNextWeek}>
              Repetir
            </Button>
            <Button variant="secondary" size="sm" icon={CalendarEdit} onClick={() => setRescheduling((v) => !v)}>
              Remarcar
            </Button>
            {canCheckIn && (
              <Button
                variant="primary"
                size="sm"
                icon={TickCircle}
                onClick={() => {
                  update(appointment.id, { status: "aguardando", arrivedAt: NOW_TIME });
                  onClose();
                }}
              >
                Fazer check-in
              </Button>
            )}
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          {patient && patient.alerts.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-bg px-3 py-2.5 text-sm text-danger">
              <Warning2 size={18} aria-hidden className="mt-0.5 shrink-0" variant="Bold" />
              <div>
                <p className="font-semibold">Alerta clínico</p>
                <p>{patient.alerts.join(" · ")}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Avatar name={patient?.name ?? "Paciente"} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold text-text">{patient?.name ?? "Paciente não encontrado"}</p>
              <p className="text-sm text-text-muted">
                {patient ? `${age(patient.birthDate, appointment.date)} anos · ${patient.phone}` : "—"}
              </p>
            </div>
            <StatusBadge status={appointment.status} />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {appointment.isEncaixe && <Badge tone="warning" icon={Flash}>Encaixe</Badge>}
            {appointment.isRetorno && <Badge tone="info" icon={Refresh2}>Retorno</Badge>}
            {appointment.isFirstVisit && <Badge tone="accent" icon={UserAdd}>1ª consulta</Badge>}
          </div>

          <DescriptionList
            columns={2}
            items={[
              { label: "Profissional", value: professional?.name },
              { label: "Especialidade", value: professional?.specialty },
              { label: "Procedimento", value: proc?.name },
              { label: "Duração", value: proc ? `${proc.durationMin} min` : undefined },
              { label: "Local", value: locationName(appointment.locationId) },
              { label: "Convênio", value: insuranceName(appointment.insuranceId) },
              { label: "Valor", value: brl(appointment.priceCents) },
              { label: "Observações", value: appointment.notes },
            ]}
          />

          <Select
            label="Alterar status"
            value={appointment.status}
            onChange={(e) => update(appointment.id, { status: e.target.value as AppointmentStatus })}
            options={Object.entries(APPOINTMENT_STATUS).map(([value, s]) => ({ value, label: s.label }))}
          />

          {rescheduling && professional && (
            <div className="flex flex-col gap-3 rounded-lg bg-surface px-3 py-3">
              <p className="text-sm font-medium text-text">Novo horário</p>
              <div className="flex flex-wrap gap-2">
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => {
                    setRescheduleDate(e.target.value);
                    setRescheduleTime("");
                  }}
                  className="h-9 rounded-md border border-border-strong bg-surface-raised px-3 text-base text-text"
                  aria-label="Nova data"
                />
              </div>
              {rescheduleSlots.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {rescheduleSlots.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setRescheduleTime(t)}
                      className={`h-8 rounded-md border px-2.5 text-sm tabular transition-colors ${t === rescheduleTime ? "border-accent bg-accent-muted text-accent" : "border-border-strong bg-surface-raised text-text-muted hover:text-text"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted">Sem horários livres nesta data.</p>
              )}
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setRescheduling(false)}>
                  Voltar
                </Button>
                <Button size="sm" variant="primary" disabled={!rescheduleTime} onClick={confirmReschedule}>
                  Confirmar remarcação
                </Button>
              </div>
            </div>
          )}

          {repeated && (
            <p className="rounded-md bg-success-bg px-3 py-2 text-sm text-success">Agendamento repetido para {dateLong(repeated)}.</p>
          )}

          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <ButtonLink to={`/pacientes/${appointment.patientId}`} variant="secondary" size="sm" icon={DocumentText}>
              Abrir prontuário
            </ButtonLink>
            <ButtonLink to={`/atendimento/${appointment.id}`} variant="secondary" size="sm" icon={Health}>
              Iniciar atendimento
            </ButtonLink>
            <Button
              variant={whatsappSent ? "subtle" : "secondary"}
              size="sm"
              icon={whatsappSent ? TickCircle : Whatsapp}
              disabled={whatsappSent}
              onClick={() => setWhatsappSent(true)}
            >
              {whatsappSent ? "Confirmação enviada" : "Enviar confirmação por WhatsApp"}
            </Button>
          </div>
        </div>
      </Drawer>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancelar agendamento"
        description="Essa ação muda o status do agendamento. O horário fica livre na agenda."
        icon={CloseCircle}
        tone="danger"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setCancelOpen(false)}>
              Voltar
            </Button>
            <Button variant="danger" size="sm" onClick={confirmCancel}>
              Confirmar cancelamento
            </Button>
          </>
        }
      >
        <Select
          label="Motivo"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value as AppointmentStatus)}
          options={CANCEL_REASONS}
        />
      </Modal>
    </>
  );
}
