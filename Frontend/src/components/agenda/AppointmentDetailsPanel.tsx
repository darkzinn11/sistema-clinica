import { Calendar, Clock, CloseCircle, DocumentText, Health, Location, TickCircle } from "iconsax-reactjs";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { brl, dateShort } from "@/lib/format";
import {
  insuranceName,
  locationName,
  patientById,
  procedureById,
  professionalById,
  type Appointment,
} from "@/lib/mock/core";

interface Props {
  appointment: Appointment;
  onClose: () => void;
  onManage: () => void;
  onCheckIn: () => void;
}

/** Painel contextual integrado à grade, sem bloquear o calendário. */
export function AppointmentDetailsPanel({ appointment, onClose, onManage, onCheckIn }: Props) {
  const patient = patientById(appointment.patientId);
  const professional = professionalById(appointment.professionalId);
  const procedure = procedureById(appointment.procedureId);
  const canCheckIn = appointment.status === "confirmado" || appointment.status === "nao_confirmado";
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
          <Avatar name={patient?.name ?? "Paciente"} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold leading-snug text-text">{patient?.name ?? "Paciente"}</p>
            <p className="mt-1 text-xs text-text-muted">{patient?.phone ?? "Telefone não informado"}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {appointment.isRetorno && <Badge tone="info" size="sm">Retorno</Badge>}
              {appointment.isEncaixe && <Badge tone="warning" size="sm">Encaixe</Badge>}
              {appointment.isFirstVisit && <Badge tone="accent" size="sm">Primeira consulta</Badge>}
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-surface px-4 py-3">
          <p className="mb-1.5 text-xs text-text-muted">Procedimento</p>
          <p className="text-sm font-semibold text-text">{procedure?.name ?? "Atendimento"}</p>
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
          <div>
            <div className="flex items-center gap-1.5 text-xs text-text-muted"><Location size={14} aria-hidden /> Local</div>
            <p className="mt-1 text-sm font-medium text-text">{locationName(appointment.locationId)}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Convênio</p>
            <p className="mt-1 text-sm font-medium text-text">{insuranceName(appointment.insuranceId)}</p>
          </div>
        </div>

        {patient?.alerts && patient.alerts.length > 0 && (
          <div className="rounded-lg bg-danger-bg px-3 py-2.5 text-xs text-danger">
            <strong>Alertas clínicos:</strong> {patient.alerts.join(" · ")}
          </div>
        )}

        {appointment.notes && (
          <div className="border-t border-border pt-4">
            <p className="text-xs font-semibold text-text-muted">Observações</p>
            <p className="mt-1.5 text-sm leading-relaxed text-text">{appointment.notes}</p>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="text-sm text-text-muted">Valor previsto</span>
          <span className="text-lg font-semibold tabular text-text">{brl(appointment.priceCents)}</span>
        </div>

        <div className="flex flex-col gap-2">
          {canCheckIn && (
            <Button variant="primary" icon={TickCircle} className="w-full" onClick={onCheckIn}>
              Confirmar chegada
            </Button>
          )}
          <Button variant={canCheckIn ? "secondary" : "primary"} className="w-full" onClick={onManage}>
            Gerenciar agendamento
          </Button>
          <ButtonLink to={"/pacientes/" + appointment.patientId} icon={DocumentText} className="w-full" variant="ghost">
            Abrir prontuário
          </ButtonLink>
          {appointment.status === "aguardando" && (
            <ButtonLink to={"/atendimento/" + appointment.id} icon={Health} className="w-full" variant="ghost">
              Iniciar atendimento
            </ButtonLink>
          )}
        </div>
      </div>
    </section>
  );
}
