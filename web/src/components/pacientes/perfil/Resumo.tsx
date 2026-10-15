import { CalendarTick, Danger, DocumentText, Health } from "iconsax-reactjs";
import { Link } from "react-router";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LineChart } from "@/components/ui/charts";
import type { Patient } from "@/lib/mock/core";
import { TODAY, appointmentsForPatient, professionalById, procedureById } from "@/lib/mock/core";
import { brl, dateBR, dateShort } from "@/lib/format";
import { documentsForPatient, prescriptionsForPatient, vitalsForPatient } from "@/lib/mock/pacientes";

const DOC_TYPE_LABEL: Record<string, string> = {
  atestado: "Atestado",
  declaracao: "Declaração",
  laudo: "Laudo",
  encaminhamento: "Encaminhamento",
};

export function Resumo({ patient }: { patient: Patient }) {
  const appointments = appointmentsForPatient(patient.id);
  const upcoming = appointments
    .filter((a) => a.date >= TODAY && !["desmarcado_pelo_paciente", "cancelado_pelo_profissional", "nao_compareceu"].includes(a.status))
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0];
  const past = appointments.filter((a) => a.date < TODAY || (a.date === TODAY && a.status === "atendido")).slice(0, 5);
  const activePrescriptions = prescriptionsForPatient(patient.id).filter((p) => p.status === "ativa");
  const vitals = vitalsForPatient(patient.id).map((v) => ({ label: v.label, sistolica: v.sistolica, diastolica: v.diastolica }));
  const recentDocs = documentsForPatient(patient.id).slice(0, 3);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="flex flex-col gap-5 lg:col-span-2">
        <Card>
          <CardHeader title="Próximo agendamento" />
          <CardBody>
            {upcoming ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-text">
                    {dateBR(upcoming.date)} às {upcoming.start}
                  </p>
                  <p className="text-sm text-text-muted">
                    {procedureById(upcoming.procedureId)?.name} · {professionalById(upcoming.professionalId)?.name}
                  </p>
                </div>
                <StatusBadge status={upcoming.status} />
              </div>
            ) : (
              <EmptyState icon={CalendarTick} title="Nenhum agendamento futuro" description="Este paciente não tem consultas marcadas." />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Últimas consultas" />
          <CardBody className="flex flex-col gap-3">
            {past.length === 0 ? (
              <p className="text-sm text-text-muted">Nenhuma consulta registrada ainda.</p>
            ) : (
              past.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-text">{procedureById(a.procedureId)?.name}</p>
                    <p className="text-xs text-text-muted">
                      {dateBR(a.date)} · {professionalById(a.professionalId)?.name}
                    </p>
                  </div>
                  <StatusBadge status={a.status} size="sm" />
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Sinais vitais" description="Pressão arterial nas últimas consultas." />
          <CardBody>
            <LineChart
              title="Pressão arterial"
              data={vitals}
              series={[
                { key: "sistolica", label: "Sistólica" },
                { key: "diastolica", label: "Diastólica" },
              ]}
              format={(n) => `${n} mmHg`}
            />
          </CardBody>
        </Card>
      </div>

      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader title="Problemas ativos & medicamentos" />
          <CardBody className="flex flex-col gap-4">
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">Problemas ativos</p>
              {patient.alerts.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {patient.alerts.map((a) => (
                    <Badge key={a} tone="danger" icon={Danger}>
                      {a}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-subtle">Nenhum problema ativo registrado.</p>
              )}
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">Medicamentos em uso</p>
              {activePrescriptions.length > 0 ? (
                <ul className="flex flex-col gap-1.5">
                  {activePrescriptions.flatMap((p) => p.medications).map((m) => (
                    <li key={m.name} className="flex items-center gap-2 text-sm text-text">
                      <Health size={14} aria-hidden className="shrink-0 text-text-subtle" />
                      {m.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-text-subtle">Nenhum medicamento ativo.</p>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Saldo" />
          <CardBody>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted">Saldo em aberto</span>
              <span className={patient.balanceCents > 0 ? "font-display text-lg font-semibold text-danger" : "font-display text-lg font-semibold text-success"}>
                {patient.balanceCents > 0 ? brl(patient.balanceCents) : "Em dia"}
              </span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Documentos recentes" actions={<Link to="documentos" className="text-sm font-medium text-accent hover:underline">Ver todos</Link>} />
          <CardBody>
            {recentDocs.length > 0 ? (
              <ul className="flex flex-col gap-2.5">
                {recentDocs.map((d) => (
                  <li key={d.id} className="flex items-center gap-2.5 text-sm">
                    <DocumentText size={16} aria-hidden className="shrink-0 text-text-subtle" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-text">{d.title}</p>
                      <p className="text-xs text-text-muted">
                        {DOC_TYPE_LABEL[d.type]} · {dateShort(d.date)}
                      </p>
                    </div>
                    <Badge tone={d.status === "assinado" ? "success" : "neutral"} size="sm">
                      {d.status === "assinado" ? "Assinado" : "Rascunho"}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={DocumentText} title="Nenhum documento" />
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
