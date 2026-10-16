import { IconCircle } from "@/components/ui/icon-circle";
import { Add, ArrowRight2, ClipboardClose, Clock, MoneyRecive, Moneys, ReceiptItem, Send2, ShieldCross, TickCircle, Warning2 } from "iconsax-reactjs";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { StatCard } from "@/components/ui/charts";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Meter } from "@/components/ui/misc";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { cn } from "@/lib/cn";
import { brl, dateBR } from "@/lib/format";
import {
  CONVENIOS,
  GUIA_STATUS_META,
  type GuiaStatus,
  autorizacoes,
  glosasList,
  guias,
  insuranceName,
  lotes,
  prazosEnvio,
} from "@/lib/mock/faturamento";

/** Etapas por onde a guia passa até ser enviada; depois disso ela termina paga ou glosada. */
const FLOW: GuiaStatus[] = ["em_digitacao", "pronta", "em_lote", "enviada"];
const OUTCOMES: GuiaStatus[] = ["paga", "glosada"];

const DOT: Record<GuiaStatus, string> = {
  em_digitacao: "bg-text-subtle",
  pronta: "bg-info",
  em_lote: "bg-accent",
  enviada: "bg-warning",
  paga: "bg-success",
  glosada: "bg-danger",
};

function pct(value: number) {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

export default function FaturamentoVisao() {
  const resumo = (status: GuiaStatus) => {
    const list = guias.filter((g) => g.status === status);
    return { status, count: list.length, valorCents: list.reduce((s, g) => s + g.valorCents, 0) };
  };

  const faturadoCents = guias.reduce((s, g) => s + g.valorCents, 0);
  const recebidoCents = guias.filter((g) => g.status === "paga").reduce((s, g) => s + g.valorCents, 0);
  const glosadoCents = guias.filter((g) => g.status === "glosada").reduce((s, g) => s + (g.glosa?.valorCents ?? 0), 0);
  const aEnviarCents = guias.filter((g) => g.status === "pronta" || g.status === "em_lote").reduce((s, g) => s + g.valorCents, 0);

  const porConvenio = CONVENIOS.map((c) => {
    const list = guias.filter((g) => g.insuranceId === c.id);
    const faturado = list.reduce((s, g) => s + g.valorCents, 0);
    const recebido = list.filter((g) => g.status === "paga").reduce((s, g) => s + g.valorCents, 0);
    const glosado = list.filter((g) => g.status === "glosada").reduce((s, g) => s + (g.glosa?.valorCents ?? 0), 0);
    return { id: c.id, name: c.name, guias: list.length, faturado, recebido, glosado, taxa: faturado > 0 ? Math.round((glosado / faturado) * 1000) / 10 : 0 };
  }).sort((a, b) => b.faturado - a.faturado);
  const maiorTaxa = Math.max(...porConvenio.map((c) => c.taxa), 1);

  const acoes = [
    { icon: ReceiptItem, count: guias.filter((g) => g.status === "pronta").length, text: ["guia pronta aguardando lote", "guias prontas aguardando lote"], href: "/faturamento/guias?status=pronta" },
    { icon: Warning2, count: lotes.filter((l) => l.status === "fechado" && !l.conferido).length, text: ["lote fechado sem conferência", "lotes fechados sem conferência"], href: "/faturamento/lotes" },
    { icon: ClipboardClose, count: glosasList.filter((g) => !g.recurso).length, text: ["glosa sem recurso aberto", "glosas sem recurso aberto"], href: "/faturamento/retorno" },
    { icon: Clock, count: autorizacoes.filter((a) => a.status === "em_analise" || a.status === "pendente_documentacao").length, text: ["autorização em análise", "autorizações em análise"], href: "/faturamento/autorizacoes" },
  ].filter((a) => a.count > 0);

  const prazoCritico = prazosEnvio[0];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Faturamento TISS"
        description="Guias, lotes e glosas por convênio."
        breadcrumbs={[{ label: "Faturamento TISS" }]}
        actions={
          <>
            <ButtonLink to="/faturamento/lotes" variant="secondary" icon={Send2}>Lotes</ButtonLink>
            <ButtonLink to="/faturamento/guias/nova" variant="primary" icon={Add}>Nova guia</ButtonLink>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 ui-stat-strip" data-columns="4">
        <StatCard label="Faturado" value={brl(faturadoCents)} icon={<Moneys />} footer={<span className="text-text-muted">{guias.length} guias no total</span>} />
        <StatCard label="Recebido" value={brl(recebidoCents)} icon={<MoneyRecive />} footer={<span className="text-text-muted">{pct(faturadoCents ? (recebidoCents / faturadoCents) * 100 : 0)} do faturado</span>} />
        <StatCard label="Glosado" value={brl(glosadoCents)} icon={<ShieldCross />} footer={<span className="text-text-muted">{pct(faturadoCents ? (glosadoCents / faturadoCents) * 100 : 0)} do faturado</span>} />
        <StatCard label="A enviar" value={brl(aEnviarCents)} icon={<Send2 />} footer={<span className="text-text-muted">Guias prontas e em lote</span>} />
      </div>

      <Card className="mb-6">
        <CardHeader title="Andamento das guias" description="Clique em uma etapa para ver as guias." />
        <CardBody className="flex flex-col gap-5">
          <div>
            <div className="mb-2 flex items-baseline justify-between text-sm">
              <span className="text-text-muted">Distribuição das guias</span>
              <span className="tabular font-medium text-text">{guias.length} guias</span>
            </div>
            <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={[...FLOW, ...OUTCOMES].map((st) => `${GUIA_STATUS_META[st].label}: ${resumo(st).count}`).join(", ")}>
              {[...FLOW, ...OUTCOMES].map((st) => (
                <span key={st} className={cn("h-full first:rounded-l-full last:rounded-r-full", DOT[st])} style={{ flexGrow: resumo(st).count }} />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <GroupLabel className="col-span-2 sm:col-span-3 lg:col-span-4">Envio</GroupLabel>
            <GroupLabel className="hidden lg:col-span-2 lg:flex">Retorno</GroupLabel>
            {FLOW.map((status, i) => (
              <PipelineStep key={status} {...resumo(status)} total={guias.length} arrow={i < FLOW.length - 1} />
            ))}
            <GroupLabel className="col-span-2 sm:col-span-3 lg:hidden">Retorno</GroupLabel>
            {OUTCOMES.map((status) => (
              <PipelineStep key={status} {...resumo(status)} total={guias.length} />
            ))}
          </div>
        </CardBody>
      </Card>
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <CardHeader title="Por convênio" description="Faturado, recebido e taxa de glosa de cada operadora." />
          <Table>
            <THead>
              <TR>
                <TH>Convênio</TH>
                <TH align="right">Faturado</TH>
                <TH align="right">Recebido</TH>
                <TH align="right">Glosado</TH>
                <TH className="w-40">Taxa de glosa</TH>
              </TR>
            </THead>
            <TBody>
              {porConvenio.map((c) => (
                <TR key={c.id}>
                  <TD>
                    <span className="block font-medium">{c.name}</span>
                    <span className="text-sm text-text-muted">{c.guias} guias</span>
                  </TD>
                  <TD numeric>{brl(c.faturado)}</TD>
                  <TD numeric>{brl(c.recebido)}</TD>
                  <TD numeric>{brl(c.glosado)}</TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
                        <div className={cn("h-full rounded-full", c.taxa >= 10 ? "bg-danger-fill" : c.taxa >= 5 ? "bg-warning-fill" : "bg-accent")} style={{ width: `${(c.taxa / maiorTaxa) * 100}%` }} />
                      </div>
                      <span className="tabular w-12 text-right text-sm font-medium">{pct(c.taxa)}</span>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Ações pendentes" description="O que precisa de atenção agora" />
            <CardBody className="px-3 py-3">
              {acoes.length === 0 ? (
                <div className="flex items-center gap-2 px-3 py-6 text-base text-text-muted">
                  <TickCircle size={18} className="text-success" aria-hidden />
                  Tudo em dia por aqui.
                </div>
              ) : (
                <ul className="flex flex-col gap-1">
                  {acoes.map((a) => (
                    <li key={a.href}>
                      <Link to={a.href} className="group flex items-center gap-3 rounded-full px-3 py-2.5 transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                        <IconCircle tone="accent" size="sm">
                          <a.icon size={16} aria-hidden />
                        </IconCircle>
                        <span className="flex-1 text-base text-text">
                          <strong className="tabular font-semibold">{a.count}</strong> {a.text[a.count === 1 ? 0 : 1]}
                        </span>
                        <ArrowRight2 size={16} aria-hidden className="shrink-0 text-text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-text" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader
              title="Prazos de envio"
              description="Data limite por convênio"
              actions={prazoCritico && prazoCritico.diasRestantes <= 3 ? <Badge tone="danger" dot>Prazo próximo</Badge> : undefined}
            />
            <CardBody className="flex flex-col gap-4">
              {prazosEnvio.map((p) => (
                <Meter
                  key={p.insuranceId}
                  value={Math.max(0, 30 - p.diasRestantes)}
                  max={30}
                  tone={p.diasRestantes <= 3 ? "danger" : p.diasRestantes <= 7 ? "warning" : "accent"}
                  label={`${insuranceName(p.insuranceId)} · ${dateBR(p.dataLimite)}`}
                  showValue={`${p.diasRestantes} dia${p.diasRestantes === 1 ? "" : "s"}`}
                />
              ))}
            </CardBody>
          </Card>
        </div>

      </div>
    </div>
  );
}

function GroupLabel({ className, children }: { className?: string; children: string }) {
  return (
    <p className={cn("flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-text-subtle", className)}>
      {children}
      <span aria-hidden className="h-px flex-1 bg-border" />
    </p>
  );
}

function PipelineStep({ status, count, valorCents, total, arrow }: { status: GuiaStatus; count: number; valorCents: number; total: number; arrow?: boolean }) {
  return (
    <div className="relative">
      <Link
        to={`/faturamento/guias?status=${status}`}
        className="group flex h-full flex-col gap-3 rounded-2xl bg-surface p-4 transition-colors hover:bg-accent-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-text">
            <span aria-hidden className={cn("h-2 w-2 rounded-full", DOT[status])} />
            {GUIA_STATUS_META[status].label}
          </span>
          <span className="tabular text-xs text-text-muted">{pct(total ? (count / total) * 100 : 0)}</span>
        </span>
        <span>
          <span className="tabular block text-2xl font-semibold leading-none text-text">{count}</span>
          <span className="tabular mt-1.5 block text-sm text-text-muted">{brl(valorCents)}</span>
        </span>
      </Link>
      {arrow && (
        <span aria-hidden className="absolute -right-[18px] top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface-raised text-text-muted lg:flex">
          <ArrowRight2 size={12} />
        </span>
      )}
    </div>
  );
}
