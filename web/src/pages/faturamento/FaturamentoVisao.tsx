import { IconCircle } from "@/components/ui/icon-circle";
import { Add, ClipboardClose, Clock, ReceiptItem, Send2, TickCircle, Warning2 } from "iconsax-reactjs";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { BarChart, BarList } from "@/components/ui/charts";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Meter } from "@/components/ui/misc";
import { PageHeader } from "@/components/ui/page-header";
import { brl, dateBR } from "@/lib/format";
import {
  CONVENIOS,
  GUIA_STATUS_META,
  GUIA_STATUS_ORDER,
  type GuiaStatus,
  autorizacoes,
  glosasList,
  guias,
  insuranceName,
  lotes,
  prazosEnvio,
} from "@/lib/mock/faturamento";

function toReais(cents: number) {
  return Math.round(cents) / 100;
}

export default function FaturamentoVisao() {
  const porStatus = GUIA_STATUS_ORDER.map((status) => {
    const list = guias.filter((g) => g.status === status);
    return { status, count: list.length, valorCents: list.reduce((s, g) => s + g.valorCents, 0) };
  });

  const porConvenio = CONVENIOS.map((c) => {
    const list = guias.filter((g) => g.insuranceId === c.id);
    const faturado = list.reduce((s, g) => s + g.valorCents, 0);
    const recebido = list.filter((g) => g.status === "paga").reduce((s, g) => s + g.valorCents, 0);
    const glosado = list.filter((g) => g.status === "glosada").reduce((s, g) => s + (g.glosa?.valorCents ?? 0), 0);
    return { label: c.name, faturado: toReais(faturado), recebido: toReais(recebido), glosado: toReais(glosado), faturadoCents: faturado, glosadoCents: glosado };
  });

  const taxaGlosa = porConvenio
    .map((c) => ({ label: c.label, pct: c.faturadoCents > 0 ? Math.round((c.glosadoCents / c.faturadoCents) * 1000) / 10 : 0 }))
    .sort((a, b) => b.pct - a.pct);

  const lotesPendenteValidacao = lotes.filter((l) => l.status === "fechado" && !l.conferido).length;
  const guiasProntas = guias.filter((g) => g.status === "pronta").length;
  const autorizacoesPendentes = autorizacoes.filter((a) => a.status === "em_analise" || a.status === "pendente_documentacao").length;
  const glosasSemRecurso = glosasList.filter((g) => !g.recurso).length;
  const prazoCritico = prazosEnvio[0];

  const acoes = [
    { icon: ReceiptItem, text: `${guiasProntas} guias prontas aguardando lote`, href: "/faturamento/guias?status=pronta" },
    { icon: Warning2, text: `${lotesPendenteValidacao} lotes fechados com pendência de conferência`, href: "/faturamento/lotes" },
    { icon: ClipboardClose, text: `${glosasSemRecurso} glosas ainda sem recurso aberto`, href: "/faturamento/retorno" },
    { icon: Clock, text: `${autorizacoesPendentes} solicitações de autorização em análise`, href: "/faturamento/autorizacoes" },
  ].filter((a) => !a.text.startsWith("0"));

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Faturamento TISS"
        description="Visão geral de guias, lotes e glosas por convênio."
        breadcrumbs={[{ label: "Faturamento TISS" }]}
        actions={
          <>
            <ButtonLink to="/faturamento/lotes" variant="secondary" icon={Send2}>Lotes</ButtonLink>
            <ButtonLink to="/faturamento/guias/nova" variant="primary" icon={Add}>Nova guia</ButtonLink>
          </>
        }
      />

      <Card className="mb-6">
        <CardHeader title="Pipeline de guias" description="Clique em uma etapa para ver as guias correspondentes." />
        <CardBody className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {porStatus.map((s) => (
            <Link
              key={s.status}
              to={`/faturamento/guias?status=${s.status}`}
              className="flex flex-col gap-2 rounded-lg bg-surface px-3 py-3 transition-colors hover:bg-accent-muted/40"
            >
              <Badge tone={GUIA_STATUS_META[s.status as GuiaStatus].tone} dot size="sm">{GUIA_STATUS_META[s.status as GuiaStatus].label}</Badge>
              <span className="font-display text-xl font-semibold tracking-tight text-text">{s.count}</span>
              <span className="tabular text-sm text-text-muted">{brl(s.valorCents)}</span>
            </Link>
          ))}
        </CardBody>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Faturado, recebido e glosado por convênio" description="Últimos lançamentos acumulados do protótipo." />
          <CardBody>
            <BarChart
              title="Faturado, recebido e glosado por convênio"
              data={porConvenio.map((c) => ({ label: c.label, faturado: c.faturado, recebido: c.recebido, glosado: c.glosado }))}
              series={[
                { key: "faturado", label: "Faturado" },
                { key: "recebido", label: "Recebido" },
                { key: "glosado", label: "Glosado" },
              ]}
              format={(n) => brl(Math.round(n * 100))}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Taxa de glosa por convênio" description="Glosado ÷ faturado" />
          <CardBody>
            <BarList title="Taxa de glosa por convênio" data={taxaGlosa.map((t) => ({ label: t.label, value: t.pct }))} format={(n) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`} />
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Prazos de envio"
            description="Data limite de faturamento por convênio"
            actions={prazoCritico && prazoCritico.diasRestantes <= 3 ? <Badge tone="danger" dot>Prazo próximo</Badge> : undefined}
          />
          <CardBody className="flex flex-col gap-4">
            {prazosEnvio.map((p) => {
              const tone = p.diasRestantes <= 3 ? "danger" : p.diasRestantes <= 7 ? "warning" : "accent";
              return (
                <Meter
                  key={p.insuranceId}
                  value={Math.max(0, 30 - p.diasRestantes)}
                  max={30}
                  tone={tone}
                  label={`${insuranceName(p.insuranceId)} · vence em ${dateBR(p.dataLimite)}`}
                  showValue={`${p.diasRestantes} dia${p.diasRestantes === 1 ? "" : "s"}`}
                />
              );
            })}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Ações pendentes" description="O que precisa de atenção agora" />
          <CardBody>
            {acoes.length === 0 ? (
              <div className="flex items-center gap-2 py-6 text-base text-text-muted">
                <TickCircle size={18} className="text-success" aria-hidden />
                Tudo em dia por aqui.
              </div>
            ) : (
              <ul className="flex flex-col gap-1">
                {acoes.map((a) => (
                  <li key={a.text}>
                    <Link to={a.href} className="flex items-center gap-3 rounded-md px-2 py-2.5 text-base text-text transition-colors hover:bg-surface">
                      <IconCircle tone="accent" size="sm">
                        <a.icon size={16} aria-hidden />
                      </IconCircle>
                      <span className="flex-1">{a.text}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
