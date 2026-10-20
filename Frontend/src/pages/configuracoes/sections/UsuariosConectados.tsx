import { useMemo, useState } from "react";
import { LogoutCurve, SearchNormal1 } from "iconsax-reactjs";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR, TableFooter } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/overlay";
import { EmptyState } from "@/components/ui/empty-state";
import { userAccessRoster, type UserAccessRow } from "@/lib/mock/configuracoes";

export default function UsuariosConectados() {
  const [roster, setRoster] = useState<UserAccessRow[]>(() => userAccessRoster());
  const [search, setSearch] = useState("");
  const [toEnd, setToEnd] = useState<UserAccessRow | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);

  const query = search.trim().toLowerCase();
  const filtered = useMemo(() => roster.filter((u) => query === "" || u.name.toLowerCase().includes(query)), [roster, query]);
  const onlineCount = roster.filter((u) => u.online).length;

  function disconnect(id: string) {
    setRoster((prev) => prev.map((u) => (u.id === id ? { ...u, online: false, device: undefined, browser: undefined, location: undefined } : u)));
  }

  return (
    <div>
      <Card>
        <CardHeader
          title="Usuários conectados"
          description={`${roster.length} usuários da clínica · ${onlineCount} on-line agora.`}
          actions={
            onlineCount > 0 && (
              <Button variant="danger" size="sm" icon={LogoutCurve} onClick={() => setConfirmAll(true)}>
                Desconectar todos
              </Button>
            )
          }
        />
        <CardBody className="flex flex-col gap-4">
          <Input placeholder="Buscar usuário…" icon={SearchNormal1} value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar usuário" wrapperClassName="max-w-sm" />
          {filtered.length === 0 ? (
            <EmptyState title="Nenhum usuário encontrado" description="Ajuste a busca acima." />
          ) : (
            <>
              <Table>
                <THead>
                  <TR>
                    <TH>Usuário</TH>
                    <TH>Status</TH>
                    <TH>Último login</TH>
                    <TH>IP de acesso</TH>
                    <TH align="right">Ação</TH>
                  </TR>
                </THead>
                <TBody>
                  {filtered.map((u) => (
                    <TR key={u.id}>
                      <TD>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={u.name} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-text">{u.name}</p>
                            <p className="truncate text-sm text-text-muted">{u.role}</p>
                          </div>
                        </div>
                      </TD>
                      <TD>
                        <Badge tone={u.online ? "success" : "neutral"} dot>
                          {u.online ? "Online" : "Offline"}
                        </Badge>
                        {u.online && u.device && <p className="mt-1 text-xs text-text-subtle">{u.device} · {u.browser}</p>}
                      </TD>
                      <TD className="text-text-muted">{u.lastLogin}</TD>
                      <TD className="font-mono text-sm text-text-muted">{u.ip}</TD>
                      <TD align="right">
                        {u.online && (
                          <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-bg" onClick={() => setToEnd(u)}>
                            Desconectar
                          </Button>
                        )}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
              <TableFooter total={filtered.length} pageSize={Math.max(filtered.length, 1)} label="usuários" />
            </>
          )}
        </CardBody>
      </Card>

      <Modal
        open={!!toEnd}
        onClose={() => setToEnd(null)}
        title="Desconectar usuário?"
        description={toEnd ? `${toEnd.name} vai precisar entrar novamente.` : undefined}
        icon={LogoutCurve}
        tone="danger"
        footer={
          <>
            <Button variant="ghost" onClick={() => setToEnd(null)}>Cancelar</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (toEnd) disconnect(toEnd.id);
                setToEnd(null);
              }}
            >
              Desconectar
            </Button>
          </>
        }
      />

      <Modal
        open={confirmAll}
        onClose={() => setConfirmAll(false)}
        title="Desconectar todos os usuários online?"
        description="Todos vão precisar entrar novamente para continuar usando o sistema."
        icon={LogoutCurve}
        tone="danger"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmAll(false)}>Cancelar</Button>
            <Button
              variant="danger"
              onClick={() => {
                setRoster((prev) => prev.map((u) => (u.online ? { ...u, online: false, device: undefined, browser: undefined, location: undefined } : u)));
                setConfirmAll(false);
              }}
            >
              Desconectar todos
            </Button>
          </>
        }
      />
    </div>
  );
}
