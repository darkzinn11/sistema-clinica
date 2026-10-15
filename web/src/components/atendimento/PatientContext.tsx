import { Calendar, ClipboardText, Danger, Health, HeartTick, Warning2 } from "iconsax-reactjs";
import type { Icon as IconType } from "iconsax-reactjs";
import type { ReactNode } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Sparkline } from "@/components/ui/charts";
import { Timeline, type TimelineEntry } from "@/components/ui/misc";
import { dateShort } from "@/lib/format";
import type { Patient } from "@/lib/mock/core";
import { appointmentsForPatient, procedureById, professionalById } from "@/lib/mock/core";
import { antecedentesFor, medicamentosEmUsoFor, problemasAtivosFor, vitaisFor } from "@/lib/mock/atendimento";

function Block({ icon: Icon, title, children }: { icon: IconType; title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-text-muted">
        <Icon size={15} aria-hidden />
        {title}
      </p>
      {children}
    </div>
  );
}

export function PatientContext({ patient }: { patient: Patient }) {
  const antecedentes = antecedentesFor(patient.id);
  const medicamentos = medicamentosEmUsoFor(patient.id);
  const problemas = problemasAtivosFor(patient.id);
  const vitais = vitaisFor(patient.id);
  const historico = appointmentsForPatient(patient.id, 240, 0).slice(0, 5);

  const timelineEntries: TimelineEntry[] = historico.map((a) => {
    const procedure = procedureById(a.procedureId);
    const professional = professionalById(a.professionalId);
    return {
      id: a.id,
      icon: Calendar,
      tone: a.status === "atendido" ? "success" : a.status === "nao_compareceu" ? "danger" : "neutral",
      title: procedure?.name ?? "Consulta",
      meta: dateShort(a.date),
      body: professional?.name,
    };
  });

  return (
    <Card className="lg:sticky lg:top-20">
      <CardHeader title="Contexto do paciente" />
      <CardBody className="flex flex-col gap-5">
        <Block icon={ClipboardText} title="Antecedentes">
          <ul className="list-inside list-disc text-sm text-text">
            {antecedentes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Block>

        <Block icon={Danger} title="Alergias">
          {patient.alerts.length === 0 ? (
            <p className="text-sm text-text-muted">Nenhuma alergia registrada</p>
          ) : (
            <ul className="list-inside list-disc text-sm text-danger">
              {patient.alerts.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </Block>

        <Block icon={Health} title="Medicamentos em uso">
          <ul className="list-inside list-disc text-sm text-text">
            {medicamentos.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Block>

        {problemas.length > 0 && (
          <Block icon={Warning2} title="Problemas ativos">
            <ul className="list-inside list-disc text-sm text-text">
              {problemas.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Block>
        )}

        <Block icon={HeartTick} title="Sinais vitais da triagem">
          <div className="grid grid-cols-2 gap-3">
            {vitais.map((v) => (
              <div key={v.key} className="flex items-center justify-between gap-2 rounded-md bg-surface px-2.5 py-2">
                <div>
                  <p className="text-xs text-text-muted">{v.label}</p>
                  <p className="tabular text-base font-semibold text-text">
                    {v.values[v.values.length - 1]} <span className="text-xs font-normal text-text-subtle">{v.unit}</span>
                  </p>
                </div>
                <Sparkline values={v.values} width={64} height={24} />
              </div>
            ))}
          </div>
        </Block>

        <Block icon={Calendar} title="Últimas consultas">
          {timelineEntries.length === 0 ? <p className="text-sm text-text-muted">Sem histórico registrado.</p> : <Timeline entries={timelineEntries} />}
        </Block>
      </CardBody>
    </Card>
  );
}
