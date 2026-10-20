import { IconCircle } from "@/components/ui/icon-circle";
import type { ReactNode } from "react";
import {
  Add,
  ArrowDown,
  ArrowRight2,
  ArrowUp,
  Box,
  Cake,
  Calendar,
  CalendarTick,
  ClipboardTick,
  EmptyWallet,
  MoneyRecive,
  Minus,
  People,
  ReceiptItem,
  TicketStar,
  UserAdd,
  Wallet2,
} from "iconsax-reactjs";
import { Link } from "react-router";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Meter } from "@/components/ui/misc";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAgendaStore } from "@/components/agenda/store";
import { addDaysIso, brl, dateLong, dateShort, pct } from "@/lib/format";
import { IN_CLINIC, NOW_MIN, PENDENCIAS, birthdaysThisWeek, isCancelled, occupancy, professionalsWorking, toMin, trendEndingAt } from "@/lib/mock/agenda";
import { TODAY, appointmentsOn, currentUser, patientById, procedureById, professionalById } from "@/lib/mock/core";

type DashboardDelta = { value: number; period: string; goodWhenUp?: boolean };

function DashboardMetric({
  label, value, icon, tone, featured = false, delta, footer, currency = false,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone: "accent" | "dark" | "blue" | "royal";
  featured?: boolean;
  delta?: DashboardDelta;
  footer: ReactNode;
  currency?: boolean;
}) {
  const isPositive = delta && delta.value > 0;
  const isNegative = delta && delta.value < 0;
  const favorable = delta && (delta.value === 0 || ((delta.value > 0) === (delta.goodWhenUp ?? true)));
  const DeltaIcon = isPositive ? ArrowUp : isNegative ? ArrowDown : Minus;

  return (
    <article className={"ms-home-metric" + (featured ? " ms-home-metric--featured" : "")}>
      <p className="ms-home-metric__label">{label}</p>
      <span aria-hidden className={"ms-home-metric__icon ms-home-metric__icon--" + tone}>{icon}</span>
      <div className="ms-home-metric__value-row">
        <p className={"ms-home-metric__value tabular-nums" + (currency ? " ms-home-metric__value--currency" : "")}>{value}</p>
        {delta && (
          <span
            className={"ms-home-metric__change " + (favorable ? "ms-home-metric__change--positive" : "ms-home-metric__change--negative")}
            aria-label={(isPositive ? "Aumento de " : isNegative ? "Redução de " : "Variação de ") + Math.abs(delta.value) + " por cento " + delta.period}
          >
            <DeltaIcon size={12} variant="Linear" aria-hidden />
            {isPositive ? "+" : ""}{delta.value.toLocaleString("pt-BR")}%
          </span>
        )}
      </div>
      <div className="ms-home-metric__footer">{footer}</div>
    </article>
  );
}

function greeting() {
  const hour = Math.floor(NOW_MIN / 60);
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export default function Page() {
  const { apptsOn } = useAgendaStore();
  const today = apptsOn(TODAY);
  const nonCancelled = today.filter((a) => !isCancelled(a.status));

  // --- indicadores -----------------------------------------------------------
  const yesterday = appointmentsOn(addDaysIso(TODAY, -1)).filter((a) => !isCancelled(a.status)).length;
  const agendamentosDelta = yesterday ? Math.round(((nonCancelled.length - yesterday) / yesterday) * 100) : 0;

  const decided = nonCancelled.filter((a) => a.status === "confirmado" || a.status === "nao_confirmado");
  const confirmedPct = decided.length ? Math.round((decided.filter((a) => a.status === "confirmado").length / decided.length) * 100) : 0;

  const waitingNow = today.filter((a) => IN_CLINIC.includes(a.status));

  const revenueToday = nonCancelled.reduce((s, a) => s + a.priceCents, 0);
  const revenueYesterday = appointmentsOn(addDaysIso(TODAY, -1))
    .filter((a) => !isCancelled(a.status))
    .reduce((s, a) => s + a.priceCents, 0);
  const revenueDelta = revenueYesterday ? Math.round(((revenueToday - revenueYesterday) / revenueYesterday) * 100) : 0;

  // --- próximos atendimentos --------------------------------------------------
  const proximos = nonCancelled
    .filter((a) => toMin(a.start) >= NOW_MIN)
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 6);

  // --- ocupação por profissional ----------------------------------------------
  const working = professionalsWorking(TODAY);

  // --- pendências amanhã --------------------------------------------------------
  const tomorrow = addDaysIso(TODAY, 1);
  const unconfirmedTomorrow = appointmentsOn(tomorrow).filter((a) => a.status === "nao_confirmado").length;

  // --- aniversariantes ---------------------------------------------------------
  const birthdays = birthdaysThisWeek();

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={`${greeting()}, ${currentUser.name.split(" ")[0]}`}
        description={<span>{dateLong(TODAY)}</span>}
      />

      <div className="flex flex-col gap-5">
        <section className="ms-home-kpi-container" aria-label="Resumo de indicadores de hoje">
          <div className="ms-home-kpi-grid">
            <DashboardMetric
              featured
              tone="accent"
              label="Agendamentos hoje"
              value={nonCancelled.length}
              icon={<Calendar size={21} variant="Bold" />}
              delta={{ value: agendamentosDelta, period: "vs. ontem", goodWhenUp: true }}
              footer={<>Ontem: <strong className="tabular-nums">{yesterday}</strong></>}
            />
            <DashboardMetric
              tone="dark"
              label="Taxa de confirmação"
              value={pct(confirmedPct)}
              icon={<CalendarTick size={21} variant="Bold" />}
              delta={{ value: confirmedPct - trendEndingAt(7, confirmedPct)[0], period: "vs. início do dia", goodWhenUp: true }}
              footer={<>Início do dia: <strong className="tabular-nums">{pct(trendEndingAt(7, confirmedPct)[0])}</strong></>}
            />
            <DashboardMetric
              tone="blue"
              label="Na sala de espera agora"
              value={waitingNow.length}
              icon={<People size={21} variant="Bold" />}
              footer={<Link to="/espera" className="ms-home-metric__link">Ver sala de espera <ArrowRight2 size={14} variant="Linear" aria-hidden /></Link>}
            />
            <DashboardMetric
              tone="royal"
              label="Faturamento previsto do dia"
              value={brl(revenueToday)}
              currency
              icon={<Wallet2 size={21} variant="Bold" />}
              footer={<>Ontem: <strong className="tabular-nums">{brl(revenueYesterday)}</strong> <span className="ms-home-metric__revenue-delta">({revenueDelta > 0 ? "+" : ""}{revenueDelta}%)</span></>}
            />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader title="Próximos atendimentos" description="A partir de agora, nesta ordem" actions={<ButtonLink to="/agenda" variant="ghost" size="sm" iconRight={ArrowRight2}>Ver agenda</ButtonLink>} />
            <CardBody className="flex flex-col gap-1">
              {proximos.length === 0 ? (
                <EmptyState title="Não há mais atendimentos previstos pra hoje." illustration="agenda/nenhum-agendamento" compact className="py-4" />
              ) : (
                proximos.map((a) => {
                  const patient = patientById(a.patientId);
                  const prof = professionalById(a.professionalId);
                  return (
                    <Link key={a.id} to="/agenda" className="flex items-center gap-3 rounded-lg px-2 py-2 -mx-2 hover:bg-surface">
                      <span className="w-12 shrink-0 tabular text-sm font-medium text-text">{a.start}</span>
                      <Avatar name={patient?.name ?? "Paciente"} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-text">{patient?.name}</p>
                        <p className="flex items-center gap-1.5 truncate text-xs text-text-muted">
                          <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: `var(--c-series-${(prof?.color ?? 0) + 1})` }} />
                          {prof?.name} · {procedureById(a.procedureId)?.name}
                        </p>
                      </div>
                      <StatusBadge status={a.status} size="sm" />
                    </Link>
                  );
                })
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Sala de espera agora" description={`${waitingNow.length} paciente(s)`} actions={<ButtonLink to="/espera" variant="ghost" size="sm" iconRight={ArrowRight2}>Ver tudo</ButtonLink>} />
            <CardBody className="flex flex-col gap-1">
              {waitingNow.length === 0 ? (
                <p className="py-4 text-sm text-text-muted">Ninguém esperando no momento.</p>
              ) : (
                waitingNow.slice(0, 6).map((a) => {
                  const patient = patientById(a.patientId);
                  const waitMin = a.arrivedAt ? NOW_MIN - toMin(a.arrivedAt) : 0;
                  return (
                    <div key={a.id} className="flex items-center gap-3 px-2 py-2 -mx-2">
                      <Avatar name={patient?.name ?? "Paciente"} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-text">{patient?.name}</p>
                        <p className="truncate text-xs text-text-muted">{professionalById(a.professionalId)?.name}</p>
                      </div>
                      <Badge tone={waitMin > 20 ? "danger" : waitMin > 10 ? "warning" : "neutral"} size="sm">{waitMin} min</Badge>
                    </div>
                  );
                })
              )}
            </CardBody>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader title="Ocupação por profissional hoje" />
            <CardBody className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              {working.map((p) => {
                const occ = occupancy(p, TODAY);
                return (
                  <div key={p.id} className="flex items-center gap-3">
                    <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: `var(--c-series-${p.color + 1})` }} />
                    <div className="min-w-0 flex-1">
                      <Meter value={Math.round(occ.pct * 100)} label={p.name} showValue={`${Math.round(occ.pct * 100)}%`} tone={occ.pct >= 0.95 ? "danger" : occ.pct >= 0.8 ? "warning" : "accent"} />
                    </div>
                  </div>
                );
              })}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Pendências" />
            <CardBody className="flex flex-col gap-1">
              <Link to="/faturamento/retorno" className="flex items-center gap-3 rounded-lg px-2 py-2 -mx-2 hover:bg-surface">
                <IconCircle tone="danger" size="2xl"><ReceiptItem size={22} /></IconCircle>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text">{PENDENCIAS.glosas.count} guias com glosa</p>
                  <p className="text-xs text-text-muted">{brl(PENDENCIAS.glosas.valueCents)} a recuperar</p>
                </div>
                <ArrowRight2 size={16} className="shrink-0 text-text-subtle" />
              </Link>
              <Link to="/estoque" className="flex items-center gap-3 rounded-lg px-2 py-2 -mx-2 hover:bg-surface">
                <IconCircle tone="warning" size="2xl"><Box size={22} /></IconCircle>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text">{PENDENCIAS.estoqueBaixo} itens com estoque baixo</p>
                  <p className="text-xs text-text-muted">Reposição recomendada</p>
                </div>
                <ArrowRight2 size={16} className="shrink-0 text-text-subtle" />
              </Link>
              <Link to="/agenda/confirmacoes" className="flex items-center gap-3 rounded-lg px-2 py-2 -mx-2 hover:bg-surface">
                <IconCircle tone="info" size="2xl"><ClipboardTick size={22} /></IconCircle>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text">{unconfirmedTomorrow} agendamentos de amanhã sem confirmação</p>
                  <p className="text-xs text-text-muted">{dateShort(tomorrow)}</p>
                </div>
                <ArrowRight2 size={16} className="shrink-0 text-text-subtle" />
              </Link>
              <Link to="/financeiro/caixa" className="flex items-center gap-3 rounded-lg px-2 py-2 -mx-2 hover:bg-surface">
                <IconCircle tone="success" size="2xl"><EmptyWallet size={22} /></IconCircle>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text">Caixa fechado com diferença</p>
                  <p className="text-xs text-text-muted">{brl(PENDENCIAS.caixaDiferencaCents)}</p>
                </div>
                <ArrowRight2 size={16} className="shrink-0 text-text-subtle" />
              </Link>
            </CardBody>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Card>
            <CardHeader title="Aniversariantes" description="Hoje até os próximos 6 dias" />
            <CardBody className="flex flex-col gap-1">
              {birthdays.map((b) => (
                <div key={b.patient.id} className="flex items-center gap-3 px-2 py-2 -mx-2">
                  <Avatar name={b.patient.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-text">{b.patient.name}</p>
                    <p className="text-xs text-text-muted">Completa {b.turning} anos</p>
                  </div>
                  <Badge tone="accent" icon={Cake} size="sm">{dateShort(b.date)}</Badge>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader title="Ações rápidas" />
            <CardBody className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { label: "Novo agendamento", href: "/agenda?novo=1", icon: Add },
                { label: "Fazer check-in", href: "/agenda/check-in", icon: ClipboardTick },
                { label: "Sala de espera", href: "/espera", icon: People },
                { label: "Chamar senha", href: "/senhas", icon: TicketStar },
                { label: "Novo paciente", href: "/pacientes/novo", icon: UserAdd },
                { label: "Consultar valores", href: "/agenda/valores", icon: MoneyRecive },
              ].map((tile) => (
                <Link
                  key={tile.href}
                  to={tile.href}
                  className="flex flex-col items-center gap-2 rounded-lg bg-surface px-3 py-4 text-center transition-colors hover:bg-accent-muted"
                >
                  <IconCircle tone="accent" size="3xl" className="ms-home-action-gradient">
                    <tile.icon size={tile.icon === Add ? 29 : 24} variant={tile.icon === Add ? "Linear" : undefined} />
                  </IconCircle>
                  <span className="text-xs font-medium text-text">{tile.label}</span>
                </Link>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
