import { ArrowLeft2, ArrowRight2 } from "iconsax-reactjs";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/tabs";
import { AgendamentoDrawer } from "@/components/agenda/AgendamentoDrawer";
import { DayGrid, type GridColumn } from "@/components/agenda/DayGrid";
import { useAgendaStore } from "@/components/agenda/store";
import { addDaysIso, dateLong } from "@/lib/format";
import { weekday } from "@/lib/mock/agenda";
import { TODAY, locations, professionalById, professionalLocation } from "@/lib/mock/core";

type ViewMode = "dia" | "semana" | "salas";

/** Local → profissional dono da sala (inverso de `professionalLocation`; 1:1 neste protótipo). */
const LOCATION_PROFESSIONAL: Record<string, string> = Object.fromEntries(
  Object.entries(professionalLocation).map(([profId, locId]) => [locId, profId]),
);

export default function Page() {
  const navigate = useNavigate();
  const [date, setDate] = useState(TODAY);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { apptsOn, update, add } = useAgendaStore();
  const appts = apptsOn(date);
  const closedToday = weekday(date) === 0;
  const selected = appts.find((a) => a.id === selectedId) ?? null;

  const columns: GridColumn[] = locations.map((loc) => {
    const prof = professionalById(LOCATION_PROFESSIONAL[loc.id]);
    return {
      id: loc.id,
      label: loc.name,
      sublabel: prof?.name,
      colorVar: prof ? `var(--c-series-${prof.color + 1})` : undefined,
      isToday: date === TODAY,
    };
  });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Agenda por sala"
        breadcrumbs={[{ label: "Agenda", href: "/agenda" }, { label: "Por sala" }]}
        description="A mesma grade do dia, organizada pelos locais de atendimento."
      />

      <div className="flex flex-col gap-4">
        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button iconOnly aria-label="Dia anterior" icon={ArrowLeft2} variant="secondary" size="sm" onClick={() => setDate((d) => addDaysIso(d, -1))} />
              <Button variant="secondary" size="sm" onClick={() => setDate(TODAY)}>
                Hoje
              </Button>
              <Button iconOnly aria-label="Próximo dia" icon={ArrowRight2} variant="secondary" size="sm" onClick={() => setDate((d) => addDaysIso(d, 1))} />
              <span className="ml-1 text-base font-medium capitalize text-text">{dateLong(date)}</span>
            </div>
            <Segmented<ViewMode>
              label="Visualização"
              value="salas"
              onChange={(v) => {
                if (v === "dia") navigate("/agenda");
                if (v === "semana") navigate("/agenda/semana");
              }}
              options={[
                { value: "dia", label: "Dia" },
                { value: "semana", label: "Semana" },
                { value: "salas", label: "Por sala" },
              ]}
            />
          </CardBody>
        </Card>

        {closedToday ? (
          <Card>
            <EmptyState title="A clínica não atende aos domingos" description="Escolha outro dia para ver as salas." />
          </Card>
        ) : (
          <DayGrid
            columns={columns}
            appointmentsFor={(colId) => appts.filter((a) => a.locationId === colId)}
            activeRangeFor={() => ({ start: 7 * 60, end: 19 * 60 })}
            onAppointmentClick={(a) => setSelectedId(a.id)}
          />
        )}
      </div>

      <AgendamentoDrawer appointment={selected} onClose={() => setSelectedId(null)} update={update} add={add} apptsOn={apptsOn} />
    </div>
  );
}
