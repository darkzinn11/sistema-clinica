import { Import, SearchNormal1, Warning2 } from "iconsax-reactjs";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/overlay";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR, TableFooter } from "@/components/ui/table";
import { brl } from "@/lib/format";
import { procedures } from "@/lib/mock/core";
import { CONVENIOS, valorConvenio } from "@/lib/mock/faturamento";

export default function TabelaValores() {
  const [insuranceId, setInsuranceId] = useState(CONVENIOS[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [importOpen, setImportOpen] = useState(false);

  const filtered = procedures.filter((p) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return p.name.toLowerCase().includes(term) || p.tuss.includes(term);
  });

  const rows = useMemo(
    () =>
      filtered.map((p) => {
        const v = valorConvenio(insuranceId, p.id);
        const key = `${insuranceId}:${p.id}`;
        const contratado = overrides[key] ?? v?.valorContratadoCents ?? 0;
        const praticado = v?.valorPraticadoCents ?? p.priceCents;
        const divergenciaPct = praticado > 0 ? Math.round(((contratado - praticado) / praticado) * 1000) / 10 : 0;
        return { procedure: p, key, contratado, praticado, divergenciaPct };
      }),
    [filtered, insuranceId, overrides],
  );

  function updateContratado(key: string, valueReais: string) {
    const cents = Math.round(Number(valueReais.replace(",", ".")) * 100);
    if (Number.isNaN(cents)) return;
    setOverrides((prev) => ({ ...prev, [key]: cents }));
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Tabela de valores"
        description="Valores contratados por convênio comparados ao valor praticado pela clínica."
        breadcrumbs={[{ label: "Faturamento TISS", href: "/faturamento" }, { label: "Tabela de valores" }]}
        actions={<Button variant="secondary" icon={Import} onClick={() => setImportOpen(true)}>Importar tabela</Button>}
      />

      <Card>
        <CardBody className="flex flex-wrap items-center gap-2 border-b border-border">
          <Select aria-label="Convênio" value={insuranceId} onChange={(e) => setInsuranceId(e.target.value)} wrapperClassName="w-56" options={CONVENIOS.map((c) => ({ value: c.id, label: c.name }))} />
          <Input icon={SearchNormal1} placeholder="Buscar por procedimento ou código TUSS" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar procedimento" wrapperClassName="min-w-64 flex-1" />
        </CardBody>
        <Table>
          <THead>
            <TR><TH>TUSS</TH><TH>Descrição</TH><TH align="right">Valor contratado</TH><TH align="right">Valor praticado</TH><TH align="right">Divergência</TH></TR>
          </THead>
          <TBody>
            {rows.slice(0, 40).map((row) => (
              <TR key={row.key}>
                <TD className="tabular text-text-muted">{row.procedure.tuss}</TD>
                <TD className="font-medium text-text">{row.procedure.name}</TD>
                <TD numeric>
                  <input
                    aria-label={`Valor contratado para ${row.procedure.name}`}
                    defaultValue={(row.contratado / 100).toFixed(2)}
                    onBlur={(e) => updateContratado(row.key, e.target.value)}
                    className="tabular w-24 rounded-full border border-transparent bg-transparent px-3 py-1 text-right text-text hover:border-border-strong focus-visible:border-accent focus-visible:bg-surface-raised focus-visible:outline-none"
                  />
                </TD>
                <TD numeric className="text-text-muted">{brl(row.praticado)}</TD>
                <TD numeric>
                  {Math.abs(row.divergenciaPct) >= 1 ? (
                    <Badge tone={row.divergenciaPct < 0 ? "danger" : "warning"} dot icon={Math.abs(row.divergenciaPct) >= 10 ? Warning2 : undefined}>
                      {row.divergenciaPct > 0 ? "+" : ""}{row.divergenciaPct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
                    </Badge>
                  ) : (
                    <span className="text-text-subtle">—</span>
                  )}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
        <TableFooter total={rows.length} pageSize={40} label="procedimentos" />
      </Card>

      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Importar tabela de valores"
        description="Selecione um arquivo CSV ou XLSX exportado pelo convênio para atualizar os valores contratados."
        footer={<><Button variant="secondary" onClick={() => setImportOpen(false)}>Cancelar</Button><Button variant="primary" onClick={() => setImportOpen(false)}>Selecionar arquivo</Button></>}
      />
    </div>
  );
}
