import {
  Add,
  ArrowDown2,
  CloseCircle,
  Filter,
  Flash,
  Health,
  InfoCircle,
  Refresh2,
  SidebarLeft,
  UserAdd,
} from "iconsax-reactjs";
import { type ComponentType, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Checkbox } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/tabs";
import { AgendamentoDrawer } from "@/components/agenda/AgendamentoDrawer";
import { AppointmentDetailsPanel } from "@/components/agenda/AppointmentDetailsPanel";
import { DateNav } from "@/components/agenda/DateNav";
import { DayGrid, type GridColumn } from "@/components/agenda/DayGrid";
import { MiniMonth } from "@/components/agenda/MiniMonth";
import { NovoAgendamentoDrawer } from "@/components/agenda/NovoAgendamentoDrawer";
import { Skeleton } from "@/components/ui/misc";
import { addDaysIso, dateLong } from "@/lib/format";
import { useAgendaItems, useChangeStatus } from "@/lib/api/agenda";
import { freeSlots, toAppointment, workWindow } from "@/lib/agenda/model";
import { AgendaCatalogProvider, useCatalog } from "@/lib/agenda/provider";
import { todayIso } from "@/lib/agenda/time";
import { APPOINTMENT_STATUS, type AppointmentStatus } from "@/lib/status";

/** Ordem usada em contadores e filtros. */
const STATUS_ORDER: AppointmentStatus[] = [
  "confirmado", "nao_confirmado", "aguardando", "aguardando_pagamento", "chamando", "em_atendimento", "atendido",
  "remarcado", "nao_compareceu", "desmarcado_pelo_paciente", "cancelado_pelo_profissional",
];

type ViewMode = "dia" | "semana" | "salas";
const LEGEND_STATUS: AppointmentStatus[] = [
  "confirmado", "nao_confirmado", "aguardando", "em_atendimento", "atendido", "cancelado_pelo_profissional",
];

/** Estilo único dos controles da barra de filtros (botões e selects). */
const PILL =
  "ui-button relative inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-surface px-3.5 text-sm font-medium text-text transition-colors hover:bg-accent-muted aria-expanded:bg-accent-muted aria-pressed:bg-accent-muted focus-visible:ring-2 focus-visible:ring-accent/25 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/25";

/** Select nativo invisível sobre uma pílula — mesmo visual dos botões, com o teclado e a lista nativos. */
function FilterPill({
  icon: Icon,
  label,
  value,
  onChange,
  options,
}: {
  icon: ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className={PILL + " cursor-pointer"}>
      <Icon size={16} aria-hidden className="shrink-0 text-text-muted" />
      <span className="whitespace-nowrap">{options.find((o) => o.value === value)?.label}</span>
      <ArrowDown2 size={14} aria-hidden />
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 cursor-pointer appearance-none rounded-full opacity-0"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

export default function Page() {
  return (
    <AgendaCatalogProvider>
      <AgendaDiaView />
    </AgendaCatalogProvider>
  );
}

function AgendaDiaView() {
  const { professionals, professionalById } = useCatalog();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [date, setDate] = useState(() => searchParams.get("data") ?? todayIso());
  const [profFilter, setProfFilter] = useState<Set<string>>(new Set(professionals.map((p) => p.id)));
  const [specialtyFilter, setSpecialtyFilter] = useState("todas");
  const [statusFilter, setStatusFilter] = useState<"todos" | AppointmentStatus>("todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newPrefill, setNewPrefill] = useState<{ professionalId?: string; time?: string }>({});
  const [railOpen, setRailOpen] = useState(false);
  const [profMenuOpen, setProfMenuOpen] = useState(false);
  const profMenuRef = useRef<HTMLDivElement>(null);
  const [legendOpen, setLegendOpen] = useState(false);

  const items = useAgendaItems(date, date);
  const changeStatus = useChangeStatus();
  const appts = useMemo(() => (items.data ?? []).map(toAppointment), [items.data]);

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
      next.delete("paciente");
      next.delete("nome");
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

  const workingProfs = professionals.filter((p) => workWindow(p, date));
  const closedToday = workingProfs.length === 0;
  const specialties = [...new Set(professionals.map((p) => p.specialty))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const menuProfs = workingProfs.filter((p) => specialtyFilter === "todas" || p.specialty === specialtyFilter);
  const visibleProfs = menuProfs.filter((p) => profFilter.has(p.id));
  const allSelected = menuProfs.length > 0 && visibleProfs.length === menuProfs.length;

  /** Ao trocar de especialidade, já seleciona todos os profissionais dela (ou todos, em "todas"). */
  function selectSpecialty(specialty: string) {
    setSpecialtyFilter(specialty);
    setProfFilter(new Set(professionals.filter((p) => specialty === "todas" || p.specialty === specialty).map((p) => p.id)));
  }

  function toggleAllMenuProfs() {
    setProfFilter((prev) => {
      const next = new Set(prev);
      for (const p of menuProfs) {
        if (allSelected) next.delete(p.id);
        else next.add(p.id);
      }
      return next;
    });
  }
  const selected = appts.find((a) => a.id === selectedId) ?? null;

  const columns: GridColumn[] = visibleProfs.map((p) => ({
    id: p.id,
    label: p.name,
    sublabel: p.specialty,
    colorVar: p.colorCss,
    isToday: date === todayIso(),
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
                  { value: "salas", label: "Por sala" },
                ]}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <div className="relative" ref={profMenuRef}>
                <button
                  type="button"
                  aria-expanded={profMenuOpen}
                  onClick={() => setProfMenuOpen((v) => !v)}
                  className={PILL}
                >
                  <UserAdd size={16} aria-hidden className="shrink-0 text-text-muted" />
                  {visibleProfs.length} {visibleProfs.length === 1 ? "profissional" : "profissionais"}
                  <ArrowDown2 size={14} aria-hidden className={profMenuOpen ? "rotate-180 transition-transform" : "transition-transform"} />
                </button>
                {profMenuOpen && (
                  <div className="ui-menu-enter absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-border bg-surface-raised p-2 shadow-pop">
                    <div className="flex items-center justify-between gap-3 px-2 py-2">
                      <span className="text-xs font-semibold text-text-muted">Profissionais em atendimento</span>
                      <button
                        type="button"
                        className="shrink-0 whitespace-nowrap text-xs font-medium text-accent hover:underline"
                        onClick={toggleAllMenuProfs}
                        disabled={menuProfs.length === 0}
                      >
                        {allSelected ? "Remover seleção" : "Selecionar todos"}
                      </button>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {menuProfs.length === 0 && (
                        <p className="px-2.5 py-3 text-sm text-text-muted">Nenhum profissional de {specialtyFilter} atende neste dia.</p>
                      )}
                      {menuProfs.map((p) => (
                        <Checkbox
                          key={p.id}
                          className="rounded-full px-3 py-2 text-sm transition-colors hover:bg-surface"
                          checked={profFilter.has(p.id)}
                          onChange={() => toggleProf(p.id)}
                          label={
                            <span className="flex min-w-0 items-center gap-2.5">
                              <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.colorCss }} />
                              <span className="flex min-w-0 flex-1 flex-col">
                                <span className="truncate">{p.name}</span>
                                <span className="truncate text-xs text-text-muted">{p.specialty}</span>
                              </span>
                            </span>
                          }
                        />
                      ))}
                    </div>
                    <button type="button" onClick={() => setProfMenuOpen(false)} className="mt-1 w-full rounded-full bg-accent-muted px-3 py-2 text-sm font-semibold text-accent hover:bg-accent-muted/70">
                      Aplicar filtros
                    </button>
                  </div>
                )}
              </div>

              <FilterPill
                icon={Health}
                label="Filtrar por especialidade"
                value={specialtyFilter}
                onChange={selectSpecialty}
                options={[{ value: "todas", label: "Todas as especialidades" }, ...specialties.map((sp) => ({ value: sp, label: sp }))]}
              />

              <FilterPill
                icon={Filter}
                label="Filtrar por status"
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as "todos" | AppointmentStatus)}
                options={[{ value: "todos", label: "Todos os status" }, ...STATUS_ORDER.map((status) => ({ value: status, label: APPOINTMENT_STATUS[status].label }))]}
              />

              <button
                type="button"
                className={PILL}
                onClick={() => setLegendOpen((v) => !v)}
                aria-expanded={legendOpen}
              >
                <InfoCircle size={16} aria-hidden className="shrink-0 text-text-muted" />
                Legenda
                <ArrowDown2 size={14} aria-hidden className={legendOpen ? "rotate-180 transition-transform" : "transition-transform"} />
              </button>

              <button
                type="button"
                onClick={() => setRailOpen((v) => !v)}
                className={PILL + " ml-auto hidden lg:inline-flex"}
                aria-pressed={railOpen}
              >
                <SidebarLeft size={16} aria-hidden className="shrink-0 text-text-muted" /> {railOpen ? "Ocultar painel" : "Painel do dia"}
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
              <Card><EmptyState title="Nenhum profissional atende neste dia" description="Escolha outro dia para ver a agenda." /></Card>
            ) : visibleProfs.length === 0 ? (
              menuProfs.length === 0 ? (
              <Card><EmptyState title={`Nenhum profissional de ${specialtyFilter} neste dia`} description="Escolha outra especialidade ou outro dia." /></Card>
            ) : (
              <Card><EmptyState title="Nenhum profissional selecionado" description="Selecione pelo menos um profissional no filtro acima." /></Card>
            )
            ) : items.isPending ? (
              <Skeleton className="h-[640px] w-full" />
            ) : items.isError ? (
              <Card><EmptyState title="Não foi possível carregar a agenda." description={items.error.message} illustration="agenda/nenhum-agendamento" /></Card>
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
                  checkingIn={changeStatus.isPending}
                  onCheckIn={() => changeStatus.mutate({ id: selected.id, status: "check_in", versao: selected.version })}
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
                      {counts.length === 0 ? <EmptyState title="Nenhum agendamento neste dia." illustration="agenda/nenhum-agendamento" compact className="px-0 py-2" /> :
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
      <AgendamentoDrawer appointment={manageOpen ? selected : null} onClose={() => setManageOpen(false)} />
      <NovoAgendamentoDrawer
        open={newOpen}
        onClose={closeNew}
        defaultDate={date}
        defaultProfessionalId={newPrefill.professionalId}
        defaultTime={newPrefill.time}
        defaultPatient={searchParams.get("paciente") && searchParams.get("nome") ? { id: searchParams.get("paciente")!, name: searchParams.get("nome")! } : undefined}
      />
    </div>
  );
}
