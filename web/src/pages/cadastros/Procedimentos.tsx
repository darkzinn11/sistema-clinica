import { useMemo, useState } from "react";
import { Add, SearchNormal1, TickCircle } from "iconsax-reactjs";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Drawer } from "@/components/ui/overlay";
import { Table, TBody, TD, THead, TH, TR, TableFooter } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { brl } from "@/lib/format";
import { type Procedure, insuranceName, procedures } from "@/lib/mock/core";
import { procedurePreparo, procedurePricesByInsurance } from "@/lib/mock/cadastros";

const SPECIALTIES = [...new Set(procedures.map((p) => p.specialty))];
const KIND_LABELS: Record<Procedure["kind"], string> = { consulta: "Consulta", exame: "Exame", procedimento: "Procedimento", sessao: "Sessão" };

export default function Procedimentos() {
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [kind, setKind] = useState("");
  const [selected, setSelected] = useState<Procedure | null>(null);
  const [saved, setSaved] = useState(false);

  const query = search.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      procedures.filter(
        (p) =>
          (query === "" || p.name.toLowerCase().includes(query) || p.tuss.includes(query)) &&
          (specialty === "" || p.specialty === specialty) &&
          (kind === "" || p.kind === kind),
      ),
    [query, specialty, kind],
  );

  function handleSave() {
    setSelected(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 3500);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Procedimentos"
        description="Catálogo de consultas, exames e procedimentos oferecidos pela clínica."
        breadcrumbs={[{ label: "Cadastros", href: "/cadastros" }, { label: "Procedimentos" }]}
        actions={
          <Button variant="primary" icon={Add}>
            Novo procedimento
          </Button>
        }
      />

      {saved && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-success-bg bg-success-bg px-4 py-2.5 text-sm text-success">
          <TickCircle size={16} aria-hidden />
          Procedimento atualizado com sucesso.
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input placeholder="Buscar por nome ou TUSS…" icon={SearchNormal1} value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar procedimento" wrapperClassName="w-64" />
          <Select wrapperClassName="w-52" value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Todas as especialidades" options={SPECIALTIES.map((s) => ({ value: s, label: s }))} aria-label="Filtrar por especialidade" />
          <Select wrapperClassName="w-44" value={kind} onChange={(e) => setKind(e.target.value)} placeholder="Todos os tipos" options={Object.entries(KIND_LABELS).map(([value, label]) => ({ value, label }))} aria-label="Filtrar por tipo" />
        </div>

        <Card>
          {filtered.length === 0 ? (
            <EmptyState icon={SearchNormal1} title="Nenhum procedimento encontrado" description="Ajuste a busca ou os filtros acima." />
          ) : (
            <>
              <Table>
                <THead>
                  <tr>
                    <TH>TUSS</TH>
                    <TH>Nome</TH>
                    <TH>Especialidade</TH>
                    <TH>Tipo</TH>
                    <TH align="right">Duração</TH>
                    <TH align="right">Valor particular</TH>
                    <TH>Preparo</TH>
                  </tr>
                </THead>
                <TBody>
                  {filtered.map((p) => (
                    <TR key={p.id} interactive onClick={() => setSelected(p)}>
                      <TD className="tabular text-text-muted">{p.tuss}</TD>
                      <TD className="font-medium text-text">{p.name}</TD>
                      <TD>{p.specialty}</TD>
                      <TD>{KIND_LABELS[p.kind]}</TD>
                      <TD numeric>{p.durationMin} min</TD>
                      <TD numeric>{brl(p.priceCents)}</TD>
                      <TD>
                        {p.kind === "consulta" ? (
                          <Badge tone="neutral">Sem preparo</Badge>
                        ) : (
                          <Badge tone="warning">Com preparo</Badge>
                        )}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
              <TableFooter total={filtered.length} pageSize={Math.max(filtered.length, 1)} label="procedimentos" />
            </>
          )}
        </Card>
      </div>

      <Drawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ""}
        description={selected ? `${selected.specialty} · TUSS ${selected.tuss}` : undefined}
        width="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSelected(null)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSave}>
              Salvar
            </Button>
          </>
        }
      >
        {selected && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Nome" defaultValue={selected.name} />
              <Input label="TUSS" defaultValue={selected.tuss} />
              <Select label="Especialidade" defaultValue={selected.specialty} options={SPECIALTIES.map((s) => ({ value: s, label: s }))} />
              <Select label="Tipo" defaultValue={selected.kind} options={Object.entries(KIND_LABELS).map(([value, label]) => ({ value, label }))} />
              <Input label="Duração (min)" type="number" defaultValue={selected.durationMin} />
              <Input label="Valor particular" type="number" defaultValue={(selected.priceCents / 100).toFixed(2)} suffix="R$" />
            </div>
            <Textarea label="Preparo e orientações ao paciente" defaultValue={procedurePreparo(selected.id)} rows={3} hint="Exibido na confirmação do agendamento e no lembrete enviado ao paciente." />
            <div>
              <p className="mb-2 text-sm font-medium text-text">Valores por convênio</p>
              <Table>
                <THead>
                  <tr>
                    <TH>Convênio</TH>
                    <TH align="right">Valor</TH>
                  </tr>
                </THead>
                <TBody>
                  {procedurePricesByInsurance(selected.id).map((row) => (
                    <TR key={row.insuranceId}>
                      <TD>{insuranceName(row.insuranceId)}</TD>
                      <TD numeric>{brl(row.priceCents)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
