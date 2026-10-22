import { Clock, Danger, ProfileCircle, Warning2 } from "iconsax-reactjs";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import type { AgendaAppointment } from "@/lib/agenda/model";
import { nowMin, toMin } from "@/lib/agenda/time";

const WAIT_ICON = { neutral: Clock, warning: Warning2, danger: Danger } as const;
const WAIT_TEXT = { neutral: "text-text-muted", warning: "text-warning", danger: "text-danger" } as const;

function waitTone(minutes: number): keyof typeof WAIT_ICON {
  return minutes > 20 ? "danger" : minutes > 10 ? "warning" : "neutral";
}

export function WaitCard({ appointment }: { appointment: AgendaAppointment }) {
  const [currentMinute, setCurrentMinute] = useState(nowMin);
  useEffect(() => {
    const timer = window.setInterval(() => setCurrentMinute(nowMin()), 10_000);
    return () => window.clearInterval(timer);
  }, []);

  const wait = appointment.arrivedAt ? Math.max(0, currentMinute - toMin(appointment.arrivedAt)) : 0;
  const tone = waitTone(wait);
  const WaitIcon = WAIT_ICON[tone];
  const isWaiting = appointment.backendStatus === "check_in";

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-surface-raised p-3.5 shadow-card">
      <div className="flex items-start gap-3">
        <Avatar name={appointment.patientName} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-medium text-text">{appointment.patientName}</p>
          <p className="text-sm text-text-muted">{appointment.professionalName}</p>
        </div>
        <span aria-hidden className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: appointment.professionalId ? "var(--c-series-1)" : "var(--c-border)" }} />
      </div>
      <p className="truncate text-sm text-text-muted">
        {appointment.procedureName} <span className="text-text-subtle">· marcado para {appointment.start}</span>
      </p>
      <p className="text-sm text-text-muted">Chegou às <span className="font-medium text-text">{appointment.arrivedAt ?? "—"}</span></p>
      {isWaiting && appointment.arrivedAt ? (
        <p className={`flex items-center gap-1.5 text-sm font-medium ${WAIT_TEXT[tone]}`}><WaitIcon size={15} aria-hidden /> Esperando há {wait} min</p>
      ) : appointment.backendStatus === "atendido" ? (
        <p className="flex items-center gap-1.5 text-sm text-text-muted"><Clock size={15} aria-hidden /> Atendimento finalizado</p>
      ) : (
        <Badge tone="info" size="sm">Em atendimento</Badge>
      )}
      <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
        <ButtonLink size="sm" variant="ghost" icon={ProfileCircle} to={`/pacientes/${appointment.patientId}`}>Ficha</ButtonLink>
        <ButtonLink size="sm" variant="ghost" to={`/agenda?data=${appointment.date}`}>Ver na agenda</ButtonLink>
      </div>
    </div>
  );
}
