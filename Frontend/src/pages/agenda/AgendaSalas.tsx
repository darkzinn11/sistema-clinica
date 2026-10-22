import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/misc";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/tabs";
import { AgendamentoDrawer } from "@/components/agenda/AgendamentoDrawer";
import { DateNav } from "@/components/agenda/DateNav";
import { DayGrid, type GridColumn } from "@/components/agenda/DayGrid";
import { useAgendaItems } from "@/lib/api/agenda";
import { useProfessionalRooms, useRooms } from "@/lib/api/salas";
import { toAppointment, workWindow } from "@/lib/agenda/model";
import { AgendaCatalogProvider, useCatalog } from "@/lib/agenda/provider";
import { todayIso } from "@/lib/agenda/time";
import { addDaysIso, dateLong } from "@/lib/format";

type ViewMode = "dia" | "semana" | "salas";

export default function Page() {
  return (
    <AgendaCatalogProvider>
      <AgendaSalasView />
    </AgendaCatalogProvider>
  );
}

/** A agenda do dia organizada pelas salas: cada coluna reúne os agendamentos dos profissionais que têm aquela sala como padrão. */
function AgendaSalasView() {
  const { professionals, professionalById } = useCatalog();
  const navigate = useNavigate();
  const [date, setDate] = useState(todayIso);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const rooms = useRooms();
  const professionalRooms = useProfessionalRooms();
  const items = useAgendaItems(date, date);
  const appts = useMemo(() => (items.data ?? []).map(toAppointment), [items.data]);
  const selected = appts.find((a) => a.id === selectedId) ?? null;

  const roomOf = useMemo(() => new Map((professionalRooms.data ?? []).map((r) => [r.profissionalId, r.salaId])), [professionalRooms.data]);
  const activeRooms = (rooms.data ?? []).filter((r) => r.ativo);
  const withoutRoom = appts.filter((a) => !roomOf.has(a.professionalId) && a.backendStatus !== "cancelado" && a.backendStatus !== "remarcado");

  const professionalsOf = (roomId: string) => professionals.filter((p) => roomOf.get(p.id) === roomId);
  // Só aparecem as salas em que alguém atende no dia.
  const shownRooms = activeRooms.filter((r) => professionalsOf(r.id).some((p) => workWindow(p, date)));

  const columns: GridColumn[] = shownRooms.map((room) => {
    const people = professionalsOf(room.id).filter((p) => workWindow(p, date));
    return { id: room.id, label: room.nome, sublabel: people.map((p) => p.name).join(", "), colorVar: people[0]?.colorCss, isToday: date === todayIso() };
  });

  const loading = rooms.isPending || professionalRooms.isPending || items.isPending;
  const failed = rooms.error ?? professionalRooms.error ?? items.error;

  return (
    <div className="mx-auto max-w-[1780px]">
      <PageHeader
        title="Agenda por sala"
        breadcrumbs={[{ label: "Agenda", href: "/agenda" }, { label: "Por sala" }]}
        description="A mesma agenda do dia, organizada pelos locais de atendimento (sala padrão de cada profissional)."
      />
      <div className="flex flex-col gap-4">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <DateNav
              date={date}
              label={dateLong(date)}
              prevLabel="Dia anterior"
              nextLabel="Próximo dia"
              onPrev={() => setDate((v) => addDaysIso(v, -1))}
              onToday={() => setDate(todayIso())}
              onNext={() => setDate((v) => addDaysIso(v, 1))}
            />
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
          </div>
        </Card>

        {withoutRoom.length > 0 && !loading && (
          <p role="note" className="rounded-lg bg-warning-bg px-4 py-2.5 text-sm text-warning">
            {withoutRoom.length} agendamento(s) de profissionais sem sala padrão não aparecem aqui.{" "}
            <Link to="/cadastros/locais" className="font-medium underline">Definir a sala dos profissionais</Link>
          </p>
        )}

        {loading ? (
          <Skeleton className="h-[640px] w-full" />
        ) : failed ? (
          <Card><EmptyState title="Não foi possível carregar a agenda por sala." description={failed.message} /></Card>
        ) : activeRooms.length === 0 ? (
          <Card><EmptyState title="Nenhuma sala cadastrada nesta unidade" description="Cadastre as salas e a sala padrão dos profissionais em Cadastros > Locais e salas." /></Card>
        ) : shownRooms.length === 0 ? (
          <Card><EmptyState title="Nenhuma sala em uso neste dia" description="Nenhum profissional com sala padrão atende neste dia. Escolha outro dia ou defina as salas em Cadastros." /></Card>
        ) : (
          <DayGrid
            columns={columns}
            minColWidth={205}
            selectedAppointmentId={selectedId}
            overlapLanes
            accentFor={(a) => professionalById(a.professionalId)?.colorCss}
            appointmentsFor={(roomId) => appts.filter((a) => roomOf.get(a.professionalId) === roomId)}
            activeRangeFor={(roomId) => {
              const windows = professionalsOf(roomId).map((p) => workWindow(p, date)).filter((w): w is { start: number; end: number } => w !== null);
              return windows.length ? { start: Math.min(...windows.map((w) => w.start)), end: Math.max(...windows.map((w) => w.end)) } : null;
            }}
            onAppointmentClick={(a) => setSelectedId(a.id)}
          />
        )}
      </div>

      <AgendamentoDrawer appointment={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
}
