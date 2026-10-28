import { Flash, Star1 } from "iconsax-reactjs";
import { Badge } from "@/components/ui/badge";
import type { AgendaAppointment } from "@/lib/agenda/model";
import { cn } from "@/lib/cn";

/** Idade a partir da qual o atendimento é prioritário (Estatuto da Pessoa Idosa); 80+ tem prioridade especial. */
const PRIORITY_AGE = 60;
const SPECIAL_PRIORITY_AGE = 80;
/** Mesma altura para todas: com e sem ícone, as etiquetas ficam alinhadas lado a lado. */
const FLAG = "h-5 leading-none";

/**
 * Sinais automáticos do paciente na sala de espera: idade prioritária, primeira vez na especialidade e encaixe.
 * Tudo vem calculado do backend — a recepção não marca nada.
 */
export function PatientFlags({ appointment, specialty, className }: { appointment: AgendaAppointment; specialty?: string; className?: string }) {
  const age = appointment.patientAge;
  const priority = age !== null && age >= PRIORITY_AGE;
  if (!priority && !appointment.firstVisit && !appointment.fitIn) return null;

  return (
    <span className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {priority && (
        <span className="flex" title={age >= SPECIAL_PRIORITY_AGE ? `${age} anos · prioridade especial (80+)` : `${age} anos · atendimento prioritário (60+)`}>
          <Badge tone="aux" className={FLAG}>{age >= SPECIAL_PRIORITY_AGE ? "80+" : "60+"}</Badge>
        </span>
      )}
      {appointment.firstVisit && (
        <span className="flex" title={specialty ? `Primeira vez em ${specialty}` : "Primeira vez nesta especialidade"}>
          <Badge tone="accent" icon={Star1} className={FLAG}>1ª vez</Badge>
        </span>
      )}
      {appointment.fitIn && (
        <span className="flex" title="Encaixe: marcado no dia ou num horário que outro paciente desmarcou">
          <Badge tone="info" icon={Flash} className={FLAG}>Encaixe</Badge>
        </span>
      )}
    </span>
  );
}
