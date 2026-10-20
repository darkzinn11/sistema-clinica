import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { Add, InfoCircle, Lock1, SearchNormal1, ShieldTick, TickCircle } from "iconsax-reactjs";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Checkbox } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/overlay";
import { Tabs } from "@/components/ui/tabs";
import { Table, TBody, TD, THead, TH, TR, TableFooter } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { SaveBar } from "@/components/configuracoes/SaveBar";
import { useSettingsState } from "@/components/configuracoes/useSettingsState";
import { cn } from "@/lib/cn";
import { ACCESS_PROFILES, PERMISSION_CATEGORIES, PROFILE_PERMISSIONS, USERS, type ModulePermission } from "@/lib/mock/cadastros";

const PERMISSION_ACTIONS = [
  { key: "ver", label: "Ver" },
  { key: "criar", label: "Criar" },
  { key: "editar", label: "Editar" },
  { key: "excluir", label: "Excluir" },
] as const;

export default function Funcionarios() {
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [searchParams] = useSearchParams();
  const [profileId, setProfileId] = useState(searchParams.get("perfil") ?? ACCESS_PROFILES[0].id);
  const permissions = useSettingsState(PROFILE_PERMISSIONS);

  const query = search.trim().toLowerCase();
  const filtered = useMemo(() => USERS.filter((u) => query === "" || u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query)), [query]);

  function handleInvite() {
    setDrawerOpen(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3500);
  }

  const profile = ACCESS_PROFILES.find((p) => p.id === profileId) ?? ACCESS_PROFILES[0];
  const locked = profile.id === "admin";
  const matrix = permissions.value[profile.id];

  function toggleCell(itemKey: string, action: keyof ModulePermission) {
    if (locked) return;
    permissions.set((prev) => ({
      ...prev,
      [profile.id]: { ...prev[profile.id], [itemKey]: { ...prev[profile.id][itemKey], [action]: !prev[profile.id][itemKey][action] } },
    }));
  }

  function toggleColumn(action: keyof ModulePermission) {
    if (locked) return;
    const allChecked = PERMISSION_CATEGORIES.every((cat) => cat.items.every((item) => matrix[item.key][action]));
    permissions.set((prev) => ({
      ...prev,
      [profile.id]: Object.fromEntries(Object.entries(prev[profile.id]).map(([key, p]) => [key, { ...p, [action]: !allChecked }])),
    }));
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Funcionários e usuários"
        description="Pessoas com acesso ao sistema e os perfis de permissão de cada uma."
        breadcrumbs={[{ label: "Cadastros", href: "/cadastros" }, { label: "Funcionários e usuários" }]}
        actions={
          <Button variant="primary" icon={Add} onClick={() => setDrawerOpen(true)}>
            Convidar usuário
          </Button>
        }
      />

      {saved && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-success-bg bg-success-bg px-4 py-2.5 text-sm text-success">
          <TickCircle size={16} aria-hidden />
          Convite enviado com sucesso.
        </div>
      )}

      <Tabs tabs={[{ label: "Usuários", count: USERS.length }, { label: "Perfis de acesso", icon: ShieldTick }]} defaultIndex={searchParams.get("tab") === "perfis" ? 1 : 0}>
        {(active) =>
          active === 0 ? (
            <div className="flex flex-col gap-4">
              <Input placeholder="Buscar por nome ou e-mail…" icon={SearchNormal1} value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar usuário" wrapperClassName="max-w-sm" />
              <Card>
                {filtered.length === 0 ? (
                  <EmptyState icon={SearchNormal1} title="Nenhum usuário encontrado" description="Ajuste a busca acima." />
                ) : (
                  <>
                    <Table>
                      <THead>
                        <tr>
                          <TH>Nome</TH>
                          <TH>Função</TH>
                          <TH>E-mail</TH>
                          <TH>Perfil de acesso</TH>
                          <TH>Último acesso</TH>
                          <TH align="center">2FA</TH>
                          <TH>Status</TH>
                        </tr>
                      </THead>
                      <TBody>
                        {filtered.map((u) => {
                          const userProfile = ACCESS_PROFILES.find((p) => p.id === u.profileId);
                          return (
                            <TR key={u.id}>
                              <TD>
                                <span className="flex items-center gap-2.5 font-medium text-text">
                                  <Avatar name={u.name} size="sm" />
                                  {u.name}
                                </span>
                              </TD>
                              <TD className="text-text-muted">{u.role}</TD>
                              <TD className="text-text-muted">{u.email}</TD>
                              <TD>{userProfile?.name ?? "—"}</TD>
                              <TD className="text-text-muted">{u.lastAccess}</TD>
                              <TD align="center">
                                {u.twoFactor ? <Badge tone="success" size="sm">Ativo</Badge> : <Badge tone="neutral" size="sm">Inativo</Badge>}
                              </TD>
                              <TD>
                                <Badge tone={u.active ? "success" : "danger"} dot>
                                  {u.active ? "Ativo" : "Inativo"}
                                </Badge>
                              </TD>
                            </TR>
                          );
                        })}
                      </TBody>
                    </Table>
                    <TableFooter total={filtered.length} pageSize={Math.max(filtered.length, 1)} label="usuários" />
                  </>
                )}
              </Card>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {ACCESS_PROFILES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProfileId(p.id)}
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors",
                      p.id === profileId ? "border-accent/40 bg-accent-muted text-accent" : "border-border-strong bg-surface-raised text-text-muted hover:text-text",
                    )}
                  >
                    {p.id === "admin" && <Lock1 size={12} aria-hidden />}
                    {p.name}
                  </button>
                ))}
              </div>
              <Card>
                <CardHeader title={profile.name} description={profile.description} />
                {locked && (
                  <CardBody className="border-b border-border pt-0 pb-4">
                    <p className="flex items-center gap-2 text-sm text-text-muted">
                      <InfoCircle size={16} aria-hidden className="shrink-0" />
                      O perfil Administrador sempre tem acesso completo e não pode ser reduzido — evita perder acesso ao sistema por engano.
                    </p>
                  </CardBody>
                )}
                <Table>
                  <THead>
                    <tr>
                      <TH>Funcionalidade</TH>
                      {PERMISSION_ACTIONS.map((action) => (
                        <TH key={action.key} align="center">
                          <button
                            type="button"
                            disabled={locked}
                            onClick={() => toggleColumn(action.key)}
                            className={cn("inline-flex items-center gap-1.5", !locked && "cursor-pointer hover:text-text")}
                            aria-label={`Selecionar ${action.label} para todas as funcionalidades`}
                          >
                            {action.label}
                          </button>
                        </TH>
                      ))}
                    </tr>
                  </THead>
                  <TBody>
                    {PERMISSION_CATEGORIES.flatMap((cat) => [
                      <TR key={cat.key} className="bg-surface">
                        <TD colSpan={5} className="text-xs font-semibold tracking-wide text-text-muted uppercase">
                          {cat.label}
                        </TD>
                      </TR>,
                      ...cat.items.map((item) => {
                        const p = matrix[item.key];
                        return (
                          <TR key={item.key}>
                            <TD className="text-text">{item.label}</TD>
                            {PERMISSION_ACTIONS.map((action) => (
                              <TD key={action.key} align="center">
                                <Checkbox
                                  aria-label={`${action.label} — ${item.label}`}
                                  checked={p[action.key]}
                                  disabled={locked}
                                  onChange={() => toggleCell(item.key, action.key)}
                                  className="justify-center"
                                />
                              </TD>
                            ))}
                          </TR>
                        );
                      }),
                    ])}
                  </TBody>
                </Table>
              </Card>
              <SaveBar dirty={permissions.dirty} onDiscard={permissions.discard} onSave={permissions.save} />
            </div>
          )
        }
      </Tabs>

      <Modal
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Convidar usuário"
        description="Envie um convite de acesso por e-mail."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDrawerOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleInvite}>
              Enviar convite
            </Button>
          </>
        }
      >
        <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
          <Input label="Nome completo" placeholder="Ex.: Pedro Almeida" required />
          <Input label="E-mail" type="email" placeholder="nome@vidaplena.com.br" required />
          <Input label="Função" placeholder="Ex.: Recepcionista" />
          <Select label="Perfil de acesso" placeholder="Selecione" options={ACCESS_PROFILES.map((p) => ({ value: p.id, label: p.name }))} required />
        </form>
      </Modal>
    </div>
  );
}
