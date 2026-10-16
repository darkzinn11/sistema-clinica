import { useState } from "react";
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
import { useAgendaStore } from "@/components/agenda/store";
import { addDaysIso, dateShort, weekdayShort } from "@/lib/format";
import { mondayOf, workWindow } from "@/lib/mock/agenda";
import { TODAY, professionalById, professionals } from "@/lib/mock/core";

type ViewMode = "dia" | "semana" | "salas";

export default function Page() {
  const navigate = useNavigate();
  const [refDate, setRefDate] = useState(TODAY);
  const [professionalId, setProfessionalId] = useState(professionals[0].id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { apptsOn, update, add } = useAgendaStore();

  const weekStart = mondayOf(refDate);
  const days = Array.from({ length: 6 }, (_, i) => addDaysIso(weekStart, i));
  const professional = professionalById(professionalId)!;

  const weekAppts = days.flatMap((d) => apptsOn(d).filter((a) => a.professionalId === professionalId));
  const selected = weekAppts.find((a) => a.id === selectedId) ?? null;

  const columns: GridColumn[] = days.map((d) => ({
    id: d,
    kicker: weekdayShort(d),
    label: String(Number(d.slice(8, 10))),
    largeLabel: true,
    highlight: d === TODAY,
    isToday: d === TODAY,
  }));

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Agenda da semana"
        breadcrumbs={[{ label: "Agenda", href: "/agenda" }, { label: "Semana" }]}
        description="Visão semanal de um profissional, de segunda a sábado."
      />

      <div className="flex flex-col gap-4">
        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <DateNav
              label={`${dateShort(weekStart)} – ${dateShort(days[days.length - 1])}`}
              prevLabel="Semana anterior"
              nextLabel="Próxima semana"
              onPrev={() => setRefDate((d) => addDaysIso(d, -7))}
              onToday={() => setRefDate(TODAY)}
              onNext={() => setRefDate((d) => addDaysIso(d, 7))}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Select
                aria-label="Profissional"
                value={professionalId}
                onChange={(e) => setProfessionalId(e.target.value)}
                options={professionals.map((p) => ({ value: p.id, label: p.name }))}
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
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: `var(--c-series-${professional.color + 1})` }} />
            {professional.name} · {professional.specialty}
          </span>
          <Badge tone="neutral" size="sm">{weekAppts.length} agendamentos na semana</Badge>
        </div>

        {weekAppts.length === 0 ? (
          <Card>
            <EmptyState title="Sem agendamentos nesta semana" description="Esse profissional não tem horários marcados de segunda a sábado." />
          </Card>
        ) : (
          <DayGrid
            columns={columns}
            pxPerMin={1.8}
            minColWidth={150}
            appointmentsFor={(colId) => apptsOn(colId).filter((a) => a.professionalId === professionalId)}
            activeRangeFor={(colId) => workWindow(professional, colId)}
            onAppointmentClick={(a) => setSelectedId(a.id)}
          />
        )}
      </div>

      <AgendamentoDrawer appointment={selected} onClose={() => setSelectedId(null)} update={update} add={add} apptsOn={apptsOn} />
    </div>
  );
}
