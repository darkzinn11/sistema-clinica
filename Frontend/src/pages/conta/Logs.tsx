import { useMemo, useState } from "react";
import { ArrowRight2, ClipboardText, SearchNormal1 } from "iconsax-reactjs";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR, TableFooter } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/overlay";
import { DescriptionList } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { dateBR, time } from "@/lib/format";
import { auditLogs, type AuditLog } from "@/lib/mock/conta";

export default function Logs() {
  const [user, setUser] = useState("todos");
  const [module, setModule] = useState("todos");
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("30");
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const users = useMemo(() => Array.from(new Set(auditLogs.map((l) => l.user))), []);
  const modules = useMemo(() => Array.from(new Set(auditLogs.map((l) => l.module))), []);

  const filtered = auditLogs.filter((l) => {
    if (user !== "todos" && l.user !== user) return false;
    if (module !== "todos" && l.module !== module) return false;
    if (query && !`${l.action} ${l.record}`.toLowerCase().includes(query.toLowerCase())) return false;
    const days = Math.round((Date.parse("2026-10-13T12:00:00") - Date.parse(l.datetime)) / 86400000);
    if (period !== "todos" && days > Number(period)) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Registro de atividades"
        description="Trilha de auditoria de tudo que acontece no sistema — quem fez o quê, quando e de onde."
        breadcrumbs={[{ label: "Conta" }, { label: "Registro de atividades" }]}
      />
      <Card>
        <CardBody className="flex flex-wrap items-center gap-3 border-b border-border">
          <Input icon={SearchNormal1} placeholder="Buscar por ação ou registro" value={query} onChange={(e) => setQuery(e.target.value)} wrapperClassName="min-w-56 flex-1" />
          <Select label="" aria-label="Usuário" value={user} onChange={(e) => setUser(e.target.value)} wrapperClassName="w-44" options={[{ value: "todos", label: "Todos os usuários" }, ...users.map((u) => ({ value: u, label: u }))]} />
          <Select label="" aria-label="Módulo" value={module} onChange={(e) => setModule(e.target.value)} wrapperClassName="w-44" options={[{ value: "todos", label: "Todos os módulos" }, ...modules.map((m) => ({ value: m, label: m }))]} />
          <Select
            label=""
            aria-label="Período"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            wrapperClassName="w-40"
            options={[
              { value: "7", label: "Últimos 7 dias" },
              { value: "30", label: "Últimos 30 dias" },
              { value: "todos", label: "Todo o período" },
            ]}
          />
        </CardBody>
        <CardBody className="p-0">
          {filtered.length === 0 ? (
            <EmptyState icon={ClipboardText} title="Nenhum registro encontrado" description="Ajuste os filtros para ver mais atividades." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Data/hora</TH>
                  <TH>Usuário</TH>
                  <TH>Ação</TH>
                  <TH>Módulo</TH>
                  <TH>Registro afetado</TH>
                  <TH>IP</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {filtered.slice(0, 20).map((l) => (
                  <TR key={l.id} interactive onClick={() => setSelected(l)}>
                    <TD className="whitespace-nowrap">
                      {dateBR(l.datetime)} <span className="text-text-muted">{time(l.datetime)}</span>
                    </TD>
                    <TD>{l.user}</TD>
                    <TD>{l.action}</TD>
                    <TD>
                      <Badge tone="neutral" size="sm">{l.module}</Badge>
                    </TD>
                    <TD className="max-w-56 truncate">{l.record}</TD>
                    <TD className="font-mono text-sm">{l.ip}</TD>
                    <TD align="right">
                      <ArrowRight2 size={14} className="text-text-subtle" aria-hidden />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
        {filtered.length > 0 && <TableFooter total={filtered.length} pageSize={20} label="registros" />}
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Detalhe do registro" description={selected ? `${selected.action} · ${dateBR(selected.datetime)} ${time(selected.datetime)}` : undefined}>
        {selected && (
          <div className="flex flex-col gap-6">
            <DescriptionList
              columns={2}
              items={[
                { label: "Usuário", value: selected.user },
                { label: "Módulo", value: selected.module },
                { label: "Registro afetado", value: selected.record },
                { label: "Endereço IP", value: selected.ip },
              ]}
            />
            {selected.before && selected.after ? (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-text">O que mudou</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-danger-bg bg-danger-bg/40 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-danger">Antes</p>
                    <dl className="flex flex-col gap-1.5">
                      {Object.entries(selected.before).map(([k, val]) => (
                        <div key={k} className="flex justify-between gap-3 text-sm">
                          <dt className="text-text-muted">{k}</dt>
                          <dd className="font-medium text-text">{val}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  <div className="rounded-lg border border-success-bg bg-success-bg/40 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-success">Depois</p>
                    <dl className="flex flex-col gap-1.5">
                      {Object.entries(selected.after).map(([k, val]) => (
                        <div key={k} className="flex justify-between gap-3 text-sm">
                          <dt className="text-text-muted">{k}</dt>
                          <dd className="font-medium text-text">{val}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-muted">Esta ação não alterou campos rastreáveis (ex.: exportação ou login).</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
