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
import { Skeleton } from "@/components/ui/misc";
import { useAuth } from "@/lib/auth/auth";
import { useInicio } from "@/lib/api/inicio";
import { statusFromBackend } from "@/lib/api/status-map";
import { brl, dateLong, dateShort, pct } from "@/lib/format";
import { PENDENCIAS } from "@/lib/mock/agenda";

type DashboardDelta = { value: number; period: string; goodWhenUp?: boolean };

function DashboardMetric({
  label, value, icon, tone, delta, footer, currency = false,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone: "dark" | "blue" | "royal";
  delta?: DashboardDelta;
  footer: ReactNode;
  currency?: boolean;
}) {
  const isPositive = delta && delta.value > 0;
  const isNegative = delta && delta.value < 0;
  const favorable = delta && (delta.value === 0 || ((delta.value > 0) === (delta.goodWhenUp ?? true)));
  const DeltaIcon = isPositive ? ArrowUp : isNegative ? ArrowDown : Minus;

  return (
    <article className="ms-home-metric">
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
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

/** O backend manda a hora da unidade com o deslocamento ("2026-10-21T14:20:00-03:00"): a hora está no próprio texto. */
const clock = (iso: string) => iso.slice(11, 16);
const percentChange = (now: number, before: number) => (before ? Math.round(((now - before) / before) * 100) : 0);
const seriesColor = (hex: string | null) => hex ?? "var(--c-series-1)";

function InicioLoading() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5" aria-busy="true" aria-label="Carregando o início">
      <Skeleton className="h-9 w-64" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full" />)}
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

export default function Page() {
  const { session } = useAuth();
  const inicio = useInicio();
  const firstName = session?.usuario.nome.split(" ")[0] ?? "";

  if (inicio.isPending) return <InicioLoading />;
  if (inicio.isError) {
    return (
      <div className="mx-auto max-w-7xl">
        <PageHeader title={`${greeting()}, ${firstName}`} />
        <EmptyState title="Não foi possível carregar o início." description={inicio.error.message} illustration="agenda/nenhum-agendamento" action={<button type="button" className="text-accent underline" onClick={() => void inicio.refetch()}>Tentar de novo</button>} />
      </div>
    );
  }
  const d = inicio.data;
  const agendamentosDelta = percentChange(d.agendamentosHoje, d.agendamentosOntem);
  const revenueDelta = d.faturamentoPrevistoCentavos !== null && d.faturamentoOntemCentavos !== null ? percentChange(d.faturamentoPrevistoCentavos, d.faturamentoOntemCentavos) : 0;
  const tomorrow = new Date(d.data + "T12:00:00");
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = tomorrow.toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        description={<span>{dateLong(d.data)}</span>}
      />

      <div className="flex flex-col gap-5">
        <section className="ms-home-kpi-container" aria-label="Resumo de indicadores de hoje">
          <div className="ms-home-kpi-grid">
            <DashboardMetric
              tone="dark"
              label="Agendamentos hoje"
              value={d.agendamentosHoje}
              icon={<Calendar size={21} variant="Bold" />}
              delta={{ value: agendamentosDelta, period: "vs. ontem", goodWhenUp: true }}
              footer={<>Ontem: <strong className="tabular-nums">{d.agendamentosOntem}</strong></>}
            />
            <DashboardMetric
              tone="dark"
              label="Taxa de confirmação"
              value={pct(d.taxaConfirmacaoPct)}
              icon={<CalendarTick size={21} variant="Bold" />}
              footer={<><strong className="tabular-nums">{d.confirmados}</strong> já confirmados</>}
            />
            <DashboardMetric
              tone="blue"
              label="Na sala de espera agora"
              value={d.naSalaDeEspera}
              icon={<People size={21} variant="Bold" />}
              footer={<Link to="/espera" className="ms-home-metric__link">Ver sala de espera <ArrowRight2 size={14} variant="Linear" aria-hidden /></Link>}
            />
            <DashboardMetric
              tone="royal"
              label="Faturamento previsto do dia"
              value={d.faturamentoPrevistoCentavos === null ? "—" : brl(d.faturamentoPrevistoCentavos)}
              currency
              icon={<Wallet2 size={21} variant="Bold" />}
              footer={d.faturamentoPrevistoCentavos === null || d.faturamentoOntemCentavos === null
                ? <>Valores restritos ao seu perfil</>
                : <>Ontem: <strong className="tabular-nums">{brl(d.faturamentoOntemCentavos)}</strong> <span className="ms-home-metric__revenue-delta">({revenueDelta > 0 ? "+" : ""}{revenueDelta}%)</span></>}
            />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader title="Próximos atendimentos" description="A partir de agora, nesta ordem" actions={<ButtonLink to="/agenda" variant="ghost" size="sm" iconRight={ArrowRight2}>Ver agenda</ButtonLink>} />
            <CardBody className="flex flex-col gap-1">
              {d.proximos.length === 0 ? (
                <EmptyState title="Não há mais atendimentos previstos pra hoje." illustration="agenda/nenhum-agendamento" compact className="py-4" />
              ) : (
                d.proximos.map((a) => (
                  <Link key={a.id} to="/agenda" className="flex items-center gap-3 rounded-lg px-2 py-2 -mx-2 hover:bg-surface">
                    <span className="w-12 shrink-0 tabular text-sm font-medium text-text">{clock(a.inicio)}</span>
                    <Avatar name={a.pacienteNome} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-text">{a.pacienteNome}</p>
                      <p className="flex items-center gap-1.5 truncate text-xs text-text-muted">
                        <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: seriesColor(a.profissionalCor) }} />
                        {a.profissionalNome} · {a.procedimentoNome}
                      </p>
                    </div>
                    <StatusBadge status={statusFromBackend(a.status)} size="sm" />
                  </Link>
                ))
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Sala de espera agora" description={`${d.naSalaDeEspera} paciente(s)`} actions={<ButtonLink to="/espera" variant="ghost" size="sm" iconRight={ArrowRight2}>Ver tudo</ButtonLink>} />
            <CardBody className="flex flex-col gap-1">
              {d.espera.length === 0 ? (
                <EmptyState title="Ninguém esperando no momento." illustration="recepcao/sala-de-espera-vazia" compact className="py-4" />
              ) : (
                d.espera.map((w) => (
                  <div key={w.agendamentoId} className="flex items-center gap-3 px-2 py-2 -mx-2">
                    <Avatar name={w.pacienteNome} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-text">{w.pacienteNome}</p>
                      <p className="truncate text-xs text-text-muted">{w.profissionalNome}</p>
                    </div>
                    <Badge tone={w.aguardandoMin > 20 ? "danger" : w.aguardandoMin > 10 ? "warning" : "neutral"} size="sm">{w.aguardandoMin} min</Badge>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader title="Ocupação por profissional hoje" />
            <CardBody className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              {d.ocupacao.length === 0 && (
                <EmptyState title="Nenhum profissional com grade hoje nesta unidade." illustration="cadastros/nenhum-profissional" compact className="py-4 sm:col-span-2" />
              )}
              {d.ocupacao.map((p) => (
                <div key={p.profissionalId} className="flex items-center gap-3">
                  <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: seriesColor(p.cor) }} />
                  <div className="min-w-0 flex-1">
                    <Meter value={p.ocupacaoPct} label={p.nome} showValue={`${p.ocupacaoPct}%`} tone={p.ocupacaoPct >= 95 ? "danger" : p.ocupacaoPct >= 80 ? "warning" : "accent"} />
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Pendências" />
            <CardBody className="flex flex-col gap-1">
              <Link to="/agenda/confirmacoes" className="flex items-center gap-3 rounded-lg px-2 py-2 -mx-2 hover:bg-surface">
                <IconCircle tone="info" size="2xl"><ClipboardTick size={22} /></IconCircle>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text">{d.semConfirmacaoAmanha} agendamentos de amanhã sem confirmação</p>
                  <p className="text-xs text-text-muted">{dateShort(tomorrowIso)}</p>
                </div>
                <ArrowRight2 size={16} className="shrink-0 text-text-subtle" />
              </Link>
              <p className="mt-2 px-2 text-xs font-medium uppercase tracking-wide text-text-subtle">Demonstração (módulos ainda não ligados)</p>
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
              {d.aniversariantes.length === 0 && (
                <EmptyState title="Nenhum aniversariante nesta semana." illustration="pacientes/nenhum-paciente-alt" compact className="py-4" />
              )}
              {d.aniversariantes.map((b) => (
                <div key={b.pacienteId} className="flex items-center gap-3 px-2 py-2 -mx-2">
                  <Avatar name={b.nome} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-text">{b.nome}</p>
                    <p className="text-xs text-text-muted">Completa {b.idade} anos</p>
                  </div>
                  <Badge tone="accent" icon={Cake} size="sm">{dateShort(b.dia)}</Badge>
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
