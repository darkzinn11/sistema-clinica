import {
  Add,
  ArrowDown2,
  ArrowLeft2,
  ArrowRight2,
  Calendar,
  CloseCircle,
  Filter,
  Flash,
  Refresh2,
  SidebarLeft,
  UserAdd,
} from "iconsax-reactjs";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Checkbox, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/tabs";
import { AgendamentoDrawer } from "@/components/agenda/AgendamentoDrawer";
import { AppointmentDetailsPanel } from "@/components/agenda/AppointmentDetailsPanel";
import { DayGrid, type GridColumn } from "@/components/agenda/DayGrid";
import { MiniMonth } from "@/components/agenda/MiniMonth";
import { NovoAgendamentoDrawer } from "@/components/agenda/NovoAgendamentoDrawer";
import { useAgendaStore } from "@/components/agenda/store";
import { addDaysIso, dateLong } from "@/lib/format";
import { STATUS_ORDER, freeSlots, weekday, workWindow } from "@/lib/mock/agenda";
import { TODAY, NOW_TIME, professionalById, professionals } from "@/lib/mock/core";
import { APPOINTMENT_STATUS, type AppointmentStatus } from "@/lib/status";

type ViewMode = "dia" | "semana" | "salas";
const LEGEND_STATUS: AppointmentStatus[] = [
  "confirmado", "nao_confirmado", "aguardando", "em_atendimento", "atendido", "cancelado_pelo_profissional",
];

export default function Page() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [date, setDate] = useState(TODAY);
  const [profFilter, setProfFilter] = useState<Set<string>>(new Set(professionals.map((p) => p.id)));
  const [statusFilter, setStatusFilter] = useState<"todos" | AppointmentStatus>("todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newPrefill, setNewPrefill] = useState<{ professionalId?: string; time?: string }>({});
  const [railOpen, setRailOpen] = useState(false);
  const [profMenuOpen, setProfMenuOpen] = useState(false);
  const profMenuRef = useRef<HTMLDivElement>(null);
  const [legendOpen, setLegendOpen] = useState(false);

  const { apptsOn, update, add } = useAgendaStore();

  useEffect(() => {
    if (!profMenuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!profMenuRef.current?.contains(event.target as Node)) setProfMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [profMenuOpen]);
  const appts = apptsOn(date);

  useEffect(() => {
    if (searchParams.get("novo") === "1") {
      setNewPrefill({});
      setNewOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function closeNew() {
    setNewOpen(false);
    if (searchParams.get("novo")) {
      const next = new URLSearchParams(searchParams);
      next.delete("novo");
      setSearchParams(next, { replace: true });
    }
  }

  function toggleProf(id: string) {
    setProfFilter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const closedToday = weekday(date) === 0;
  const workingProfs = professionals.filter((p) => workWindow(p, date));
  const visibleProfs = workingProfs.filter((p) => profFilter.has(p.id));
  const selected = appts.find((a) => a.id === selectedId) ?? null;

  const columns: GridColumn[] = visibleProfs.map((p) => ({
    id: p.id,
    label: p.name,
    sublabel: p.specialty,
    colorVar: "var(--c-series-" + (p.color + 1) + ")",
    isToday: date === TODAY,
  }));

  const counts = STATUS_ORDER
    .map((status) => ({ status, count: appts.filter((a) => a.status === status).length }))
    .filter((c) => c.count > 0);
  const visibleCount = appts.filter(
    (a) => visibleProfs.some((p) => p.id === a.professionalId) &&
      (statusFilter === "todos" || a.status === statusFilter),
  ).length;

  function selectAppointment(id: string) {
    setSelectedId(id);
    if (window.matchMedia("(max-width: 1023px)").matches) setManageOpen(true);
  }

  return (
    <div className="ms-agenda-page mx-auto max-w-[1780px]">
      <PageHeader
        title="Agenda"
        description="Gerencie os horários e atendimentos da clínica em um só lugar."
        className="pb-5"
        actions={
          <Button
            variant="primary"
            icon={Add}
            size="md"
            onClick={() => {
              setNewPrefill({});
              setNewOpen(true);
            }}
          >
            Novo agendamento
          </Button>
        }
      />

      <div className="flex flex-col gap-4">
        <Card className="ms-agenda-toolbar relative z-30">
          <CardBody className="flex flex-col gap-4 px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1 rounded-full bg-surface p-1">
                  <Button iconOnly aria-label="Dia anterior" icon={ArrowLeft2} variant="ghost" size="sm" onClick={() => setDate((v) => addDaysIso(v, -1))} />
                  <Button variant="secondary" size="sm" onClick={() => setDate(TODAY)} className="rounded-full bg-surface-raised px-4 shadow-sm">Hoje</Button>
                  <Button iconOnly aria-label="Próximo dia" icon={ArrowRight2} variant="ghost" size="sm" onClick={() => setDate((v) => addDaysIso(v, 1))} />
                </div>
                <div className="ml-1 flex min-w-0 items-center gap-2 text-text">
                  <Calendar size={17} aria-hidden className="shrink-0 text-text-muted" />
                  <span className="text-sm font-semibold capitalize">{dateLong(date)}</span>
                </div>
              </div>
              <Segmented<ViewMode>
                label="Visualização da agenda"
                value="dia"
                size="sm"
                onChange={(mode) => {
                  if (mode === "semana") navigate("/agenda/semana");
                  if (mode === "salas") navigate("/agenda/salas");
                }}
                options={[
                  { value: "dia", label: "Dia" },
                  { value: "semana", label: "Semana" },
                  { value: "salas", label: "Salas" },
                ]}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <div className="relative" ref={profMenuRef}>
                <button
                  type="button"
                  aria-expanded={profMenuOpen}
                  onClick={() => setProfMenuOpen((v) => !v)}
                  className="ui-button inline-flex h-9 items-center gap-2 rounded-full bg-surface px-3.5 text-sm font-medium text-text hover:bg-accent-muted"
                >
                  <UserAdd size={16} aria-hidden />
                  {visibleProfs.length} profissionais
                  <ArrowDown2 size={14} aria-hidden className={profMenuOpen ? "rotate-180 transition-transform" : "transition-transform"} />
                </button>
                {profMenuOpen && (
                  <div className="ui-menu-enter absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl border border-border bg-surface-raised p-2 shadow-pop">
                    <div className="flex items-center justify-between px-2 py-2">
                      <span className="text-xs font-semibold text-text-muted">Profissionais em atendimento</span>
                      <button type="button" className="text-xs font-medium text-accent hover:underline" onClick={() => setProfFilter(new Set(workingProfs.map((p) => p.id)))}>
                        Selecionar todos
                      </button>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {workingProfs.map((p) => (
                        <Checkbox
                          key={p.id}
                          className="rounded-xl px-2.5 py-2 text-sm transition-colors hover:bg-surface"
                          checked={profFilter.has(p.id)}
                          onChange={() => toggleProf(p.id)}
                          label={
                            <span className="flex min-w-0 items-center gap-2.5">
                              <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: "var(--c-series-" + (p.color + 1) + ")" }} />
                              <span className="min-w-0 flex-1 truncate">{p.name}</span>
                            </span>
                          }
                        />
                      ))}
                    </div>
                    <button type="button" onClick={() => setProfMenuOpen(false)} className="mt-1 w-full rounded-xl bg-accent-muted px-3 py-2 text-sm font-semibold text-accent hover:bg-accent-muted/70">
                      Aplicar filtros
                    </button>
                  </div>
                )}
              </div>

              <div className="flex h-9 items-center gap-2 rounded-full bg-surface px-2.5 transition-colors focus-within:ring-2 focus-within:ring-accent/25">
                <Filter size={15} aria-hidden className="shrink-0 text-text-muted" />
                <Select
                  aria-label="Filtrar por status"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as "todos" | AppointmentStatus)}
                  options={[{ value: "todos", label: "Todos os status" }, ...STATUS_ORDER.map((status) => ({ value: status, label: APPOINTMENT_STATUS[status].label }))]}
                  wrapperClassName="w-40"
                  className="ms-agenda-status-select h-8 border-0 bg-transparent pr-7 text-xs shadow-none focus-visible:ring-0"
                />
              </div>

              <button
                type="button"
                className="ui-button inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-sm text-text-muted hover:bg-surface hover:text-text"
                onClick={() => setLegendOpen((v) => !v)}
                aria-expanded={legendOpen}
              >
                Legenda <ArrowDown2 size={14} className={legendOpen ? "rotate-180 transition-transform" : "transition-transform"} />
              </button>

              <button
                type="button"
                onClick={() => setRailOpen((v) => !v)}
                className="ui-button ml-auto hidden h-9 items-center gap-1.5 rounded-full px-3 text-sm text-text-muted hover:bg-surface hover:text-text lg:inline-flex"
                aria-pressed={railOpen}
              >
                <SidebarLeft size={16} aria-hidden /> {railOpen ? "Ocultar painel" : "Painel do dia"}
              </button>
              <span className="text-xs text-text-subtle">{visibleCount} agendamentos</span>
            </div>

            {legendOpen && (
              <div className="ui-submenu-enter flex flex-wrap items-center gap-2 border-t border-border pt-3">
                {LEGEND_STATUS.map((status) => (
                  <Badge key={status} tone={APPOINTMENT_STATUS[status].tone} dot size="sm">
                    {APPOINTMENT_STATUS[status].label}
                  </Badge>
                ))}
                <span className="flex items-center gap-1 text-xs text-text-muted"><Flash size={13} aria-hidden /> Encaixe</span>
                <span className="flex items-center gap-1 text-xs text-text-muted"><Refresh2 size={13} aria-hidden /> Retorno</span>
              </div>
            )}
          </CardBody>
        </Card>

        <div className="flex min-w-0 items-start gap-4">
          <div className="min-w-0 flex-1">
            {closedToday ? (
              <Card><EmptyState title="A clínica não atende aos domingos" description="Escolha outro dia para ver a agenda." /></Card>
            ) : visibleProfs.length === 0 ? (
              <Card><EmptyState title="Nenhum profissional selecionado" description="Selecione pelo menos um profissional no filtro acima." /></Card>
            ) : (
              <DayGrid
                columns={columns}
                minColWidth={205}
                selectedAppointmentId={selectedId}
                appointmentsFor={(colId) => appts.filter((a) => a.professionalId === colId && (statusFilter === "todos" || a.status === statusFilter))}
                activeRangeFor={(colId) => workWindow(professionalById(colId)!, date)}
                freeSlotsFor={(colId) => freeSlots(professionalById(colId)!, date, appts)}
                slotMinutesFor={(colId) => professionalById(colId)?.slotMin ?? 20}
                onSlotClick={(colId, time) => {
                  setNewPrefill({ professionalId: colId, time });
                  setNewOpen(true);
                }}
                onAppointmentClick={(a) => selectAppointment(a.id)}
              />
            )}
          </div>

          {(selected || railOpen) && (
            <aside className="sticky top-20 hidden w-[300px] shrink-0 flex-col gap-4 lg:flex">
              {selected ? (
                <AppointmentDetailsPanel
                  appointment={selected}
                  onClose={() => setSelectedId(null)}
                  onManage={() => setManageOpen(true)}
                  onCheckIn={() => {
                    update(selected.id, { status: "aguardando", arrivedAt: NOW_TIME });
                  }}
                />
              ) : (
                <>
                  <Card><CardBody><MiniMonth value={date} onSelect={setDate} /></CardBody></Card>
                  <Card>
                    <div className="px-5 pt-5">
                      <h2 className="font-semibold text-text">Status do dia</h2>
                      <p className="mt-1 text-xs text-text-muted">{appts.length} agendamentos</p>
                    </div>
                    <CardBody className="flex flex-col gap-2.5">
                      {counts.length === 0 ? <p className="text-sm text-text-muted">Nenhum agendamento neste dia.</p> :
                        counts.map((entry) => (
                          <div key={entry.status} className="flex items-center justify-between gap-2">
                            <Badge tone={APPOINTMENT_STATUS[entry.status].tone} dot>{APPOINTMENT_STATUS[entry.status].label}</Badge>
                            <span className="tabular text-sm font-semibold text-text">{entry.count}</span>
                          </div>
                        ))
                      }
                    </CardBody>
                  </Card>
                </>
              )}
            </aside>
          )}
        </div>
      </div>

      {selected && !manageOpen && (
        <div className="mt-4 lg:hidden">
          <Button variant="secondary" icon={CloseCircle} size="sm" onClick={() => setSelectedId(null)}>Fechar seleção</Button>
        </div>
      )}
      <AgendamentoDrawer
        appointment={manageOpen ? selected : null}
        onClose={() => setManageOpen(false)}
        update={update}
        add={add}
        apptsOn={apptsOn}
      />
      <NovoAgendamentoDrawer
        open={newOpen}
        onClose={closeNew}
        defaultDate={date}
        defaultProfessionalId={newPrefill.professionalId}
        defaultTime={newPrefill.time}
        apptsOn={apptsOn}
        add={add}
      />
    </div>
  );
}
