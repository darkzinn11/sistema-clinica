import { Add, CloseCircle, DocumentText, SearchNormal1 } from "iconsax-reactjs";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Tooltip } from "@/components/ui/misc";
import { brl } from "@/lib/format";
import { norm, PREPARO, PRICE_TABLES, priceFor } from "@/lib/mock/agenda";
import { procedures } from "@/lib/mock/core";

export default function Page() {
  const [query, setQuery] = useState("");
  const [tableId, setTableId] = useState("i0");
  const [budget, setBudget] = useState<string[]>([]);

  const filtered = procedures.filter((p) => !query || norm(p.name).includes(norm(query)) || norm(p.specialty).includes(norm(query)));
  const total = budget.reduce((s, id) => {
    const proc = procedures.find((p) => p.id === id);
    if (!proc) return s;
    return s + (priceFor(proc, tableId) ?? 0);
  }, 0);

  function toggleBudget(id: string) {
    setBudget((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Consultar valores"
        breadcrumbs={[{ label: "Agenda", href: "/agenda" }, { label: "Consultar valores" }]}
        description="Preços por procedimento, particular ou por convênio, com duração e preparo."
      />

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <Card className="min-w-0 flex-1">
          <CardBody className="flex flex-wrap items-center gap-3 border-b border-border">
            <Input icon={SearchNormal1} placeholder="Buscar procedimento ou especialidade…" value={query} onChange={(e) => setQuery(e.target.value)} wrapperClassName="w-72" aria-label="Buscar procedimento" />
            <Select value={tableId} onChange={(e) => setTableId(e.target.value)} options={PRICE_TABLES.map((t) => ({ value: t.id, label: t.name }))} wrapperClassName="w-56" aria-label="Tabela de preços" />
          </CardBody>
          {filtered.length === 0 ? (
            <EmptyState title="Nenhum procedimento encontrado" description="Tente outro termo de busca." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Procedimento</TH>
                  <TH>TUSS</TH>
                  <TH>Duração</TH>
                  <TH align="right">Particular</TH>
                  <TH align="right">{PRICE_TABLES.find((t) => t.id === tableId)?.name ?? "Tabela"}</TH>
                  <TH align="right">Orçamento</TH>
                </TR>
              </THead>
              <TBody>
                {filtered.map((p) => {
                  const tablePrice = priceFor(p, tableId);
                  const inBudget = budget.includes(p.id);
                  return (
                    <TR key={p.id}>
                      <TD>
                        <span className="flex items-center gap-1.5">
                          {p.name}
                          {PREPARO[p.id] && (
                            <Tooltip content={PREPARO[p.id]}>
                              <DocumentText size={14} className="text-text-subtle" aria-label={`Preparo: ${PREPARO[p.id]}`} />
                            </Tooltip>
                          )}
                        </span>
                      </TD>
                      <TD className="tabular text-text-muted">{p.tuss}</TD>
                      <TD className="text-text-muted">{p.durationMin} min</TD>
                      <TD align="right" numeric>{brl(p.priceCents)}</TD>
                      <TD align="right" numeric>{tablePrice === null ? <span className="text-text-subtle">Não coberto</span> : brl(tablePrice)}</TD>
                      <TD align="right">
                        <Button size="xs" variant={inBudget ? "subtle" : "ghost"} icon={inBudget ? CloseCircle : Add} onClick={() => toggleBudget(p.id)}>
                          {inBudget ? "Remover" : "Adicionar"}
                        </Button>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </Card>

        <Card className="w-full shrink-0 lg:w-80">
          <CardHeader title="Orçamento rápido" description={`${budget.length} procedimento(s)`} />
          <CardBody className="flex flex-col gap-2">
            {budget.length === 0 ? (
              <p className="text-sm text-text-muted">Adicione procedimentos da tabela ao lado pra montar um orçamento.</p>
            ) : (
              budget.map((id) => {
                const proc = procedures.find((p) => p.id === id)!;
                const price = priceFor(proc, tableId) ?? 0;
                return (
                  <div key={id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-text">{proc.name}</span>
                    <span className="tabular shrink-0 font-medium text-text">{brl(price)}</span>
                  </div>
                );
              })
            )}
            {budget.length > 0 && (
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-base font-semibold text-text">
                <span>Total</span>
                <span className="tabular">{brl(total)}</span>
              </div>
            )}
          </CardBody>
          <CardFooter className="flex-col items-stretch gap-2">
            <ButtonLink to="/financeiro/propostas" variant="secondary" size="sm">
              Gerar proposta
            </ButtonLink>
            <ButtonLink to="/agenda?novo=1" variant="primary" size="sm">
              Agendar
            </ButtonLink>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
