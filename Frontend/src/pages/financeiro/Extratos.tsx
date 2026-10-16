import { useState } from "react";
import { DocumentUpload, LinkCircle, TickCircle } from "iconsax-reactjs";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Meter } from "@/components/ui/misc";
import { EmptyState } from "@/components/ui/empty-state";
import { brl, dateBR } from "@/lib/format";
import { CONTAS, contaCorrente, extratoLinhas as extratoInicial, lancamentoById, pctConciliado, type ExtratoLinha } from "@/lib/mock/financeiro";

export default function Extratos() {
  const [conta, setConta] = useState<string>(CONTAS[0]);
  const [linhas, setLinhas] = useState<ExtratoLinha[]>(extratoInicial);

  const pct = linhas.length ? Math.round((linhas.filter((l) => l.conciliado).length / linhas.length) * 100) : pctConciliado();
  const pendentes = linhas.filter((l) => !l.conciliado);
  const conciliadas = linhas.filter((l) => l.conciliado);

  function conciliar(id: string) {
    setLinhas((prev) => prev.map((l) => (l.id === id ? { ...l, conciliado: true, sugestaoLancamentoId: undefined } : l)));
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Extratos e conciliação"
        description="Compare o extrato bancário com os lançamentos financeiros e concilie as pendências."
        breadcrumbs={[{ label: "Financeiro", href: "/financeiro" }, { label: "Extratos e conciliação" }]}
        actions={
          <Button variant="secondary" icon={DocumentUpload}>
            Importar extrato (OFX)
          </Button>
        }
      />

      <Card>
        <CardHeader
          title={conta}
          description={`Saldo atual ${brl(contaCorrente.saldoCents)}`}
          actions={<Select aria-label="Conta" value={conta} onChange={(e) => setConta(e.target.value)} options={CONTAS.map((c) => ({ value: c, label: c }))} wrapperClassName="w-60" />}
        />
        <CardBody className="flex flex-col gap-5">
          <Meter label="Conciliado" value={pct} max={100} tone={pct >= 90 ? "success" : pct >= 60 ? "warning" : "danger"} showValue={`${pct}%`} />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-text">Extrato bancário</h3>
              <ul className="flex flex-col divide-y divide-border rounded-lg">
                {linhas.map((l) => {
                  const sugestao = l.sugestaoLancamentoId ? lancamentoById(l.sugestaoLancamentoId) : undefined;
                  return (
                    <li key={l.id} className="flex flex-col gap-2 px-3.5 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-text">{l.descricao}</p>
                          <p className="text-xs text-text-muted">{dateBR(l.data)}</p>
                        </div>
                        <span className={`tabular shrink-0 text-sm font-semibold ${l.valorCents >= 0 ? "text-success" : "text-danger"}`}>
                          {l.valorCents >= 0 ? "+" : "−"}
                          {brl(Math.abs(l.valorCents))}
                        </span>
                      </div>
                      {l.conciliado ? (
                        <Badge tone="success" dot size="sm" className="self-start">Conciliado</Badge>
                      ) : sugestao ? (
                        <div className="flex items-center justify-between gap-2 rounded-lg bg-accent-muted px-2.5 py-1.5">
                          <p className="min-w-0 truncate text-xs text-accent">
                            Sugestão: {sugestao.descricao} · <Badge tone="accent" size="sm">{l.confianca}% confiança</Badge>
                          </p>
                          <Button size="xs" variant="subtle" icon={LinkCircle} onClick={() => conciliar(l.id)}>Conciliar</Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <Badge tone="neutral" size="sm">Sem sugestão</Badge>
                          <Button size="xs" variant="ghost" onClick={() => conciliar(l.id)}>Criar lançamento</Button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-text">Lançamentos conciliados</h3>
              {conciliadas.length === 0 ? (
                <EmptyState title="Nenhuma conciliação ainda" description="Concilie linhas do extrato à esquerda para vê-las aqui." className="py-10" />
              ) : (
                <ul className="flex flex-col divide-y divide-border rounded-lg">
                  {conciliadas.map((l) => (
                    <li key={l.id} className="flex items-center justify-between gap-3 px-3.5 py-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <TickCircle size={16} className="shrink-0 text-success" aria-hidden />
                        <div className="min-w-0">
                          <p className="truncate text-sm text-text">{l.descricao}</p>
                          <p className="text-xs text-text-muted">{dateBR(l.data)}</p>
                        </div>
                      </div>
                      <span className="tabular shrink-0 text-sm font-medium text-text">{brl(Math.abs(l.valorCents))}</span>
                    </li>
                  ))}
                </ul>
              )}
              {pendentes.length > 0 && <p className="text-sm text-text-muted">{pendentes.length} linha(s) ainda pendente(s) de conciliação.</p>}
            </section>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
