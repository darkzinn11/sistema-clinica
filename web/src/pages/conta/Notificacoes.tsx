import { useMemo, useState } from "react";
import { Link } from "react-router";
import { MoreCircle, NotificationBing, TickCircle } from "iconsax-reactjs";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Segmented } from "@/components/ui/tabs";
import { Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu } from "@/components/ui/overlay";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { allNotifications, type AppNotification } from "@/lib/mock/conta";

type ReadFilter = "todas" | "nao-lidas";

export default function Notificacoes() {
  const [items, setItems] = useState<AppNotification[]>(allNotifications);
  const [filter, setFilter] = useState<ReadFilter>("todas");
  const [module, setModule] = useState("todos");

  const modules = useMemo(() => Array.from(new Set(allNotifications.map((n) => n.module))), []);
  const filtered = items.filter((n) => (filter === "todas" || n.unread) && (module === "todos" || n.module === module));
  const groups: AppNotification["day"][] = ["Hoje", "Ontem", "Esta semana", "Mais antigas"];
  const unreadCount = items.filter((n) => n.unread).length;

  function toggleRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, unread: !n.unread } : n)));
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Notificações"
        description="Avisos do sistema sobre agenda, financeiro, estoque e faturamento."
        breadcrumbs={[{ label: "Conta" }, { label: "Notificações" }]}
        actions={
          unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setItems((prev) => prev.map((n) => ({ ...n, unread: false })))}>
              Marcar todas como lidas
            </Button>
          )
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            label="Filtro de leitura"
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "todas", label: "Todas" },
              { value: "nao-lidas", label: `Não lidas${unreadCount ? ` (${unreadCount})` : ""}` },
            ]}
          />
          <Select label="" aria-label="Filtrar por módulo" value={module} onChange={(e) => setModule(e.target.value)} wrapperClassName="w-48" options={[{ value: "todos", label: "Todos os módulos" }, ...modules.map((m) => ({ value: m, label: m }))]} />
        </div>
      </PageHeader>

      {filtered.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState icon={NotificationBing} title="Nenhuma notificação por aqui" description="Ajuste os filtros ou volte mais tarde." />
          </CardBody>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((g) => {
            const list = filtered.filter((n) => n.day === g);
            if (list.length === 0) return null;
            return (
              <div key={g}>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">{g}</h2>
                <Card>
                  <CardBody className="flex flex-col divide-y divide-border p-0">
                    {list.map((n) => (
                      <div key={n.id} className="flex items-start gap-3 px-4 py-3">
                        <span className={"mt-1.5 h-2 w-2 shrink-0 rounded-full " + (n.unread ? "bg-accent" : "bg-transparent")} aria-hidden />
                        <Link to={n.href} className="min-w-0 flex-1" onClick={() => n.unread && toggleRead(n.id)}>
                          <p className={"text-base " + (n.unread ? "font-semibold text-text" : "text-text")}>{n.title}</p>
                          <p className="text-sm text-text-muted">{n.body}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge tone="neutral" size="sm">{n.module}</Badge>
                            <span className="text-xs text-text-subtle">{n.time}</span>
                          </div>
                        </Link>
                        <DropdownMenu
                          label={`Ações para ${n.title}`}
                          trigger={(p) => (
                            <button {...p} aria-label="Mais ações" className="rounded-md p-1.5 text-text-muted hover:bg-surface hover:text-text">
                              <MoreCircle size={18} aria-hidden />
                            </button>
                          )}
                          items={[
                            { label: n.unread ? "Marcar como lida" : "Marcar como não lida", icon: TickCircle, onSelect: () => toggleRead(n.id) },
                          ]}
                        />
                      </div>
                    ))}
                  </CardBody>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
