import { Add, CloseCircle, DocumentText, SearchNormal1 } from "iconsax-reactjs";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/input";
import { Skeleton, Tooltip } from "@/components/ui/misc";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/lib/api/client";
import { brl } from "@/lib/format";

interface PriceRow {
  id: string;
  nome: string;
  sigla: string | null;
  tipo: "consulta" | "exame" | "procedimento";
  codigoTuss: string | null;
  duracaoMin: number | null;
  valorCentavos: number | null;
  preparo: string | null;
  avisoAgendamento: string | null;
}

const KIND_LABEL = { consulta: "Consulta", exame: "Exame", procedimento: "Procedimento" } as const;

function useDebounced(value: string, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

export default function Page() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("todos");
  const [budget, setBudget] = useState<string[]>([]);
  const term = useDebounced(query);
  const list = useQuery({
    queryKey: ["procedimentos", "valores", term, kind],
    queryFn: () => api<PriceRow[]>("/procedimentos", { query: { ativo: true, busca: term, tipo: kind === "todos" ? undefined : kind, tamanho: 200 } }),
    staleTime: 30_000,
  });
  // O orçamento guarda as linhas escolhidas, para continuar certo mesmo se a busca mudar.
  const [chosen, setChosen] = useState<Record<string, PriceRow>>({});
  const rows = list.data ?? [];
  const hasPrices = rows.some((p) => p.valorCentavos !== null);
  const total = budget.reduce((sum, id) => sum + (chosen[id]?.valorCentavos ?? 0), 0);

  function toggleBudget(row: PriceRow) {
    setBudget((prev) => (prev.includes(row.id) ? prev.filter((x) => x !== row.id) : [...prev, row.id]));
    setChosen((prev) => ({ ...prev, [row.id]: row }));
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Consultar valores"
        breadcrumbs={[{ label: "Agenda", href: "/agenda" }, { label: "Consultar valores" }]}
        description="Preço particular por procedimento, com duração, preparo e orientações de agendamento."
      />

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <Card className="min-w-0 flex-1">
          <CardBody className="flex flex-wrap items-center gap-3 border-b border-border">
            <Input icon={SearchNormal1} placeholder="Buscar procedimento…" value={query} onChange={(e) => setQuery(e.target.value)} wrapperClassName="w-72" aria-label="Buscar procedimento" />
            <Select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              options={[{ value: "todos", label: "Todos os tipos" }, { value: "consulta", label: "Consultas" }, { value: "exame", label: "Exames" }, { value: "procedimento", label: "Procedimentos" }]}
              wrapperClassName="w-52"
              aria-label="Tipo"
            />
          </CardBody>
          {list.isPending ? (
            <div className="p-5"><Skeleton className="h-64 w-full" /></div>
          ) : list.isError ? (
            <EmptyState title="Não foi possível carregar os procedimentos." description={list.error.message} />
          ) : rows.length === 0 ? (
            <EmptyState title="Nenhum procedimento encontrado" description="Tente outro termo de busca." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Procedimento</TH>
                  <TH>Tipo</TH>
                  <TH>TUSS</TH>
                  <TH>Duração</TH>
                  <TH align="right">Particular</TH>
                  <TH align="right">Orçamento</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((p) => {
                  const inBudget = budget.includes(p.id);
                  const note = [p.preparo ? `Preparo: ${p.preparo}` : null, p.avisoAgendamento ? `Aviso: ${p.avisoAgendamento}` : null].filter(Boolean).join(" · ");
                  return (
                    <TR key={p.id}>
                      <TD>
                        <span className="flex items-center gap-1.5">
                          {p.nome}
                          {note && (
                            <Tooltip content={note}>
                              <DocumentText size={14} className="text-text-subtle" aria-label={note} />
                            </Tooltip>
                          )}
                        </span>
                      </TD>
                      <TD className="text-text-muted">{KIND_LABEL[p.tipo]}</TD>
                      <TD className="tabular text-text-muted">{p.codigoTuss ?? "—"}</TD>
                      <TD className="text-text-muted">{p.duracaoMin ? `${p.duracaoMin} min` : "—"}</TD>
                      <TD align="right" numeric>{p.valorCentavos === null ? <span className="text-text-subtle">Restrito</span> : brl(p.valorCentavos)}</TD>
                      <TD align="right">
                        <Button size="xs" variant={inBudget ? "subtle" : "ghost"} icon={inBudget ? CloseCircle : Add} disabled={p.valorCentavos === null} onClick={() => toggleBudget(p)}>
                          {inBudget ? "Remover" : "Adicionar"}
                        </Button>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
          {!list.isPending && !hasPrices && rows.length > 0 && (
            <p className="border-t border-border px-5 py-3 text-sm text-text-muted">Os valores são restritos ao seu perfil.</p>
          )}
        </Card>

        <Card className="w-full shrink-0 lg:w-80">
          <CardHeader title="Orçamento rápido" description={`${budget.length} procedimento(s)`} />
          <CardBody className="flex flex-col gap-2">
            {budget.length === 0 ? (
              <p className="text-sm text-text-muted">Adicione procedimentos da tabela ao lado pra montar um orçamento.</p>
            ) : (
              budget.map((id) => (
                <div key={id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-text">{chosen[id]?.nome}</span>
                  <span className="tabular shrink-0 font-medium text-text">{brl(chosen[id]?.valorCentavos ?? 0)}</span>
                </div>
              ))
            )}
            {budget.length > 0 && (
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-base font-semibold text-text">
                <span>Total</span>
                <span className="tabular">{brl(total)}</span>
              </div>
            )}
          </CardBody>
          <CardFooter className="flex-col items-stretch gap-2">
            <ButtonLink to="/agenda?novo=1" variant="primary" size="sm">
              Agendar
            </ButtonLink>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
