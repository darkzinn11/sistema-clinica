import { Calendar2, CloseCircle, SearchNormal1, TickCircle, Timer1, Warning2 } from "iconsax-reactjs";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { StatCard } from "@/components/ui/charts";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR, TableFooter } from "@/components/ui/table";
import { Segmented } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAgendaStore } from "@/components/agenda/store";
import { NOW_MIN, hasPendingPayment, isCancelled, norm, toMin } from "@/lib/mock/agenda";
import { NOW_TIME, TODAY, insuranceName, patientById, procedureById, professionalById, type Appointment } from "@/lib/mock/core";

type RowState = "aguardando_chegada" | "chegou" | "atrasado" | "faltou" | "cancelado";
type FilterState = "todos" | Exclude<RowState, "cancelado">;

function rowState(a: Appointment): RowState {
  if (a.status === "nao_compareceu") return "faltou";
  if (isCancelled(a.status)) return "cancelado";
  if (a.status === "atendido" || ["aguardando", "aguardando_pagamento", "chamando", "em_atendimento"].includes(a.status)) return "chegou";
  if (toMin(a.start) < NOW_MIN - 5) return "atrasado";
  return "aguardando_chegada";
}

const STATE_LABEL: Record<RowState, string> = {
  aguardando_chegada: "Aguardando chegada",
  chegou: "Chegou",
  atrasado: "Atrasado",
  faltou: "Faltou",
  cancelado: "Cancelado",
};

export default function Page() {
  const { apptsOn, update } = useAgendaStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterState>("todos");
  const appts = apptsOn(TODAY)
    .filter((a) => !isCancelled(a.status))
    .sort((a, b) => a.start.localeCompare(b.start));

  const previstos = appts.length;
  const chegaram = appts.filter((a) => rowState(a) === "chegou").length;
  const atrasados = appts.filter((a) => rowState(a) === "atrasado").length;
  const faltas = apptsOn(TODAY).filter((a) => a.status === "nao_compareceu").length;

  const filtered = appts.filter((a) => {
    if (filter !== "todos" && rowState(a) !== filter) return false;
    if (!query) return true;
    const patient = patientById(a.patientId);
    return patient ? norm(patient.name).includes(norm(query)) : false;
  });

  function checkIn(a: Appointment) {
    update(a.id, { status: "aguardando", arrivedAt: NOW_TIME });
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Check-in"
        breadcrumbs={[{ label: "Agenda", href: "/agenda" }, { label: "Check-in" }]}
        description="Chegadas de hoje, com tempo de espera e pendências de pagamento."
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4 ui-stat-strip" data-columns="4">
        <StatCard icon={<Calendar2 />} label="Previstos hoje" value={previstos} />
        <StatCard icon={<TickCircle />} label="Já chegaram" value={chegaram} delta={{ value: previstos ? Math.round((chegaram / previstos) * 100) : 0, period: "do total", suffix: "%", goodWhenUp: true }} />
        <StatCard icon={<Timer1 />} label="Atrasados" value={atrasados} delta={atrasados > 0 ? { value: atrasados, period: "sem chegada", suffix: "", goodWhenUp: false } : undefined} />
        <StatCard icon={<CloseCircle />} label="Faltas hoje" value={faltas} />
      </div>

      <Card>
        <CardBody className="flex flex-col gap-3 border-b border-border">
          <div className="flex flex-wrap items-center gap-3">
            <Input icon={SearchNormal1} placeholder="Buscar paciente…" value={query} onChange={(e) => setQuery(e.target.value)} wrapperClassName="w-64" aria-label="Buscar paciente" />
            <Segmented<FilterState>
              label="Filtrar por situação"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "todos", label: "Todos" },
                { value: "aguardando_chegada", label: "Aguardando" },
                { value: "atrasado", label: "Atrasados" },
                { value: "chegou", label: "Chegou" },
                { value: "faltou", label: "Faltas" },
              ]}
            />
          </div>
        </CardBody>
        {filtered.length === 0 ? (
          <EmptyState title="Nenhum agendamento encontrado" description="Ajuste a busca ou o filtro de situação." />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Horário</TH>
                  <TH>Paciente</TH>
                  <TH>Profissional</TH>
                  <TH>Procedimento</TH>
                  <TH>Convênio</TH>
                  <TH>Chegada</TH>
                  <TH align="right">Espera</TH>
                  <TH align="right">Ação</TH>
                </TR>
              </THead>
              <TBody>
                {filtered.map((a) => {
                  const patient = patientById(a.patientId);
                  const state = rowState(a);
                  const waitMin = a.arrivedAt && state === "chegou" ? NOW_MIN - toMin(a.arrivedAt) : null;
                  const pending = hasPendingPayment(a);
                  return (
                    <TR key={a.id}>
                      <TD className="tabular">{a.start}</TD>
                      <TD>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={patient?.name ?? "Paciente"} size="sm" />
                          <div className="min-w-0">
                            <p className="flex items-center gap-1 truncate text-text">
                              {patient?.name}
                              {patient && patient.alerts.length > 0 && <Warning2 size={14} variant="Bold" className="shrink-0 text-danger" aria-label="Paciente com alerta clínico" />}
                            </p>
                            {pending && (
                              <Badge tone="warning" size="sm">Pagamento pendente</Badge>
                            )}
                          </div>
                        </div>
                      </TD>
                      <TD>{professionalById(a.professionalId)?.name}</TD>
                      <TD className="text-text-muted">{procedureById(a.procedureId)?.name}</TD>
                      <TD className="text-text-muted">{insuranceName(a.insuranceId)}</TD>
                      <TD className="tabular">{a.arrivedAt ?? "—"}</TD>
                      <TD align="right">
                        {waitMin !== null ? (
                          <Badge tone={waitMin > 20 ? "danger" : waitMin > 10 ? "warning" : "neutral"} size="sm">{waitMin} min</Badge>
                        ) : state === "atrasado" ? (
                          <Badge tone="danger" size="sm">{NOW_MIN - toMin(a.start)} min de atraso</Badge>
                        ) : (
                          "—"
                        )}
                      </TD>
                      <TD align="right">
                        {state === "chegou" ? (
                          <StatusBadge status={a.status} size="sm" />
                        ) : state === "faltou" ? (
                          <Badge tone="danger" size="sm">{STATE_LABEL.faltou}</Badge>
                        ) : (
                          <Button size="sm" variant="primary" icon={TickCircle} onClick={() => checkIn(a)}>
                            Fazer check-in
                          </Button>
                        )}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
            <TableFooter total={filtered.length} pageSize={filtered.length} label="agendamentos" />
          </>
        )}
      </Card>
    </div>
  );
}
