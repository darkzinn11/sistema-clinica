import { Calendar, Clock, CloseCircle, DocumentText, Health, TickCircle } from "iconsax-reactjs";
import { Avatar } from "@/components/ui/avatar";
import { Button, ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { brl, dateShort } from "@/lib/format";
import { useCatalog } from "@/lib/agenda/provider";
import type { AgendaAppointment as Appointment } from "@/lib/agenda/model";

interface Props {
  appointment: Appointment;
  onClose: () => void;
  onManage: () => void;
  onCheckIn: () => void;
  checkingIn?: boolean;
}

/** Painel contextual integrado à grade, sem bloquear o calendário. */
export function AppointmentDetailsPanel({ appointment, onClose, onManage, onCheckIn, checkingIn = false }: Props) {
  const { professionalById } = useCatalog();
  const professional = professionalById(appointment.professionalId);
  const canCheckIn = appointment.backendStatus === "agendado" || appointment.backendStatus === "confirmado";
  return (
    <section className="ms-agenda-panel flex flex-col overflow-hidden rounded-xl bg-surface-raised shadow-card" aria-label="Detalhes do agendamento">
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        {/* flex-wrap: status longos ("Desmarcado pelo paciente") descem para a linha de baixo em vez de vazar do painel. */}
        <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5 pt-1">
          <h2 className="font-display text-base font-semibold text-text">Agendamento</h2>
          <StatusBadge status={appointment.status} size="sm" />
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar detalhes" className="ui-topbar-control flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-muted hover:text-text">
          <CloseCircle size={18} aria-hidden />
        </button>
      </div>

      <div className="flex flex-col gap-5 p-5">
        <div className="flex items-start gap-3">
          <Avatar name={appointment.patientName} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold leading-snug text-text">{appointment.patientName}</p>
            <p className="mt-1 text-xs text-text-muted">{appointment.patientPhone ?? "Telefone não informado"}</p>
          </div>
        </div>

        <div className="rounded-lg bg-surface px-4 py-3">
          <p className="mb-1.5 text-xs text-text-muted">Procedimento</p>
          <p className="text-sm font-semibold text-text">{appointment.procedureName}</p>
          <p className="mt-1 text-xs text-text-muted">{professional?.name} · {professional?.specialty}</p>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-text-muted"><Calendar size={14} aria-hidden /> Data</div>
            <p className="mt-1 text-sm font-medium text-text">{dateShort(appointment.date)}</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-text-muted"><Clock size={14} aria-hidden /> Horário</div>
            <p className="mt-1 text-sm font-medium text-text">{appointment.start} – {appointment.end}</p>
          </div>
        </div>

        {appointment.notes && (
          <div className="border-t border-border pt-4">
            <p className="text-xs font-semibold text-text-muted">Observações</p>
            <p className="mt-1.5 text-sm leading-relaxed text-text">{appointment.notes}</p>
          </div>
        )}

        {appointment.priceCents !== null && (
          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="text-sm text-text-muted">Valor previsto</span>
            <span className="text-lg font-semibold tabular text-text">{brl(appointment.priceCents)}</span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {canCheckIn && (
            <Button variant="primary" icon={TickCircle} className="w-full" onClick={onCheckIn} loading={checkingIn}>
              Confirmar chegada
            </Button>
          )}
          <Button variant={canCheckIn ? "secondary" : "primary"} className="w-full" onClick={onManage}>
            Gerenciar agendamento
          </Button>
          <ButtonLink to={"/pacientes/" + appointment.patientId} icon={DocumentText} className="w-full" variant="ghost">
            Abrir prontuário
          </ButtonLink>
          {appointment.backendStatus === "check_in" && (
            <ButtonLink to={"/atendimento/" + appointment.id} icon={Health} className="w-full" variant="ghost">
              Iniciar atendimento
            </ButtonLink>
          )}
        </div>
      </div>
    </section>
  );
}
