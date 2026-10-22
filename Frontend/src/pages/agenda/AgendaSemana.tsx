import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/tabs";
import { AgendamentoDrawer } from "@/components/agenda/AgendamentoDrawer";
import { DateNav } from "@/components/agenda/DateNav";
import { DayGrid, type GridColumn } from "@/components/agenda/DayGrid";
import { Skeleton } from "@/components/ui/misc";
import { addDaysIso, dateShort, weekdayShort } from "@/lib/format";
import { useAgendaItems } from "@/lib/api/agenda";
import { toAppointment, workWindow, type AgendaProfessional } from "@/lib/agenda/model";
import { AgendaCatalogProvider, useCatalog } from "@/lib/agenda/provider";
import { mondayOf, todayIso } from "@/lib/agenda/time";

type ViewMode = "dia" | "semana" | "salas";

/** Janela da unidade no dia: do primeiro início ao último fim entre todos os profissionais que atendem. */
function unitWindow(professionals: AgendaProfessional[], iso: string): { start: number; end: number } | null {
  const windows = professionals.map((p) => workWindow(p, iso)).filter((w): w is { start: number; end: number } => w !== null);
  if (!windows.length) return null;
  return { start: Math.min(...windows.map((w) => w.start)), end: Math.max(...windows.map((w) => w.end)) };
}

export default function Page() {
  return (
    <AgendaCatalogProvider>
      <AgendaSemanaView />
    </AgendaCatalogProvider>
  );
}

function AgendaSemanaView() {
  const { professionals } = useCatalog();
  const navigate = useNavigate();
  const [refDate, setRefDate] = useState(todayIso);
  const [professionalId, setProfessionalId] = useState("todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const weekStart = mondayOf(refDate);
  const days = Array.from({ length: 6 }, (_, i) => addDaysIso(weekStart, i));
  const all = professionalId === "todos";
  const professional = professionals.find((p) => p.id === professionalId);
  const items = useAgendaItems(days[0], days[days.length - 1], all ? undefined : professionalId);
  const weekAppts = useMemo(() => (items.data ?? []).map(toAppointment), [items.data]);
  const selected = weekAppts.find((a) => a.id === selectedId) ?? null;
  const today = todayIso();

  if (professionals.length === 0) {
    return (
      <div className="mx-auto max-w-7xl">
        <PageHeader title="Agenda da semana" breadcrumbs={[{ label: "Agenda", href: "/agenda" }, { label: "Semana" }]} />
        <Card><EmptyState title="Nenhum profissional na agenda desta unidade" description="Cadastre profissionais e grades em Cadastros." /></Card>
      </div>
    );
  }

  const columns: GridColumn[] = days.map((d) => ({
    id: d,
    kicker: weekdayShort(d),
    label: String(Number(d.slice(8, 10))),
    largeLabel: true,
    highlight: d === today,
    isToday: d === today,
  }));

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Agenda da semana"
        breadcrumbs={[{ label: "Agenda", href: "/agenda" }, { label: "Semana" }]}
        description="Visão semanal da unidade toda ou de um profissional, de segunda a sábado."
      />

      <div className="flex flex-col gap-4">
        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <DateNav
              date={refDate}
              unit="week"
              label={`${dateShort(weekStart)} – ${dateShort(days[days.length - 1])}`}
              prevLabel="Semana anterior"
              nextLabel="Próxima semana"
              onPrev={() => setRefDate((d) => addDaysIso(d, -7))}
              onToday={() => setRefDate(todayIso())}
              onNext={() => setRefDate((d) => addDaysIso(d, 7))}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Select
                aria-label="Profissional"
                value={professionalId}
                onChange={(e) => setProfessionalId(e.target.value)}
                options={[{ value: "todos", label: "Todos os profissionais" }, ...professionals.map((p) => ({ value: p.id, label: p.name }))]}
                wrapperClassName="w-56"
              />
              <Segmented<ViewMode>
                label="Visualização"
                value="semana"
                onChange={(v) => {
                  if (v === "dia") navigate("/agenda");
                  if (v === "salas") navigate("/agenda/salas");
                }}
                options={[
                  { value: "dia", label: "Dia" },
                  { value: "semana", label: "Semana" },
                  { value: "salas", label: "Por sala" },
                ]}
              />
            </div>
          </CardBody>
        </Card>

        <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted">
          {professional ? (
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: professional.colorCss }} />
              {professional.name} · {professional.specialty}
            </span>
          ) : (
            <span>Todos os profissionais da unidade</span>
          )}
          <Badge tone="neutral" size="sm">{weekAppts.length} agendamentos na semana</Badge>
        </div>

        {items.isPending ? (
          <Skeleton className="h-[640px] w-full" />
        ) : items.isError ? (
          <Card><EmptyState title="Não foi possível carregar a agenda." description={items.error.message} illustration="agenda/nenhum-agendamento" /></Card>
        ) : weekAppts.length === 0 ? (
          <Card>
            <EmptyState title="Sem agendamentos nesta semana" description="Não há horários marcados de segunda a sábado." />
          </Card>
        ) : (
          <DayGrid
            columns={columns}
            pxPerMin={1.8}
            minColWidth={150}
            appointmentsFor={(colId) => weekAppts.filter((a) => a.date === colId)}
            activeRangeFor={(colId) => all ? unitWindow(professionals, colId) : workWindow(professional!, colId)}
            overlapLanes={all}
            accentFor={all ? (a) => professionals.find((p) => p.id === a.professionalId)?.colorCss : undefined}
            onAppointmentClick={(a) => setSelectedId(a.id)}
          />
        )}
      </div>

      <AgendamentoDrawer appointment={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
}
