import { Clock, Danger, DirectSend, ProfileCircle, Warning2 } from "iconsax-reactjs";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { age } from "@/lib/format";
import type { Appointment } from "@/lib/mock/core";
import { TODAY, patientById, procedureById, professionalById } from "@/lib/mock/core";
import { TRIAGE_RISK, priorityFlags, triageFor, waitMinutes, waitTone } from "@/lib/mock/recepcao";

const WAIT_ICON = { neutral: Clock, warning: Warning2, danger: Danger } as const;
const WAIT_TEXT = { neutral: "text-text-muted", warning: "text-warning", danger: "text-danger" } as const;

export function WaitCard({
  appointment,
  onChamar,
  onEncaminhar,
}: {
  appointment: Appointment;
  onChamar?: () => void;
  onEncaminhar?: () => void;
}) {
  const patient = patientById(appointment.patientId);
  const professional = professionalById(appointment.professionalId);
  const procedure = procedureById(appointment.procedureId);
  if (!patient || !professional || !procedure) return null;

  const min = appointment.arrivedAt ? waitMinutes(appointment.arrivedAt) : 0;
  const tone = waitTone(min);
  const WaitIcon = WAIT_ICON[tone];
  const flags = priorityFlags(patient);
  const risk = triageFor(appointment.id);

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-surface-raised p-3.5 shadow-card">
      <div className="flex items-start gap-3">
        <Avatar name={patient.name} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-medium text-text">{patient.name}</p>
          <p className="text-sm text-text-muted">{age(patient.birthDate, TODAY)} anos</p>
        </div>
        <span
          aria-hidden
          title={professional.name}
          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: `var(--c-series-${professional.color + 1})` }}
        />
      </div>

      <p className="truncate text-sm text-text-muted">
        {procedure.name} <span className="text-text-subtle">· {professional.name}</span>
      </p>

      {(flags.length > 0 || risk) && (
        <div className="flex flex-wrap gap-1.5">
          {risk && (
            <Badge tone={TRIAGE_RISK[risk].tone} dot size="sm">
              {TRIAGE_RISK[risk].label}
            </Badge>
          )}
          {flags.map((f) => (
            <Badge key={f.key} tone="accent" size="sm">
              {f.label}
            </Badge>
          ))}
        </div>
      )}

      {appointment.arrivedAt && appointment.status !== "atendido" && (
        <p className={`flex items-center gap-1.5 text-sm font-medium ${WAIT_TEXT[tone]}`}>
          <WaitIcon size={15} aria-hidden />
          Esperando há {min} min
        </p>
      )}
      {appointment.status === "atendido" && (
        <p className="flex items-center gap-1.5 text-sm text-text-muted">
          <Clock size={15} aria-hidden />
          Atendido às {appointment.start}
        </p>
      )}

      <div className="flex items-center gap-2 border-t border-border pt-3">
        {(appointment.status === "aguardando" || appointment.status === "aguardando_pagamento") && (
          <Button size="xs" variant="primary" onClick={onChamar} className="flex-1">
            Chamar
          </Button>
        )}
        {appointment.status === "chamando" && (
          <Button size="xs" variant="subtle" icon={DirectSend} onClick={onEncaminhar} className="flex-1">
            Encaminhar
          </Button>
        )}
        <ButtonLink size="xs" variant="ghost" icon={ProfileCircle} to={`/pacientes/${patient.id}`}>
          Ficha
        </ButtonLink>
      </div>
    </div>
  );
}
