import { Call, Clock, Danger, People, PlayCircle, TickCircle, Timer1 } from "iconsax-reactjs";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/charts";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Tooltip } from "@/components/ui/misc";
import { age } from "@/lib/format";
import { TODAY, patientById, procedureById, professionals, todayAppointments } from "@/lib/mock/core";
import type { AppointmentStatus } from "@/lib/status";
import { waitMinutes } from "@/lib/mock/recepcao";

const PENDING: AppointmentStatus[] = ["aguardando", "aguardando_pagamento", "chamando"];

function defaultProfessionalId(): string {
  const withOngoing = professionals.find((p) => todayAppointments.some((a) => a.professionalId === p.id && a.status === "em_atendimento"));
  return withOngoing?.id ?? professionals[0].id;
}

export default function MeusAtendimentos() {
  const [professionalId, setProfessionalId] = useState(defaultProfessionalId);
  const [overrides, setOverrides] = useState<Record<string, AppointmentStatus>>({});

  const list = useMemo(
    () =>
      todayAppointments
        .filter((a) => a.professionalId === professionalId)
        .map((a) => ({ ...a, status: overrides[a.id] ?? a.status }))
        .sort((a, b) => a.start.localeCompare(b.start)),
    [professionalId, overrides],
  );

  function chamarPaciente(id: string) {
    setOverrides((prev) => ({ ...prev, [id]: "chamando" }));
  }

  const atendidos = list.filter((a) => a.status === "atendido").length;
  const aguardando = list.filter((a) => PENDING.includes(a.status)).length;
  const proximo = list.find((a) => PENDING.includes(a.status) || a.status === "confirmado" || a.status === "nao_confirmado");
  const atendidosDuracao = list.filter((a) => a.status === "atendido");
  const tempoMedio = atendidosDuracao.length
    ? Math.round(atendidosDuracao.reduce((s, a) => s + (Number(a.end.slice(0, 2)) * 60 + Number(a.end.slice(3)) - (Number(a.start.slice(0, 2)) * 60 + Number(a.start.slice(3)))), 0) / atendidosDuracao.length)
    : 0;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Meus atendimentos"
        description="A agenda do seu dia: quem já foi atendido, quem está esperando e quem vem a seguir."
        breadcrumbs={[{ label: "Atendimento" }]}
        actions={
          <Select
            aria-label="Profissional"
            value={professionalId}
            onChange={(e) => setProfessionalId(e.target.value)}
            options={professionals.map((p) => ({ value: p.id, label: p.name }))}
            wrapperClassName="w-64"
          />
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4 ui-stat-strip" data-columns="4">
        <StatCard label="Atendidos hoje" value={atendidos} icon={<TickCircle size={18} aria-hidden />} />
        <StatCard label="Aguardando" value={aguardando} icon={<People size={18} aria-hidden />} />
        <StatCard label="Próximo" value={proximo ? proximo.start : "—"} icon={<Clock size={18} aria-hidden />} />
        <StatCard label="Tempo médio" value={tempoMedio ? `${tempoMedio} min` : "—"} icon={<Timer1 size={18} aria-hidden />} />
      </div>

      <Card>
        {list.length === 0 ? (
          <EmptyState title="Sem agendamentos hoje" description="Este profissional não tem atendimentos marcados para hoje." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Horário</TH>
                <TH>Paciente</TH>
                <TH>Procedimento</TH>
                <TH>Status</TH>
                <TH align="right">Espera</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {list.map((a) => {
                const patient = patientById(a.patientId);
                const procedure = procedureById(a.procedureId);
                if (!patient || !procedure) return null;
                return (
                  <TR key={a.id}>
                    <TD className="tabular font-medium">{a.start}</TD>
                    <TD>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={patient.name} size="sm" />
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate font-medium text-text">
                            {patient.name}
                            {patient.alerts.length > 0 && (
                              <Tooltip content={patient.alerts.join(", ")}>
                                <Danger size={14} className="text-danger" aria-hidden />
                              </Tooltip>
                            )}
                          </p>
                          <p className="text-sm text-text-muted">{age(patient.birthDate, TODAY)} anos</p>
                        </div>
                      </div>
                    </TD>
                    <TD>{procedure.name}</TD>
                    <TD>
                      <StatusBadge status={a.status} />
                    </TD>
                    <TD align="right" numeric>
                      {a.arrivedAt && PENDING.includes(a.status) ? `${waitMinutes(a.arrivedAt)} min` : <span className="text-text-muted">—</span>}
                    </TD>
                    <TD align="right">
                      {a.status === "em_atendimento" ? (
                        <ButtonLink size="sm" variant="primary" icon={PlayCircle} to={`/atendimento/${a.id}`}>
                          Iniciar atendimento
                        </ButtonLink>
                      ) : PENDING.includes(a.status) ? (
                        <Button size="sm" variant="secondary" icon={Call} onClick={() => chamarPaciente(a.id)}>
                          Chamar paciente
                        </Button>
                      ) : null}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
