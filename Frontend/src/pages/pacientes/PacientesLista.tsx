import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft2, ArrowRight2, Add, Cake, Calendar, Danger, Edit2, Grid2, More, RowVertical, SearchNormal1, UserAdd, UserRemove, UserTick } from "iconsax-reactjs";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/tabs";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Table, THead, TBody, TH, TR, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { DropdownMenu } from "@/components/ui/overlay";
import { DeactivateModal } from "@/components/pacientes/DeactivateModal";
import { Skeleton, Tooltip } from "@/components/ui/misc";
import { StatCard } from "@/components/ui/charts";
import { WhatsappIcon } from "@/components/ui/whatsapp-icon";
import { ApiError } from "@/lib/api/client";
import {
  usePatientStats, usePatients, usePriorities, useReactivatePatient, type PatientSummary,
} from "@/lib/api/pacientes";
import { dateBR } from "@/lib/format";
import { ageFrom, formatCpf, formatPhone, onlyDigits } from "@/lib/pacientes/options";
import { useAuth } from "@/lib/auth/auth";
import { cn } from "@/lib/cn";

type ViewMode = "tabela" | "cartoes";
type Situation = "ativos" | "inativos" | "todos";

const PAGE_SIZE = 20;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function useDebounced(value: string, ms = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

function document(p: PatientSummary): string {
  if (p.cpf) return formatCpf(p.cpf);
  return p.estrangeiro ? "Estrangeiro" : "Sem CPF";
}

function whatsapp(phone: string | null): string | null {
  const digits = onlyDigits(phone ?? "");
  return digits.length >= 10 ? `https://wa.me/${digits.length <= 11 ? `55${digits}` : digits}` : null;
}

export default function Page() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const [search, setSearch] = useState("");
  const [letter, setLetter] = useState("");
  const [situation, setSituation] = useState<Situation>("ativos");
  const [page, setPage] = useState(0);
  const [view, setView] = useState<ViewMode>("tabela");
  const [toDeactivate, setToDeactivate] = useState<PatientSummary | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const term = useDebounced(search);
  const list = usePatients({ busca: term, inicial: letter, situacao: situation, pagina: page, tamanho: PAGE_SIZE });
  const stats = usePatientStats();
  const priorities = usePriorities();
    const reactivate = useReactivatePatient();
  const priorityName = new Map((priorities.data ?? []).map((p) => [p.id, p.nome]));

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 3500);
    return () => clearTimeout(t);
  }, [banner]);

  const total = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rows = list.data?.items ?? [];
  const canEdit = can("pacientes:editar");
  const canInactivate = can("pacientes:inativar");

  const change = (apply: () => void) => { apply(); setPage(0); };

  function doReactivate(p: PatientSummary) {
    reactivate.mutateAsync(p.id)
      .then(() => setBanner(`${p.nome.split(" ")[0]} foi reativado(a).`))
      .catch((e) => setBanner(e instanceof ApiError ? e.message : "Não foi possível reativar."));
  }

  function menu(p: PatientSummary) {
    return [
      { label: "Abrir cadastro", icon: UserTick, href: `/pacientes/${p.id}` },
      ...(canEdit && p.ativo ? [{ label: "Editar", icon: Edit2, href: `/pacientes/${p.id}/editar` }] : []),
      ...(p.ativo ? [{ label: "Agendar", icon: Calendar, href: `/agenda?novo=1&paciente=${p.id}&nome=${encodeURIComponent(p.nome)}` }] : []),
      ...(canInactivate ? [{ label: "", divider: true }, p.ativo
        ? { label: "Inativar", icon: UserRemove, danger: true, onSelect: () => setToDeactivate(p) }
        : { label: "Reativar", icon: UserTick, onSelect: () => doReactivate(p) }] : []),
    ];
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Pacientes"
        description="Cadastro completo de cada paciente da clínica."
        breadcrumbs={[{ label: "Pacientes" }]}
        actions={<ButtonLink to="/pacientes/novo" variant="primary" icon={UserAdd}>Novo paciente</ButtonLink>}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 ui-stat-strip" data-columns="4">
        <StatCard label="Pacientes ativos" value={(stats.data?.ativos ?? 0).toLocaleString("pt-BR")} icon={<UserAdd size={18} />} />
        <StatCard label="Novos no mês" value={(stats.data?.novosNoMes ?? 0).toLocaleString("pt-BR")} icon={<Add size={22} variant="Linear" />} />
        <StatCard label="Aniversariantes da semana" value={(stats.data?.aniversariantesSemana ?? 0).toLocaleString("pt-BR")} icon={<Cake size={18} />} />
        <StatCard label="Inativos" value={(stats.data?.inativos ?? 0).toLocaleString("pt-BR")} icon={<UserRemove size={18} />} />
      </div>

      {banner && (
        <div role="status" className="mb-4 rounded-lg border border-accent/30 bg-accent-muted px-4 py-2.5 text-sm text-accent">{banner}</div>
      )}

      <Card>
        <CardBody className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              icon={SearchNormal1}
              placeholder="Buscar por nome, CPF, telefone ou nº do prontuário…"
              aria-label="Buscar pacientes"
              value={search}
              onChange={(e) => change(() => setSearch(e.target.value))}
              wrapperClassName="min-w-56 w-full sm:w-auto sm:max-w-[460px] sm:flex-[1_1_360px]"
            />
            <Segmented<Situation>
              label="Situação"
              size="sm"
              value={situation}
              onChange={(v) => change(() => setSituation(v))}
              options={[{ value: "ativos", label: "Ativos" }, { value: "inativos", label: "Inativos" }, { value: "todos", label: "Todos" }]}
            />
            <div className="ml-auto">
              <Segmented<ViewMode>
                label="Visualização"
                size="sm"
                value={view}
                onChange={setView}
                options={[{ value: "tabela", label: "Tabela", icon: RowVertical }, { value: "cartoes", label: "Cartões", icon: Grid2 }]}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filtrar pela inicial do nome">
            <button type="button" onClick={() => change(() => setLetter(""))} aria-pressed={letter === ""}
              className={cn("h-7 rounded-full px-3 text-xs font-medium", letter === "" ? "bg-accent text-on-accent" : "bg-surface text-text-muted hover:text-text")}>Todas</button>
            {LETTERS.map((l) => (
              <button key={l} type="button" onClick={() => change(() => setLetter(l))} aria-pressed={letter === l}
                className={cn("h-7 min-w-7 rounded-full px-2 text-xs font-medium", letter === l ? "bg-accent text-on-accent" : "bg-surface text-text-muted hover:text-text")}>{l}</button>
            ))}
          </div>

          {list.isPending ? (
            <Skeleton className="h-72 w-full" />
          ) : list.isError ? (
            <EmptyState title="Não foi possível carregar os pacientes." description={list.error.message} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={UserAdd}
              title="Nenhum paciente encontrado"
              description="Ajuste a busca ou os filtros, ou cadastre um novo paciente."
              action={<ButtonLink to="/pacientes/novo" variant="primary" icon={UserAdd}>Cadastrar paciente</ButtonLink>}
            />
          ) : view === "tabela" ? (
            <Table>
              <THead>
                <tr>
                  <TH>Paciente</TH>
                  <TH>Prontuário</TH>
                  <TH>Documento</TH>
                  <TH>Celular</TH>
                  <TH>Nascimento</TH>
                  <TH className="w-10" aria-label="Ações" />
                </tr>
              </THead>
              <TBody>
                {rows.map((p) => {
                  const link = whatsapp(p.celular);
                  const years = ageFrom(p.nascimento);
                  return (
                    <TR key={p.id} interactive onClick={() => navigate(`/pacientes/${p.id}`)}>
                      <TD>
                        <div className="flex items-center gap-3">
                          <Avatar name={p.nome} />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {p.corIdentificacao && <span aria-label="Cor de identificação" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.corIdentificacao }} />}
                              <span className={cn("truncate font-medium", !p.ativo && "text-text-muted line-through")}>{p.nome}</span>
                              {p.avisoAtivo && (
                                <Tooltip content="Tem aviso no cadastro"><Danger size={15} variant="Bold" aria-label="Tem aviso no cadastro" className="shrink-0 text-danger" /></Tooltip>
                              )}
                              {!p.ativo && <Badge tone="neutral" size="sm">Inativo</Badge>}
                              {p.prioridadeId && priorityName.get(p.prioridadeId) && <Badge tone="info" size="sm">{priorityName.get(p.prioridadeId)}</Badge>}
                            </div>
                            {p.nomeSocial && <p className="text-sm text-text-muted">Nome social: {p.nomeSocial}</p>}
                          </div>
                        </div>
                      </TD>
                      <TD className="tabular text-text-muted">{p.numeroProntuario ?? "—"}</TD>
                      <TD className="tabular text-text-muted">{document(p)}</TD>
                      <TD onClick={(e) => e.stopPropagation()}>
                        <span className="inline-flex items-center gap-1.5 tabular text-text-muted">
                          {formatPhone(p.celular) || "—"}
                          {link && <a href={link} target="_blank" rel="noopener noreferrer" aria-label={`Chamar ${p.nome} no WhatsApp`} className="text-success hover:opacity-80"><WhatsappIcon size={15} aria-hidden /></a>}
                        </span>
                      </TD>
                      <TD className="text-text-muted">{p.nascimento ? `${dateBR(p.nascimento)}${years !== null ? ` (${years} anos)` : ""}` : "—"}</TD>
                      <TD onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu
                          label={`Ações de ${p.nome}`}
                          items={menu(p)}
                          trigger={(props) => (
                            <button {...props} type="button" aria-label={`Ações de ${p.nome}`} className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-surface hover:text-text">
                              <More size={18} aria-hidden />
                            </button>
                          )}
                        />
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((p) => (
                <button key={p.id} type="button" onClick={() => navigate(`/pacientes/${p.id}`)}
                  className="flex items-start gap-3 rounded-xl bg-surface px-4 py-3 text-left transition-colors hover:bg-accent-muted">
                  <Avatar name={p.nome} />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate font-medium text-text", !p.ativo && "line-through")}>{p.nome}</span>
                    <span className="block text-sm text-text-muted">Prontuário {p.numeroProntuario ?? "—"} · {document(p)}</span>
                    <span className="block text-sm text-text-muted">{formatPhone(p.celular) || "Sem celular"}</span>
                  </span>
                  {!p.ativo && <Badge tone="neutral" size="sm">Inativo</Badge>}
                </button>
              ))}
            </div>
          )}

          {rows.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-sm text-text-muted">
              <span className="tabular">{page * PAGE_SIZE + 1}–{page * PAGE_SIZE + rows.length} de {total.toLocaleString("pt-BR")} pacientes</span>
              <div className="flex items-center gap-1">
                <button type="button" aria-label="Página anterior" disabled={page <= 0} onClick={() => setPage((p) => p - 1)} className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface disabled:opacity-40"><ArrowLeft2 size={16} aria-hidden /></button>
                <span className="tabular px-2">{page + 1} / {pages}</span>
                <button type="button" aria-label="Próxima página" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)} className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface disabled:opacity-40"><ArrowRight2 size={16} aria-hidden /></button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <DeactivateModal patient={toDeactivate} onClose={() => setToDeactivate(null)} onDone={(name) => { setBanner(`${name.split(" ")[0]} foi marcado(a) como inativo.`); setToDeactivate(null); }} />
    </div>
  );
}
