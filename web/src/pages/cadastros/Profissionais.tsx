import { useState } from "react";
import { Link } from "react-router";
import { Add, Element4, RowVertical, SearchNormal1, TickCircle } from "iconsax-reactjs";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Segmented } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Drawer } from "@/components/ui/overlay";
import { Table, TBody, TD, THead, TH, TR, TableFooter } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { TODAY, professionals } from "@/lib/mock/core";
import { defaultWeekSchedule, professionalProcedures } from "@/lib/mock/cadastros";

const TODAY_WEEKDAY = new Date(`${TODAY}T12:00:00`).getDay();
const SPECIALTIES = [...new Set(professionals.map((p) => p.specialty))];

export default function Profissionais() {
  const [view, setView] = useState<"cartoes" | "tabela">("cartoes");
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const query = search.trim().toLowerCase();
  const filtered = professionals.filter((p) => query === "" || p.name.toLowerCase().includes(query) || p.specialty.toLowerCase().includes(query));

  function statusHoje(profId: string) {
    const schedule = defaultWeekSchedule(professionals.find((p) => p.id === profId)!);
    return schedule[TODAY_WEEKDAY].enabled;
  }

  function handleSave() {
    setDrawerOpen(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 4000);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Profissionais"
        description="Médicos e profissionais de saúde da clínica — horários, procedimentos e repasse."
        breadcrumbs={[{ label: "Cadastros", href: "/cadastros" }, { label: "Profissionais" }]}
        actions={
          <Button variant="primary" icon={Add} onClick={() => setDrawerOpen(true)}>
            Novo profissional
          </Button>
        }
      />

      {saved && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-success-bg bg-success-bg px-4 py-2.5 text-sm text-success">
          <TickCircle size={16} aria-hidden />
          Profissional cadastrado com sucesso.
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Input placeholder="Buscar por nome ou especialidade…" icon={SearchNormal1} value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar profissional" wrapperClassName="w-72" />
          <Segmented
            label="Visualização"
            size="sm"
            value={view}
            onChange={setView}
            options={[
              { value: "cartoes", label: "Cartões", icon: Element4 },
              { value: "tabela", label: "Tabela", icon: RowVertical },
            ]}
          />
        </div>

        {filtered.length === 0 ? (
          <Card>
            <EmptyState icon={SearchNormal1} title="Nenhum profissional encontrado" description="Tente outro termo de busca." />
          </Card>
        ) : view === "cartoes" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => {
              const procs = professionalProcedures(p.id).length;
              const working = statusHoje(p.id);
              return (
                <Link key={p.id} to={`/cadastros/profissionais/${p.id}`} className="block">
                  <Card className="h-full transition-colors hover:border-border-strong">
                    <CardBody className="flex flex-col gap-3">
                      <div className="flex items-start gap-3">
                        <span className="relative shrink-0">
                          <Avatar name={p.name} size="lg" />
                          <span aria-hidden className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface-raised" style={{ background: `var(--c-series-${p.color + 1})` }} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-semibold text-text">{p.name}</p>
                          <p className="truncate text-sm text-text-muted">{p.specialty}</p>
                          <p className="truncate text-xs text-text-subtle">{p.council}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                        <Badge tone={working ? "success" : "neutral"} dot>
                          {working ? "Atendendo hoje" : "Folga hoje"}
                        </Badge>
                        <span className="text-sm text-text-muted">
                          <span className="tabular font-medium text-text">{procs}</span> procedimentos
                        </span>
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <Card>
            <Table>
              <THead>
                <tr>
                  <TH>Profissional</TH>
                  <TH>Especialidade</TH>
                  <TH>Conselho</TH>
                  <TH>Status hoje</TH>
                  <TH align="right">Procedimentos</TH>
                </tr>
              </THead>
              <TBody>
                {filtered.map((p) => {
                  const procs = professionalProcedures(p.id).length;
                  const working = statusHoje(p.id);
                  return (
                    <TR key={p.id} interactive>
                      <TD>
                        <Link to={`/cadastros/profissionais/${p.id}`} className="flex items-center gap-2.5 font-medium text-text hover:underline">
                          <Avatar name={p.name} size="sm" />
                          {p.name}
                        </Link>
                      </TD>
                      <TD>{p.specialty}</TD>
                      <TD className="text-text-muted">{p.council}</TD>
                      <TD>
                        <Badge tone={working ? "success" : "neutral"} dot>
                          {working ? "Atendendo hoje" : "Folga hoje"}
                        </Badge>
                      </TD>
                      <TD numeric>{procs}</TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
            <TableFooter total={filtered.length} pageSize={Math.max(filtered.length, 1)} label="profissionais" />
          </Card>
        )}
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Novo profissional"
        description="Cadastre um médico ou profissional de saúde."
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
          <Input label="Nome completo" placeholder="Ex.: Dra. Mariana Costa" required />
          <Select label="Especialidade" placeholder="Selecione" options={SPECIALTIES.map((s) => ({ value: s, label: s }))} required />
          <Input label="Registro no conselho" placeholder="Ex.: CRM-MA 00000" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Telefone" type="tel" placeholder="(98) 90000-0000" />
            <Input label="E-mail" type="email" placeholder="nome@vidaplena.com.br" />
          </div>
        </form>
      </Drawer>
    </div>
  );
}
