import { Calendar2, CloseCircle, SearchNormal1, TickCircle, Timer1 } from "iconsax-reactjs";
import { useMemo, useState } from "react";
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
import { Skeleton } from "@/components/ui/misc";
import { useAgendaItems, useChangeStatus } from "@/lib/api/agenda";
import { isCancelled, toAppointment, type AgendaAppointment as Appointment } from "@/lib/agenda/model";
import { nowMin, todayIso, toMin } from "@/lib/agenda/time";

const norm = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

type RowState = "aguardando_chegada" | "chegou" | "atrasado" | "faltou" | "cancelado";
type FilterState = "todos" | Exclude<RowState, "cancelado">;

function rowState(a: Appointment, now: number): RowState {
  if (a.backendStatus === "nao_compareceu") return "faltou";
  if (isCancelled(a.status)) return "cancelado";
  if (["check_in", "em_atendimento", "atendido"].includes(a.backendStatus)) return "chegou";
  if (toMin(a.start) < now - 5) return "atrasado";
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
  const today = todayIso();
  const now = nowMin();
  const items = useAgendaItems(today, today);
  const changeStatus = useChangeStatus();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterState>("todos");
  const all = useMemo(() => (items.data ?? []).map(toAppointment), [items.data]);
  const appts = all.filter((a) => !isCancelled(a.status) || a.backendStatus === "nao_compareceu").filter((a) => a.backendStatus !== "remarcado");

  const previstos = all.filter((a) => !isCancelled(a.status)).length;
  const chegaram = appts.filter((a) => rowState(a, now) === "chegou").length;
  const atrasados = appts.filter((a) => rowState(a, now) === "atrasado").length;
  const faltas = all.filter((a) => a.backendStatus === "nao_compareceu").length;

  const filtered = appts.filter((a) => {
    if (filter !== "todos" && rowState(a, now) !== filter) return false;
    if (!query) return true;
    return norm(a.patientName).includes(norm(query));
  });

  function checkIn(a: Appointment) {
    changeStatus.mutate({ id: a.id, status: "check_in", versao: a.version });
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
        {items.isPending ? (
          <div className="p-5"><Skeleton className="h-64 w-full" /></div>
        ) : items.isError ? (
          <EmptyState title="Não foi possível carregar os agendamentos." description={items.error.message} />
        ) : filtered.length === 0 ? (
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
                  <TH>Chegada</TH>
                  <TH align="right">Espera</TH>
                  <TH align="right">Ação</TH>
                </TR>
              </THead>
              <TBody>
                {filtered.map((a) => {
                  const state = rowState(a, now);
                  const waitMin = a.arrivedAt && a.backendStatus === "check_in" ? Math.max(0, now - toMin(a.arrivedAt)) : null;
                  return (
                    <TR key={a.id}>
                      <TD className="tabular">{a.start}</TD>
                      <TD>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={a.patientName} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-text">{a.patientName}</p>
                          </div>
                        </div>
                      </TD>
                      <TD>{a.professionalName}</TD>
                      <TD className="text-text-muted">{a.procedureName}</TD>
                      <TD className="tabular">{a.arrivedAt ?? "—"}</TD>
                      <TD align="right">
                        {waitMin !== null ? (
                          <Badge tone={waitMin > 20 ? "danger" : waitMin > 10 ? "warning" : "neutral"} size="sm">{waitMin} min</Badge>
                        ) : state === "atrasado" ? (
                          <Badge tone="danger" size="sm">{now - toMin(a.start)} min de atraso</Badge>
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
                          <Button size="sm" variant="primary" icon={TickCircle} disabled={changeStatus.isPending} onClick={() => checkIn(a)}>
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
