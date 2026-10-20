import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Add, SearchNormal1, TickCircle } from "iconsax-reactjs";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/overlay";
import { Table, TBody, TD, THead, TH, TR, TableFooter } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { insurances } from "@/lib/mock/core";
import { insuranceBilling, insurancePlans } from "@/lib/mock/cadastros";

export default function Convenios() {
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const list = insurances.filter((i) => i.id !== "i0");
  const query = search.trim().toLowerCase();
  const filtered = useMemo(() => list.filter((i) => query === "" || i.name.toLowerCase().includes(query) || i.ans.toLowerCase().includes(query)), [list, query]);

  function handleSave() {
    setDrawerOpen(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3500);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Convênios"
        description="Operadoras de saúde credenciadas, planos e regras de faturamento."
        breadcrumbs={[{ label: "Cadastros", href: "/cadastros" }, { label: "Convênios" }]}
        actions={
          <Button variant="primary" icon={Add} onClick={() => setDrawerOpen(true)}>
            Novo convênio
          </Button>
        }
      />

      {saved && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-success-bg bg-success-bg px-4 py-2.5 text-sm text-success">
          <TickCircle size={16} aria-hidden />
          Convênio cadastrado com sucesso.
        </div>
      )}

      <div className="flex flex-col gap-4">
        <Input placeholder="Buscar por nome ou registro ANS…" icon={SearchNormal1} value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar convênio" wrapperClassName="max-w-sm" />

        <Card>
          {filtered.length === 0 ? (
            <EmptyState icon={SearchNormal1} title="Nenhum convênio encontrado" description="Ajuste a busca acima." />
          ) : (
            <>
              <Table>
                <THead>
                  <tr>
                    <TH>Convênio</TH>
                    <TH>Registro ANS</TH>
                    <TH align="right">Planos</TH>
                    <TH align="right">Prazo de pagamento</TH>
                    <TH>Versão TISS</TH>
                    <TH>Status</TH>
                  </tr>
                </THead>
                <TBody>
                  {filtered.map((ins) => {
                    const billing = insuranceBilling(ins.id);
                    const plans = insurancePlans(ins.id);
                    return (
                      <TR key={ins.id} interactive>
                        <TD>
                          <Link to={`/cadastros/convenios/${ins.id}`} className="font-medium text-text hover:underline">
                            {ins.name}
                          </Link>
                        </TD>
                        <TD className="text-text-muted">{ins.ans}</TD>
                        <TD numeric>{plans.length}</TD>
                        <TD numeric>{billing.prazoPagamentoDias} dias</TD>
                        <TD>{billing.versaoTiss}</TD>
                        <TD>
                          <Badge tone={billing.ativo ? "success" : "neutral"} dot>
                            {billing.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
              <TableFooter total={filtered.length} pageSize={Math.max(filtered.length, 1)} label="convênios" />
            </>
          )}
        </Card>
      </div>

      <Modal
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Novo convênio"
        description="Credencie uma nova operadora de saúde."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDrawerOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSave}>
              Salvar
            </Button>
          </>
        }
      >
        <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
          <Input label="Nome da operadora" placeholder="Ex.: Amil Saúde" required />
          <Input label="Registro ANS" placeholder="00.000-0" required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Prazo de pagamento (dias)" type="number" placeholder="30" />
            <Input label="Versão TISS" placeholder="4.01.00" />
          </div>
        </form>
      </Modal>
    </div>
  );
}
