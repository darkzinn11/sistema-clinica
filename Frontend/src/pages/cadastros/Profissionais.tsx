import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Add, Edit2, Element4, RowVertical, SearchNormal1, TickCircle, Warning2 } from "iconsax-reactjs";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Segmented } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { Badge, type Tone } from "@/components/ui/badge";
import { Modal } from "@/components/ui/overlay";
import { Table, TBody, TD, THead, TH, TR, TableFooter } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import { TODAY, clinic, professionals } from "@/lib/mock/core";
import { ACCESS_STATUSES, SPECIALTY_NAMES, type AccessStatus, defaultWeekSchedule, professionalAccessStatus, professionalProcedures, professionalProfile } from "@/lib/mock/cadastros";

const TODAY_WEEKDAY = new Date(`${TODAY}T12:00:00`).getDay();

const STATUS_TONE: Record<AccessStatus, Tone> = {
  Ativo: "success",
  "Convite pendente": "info",
  "Convite expirado": "warning",
  "Acesso legado": "danger",
  "Sem convite": "neutral",
  Desabilitado: "neutral",
  Inativo: "neutral",
};

const STATUS_DOT_CLASS: Record<AccessStatus, string> = {
  Ativo: "bg-success",
  "Convite pendente": "bg-info",
  "Convite expirado": "bg-warning",
  "Acesso legado": "bg-danger",
  "Sem convite": "bg-text-subtle",
  Desabilitado: "bg-text-subtle",
  Inativo: "bg-text-subtle",
};

export default function Profissionais() {
  const [view, setView] = useState<"cartoes" | "tabela">("cartoes");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const withAccess = useMemo(() => professionals.map((p) => ({ prof: p, access: professionalAccessStatus(p), profile: professionalProfile(p) })), []);

  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(ACCESS_STATUSES.map((s) => [s, 0])) as Record<AccessStatus, number>;
    for (const { access } of withAccess) counts[access.status] += 1;
    return counts;
  }, [withAccess]);

  const unverified = useMemo(() => withAccess.filter((w) => w.access.accessEmail && !w.access.emailVerified), [withAccess]);

  const query = search.trim().toLowerCase();
  const filtered = withAccess.filter(({ prof, access }) => {
    if (query !== "" && !prof.name.toLowerCase().includes(query) && !prof.specialty.toLowerCase().includes(query) && !(access.accessEmail ?? "").toLowerCase().includes(query)) return false;
    if (statusFilter && access.status !== statusFilter) return false;
    return true;
  });

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
        description={`${clinic.name} · ${professionals.length} cadastros · ${statusCounts["Convite pendente"] + statusCounts["Convite expirado"] + statusCounts["Sem convite"]} com acesso pendente`}
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

      {unverified.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border border-warning-bg bg-warning-bg px-4 py-2.5 text-sm text-warning">
          <Warning2 size={16} aria-hidden className="shrink-0" />
          <span>
            <span className="font-medium">{unverified.length}</span> {unverified.length === 1 ? "profissional sem e-mail de acesso verificado" : "profissionais sem e-mail de acesso verificado"}. Resolva antes da migração ao login único.
          </span>
          <button type="button" className="font-medium underline underline-offset-2" onClick={() => setStatusFilter("")}>
            Revisar estes profissionais
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Input placeholder="Buscar profissional, especialidade ou e-mail…" icon={SearchNormal1} value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar profissional" wrapperClassName="w-80" />
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

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter("")}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              statusFilter === "" ? "bg-accent text-on-accent" : "bg-surface text-text-muted hover:text-text",
            )}
          >
            Todos <span className="tabular opacity-70">({professionals.length})</span>
          </button>
          {ACCESS_STATUSES.filter((status) => statusCounts[status] > 0).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter((prev) => (prev === status ? "" : status))}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                statusFilter === status ? "border-accent bg-accent-muted text-accent" : "border-border text-text-muted hover:border-border-strong hover:text-text",
              )}
            >
              <span aria-hidden className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATUS_DOT_CLASS[status])} />
              {status}
              <span className="tabular opacity-70">{statusCounts[status]}</span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <Card>
            <EmptyState icon={SearchNormal1} title="Nenhum profissional encontrado" description="Tente outro termo de busca ou ajuste os filtros." />
          </Card>
        ) : view === "cartoes" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(({ prof, access, profile }) => {
              const procs = professionalProcedures(prof.id).length;
              const working = statusHoje(prof.id);
              return (
                <Link key={prof.id} to={`/cadastros/profissionais/${prof.id}`} className="block">
                  <Card className="h-full transition-colors hover:border-border-strong">
                    <CardBody className="flex flex-col gap-3">
                      <div className="flex items-start gap-3">
                        <span className="relative shrink-0">
                          <Avatar name={prof.name} size="lg" />
                          <span aria-hidden className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface-raised" style={{ background: `var(--c-series-${prof.color + 1})` }} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-semibold text-text">{prof.name}</p>
                          <p className="truncate text-sm text-text-muted">{prof.specialty}</p>
                          <p className="truncate text-xs text-text-subtle">{profile.units.map((u) => clinic.units.find((cu) => cu.id === u)?.name).join(", ")}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                        <Badge tone={STATUS_TONE[access.status]} dot>
                          {access.status}
                        </Badge>
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
                  <TH>Nome</TH>
                  <TH>Especialidade</TH>
                  <TH>Unidades</TH>
                  <TH>E-mail de acesso</TH>
                  <TH>Acesso</TH>
                  <TH className="w-10" aria-label="Ações" />
                </tr>
              </THead>
              <TBody>
                {filtered.map(({ prof, access, profile }) => (
                  <TR key={prof.id} interactive>
                    <TD>
                      <Link to={`/cadastros/profissionais/${prof.id}`} className="flex items-center gap-2.5 font-medium text-text hover:underline">
                        <Avatar name={prof.name} size="sm" />
                        {prof.name}
                      </Link>
                    </TD>
                    <TD className="text-text-muted">{prof.specialty}</TD>
                    <TD className="text-text-muted">{profile.units.map((u) => clinic.units.find((cu) => cu.id === u)?.name).join(", ") || "—"}</TD>
                    <TD className="text-text-muted">{access.accessEmail ?? "—"}</TD>
                    <TD>
                      <Badge tone={STATUS_TONE[access.status]} dot>
                        {access.status}
                      </Badge>
                    </TD>
                    <TD onClick={(e) => e.stopPropagation()}>
                      <ButtonLink to={`/cadastros/profissionais/${prof.id}`} variant="ghost" size="sm" iconOnly icon={Edit2} aria-label={`Editar ${prof.name}`} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <TableFooter total={filtered.length} pageSize={Math.max(filtered.length, 1)} label="profissionais" />
          </Card>
        )}
      </div>

      <Modal
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
          <Select label="Especialidade" placeholder="Selecione" options={SPECIALTY_NAMES.map((s) => ({ value: s, label: s }))} required />
          <Input label="Registro no conselho" placeholder="Ex.: CRM-MA 00000" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Telefone" type="tel" placeholder="(98) 90000-0000" />
            <Input label="E-mail" type="email" placeholder="nome@vidaplena.com.br" />
          </div>
        </form>
      </Modal>
    </div>
  );
}
