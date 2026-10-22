import { CalendarEdit, CloseCircle, DocumentText, Health, Refresh2, TickCircle } from "iconsax-reactjs";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button, ButtonLink } from "@/components/ui/button";
import { DescriptionList } from "@/components/ui/misc";
import { Modal } from "@/components/ui/overlay";
import { Input, Select } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { brl, dateLong } from "@/lib/format";
import { ApiError } from "@/lib/api/client";
import {
  useAvailability, useCancelAppointment, useChangeStatus, useCreateAppointment, useMotives, useRescheduleAppointment,
} from "@/lib/api/agenda";
import { statusFromBackend, type BackendStatus } from "@/lib/api/status-map";
import { CAN_CANCEL, CAN_RESCHEDULE, NEXT_BY_RECEPTION, type AgendaAppointment } from "@/lib/agenda/model";
import { useCatalog } from "@/lib/agenda/provider";
import { clock } from "@/lib/agenda/time";
import { APPOINTMENT_STATUS } from "@/lib/status";

const message = (error: unknown) => (error instanceof ApiError ? error.message : "Não foi possível concluir a ação. Tente de novo.");

/**
 * Detalhe e ações de um agendamento: mudar status (confirmar, check-in, falta), cancelar com motivo, remarcar e repetir.
 * Tudo vai ao backend, que confere as regras de novo (a tela só oferece o que a regra permite).
 */
export function AgendamentoDrawer({ appointment, onClose }: { appointment: AgendaAppointment | null; onClose: () => void }) {
  const { professionalById, procedureById, unitId } = useCatalog();
  const motives = useMotives();
  const changeStatus = useChangeStatus();
  const cancel = useCancelAppointment();
  const reschedule = useRescheduleAppointment();
  const create = useCreateAppointment();
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleSlot, setRescheduleSlot] = useState("");
  const [motiveId, setMotiveId] = useState<number | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [note, setNote] = useState("");
  const [repeated, setRepeated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prevId, setPrevId] = useState<string | null>(appointment?.id ?? null);
  const slots = useAvailability(rescheduling ? appointment?.professionalId : undefined, appointment?.procedureId, rescheduling ? rescheduleDate : undefined);

  if (prevId !== (appointment?.id ?? null)) {
    setPrevId(appointment?.id ?? null);
    setRescheduling(false);
    setCancelOpen(false);
    setRepeated(null);
    setError(null);
    setNote("");
    setMotiveId(null);
    setRescheduleDate(appointment?.date ?? "");
    setRescheduleSlot("");
  }

  if (!appointment) {
    return (
      <Modal open={false} onClose={onClose} title="Agendamento">
        {null}
      </Modal>
    );
  }

  const professional = professionalById(appointment.professionalId);
  const procedure = procedureById(appointment.procedureId);
  const status = appointment.backendStatus;
  const canCheckIn = status === "agendado" || status === "confirmado";
  const canCancel = CAN_CANCEL.includes(status);
  const canReschedule = CAN_RESCHEDULE.includes(status);
  const nextStatuses = NEXT_BY_RECEPTION[status] ?? [];
  const chosenMotive = motiveId ?? motives.data?.[0]?.id ?? null;
  const busy = changeStatus.isPending || cancel.isPending || reschedule.isPending || create.isPending;

  function run(action: Promise<unknown>, done: () => void) {
    setError(null);
    action.then(done).catch((e) => setError(message(e)));
  }

  function setStatus(next: BackendStatus, closeAfter = false) {
    run(changeStatus.mutateAsync({ id: appointment!.id, status: next, versao: appointment!.version }), () => { if (closeAfter) onClose(); });
  }

  function confirmCancel() {
    if (chosenMotive === null) return;
    run(cancel.mutateAsync({ id: appointment!.id, versao: appointment!.version, motivoId: chosenMotive, observacao: note.trim() || undefined }), () => {
      setCancelOpen(false);
      onClose();
    });
  }

  function confirmReschedule() {
    if (!rescheduleSlot || chosenMotive === null) return;
    run(reschedule.mutateAsync({ id: appointment!.id, versao: appointment!.version, motivoId: chosenMotive, inicio: rescheduleSlot }), () => {
      setRescheduling(false);
      onClose();
    });
  }

  function repeatNextWeek() {
    const next = new Date(`${appointment!.date}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 7);
    const date = next.toISOString().slice(0, 10);
    const offset = appointment!.startIso.slice(19);
    run(create.mutateAsync({
      unidadeId: unitId, profissionalId: appointment!.professionalId, pacienteId: appointment!.patientId,
      procedimentoId: appointment!.procedureId, inicio: `${date}T${appointment!.start}:00${offset}`, canal: "clinica",
    }), () => setRepeated(date));
  }

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title="Agendamento"
        description={`${dateLong(appointment.date)} às ${appointment.start}`}
        size="md"
        footer={
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <Button variant="danger" size="sm" icon={CloseCircle} disabled={!canCancel || busy} onClick={() => setCancelOpen(true)}>
              Cancelar
            </Button>
            <Button variant="secondary" size="sm" icon={Refresh2} disabled={busy} loading={create.isPending} onClick={repeatNextWeek}>
              Repetir
            </Button>
            <Button variant="secondary" size="sm" icon={CalendarEdit} disabled={!canReschedule || busy} onClick={() => setRescheduling((v) => !v)}>
              Remarcar
            </Button>
            {canCheckIn && (
              <Button variant="primary" size="sm" icon={TickCircle} disabled={busy} loading={changeStatus.isPending} onClick={() => setStatus("check_in", true)}>
                Fazer check-in
              </Button>
            )}
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <Avatar name={appointment.patientName} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold text-text">{appointment.patientName}</p>
              <p className="text-sm text-text-muted">{appointment.patientPhone ?? "Telefone não informado"}</p>
            </div>
            <StatusBadge status={appointment.status} />
          </div>

          <DescriptionList
            columns={2}
            items={[
              { label: "Profissional", value: professional?.name ?? appointment.professionalName },
              { label: "Especialidade", value: professional?.specialty },
              { label: "Procedimento", value: appointment.procedureName },
              { label: "Duração", value: procedure?.durationMin ? `${procedure.durationMin} min` : undefined },
              { label: "Canal", value: appointment.channel },
              { label: "Valor", value: appointment.priceCents === null ? undefined : brl(appointment.priceCents) },
              { label: "Observações", value: appointment.notes ?? undefined },
            ]}
          />

          {nextStatuses.length > 0 && (
            <Select
              label="Alterar status"
              value=""
              disabled={busy}
              onChange={(e) => e.target.value && setStatus(e.target.value as BackendStatus)}
              options={[
                { value: "", label: APPOINTMENT_STATUS[appointment.status].label },
                ...nextStatuses.map((s) => ({ value: s, label: APPOINTMENT_STATUS[statusFromBackend(s)].label })),
              ]}
            />
          )}

          {rescheduling && (
            <div className="flex flex-col gap-3 rounded-lg bg-surface px-3 py-3">
              <p className="text-sm font-medium text-text">Novo horário</p>
              <Select
                label="Motivo"
                value={String(chosenMotive ?? "")}
                onChange={(e) => setMotiveId(Number(e.target.value))}
                options={(motives.data ?? []).map((m) => ({ value: String(m.id), label: m.nome }))}
              />
              <Input
                type="date"
                label="Nova data"
                value={rescheduleDate}
                onChange={(e) => {
                  setRescheduleDate(e.target.value);
                  setRescheduleSlot("");
                }}
              />
              {slots.isFetching ? (
                <p className="text-sm text-text-muted">Buscando horários livres…</p>
              ) : slots.isError ? (
                <p className="text-sm text-danger">{message(slots.error)}</p>
              ) : (slots.data ?? []).length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {(slots.data ?? []).map((s) => (
                    <button
                      key={s.inicio}
                      type="button"
                      onClick={() => setRescheduleSlot(s.inicio)}
                      className={`h-8 rounded-full border px-3 text-sm tabular transition-colors ${s.inicio === rescheduleSlot ? "border-accent bg-accent-muted text-accent" : "border-border-strong bg-surface-raised text-text hover:bg-accent-muted"}`}
                    >
                      {clock(s.inicio)}
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
                <Button size="sm" variant="primary" disabled={!rescheduleSlot || busy} loading={reschedule.isPending} onClick={confirmReschedule}>
                  Confirmar remarcação
                </Button>
              </div>
            </div>
          )}

          {repeated && (
            <p className="rounded-lg bg-success-bg px-3 py-2 text-sm text-success">Agendamento repetido para {dateLong(repeated)}.</p>
          )}
          {error && <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>}

          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <ButtonLink to={`/pacientes/${appointment.patientId}`} variant="secondary" size="sm" icon={DocumentText}>
              Abrir prontuário
            </ButtonLink>
            {status === "check_in" && (
              <ButtonLink to={`/atendimento/${appointment.id}`} variant="secondary" size="sm" icon={Health}>
                Iniciar atendimento
              </ButtonLink>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancelar agendamento"
        description="O horário volta a ficar livre na agenda. O motivo fica registrado."
        icon={CloseCircle}
        tone="danger"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setCancelOpen(false)}>
              Voltar
            </Button>
            <Button variant="danger" size="sm" disabled={busy || chosenMotive === null} loading={cancel.isPending} onClick={confirmCancel}>
              Confirmar cancelamento
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Select
            label="Motivo"
            value={String(chosenMotive ?? "")}
            onChange={(e) => setMotiveId(Number(e.target.value))}
            options={(motives.data ?? []).map((m) => ({ value: String(m.id), label: m.nome }))}
          />
          <Input label="Observação (opcional)" value={note} onChange={(e) => setNote(e.target.value)} />
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        </div>
      </Modal>
    </>
  );
}
