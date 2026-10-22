import { useMemo, useState } from "react";
import { Box, Chart, Clock, TickCircle, Warning2 } from "iconsax-reactjs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/charts";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/misc";
import { PageHeader } from "@/components/ui/page-header";
import { DateNav } from "@/components/agenda/DateNav";
import { cn } from "@/lib/cn";
import { useEquipmentDay, type EquipmentDay } from "@/lib/api/salas";
import { clock, nowMin, todayIso, toMin } from "@/lib/agenda/time";
import { addDaysIso, dateLong } from "@/lib/format";

/** Um uso do equipamento já com a hora da clínica. */
interface Allocation { id: string; start: string; end: string; label: string; professional: string }

const DAY_START = 7;
const DAY_END = 19;
const TOTAL_MIN = (DAY_END - DAY_START) * 60;
/** Quantos usos aparecem por equipamento antes de "Ver o dia todo". */
const PREVIEW = 4;

const pctX = (min: number) => ((min - DAY_START * 60) / TOTAL_MIN) * 100;
const fmt = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

interface Segment {
  start: number;
  end: number;
  over: boolean;
}

/** Trechos ocupados do dia (usos encostados viram um trecho só); `over` = mais usos que unidades. */
function occupancy(allocs: Allocation[], capacity: number): Segment[] {
  const points = allocs.flatMap((a) => [
    { t: toMin(a.start), d: 1 },
    { t: toMin(a.end), d: -1 },
  ]);
  points.sort((a, b) => a.t - b.t || a.d - b.d);
  const segs: Segment[] = [];
  let active = 0;
  let last = 0;
  for (const p of points) {
    if (active > 0 && p.t > last) {
      const over = active > capacity;
      const prev = segs[segs.length - 1];
      if (prev && prev.end === last && prev.over === over) prev.end = p.t;
      else segs.push({ start: last, end: p.t, over });
    }
    active += p.d;
    last = p.t;
  }
  return segs;
}

/** Usos que passam da quantidade do equipamento no mesmo horário. */
function conflictingUses(allocs: Allocation[], capacity: number): Set<string> {
  const conflicts = new Set<string>();
  for (const a of allocs) {
    const overlapping = allocs.filter((b) => toMin(b.start) < toMin(a.end) && toMin(a.start) < toMin(b.end));
    if (overlapping.length > capacity) conflicts.add(a.id);
  }
  return conflicts;
}

function toAllocations(equipment: EquipmentDay): Allocation[] {
  return equipment.usos.map((u) => ({ id: u.agendamentoId, start: clock(u.inicio), end: clock(u.fim), label: u.procedimentoNome, professional: u.profissionalNome }));
}

export default function Page() {
  const [date, setDate] = useState(todayIso);
  const day = useEquipmentDay(date);
  const isToday = date === todayIso();
  const NOW_MIN = nowMin();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const rows = useMemo(() => (day.data?.equipamentos ?? []).map((eq) => {
    const eqAllocs = toAllocations(eq).sort((a, b) => toMin(a.start) - toMin(b.start));
    const capacity = eq.quantidade;
    const conflicts = conflictingUses(eqAllocs, capacity);
    const busyMin = eqAllocs.reduce((s, a) => s + (toMin(a.end) - toMin(a.start)), 0);
    const utilization = Math.min(100, Math.round((busyMin / (TOTAL_MIN * capacity)) * 100));
    const current = isToday ? eqAllocs.filter((a) => toMin(a.start) <= NOW_MIN && toMin(a.end) > NOW_MIN) : [];
    const upcoming = isToday ? eqAllocs.filter((a) => toMin(a.end) > NOW_MIN) : eqAllocs;
    const next = isToday ? eqAllocs.find((a) => toMin(a.start) > NOW_MIN) : eqAllocs[0];
    return { eq, capacity, allocs: eqAllocs, upcoming, conflicts, utilization, current, next, segments: occupancy(eqAllocs, capacity), location: eq.salaNome ?? "Sem sala" };
  }), [day.data, isToday, NOW_MIN]);

  const usesTotal = rows.reduce((s, r) => s + r.allocs.length, 0);
  const conflictCount = rows.filter((r) => r.conflicts.size > 0).length;
  const avgUtil = rows.length ? Math.round(rows.reduce((s, r) => s + r.utilization, 0) / rows.length) : 0;
  const inUseNow = rows.filter((r) => r.current.length > 0).length;

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Equipamentos"
        breadcrumbs={[{ label: "Agenda", href: "/agenda" }, { label: "Equipamentos" }]}
        description="O que está em uso, o que vem a seguir e onde há choque de horário. O uso vem dos agendamentos dos procedimentos que ocupam cada aparelho."
      />

      <Card className="mb-5">
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
        </div>
      </Card>

      {day.isPending ? (
        <Skeleton className="h-96 w-full" />
      ) : day.isError ? (
        <Card><EmptyState title="Não foi possível carregar os equipamentos." description={day.error.message} /></Card>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            title="Nenhum equipamento cadastrado nesta unidade"
            description="Cadastre os aparelhos e os procedimentos que usam cada um em Cadastros > Equipamentos."
          />
        </Card>
      ) : (
        <>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 ui-stat-strip" data-columns="4">
        <StatCard label={isToday ? "Em uso agora" : "Em uso"} value={isToday ? `${inUseNow} de ${rows.length}` : "—"} icon={<Clock />} footer={<span className="text-text-muted">{isToday ? `Equipamentos ocupados às ${fmt(NOW_MIN)}` : "Escolha hoje para ver o uso em tempo real"}</span>} />
        <StatCard label="Usos no dia" value={usesTotal.toLocaleString("pt-BR")} icon={<Box />} footer={<span className="text-text-muted">Agendamentos que ocupam aparelhos</span>} />
        <StatCard label="Ocupação média" value={`${avgUtil}%`} icon={<Chart />} footer={<span className="text-text-muted">Das 7h às 19h</span>} />
        <StatCard
          label="Com choque de horário"
          value={`${conflictCount} de ${rows.length}`}
          icon={conflictCount > 0 ? <Warning2 /> : <TickCircle />}
          footer={<span className={conflictCount > 0 ? "text-danger" : "text-text-muted"}>{conflictCount > 0 ? "Mais exames que unidades no mesmo horário" : "Nenhum choque no dia"}</span>}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {rows.map((r) => {
          const isOpen = expanded.has(r.eq.id);
          const list = isOpen ? r.allocs : r.upcoming.slice(0, PREVIEW);
          const status =
            r.current.length > r.capacity
              ? { tone: "danger" as const, label: "Choque agora" }
              : r.current.length > 0
                ? { tone: "accent" as const, label: r.capacity > 1 ? `Em uso (${r.current.length} de ${r.capacity})` : "Em uso" }
                : { tone: "neutral" as const, label: "Livre" };

          return (
            <Card key={r.eq.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-3 px-5 pt-5">
                <div className="min-w-0">
                  <h2 className="truncate text-md font-semibold text-text">{r.eq.nome}</h2>
                  <p className="truncate text-sm text-text-muted">
                    {r.location} · {r.capacity === 1 ? "1 unidade" : `${r.capacity} unidades`}
                  </p>
                </div>
                <Badge tone={status.tone} dot size="md">{status.label}</Badge>
              </div>

              {/* Agora / a seguir, em texto: responde a pergunta principal sem precisar ler a barra. */}
              <div className="grid grid-cols-2 gap-3 px-5 pt-4">
                <div className="min-w-0 rounded-xl bg-surface px-3.5 py-2.5">
                  <p className="text-xs text-text-muted">Agora</p>
                  {r.current.length ? (
                    <p className="truncate text-sm font-medium text-text">
                      {r.current[0].label} · até {r.current[0].end}
                    </p>
                  ) : (
                    <p className="truncate text-sm font-medium text-text">{r.next ? `Livre até ${r.next.start}` : "Livre pelo resto do dia"}</p>
                  )}
                </div>
                <div className="min-w-0 rounded-xl bg-surface px-3.5 py-2.5">
                  <p className="text-xs text-text-muted">A seguir</p>
                  <p className="truncate text-sm font-medium text-text">{r.next ? `${r.next.start} · ${r.next.label}` : "Nada mais hoje"}</p>
                </div>
              </div>

              {/* Barra do dia: trechos ocupados em verde, choques em vermelho, linha de agora. */}
              <div className="px-5 pt-4">
                <div className="mb-1.5 flex items-baseline justify-between text-xs text-text-muted">
                  <span>Ocupação do dia</span>
                  <span className="tabular font-medium text-text">{r.utilization}%</span>
                </div>
                <div className="relative h-2 rounded-full bg-surface">
                  {/* Trechos em pílulas com 1px de respiro; o que já passou fica esmaecido. */}
                  {r.segments.map((s) => (
                    <span
                      key={s.start}
                      className={cn(
                        "absolute inset-y-0 rounded-full",
                        s.over ? "bg-danger" : "bg-accent",
                        isToday && s.end <= NOW_MIN && "opacity-40",
                      )}
                      style={{
                        left: `calc(${pctX(s.start)}% + 1px)`,
                        width: `max(calc(${((s.end - s.start) / TOTAL_MIN) * 100}% - 2px), 3px)`,
                      }}
                    />
                  ))}
                  {isToday && NOW_MIN > DAY_START * 60 && NOW_MIN < DAY_END * 60 && (
                    <span
                      aria-hidden
                      className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-text ring-2 ring-surface-raised"
                      style={{ left: `${pctX(NOW_MIN)}%` }}
                    />
                  )}
                </div>
                <div className="tabular mt-1 flex justify-between text-[11px] text-text-subtle">
                  {[7, 10, 13, 16, 19].map((h) => <span key={h}>{h}h</span>)}
                </div>
              </div>

              {/* Usos em lista: horário, procedimento e profissional; choques marcados na própria linha. */}
              <div className="mt-3 flex flex-1 flex-col border-t border-border">
                {r.allocs.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-text-muted">Sem uso programado hoje.</p>
                ) : list.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-text-muted">Todos os usos de hoje já terminaram.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {list.map((a) => {
                      const conflict = r.conflicts.has(a.id);
                      const past = isToday && toMin(a.end) <= NOW_MIN;
                      return (
                        <li key={a.id} className={cn("flex items-center gap-3 px-5 py-2.5 text-sm", past && "opacity-55", conflict && "bg-danger-bg/60")}>
                          <span className="tabular w-[92px] shrink-0 font-medium text-text">{a.start}–{a.end}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-text">{a.label}</span>
                            <span className="block truncate text-xs text-text-muted">{a.professional}</span>
                          </span>
                          {conflict && (
                            <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-danger">
                              <Warning2 size={13} variant="Bold" aria-hidden />
                              Choque
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {r.allocs.length > list.length || isOpen ? (
                  r.allocs.length > PREVIEW && (
                    <button
                      type="button"
                      onClick={() => toggle(r.eq.id)}
                      className="mt-auto border-t border-border px-5 py-2.5 text-left text-sm font-medium text-accent hover:bg-surface/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                    >
                      {isOpen ? "Mostrar só os próximos" : `Ver o dia todo (${r.allocs.length} usos)`}
                    </button>
                  )
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>
        </>
      )}
    </div>
  );
}
