import { Clock, People, TableDocument, Timer1 } from "iconsax-reactjs";
import { useMemo, useState } from "react";
import { WaitCard } from "@/components/recepcao/WaitCard";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/misc";
import { StatCard } from "@/components/ui/charts";
import { Table, TBody, TD, TH, THead, TR, TableFooter } from "@/components/ui/table";
import { useAgendaItems } from "@/lib/api/agenda";
import { AgendaCatalogProvider, useCatalog } from "@/lib/agenda/provider";
import { toAppointment } from "@/lib/agenda/model";
import { nowMin, todayIso, toMin } from "@/lib/agenda/time";

const COLUMNS = [
  { key: "check_in", title: "Aguardando" },
  { key: "em_atendimento", title: "Em atendimento" },
  { key: "atendido", title: "Finalizado" },
] as const;

function SalaEsperaContent() {
  const { professionals } = useCatalog();
  const today = todayIso();
  const items = useAgendaItems(today, today, undefined, 10_000);
  const [professionalId, setProfessionalId] = useState("");
  const [view, setView] = useState<"quadro" | "lista">("quadro");
  const appointments = useMemo(() => (items.data ?? []).map(toAppointment).filter((a) => ["check_in", "em_atendimento", "atendido"].includes(a.backendStatus) && (!professionalId || a.professionalId === professionalId)), [items.data, professionalId]);
  const waiting = appointments.filter((a) => a.backendStatus === "check_in");
  const finished = appointments.filter((a) => a.backendStatus === "atendido");
  const waits = waiting.filter((a) => a.arrivedAt).map((a) => Math.max(0, nowMin() - toMin(a.arrivedAt!)));
  const average = waits.length ? Math.round(waits.reduce((sum, value) => sum + value, 0) / waits.length) : 0;
  const longest = waits.length ? Math.max(...waits) : 0;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Sala de espera" description="Acompanhe os pacientes que fizeram check-in e o andamento dos atendimentos." breadcrumbs={[{ label: "Recepção" }, { label: "Sala de espera" }]} />
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4 ui-stat-strip" data-columns="4">
        <StatCard label="Aguardando agora" value={waiting.length} icon={<People size={18} aria-hidden />} />
        <StatCard label="Espera média" value={`${average} min`} icon={<Clock size={18} aria-hidden />} />
        <StatCard label="Maior espera" value={`${longest} min`} icon={<Timer1 size={18} aria-hidden />} />
        <StatCard label="Atendidos hoje" value={finished.length} icon={<TableDocument size={18} aria-hidden />} />
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Select aria-label="Filtrar por profissional" value={professionalId} onChange={(e) => setProfessionalId(e.target.value)} options={[{ value: "", label: "Todos os profissionais" }, ...professionals.map((p) => ({ value: p.id, label: p.name }))]} wrapperClassName="w-64" />
        <Segmented label="Modo de visualização" value={view} onChange={setView} options={[{ value: "quadro", label: "Quadro", icon: TableDocument }, { value: "lista", label: "Lista", icon: TableDocument }]} />
      </div>
      {items.isPending ? <Card><CardBody><Skeleton className="h-64 w-full" /></CardBody></Card> : items.isError ? <Card><EmptyState title="Não foi possível carregar a sala de espera." description={items.error.message} /></Card> : appointments.length === 0 ? <Card><EmptyState icon={People} title="Ninguém na sala de espera" description="Os pacientes aparecerão aqui após o check-in." /></Card> : view === "quadro" ? <Card><CardBody className="overflow-x-auto"><div className="grid min-w-[760px] grid-cols-3 gap-4">{COLUMNS.map((column) => <div key={column.key} className="flex flex-col gap-3 rounded-lg bg-surface p-3"><div className="flex items-center justify-between px-1"><h3 className="text-sm font-semibold text-text">{column.title}</h3><span className="tabular rounded-full bg-surface-raised px-2 py-0.5 text-xs font-medium text-text-muted">{appointments.filter((a) => a.backendStatus === column.key).length}</span></div>{appointments.filter((a) => a.backendStatus === column.key).map((a) => <WaitCard key={a.id} appointment={a} />)}</div>)}</div></CardBody></Card> : <Card><Table><THead><TR><TH>Paciente</TH><TH>Profissional</TH><TH>Procedimento</TH><TH>Horário</TH><TH>Chegada</TH><TH>Status</TH></TR></THead><TBody>{appointments.map((a) => <TR key={a.id}><TD>{a.patientName}</TD><TD>{a.professionalName}</TD><TD>{a.procedureName}</TD><TD className="tabular">{a.start}</TD><TD className="tabular">{a.arrivedAt ?? "—"}</TD><TD>{COLUMNS.find((c) => c.key === a.backendStatus)?.title}</TD></TR>)}</TBody></Table><TableFooter total={appointments.length} label="pacientes" /></Card>}
    </div>
  );
}

export default function SalaEspera() {
  return <AgendaCatalogProvider><SalaEsperaContent /></AgendaCatalogProvider>;
}
