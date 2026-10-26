import { Clock, Danger, ProfileCircle, TickCircle, Warning2 } from "iconsax-reactjs";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { PatientFlags } from "@/components/recepcao/PatientFlags";
import type { AgendaAppointment } from "@/lib/agenda/model";
import { nowMin, toMin } from "@/lib/agenda/time";
// Emojis no padrão iOS (emoji-datasource-apple): só estes três PNGs entram no bundle.
import emojiCalm from "emoji-datasource-apple/img/apple/64/1f642.png";
import emojiImpatient from "emoji-datasource-apple/img/apple/64/1f610.png";
import emojiUpset from "emoji-datasource-apple/img/apple/64/1f61f.png";

const WAIT_ICON = { neutral: Clock, warning: Warning2, danger: Danger } as const;
/** Tom da etiqueta de espera: cinza enquanto está no prazo, âmbar e vermelho quando demora. */
const WAIT_BADGE = { neutral: "neutral", warning: "warning", danger: "danger" } as const;
/** Etiquetas de status do card: mesma altura e respiro, para lerem como uma família. */
const STATUS_CHIP = "h-6 self-start gap-1.5 px-2.5";

/** Humor provável pelo tempo de espera (mesmas faixas da cor do tempo): ajuda a recepção a priorizar quem dar atenção. */
const MOOD = {
  neutral: { emoji: emojiCalm, label: "Tranquilo", tone: "success" },
  warning: { emoji: emojiImpatient, label: "Impaciente", tone: "warning" },
  danger: { emoji: emojiUpset, label: "Incomodado", tone: "danger" },
} as const;

function waitTone(minutes: number): keyof typeof WAIT_ICON {
  return minutes > 20 ? "danger" : minutes > 10 ? "warning" : "neutral";
}

export function WaitCard({ appointment, specialty }: { appointment: AgendaAppointment; specialty?: string }) {
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
          <PatientFlags appointment={appointment} specialty={specialty} className="mt-2" />
        </div>
        <span aria-hidden className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: appointment.professionalId ? "var(--c-series-1)" : "var(--c-border)" }} />
      </div>
      <p className="truncate text-sm text-text-muted">
        {appointment.procedureName} <span className="text-text-subtle">· marcado para {appointment.start}</span>
      </p>
      <p className="text-sm text-text-muted">Chegou às <span className="font-medium text-text">{appointment.arrivedAt ?? "—"}</span></p>
      {isWaiting && appointment.arrivedAt ? (
        <div className="flex items-center justify-between gap-2">
          <Badge tone={WAIT_BADGE[tone]} className={STATUS_CHIP}>
            <WaitIcon size={14} aria-hidden />
            Esperando <span className="tabular font-semibold">{wait} min</span>
          </Badge>
          <span title="Humor estimado pelo tempo de espera">
            <Badge tone={MOOD[tone].tone} className="h-6 pl-1.5"><img src={MOOD[tone].emoji} alt="" width={16} height={16} className="shrink-0" />{MOOD[tone].label}</Badge>
          </span>
        </div>
      ) : appointment.backendStatus === "atendido" ? (
        <Badge tone="success" className={STATUS_CHIP}><TickCircle size={14} variant="Bold" aria-hidden />Atendimento finalizado</Badge>
      ) : (
        // self-start: na coluna flex o badge esticava pela largura toda.
        <Badge tone="info" dot className={STATUS_CHIP}>Em atendimento</Badge>
      )}
      <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
        <ButtonLink size="sm" variant="ghost" icon={ProfileCircle} to={`/pacientes/${appointment.patientId}`}>Ficha</ButtonLink>
        <ButtonLink size="sm" variant="ghost" to={`/agenda?data=${appointment.date}`}>Ver na agenda</ButtonLink>
      </div>
    </div>
  );
}
