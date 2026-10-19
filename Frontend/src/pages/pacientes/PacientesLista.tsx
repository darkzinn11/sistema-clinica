import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Add,
  ArrowSwapHorizontal,
  Cake,
  Calendar,
  Danger,
  Edit2,
  EmptyWallet,
  Export,
  Grid2,
  More,
  RowVertical,
  SearchNormal1,
  Sms,
  TagUser,
  UserAdd,
  UserRemove,
} from "iconsax-reactjs";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Checkbox } from "@/components/ui/input";
import { Segmented } from "@/components/ui/tabs";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Table, THead, TBody, TH, TR, TD, TableFooter } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { DropdownMenu, Modal } from "@/components/ui/overlay";
import { Tooltip } from "@/components/ui/misc";
import { StatCard } from "@/components/ui/charts";
import { patients, insurances, insuranceName, TODAY, appointmentsForPatient } from "@/lib/mock/core";
import type { Patient } from "@/lib/mock/core";
import { age, brl, dateBR, dateShort } from "@/lib/format";
import { normalizeName, onlyDigits } from "@/lib/mock/pacientes";
import { WhatsappIcon } from "@/components/ui/whatsapp-icon";
import { FilterDropdown, TogglePill } from "@/components/pacientes/filters";

type ViewMode = "tabela" | "cartoes";
type LastVisitFilter = "all" | "30" | "90" | "mais90" | "nunca";

const PAGE_SIZE = 20;

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((new Date(`${toIso}T12:00:00`).getTime() - new Date(`${fromIso}T12:00:00`).getTime()) / 86_400_000);
}

function isBirthdayWithinDays(birthDate: string, days: number): boolean {
  const base = new Date(`${TODAY}T12:00:00`);
  const md = birthDate.slice(5);
  for (let i = 0; i <= days; i += 1) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    const cmp = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (cmp === md) return true;
  }
  return false;
}

export default function Page() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [convenio, setConvenio] = useState("all");
  const [tag, setTag] = useState("all");
  const [lastVisitFilter, setLastVisitFilter] = useState<LastVisitFilter>("all");
  const [birthdayOnly, setBirthdayOnly] = useState(false);
  const [view, setView] = useState<ViewMode>("tabela");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [inactiveIds, setInactiveIds] = useState<Set<string>>(new Set());
  const [confirmInactivate, setConfirmInactivate] = useState<Patient | null>(null);
  const [mergeTarget, setMergeTarget] = useState<Patient | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 3200);
    return () => clearTimeout(t);
  }, [banner]);

  const allTags = useMemo(() => Array.from(new Set(patients.flatMap((p) => p.tags))).sort(), []);

  const nextAppointmentByPatient = useMemo(() => {
    const map = new Map<string, { date: string; start: string } | undefined>();
    for (const p of patients) {
      const future = appointmentsForPatient(p.id, 0, 45)
        .filter((a) => a.date >= TODAY && !["desmarcado_pelo_paciente", "cancelado_pelo_profissional", "nao_compareceu"].includes(a.status))
        .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
      map.set(p.id, future[0]);
    }
    return map;
  }, []);

  const kpis = useMemo(
    () => ({
      total: patients.length,
      novos: patients.filter((p) => p.createdAt.slice(0, 7) === TODAY.slice(0, 7)).length,
      aniversariantes: patients.filter((p) => isBirthdayWithinDays(p.birthDate, 6)).length,
      comSaldo: patients.filter((p) => p.balanceCents > 0).length,
    }),
    [],
  );

  const filtered = useMemo(() => {
    const q = normalizeName(search);
    const qDigits = onlyDigits(search);
    return patients.filter((p) => {
      if (q || qDigits) {
        const nameMatch = normalizeName(p.name).includes(q);
        const cpfMatch = qDigits.length > 0 && onlyDigits(p.cpf).includes(qDigits);
        const phoneMatch = qDigits.length > 0 && onlyDigits(p.phone).includes(qDigits);
        if (!nameMatch && !cpfMatch && !phoneMatch) return false;
      }
      if (convenio !== "all" && p.insuranceId !== convenio) return false;
      if (tag !== "all" && !p.tags.includes(tag)) return false;
      if (birthdayOnly && !isBirthdayWithinDays(p.birthDate, 6)) return false;
      if (lastVisitFilter !== "all") {
        if (lastVisitFilter === "nunca") {
          if (p.lastVisit) return false;
        } else {
          if (!p.lastVisit) return false;
          const d = daysBetween(p.lastVisit, TODAY);
          if (lastVisitFilter === "30" && d > 30) return false;
          if (lastVisitFilter === "90" && (d <= 30 || d > 90)) return false;
          if (lastVisitFilter === "mais90" && d <= 90) return false;
        }
      }
      return true;
    });
  }, [search, convenio, tag, birthdayOnly, lastVisitFilter]);

  const visible = filtered.slice(0, PAGE_SIZE);
  const allVisibleSelected = visible.length > 0 && visible.every((p) => selected.has(p.id));

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        for (const p of visible) next.delete(p.id);
        return next;
      }
      const next = new Set(prev);
      for (const p of visible) next.add(p.id);
      return next;
    });
  }

  function runBulkAction(label: string) {
    const count = selected.size;
    setBanner(`${label}: ${count} paciente${count === 1 ? "" : "s"}.`);
    setSelected(new Set());
  }

  function inactivate(p: Patient) {
    setInactiveIds((prev) => new Set(prev).add(p.id));
    setBanner(`${p.name.split(" ")[0]} foi marcado(a) como inativo.`);
    setConfirmInactivate(null);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Pacientes"
        description="Cadastro completo, histórico clínico e financeiro de cada paciente da clínica."
        breadcrumbs={[{ label: "Início", href: "/inicio" }, { label: "Pacientes" }]}
        actions={
          <ButtonLink to="/pacientes/novo" variant="primary" icon={UserAdd}>
            Novo paciente
          </ButtonLink>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 ui-stat-strip" data-columns="4">
        <StatCard label="Total de pacientes" value={kpis.total.toLocaleString("pt-BR")} icon={<UserAdd size={18} />} />
        <StatCard label="Novos no mês" value={kpis.novos.toLocaleString("pt-BR")} icon={<Add size={22} variant="Linear" />} />
        <StatCard label="Aniversariantes da semana" value={kpis.aniversariantes.toLocaleString("pt-BR")} icon={<Cake size={18} />} />
        <StatCard label="Com saldo em aberto" value={kpis.comSaldo.toLocaleString("pt-BR")} icon={<EmptyWallet size={18} />} />
      </div>

      {banner && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-accent/30 bg-accent-muted px-4 py-2.5 text-sm text-accent">
          {banner}
          <button type="button" onClick={() => setBanner(null)} aria-label="Fechar aviso" className="text-accent/70 hover:text-accent">
            <Add size={14} aria-hidden className="rotate-45" />
          </button>
        </div>
      )}

      <Card>
        <CardBody className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              icon={SearchNormal1}
              placeholder="Buscar por nome, CPF ou telefone…"
              aria-label="Buscar pacientes"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              wrapperClassName="min-w-56 w-full sm:w-auto sm:max-w-[420px] sm:flex-[1_1_320px]"
            />
            <FilterDropdown
              label="Convênio"
              value={convenio}
              onChange={setConvenio}
              options={[{ value: "all", label: "Todos" }, ...insurances.map((i) => ({ value: i.id, label: i.name }))]}
            />
            <FilterDropdown
              label="Tag"
              value={tag}
              onChange={setTag}
              options={[{ value: "all", label: "Todas" }, ...allTags.map((t) => ({ value: t, label: t }))]}
            />
            <FilterDropdown
              label="Última consulta"
              value={lastVisitFilter}
              onChange={setLastVisitFilter}
              options={[
                { value: "all", label: "Qualquer período" },
                { value: "30", label: "Até 30 dias" },
                { value: "90", label: "31 a 90 dias" },
                { value: "mais90", label: "Mais de 90 dias" },
                { value: "nunca", label: "Nunca veio" },
              ]}
            />
            <TogglePill label="Aniversariantes" icon={Cake} active={birthdayOnly} onClick={() => setBirthdayOnly((v) => !v)} />
            <div className="ml-auto">
              <Segmented
                label="Visualização"
                size="sm"
                value={view}
                onChange={setView}
                options={[
                  { value: "tabela", label: "Tabela", icon: RowVertical },
                  { value: "cartoes", label: "Cartões", icon: Grid2 },
                ]}
              />
            </div>
          </div>

          {selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-accent/30 bg-accent-muted px-4 py-2.5">
              <span className="text-sm font-medium text-accent">{selected.size} selecionado(s)</span>
              <div className="ml-auto flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" icon={Export} onClick={() => runBulkAction("Exportação iniciada")}>
                  Exportar
                </Button>
                <Button size="sm" variant="secondary" icon={Sms} onClick={() => runBulkAction("Mensagem enviada")}>
                  Enviar mensagem
                </Button>
                <Button size="sm" variant="secondary" icon={TagUser} onClick={() => runBulkAction("Tag adicionada")}>
                  Adicionar tag
                </Button>
              </div>
            </div>
          )}

          {filtered.length === 0 ? (
            <EmptyState
              icon={UserAdd}
              title="Nenhum paciente encontrado"
              description="Ajuste os filtros ou cadastre um novo paciente."
              action={
                <ButtonLink to="/pacientes/novo" variant="primary" icon={UserAdd}>
                  Cadastrar paciente
                </ButtonLink>
              }
            />
          ) : view === "tabela" ? (
            <Table>
              <THead>
                <tr>
                  <TH className="w-10">
                    <Checkbox
                      className="justify-center"
                      aria-label="Selecionar todos os pacientes visíveis"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                    />
                  </TH>
                  <TH>Paciente</TH>
                  <TH>CPF</TH>
                  <TH>Telefone</TH>
                  <TH>Convênio</TH>
                  <TH>Última consulta</TH>
                  <TH>Próxima consulta</TH>
                  <TH>Tags</TH>
                  <TH align="right">Saldo</TH>
                  <TH className="w-10" aria-label="Ações" />
                </tr>
              </THead>
              <TBody>
                {visible.map((p) => {
                  const inactive = inactiveIds.has(p.id);
                  const next = nextAppointmentByPatient.get(p.id);
                  return (
                    <TR key={p.id} interactive onClick={() => navigate(`/pacientes/${p.id}`)}>
                      <TD onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          className="justify-center"
                          aria-label={`Selecionar ${p.name}`}
                          checked={selected.has(p.id)}
                          onChange={() => toggleSelected(p.id)}
                        />
                      </TD>
                      <TD>
                        <div className="flex items-center gap-3">
                          <Avatar name={p.name} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={cnInactive(inactive) + " truncate font-medium"}>{p.name}</span>
                              {p.alerts.length > 0 && (
                                <Tooltip content={p.alerts.join(", ")}>
                                  <Danger size={15} variant="Bold" aria-hidden className="shrink-0 text-danger" />
                                </Tooltip>
                              )}
                              {inactive && (
                                <Badge tone="neutral" size="sm">
                                  Inativo
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-text-muted">
                              {age(p.birthDate, TODAY)} anos · {p.sex === "F" ? "Feminino" : "Masculino"}
                            </p>
                          </div>
                        </div>
                      </TD>
                      <TD className="tabular whitespace-nowrap">{p.cpf}</TD>
                      <TD className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="tabular">{p.phone}</span>
                          <Tooltip content="WhatsApp">
                            {/* Figma 11009:1188: círculo verde de 19,6px (padding 4,6px) com o ícone do WhatsApp em branco. */}
                            <span className="inline-flex size-[19.6px] shrink-0 items-center justify-center rounded-full bg-accent">
                              <WhatsappIcon size={10.41} className="text-white" aria-hidden />
                            </span>
                          </Tooltip>
                        </div>
                      </TD>
                      <TD>{insuranceName(p.insuranceId)}</TD>
                      <TD className="whitespace-nowrap">{p.lastVisit ? dateBR(p.lastVisit) : <span className="text-text-subtle">—</span>}</TD>
                      <TD className="whitespace-nowrap">
                        {next ? (
                          <span>
                            {dateShort(next.date)} às {next.start}
                          </span>
                        ) : (
                          <span className="text-text-subtle">—</span>
                        )}
                      </TD>
                      <TD>
                        {p.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {p.tags.map((t) => (
                              <Badge key={t} tone="accent">
                                {t}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-text-subtle">—</span>
                        )}
                      </TD>
                      <TD numeric className={p.balanceCents > 0 ? "font-medium text-danger" : undefined}>
                        {p.balanceCents > 0 ? brl(p.balanceCents) : <span className="text-text-subtle">—</span>}
                      </TD>
                      <TD onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu
                          label={`Ações para ${p.name}`}
                          trigger={(tp) => (
                            <Button {...tp} size="sm" variant="ghost" iconOnly icon={More} aria-label="Mais ações" />
                          )}
                          items={[
                            { label: "Abrir", icon: UserAdd, onSelect: () => navigate(`/pacientes/${p.id}`) },
                            { label: "Agendar", icon: Calendar, onSelect: () => navigate("/agenda?novo=1") },
                            { label: "Editar", icon: Edit2, onSelect: () => navigate(`/pacientes/${p.id}/dados`) },
                            { label: "Mesclar duplicados", icon: ArrowSwapHorizontal, onSelect: () => setMergeTarget(p) },
                            { label: "Inativar", icon: UserRemove, danger: true, divider: true, onSelect: () => setConfirmInactivate(p) },
                          ]}
                        />
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((p) => {
                const inactive = inactiveIds.has(p.id);
                const next = nextAppointmentByPatient.get(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => navigate(`/pacientes/${p.id}`)}
                    className="flex flex-col gap-3 rounded-lg bg-surface p-4 text-left transition-colors hover:bg-surface-raised"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <Avatar name={p.name} size="md" />
                        <div>
                          <p className={cnInactive(inactive) + " font-medium"}>{p.name}</p>
                          <p className="text-sm text-text-muted">
                            {age(p.birthDate, TODAY)} anos · {p.sex === "F" ? "Feminino" : "Masculino"}
                          </p>
                        </div>
                      </div>
                      {p.alerts.length > 0 && <Danger size={16} variant="Bold" aria-hidden className="shrink-0 text-danger" />}
                    </div>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
                      <dt className="text-text-muted">Convênio</dt>
                      <dd className="text-right text-text">{insuranceName(p.insuranceId)}</dd>
                      <dt className="text-text-muted">Última consulta</dt>
                      <dd className="text-right text-text">{p.lastVisit ? dateBR(p.lastVisit) : "—"}</dd>
                      <dt className="text-text-muted">Próxima consulta</dt>
                      <dd className="text-right text-text">{next ? `${dateShort(next.date)} ${next.start}` : "—"}</dd>
                      <dt className="text-text-muted">Saldo</dt>
                      <dd className={cnBalance(p.balanceCents)}>{p.balanceCents > 0 ? brl(p.balanceCents) : "—"}</dd>
                    </dl>
                    {p.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {p.tags.map((t) => (
                          <Badge key={t} tone="accent">
                            {t}
                          </Badge>
                        ))}
                        {inactive && <Badge tone="neutral">Inativo</Badge>}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {filtered.length > 0 && <TableFooter total={filtered.length} page={1} pageSize={PAGE_SIZE} label="pacientes" />}
        </CardBody>
      </Card>

      <Modal
        open={confirmInactivate !== null}
        onClose={() => setConfirmInactivate(null)}
        title="Inativar paciente"
        description={confirmInactivate ? `${confirmInactivate.name} deixará de aparecer nas listas ativas e na busca da agenda. Você pode reverter isso depois.` : undefined}
        icon={UserRemove}
        tone="danger"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmInactivate(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={() => confirmInactivate && inactivate(confirmInactivate)}>
              Inativar paciente
            </Button>
          </>
        }
      />

      <Modal
        open={mergeTarget !== null}
        onClose={() => setMergeTarget(null)}
        title="Mesclar duplicados"
        description={
          mergeTarget
            ? `Buscando outros cadastros com nome ou CPF parecidos com ${mergeTarget.name}…`
            : undefined
        }
        icon={ArrowSwapHorizontal}
        footer={
          <Button variant="secondary" onClick={() => setMergeTarget(null)}>
            Fechar
          </Button>
        }
      >
        {mergeTarget && (() => {
          const candidates = patients.filter(
            (other) => other.id !== mergeTarget.id && (onlyDigits(other.cpf) === onlyDigits(mergeTarget.cpf) || normalizeName(other.name) === normalizeName(mergeTarget.name)),
          );
          return candidates.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {candidates.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={c.name} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-text">{c.name}</p>
                      <p className="text-xs text-text-muted">{c.cpf}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => navigate(`/pacientes/${c.id}`)}>
                    Abrir cadastro
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-muted">Nenhum cadastro duplicado encontrado para este paciente.</p>
          );
        })()}
      </Modal>
    </div>
  );
}

function cnInactive(inactive: boolean): string {
  return inactive ? "text-text-muted line-through decoration-text-subtle" : "text-text";
}

function cnBalance(cents: number): string {
  return cents > 0 ? "text-right font-medium text-danger" : "text-right text-text-subtle";
}
