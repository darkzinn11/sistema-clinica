import { Clock, People, ProfileCircle, SearchNormal1, TableDocument, Timer1 } from "iconsax-reactjs";
import { useMemo, useState } from "react";
import { WaitCard } from "@/components/recepcao/WaitCard";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { StatCard } from "@/components/ui/charts";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TBody, TD, TH, THead, TR, TableFooter } from "@/components/ui/table";
import { age } from "@/lib/format";
import type { Appointment } from "@/lib/mock/core";
import { TODAY, patientById, procedureById, professionalById, professionals } from "@/lib/mock/core";
import type { AppointmentStatus } from "@/lib/status";
import { priorityFlags, waitMinutes, waitTone, waitingRoomToday } from "@/lib/mock/recepcao";

interface Column {
  key: string;
  title: string;
  statuses: AppointmentStatus[];
}

const COLUMNS: Column[] = [
  { key: "aguardando", title: "Aguardando", statuses: ["aguardando", "aguardando_pagamento"] },
  { key: "chamando", title: "Chamado", statuses: ["chamando"] },
  { key: "em_atendimento", title: "Em atendimento", statuses: ["em_atendimento"] },
  { key: "atendido", title: "Finalizado", statuses: ["atendido"] },
];

export default function SalaEspera() {
  const base = useMemo(() => waitingRoomToday(), []);
  const [overrides, setOverrides] = useState<Record<string, AppointmentStatus>>({});
  const [professionalId, setProfessionalId] = useState("");
  const [view, setView] = useState<"quadro" | "lista">("quadro");

  const cards: Appointment[] = base
    .map((a) => ({ ...a, status: overrides[a.id] ?? a.status }))
    .filter((a) => !professionalId || a.professionalId === professionalId);

  function moveTo(id: string, status: AppointmentStatus) {
    setOverrides((prev) => ({ ...prev, [id]: status }));
  }

  const aguardandoCards = cards.filter((a) => a.status === "aguardando" || a.status === "aguardando_pagamento");
  const waits = aguardandoCards.map((a) => (a.arrivedAt ? waitMinutes(a.arrivedAt) : 0));
  const mediaEspera = waits.length ? Math.round(waits.reduce((s, v) => s + v, 0) / waits.length) : 0;
  const maiorEspera = waits.length ? Math.max(...waits) : 0;
  const atendidosHoje = cards.filter((a) => a.status === "atendido").length;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Sala de espera"
        description="Acompanhe quem está na recepção hoje, chame pacientes e encaminhe ao consultório."
        breadcrumbs={[{ label: "Recepção" }, { label: "Sala de espera" }]}
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4 ui-stat-strip" data-columns="4">
        <StatCard label="Aguardando" value={aguardandoCards.length} icon={<People size={18} aria-hidden />} />
        <StatCard label="Espera média" value={`${mediaEspera} min`} icon={<Clock size={18} aria-hidden />} />
        <StatCard label="Maior espera" value={`${maiorEspera} min`} icon={<Timer1 size={18} aria-hidden />} />
        <StatCard label="Atendidos hoje" value={atendidosHoje} icon={<TableDocument size={18} aria-hidden />} />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Select
          aria-label="Filtrar por profissional"
          value={professionalId}
          onChange={(e) => setProfessionalId(e.target.value)}
          placeholder="Todos os profissionais"
          options={professionals.map((p) => ({ value: p.id, label: p.name }))}
          wrapperClassName="w-64"
        />
        <Segmented
          label="Modo de visualização"
          value={view}
          onChange={setView}
          options={[
            { value: "quadro", label: "Quadro", icon: TableDocument },
            { value: "lista", label: "Lista", icon: SearchNormal1 },
          ]}
        />
      </div>

      {cards.length === 0 ? (
        <Card>
          <EmptyState icon={People} title="Ninguém na recepção" description="Ainda não há pacientes aguardando para este filtro." />
        </Card>
      ) : view === "quadro" ? (
        <Card>
          <CardBody className="overflow-x-auto">
            <div className="grid w-full min-w-[960px] grid-cols-4 gap-4">
              {COLUMNS.map((col) => {
                const items = cards
                  .filter((a) => col.statuses.includes(a.status))
                  .sort((a, b) => (a.arrivedAt ?? "").localeCompare(b.arrivedAt ?? ""));
                return (
                  <div key={col.key} className="flex flex-col gap-3 rounded-lg bg-surface p-3">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-sm font-semibold text-text">{col.title}</h3>
                      <span className="tabular rounded-full bg-surface-raised px-2 py-0.5 text-xs font-medium text-text-muted">{items.length}</span>
                    </div>
                    <div className="flex flex-col gap-3">
                      {items.length === 0 ? (
                        <p className="px-1 text-sm text-text-subtle">Vazio</p>
                      ) : (
                        items.map((a) => (
                          <WaitCard
                            key={a.id}
                            appointment={a}
                            onChamar={() => moveTo(a.id, "chamando")}
                            onEncaminhar={() => moveTo(a.id, "em_atendimento")}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <Table>
            <THead>
              <TR>
                <TH>Paciente</TH>
                <TH>Profissional</TH>
                <TH>Procedimento</TH>
                <TH>Status</TH>
                <TH align="right">Espera</TH>
                <TH>Prioridade</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {cards
                .sort((a, b) => (a.arrivedAt ?? "").localeCompare(b.arrivedAt ?? ""))
                .map((a) => {
                  const patient = patientById(a.patientId);
                  const professional = professionalById(a.professionalId);
                  const procedure = procedureById(a.procedureId);
                  if (!patient || !professional || !procedure) return null;
                  const min = a.arrivedAt ? waitMinutes(a.arrivedAt) : 0;
                  const tone = waitTone(min);
                  const flags = priorityFlags(patient);
                  return (
                    <TR key={a.id}>
                      <TD>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={patient.name} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-text">{patient.name}</p>
                            <p className="text-sm text-text-muted">{age(patient.birthDate, TODAY)} anos</p>
                          </div>
                        </div>
                      </TD>
                      <TD>
                        <span className="flex items-center gap-2">
                          <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: `var(--c-series-${professional.color + 1})` }} />
                          {professional.name}
                        </span>
                      </TD>
                      <TD>{procedure.name}</TD>
                      <TD>
                        <StatusBadge status={a.status} />
                      </TD>
                      <TD align="right" numeric>
                        {a.status === "atendido" ? (
                          <span className="text-text-muted">—</span>
                        ) : (
                          <span className={tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-text"}>{min} min</span>
                        )}
                      </TD>
                      <TD>
                        <div className="flex flex-wrap gap-1">
                          {flags.map((f) => (
                            <span key={f.key} className="rounded-full bg-accent-muted px-2 py-0.5 text-xs font-medium text-accent">
                              {f.label}
                            </span>
                          ))}
                          {flags.length === 0 && <span className="text-text-subtle">—</span>}
                        </div>
                      </TD>
                      <TD align="right">
                        <ButtonLink size="xs" variant="ghost" iconOnly aria-label="Ver ficha" icon={ProfileCircle} to={`/pacientes/${patient.id}`} />
                      </TD>
                    </TR>
                  );
                })}
            </TBody>
          </Table>
          <TableFooter total={cards.length} label="pacientes" />
        </Card>
      )}
    </div>
  );
}
