import { useState } from "react";
import { LogoutCurve } from "iconsax-reactjs";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/overlay";
import { EmptyState } from "@/components/ui/empty-state";
import { connectedSessions as initialSessions, type ConnectedSession } from "@/lib/mock/configuracoes";

export default function UsuariosConectados() {
  const [sessions, setSessions] = useState<ConnectedSession[]>(initialSessions);
  const [toEnd, setToEnd] = useState<ConnectedSession | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);

  return (
    <div>
      <Card>
        <CardHeader
          title="Usuários conectados"
          description="Sessões ativas no sistema, no app e nos dispositivos de recepção."
          actions={
            sessions.some((s) => !s.current) && (
              <Button variant="danger" size="sm" icon={LogoutCurve} onClick={() => setConfirmAll(true)}>
                Encerrar todas
              </Button>
            )
          }
        />
        <CardBody className="p-0">
          {sessions.length === 0 ? (
            <EmptyState title="Nenhuma sessão ativa" />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Usuário</TH>
                  <TH>Dispositivo / navegador</TH>
                  <TH>IP</TH>
                  <TH>Local</TH>
                  <TH>Última atividade</TH>
                  <TH align="right">Ação</TH>
                </TR>
              </THead>
              <TBody>
                {sessions.map((sess) => (
                  <TR key={sess.id}>
                    <TD>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={sess.user} size="sm" />
                        <span className="font-medium">{sess.user}</span>
                        {sess.current && <Badge tone="accent" size="sm">Esta sessão</Badge>}
                      </div>
                    </TD>
                    <TD>
                      <div>
                        <p>{sess.device}</p>
                        <p className="text-sm text-text-muted">{sess.browser}</p>
                      </div>
                    </TD>
                    <TD className="font-mono text-sm">{sess.ip}</TD>
                    <TD>{sess.location}</TD>
                    <TD>{sess.lastActivity}</TD>
                    <TD align="right">
                      {!sess.current && (
                        <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-bg" onClick={() => setToEnd(sess)}>
                          Encerrar sessão
                        </Button>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Modal
        open={!!toEnd}
        onClose={() => setToEnd(null)}
        title="Encerrar sessão?"
        description={toEnd ? `${toEnd.user} vai precisar entrar novamente em ${toEnd.device}.` : undefined}
        icon={LogoutCurve}
        tone="danger"
        footer={
          <>
            <Button variant="ghost" onClick={() => setToEnd(null)}>Cancelar</Button>
            <Button
              variant="danger"
              onClick={() => {
                setSessions((prev) => prev.filter((s) => s.id !== toEnd?.id));
                setToEnd(null);
              }}
            >
              Encerrar sessão
            </Button>
          </>
        }
      />

      <Modal
        open={confirmAll}
        onClose={() => setConfirmAll(false)}
        title="Encerrar todas as sessões?"
        description="Todos os outros dispositivos conectados vão precisar entrar novamente. Esta sessão continua ativa."
        icon={LogoutCurve}
        tone="danger"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmAll(false)}>Cancelar</Button>
            <Button
              variant="danger"
              onClick={() => {
                setSessions((prev) => prev.filter((s) => s.current));
                setConfirmAll(false);
              }}
            >
              Encerrar todas
            </Button>
          </>
        }
      />
    </div>
  );
}
