import { useMemo, useState } from "react";
import { Add, CloseCircle, SearchNormal1, ShieldTick, TickCircle } from "iconsax-reactjs";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Drawer } from "@/components/ui/overlay";
import { Tabs } from "@/components/ui/tabs";
import { Table, TBody, TD, THead, TH, TR, TableFooter } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ACCESS_PROFILES, PERMISSION_MODULES, PROFILE_PERMISSIONS, USERS } from "@/lib/mock/cadastros";

export default function Funcionarios() {
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profileId, setProfileId] = useState(ACCESS_PROFILES[0].id);

  const query = search.trim().toLowerCase();
  const filtered = useMemo(() => USERS.filter((u) => query === "" || u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query)), [query]);

  function handleInvite() {
    setDrawerOpen(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3500);
  }

  const profile = ACCESS_PROFILES.find((p) => p.id === profileId) ?? ACCESS_PROFILES[0];
  const matrix = PROFILE_PERMISSIONS[profile.id];

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

      <Tabs tabs={[{ label: "Usuários", count: USERS.length }, { label: "Perfis de acesso", icon: ShieldTick }]}>
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
                    className={`inline-flex h-8 items-center rounded-full border px-3 text-sm font-medium transition-colors ${
                      p.id === profileId ? "border-accent/40 bg-accent-muted text-accent" : "border-border-strong bg-surface-raised text-text-muted hover:text-text"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              <Card>
                <CardHeader title={profile.name} description={profile.description} />
                <Table>
                  <THead>
                    <tr>
                      <TH>Módulo</TH>
                      <TH align="center">Ver</TH>
                      <TH align="center">Criar</TH>
                      <TH align="center">Editar</TH>
                      <TH align="center">Excluir</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {PERMISSION_MODULES.map((mod) => {
                      const p = matrix[mod];
                      return (
                        <TR key={mod}>
                          <TD className="font-medium text-text">{mod}</TD>
                          {(["ver", "criar", "editar", "excluir"] as const).map((k) => (
                            <TD key={k} align="center">
                              {p[k] ? <TickCircle size={16} aria-hidden className="mx-auto text-success" /> : <CloseCircle size={16} aria-hidden className="mx-auto text-text-subtle" />}
                            </TD>
                          ))}
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              </Card>
            </div>
          )
        }
      </Tabs>

      <Drawer
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
      </Drawer>
    </div>
  );
}
