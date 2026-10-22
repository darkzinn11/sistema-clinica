import { Add, Copy, Trash } from "iconsax-reactjs";
import { useState } from "react";
import { useAuth } from "@/lib/auth/auth";
import { useCreateDevice, useDevices, useRevokeDevice, type CreatedDevice } from "@/lib/api/dispositivos";
import { useCounters, useSaveCounter, useSaveTicketType, useTicketTypes } from "@/lib/api/recepcao";
import { ApiError } from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";

function ErrorText({ error }: { error: unknown }) {
  return error ? <p role="alert" className="text-sm text-danger">{error instanceof ApiError ? error.message : "Não foi possível concluir a operação."}</p> : null;
}

export default function TotemEGuiches() {
  const { can } = useAuth();
  const devices = useDevices();
  const createDevice = useCreateDevice();
  const revokeDevice = useRevokeDevice();
  const types = useTicketTypes();
  const counters = useCounters();
  const saveType = useSaveTicketType();
  const saveCounter = useSaveCounter();
  const [name, setName] = useState("");
  const [deviceType, setDeviceType] = useState<"totem" | "painel">("totem");
  const [created, setCreated] = useState<CreatedDevice | null>(null);
  const [copied, setCopied] = useState(false);
  const [newType, setNewType] = useState({ nome: "", prefixo: "", preferencial: false });
  const [newCounter, setNewCounter] = useState("");

  if (!can("fila:configurar")) return <EmptyState title="Acesso restrito" description="Somente administradores podem configurar dispositivos, tipos e guichês." />;

  async function copyToken() {
    if (!created) return;
    try { await navigator.clipboard.writeText(created.token); } catch { /* clipboard indisponível */ }
    setCopied(true);
  }

  return <div className="mx-auto max-w-7xl"><PageHeader title="Totem e guichês" description="Configure a fila, os guichês e as credenciais dos dispositivos." breadcrumbs={[{ label: "Configurações" }, { label: "Totem e guichês" }]} />
    <div className="flex flex-col gap-5">
      <Card><CardHeader title="Dispositivos" description="O código secreto só aparece uma vez, no momento da criação." /><CardBody className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3"><Input label="Nome do dispositivo" placeholder={deviceType === "painel" ? "Painel da recepção" : "Totem da recepção"} value={name} onChange={(e) => setName(e.target.value)} wrapperClassName="w-72" /><label className="flex flex-col gap-1 text-sm text-text-muted"><span>Tipo</span><select className="h-10 rounded-md border border-border bg-surface px-3 text-text" value={deviceType} onChange={(e) => setDeviceType(e.target.value as "totem" | "painel")}><option value="totem">Totem</option><option value="painel">Painel de TV</option></select></label><Button icon={Add} disabled={!name.trim() || createDevice.isPending} loading={createDevice.isPending} onClick={() => createDevice.mutate({ nome: name.trim(), tipo: deviceType }, { onSuccess: (value) => { setCreated(value); setName(""); } })}>Novo dispositivo</Button></div>
        <ErrorText error={devices.error ?? createDevice.error ?? revokeDevice.error} />
        {created && <div className="rounded-lg border border-warning bg-warning-bg p-4"><p className="font-semibold text-warning">Código de {created.dispositivo.nome}</p><p className="mt-1 text-sm text-warning">Copie agora. Este código não será mostrado de novo.</p><div className="mt-3 flex items-center gap-2"><code className="min-w-0 flex-1 break-all rounded bg-surface px-3 py-2 text-xs text-text">{created.token}</code><Button variant="secondary" icon={Copy} onClick={() => void copyToken()}>{copied ? "Copiado" : "Copiar"}</Button><Button variant="ghost" onClick={() => setCreated(null)}>Fechar</Button></div></div>}
        {(devices.data ?? []).length === 0 ? <p className="text-sm text-text-muted">Nenhum dispositivo cadastrado.</p> : <div className="flex flex-col divide-y divide-border">{devices.data?.map((device) => <div key={device.id} className="flex items-center justify-between gap-3 py-3"><div><p className="font-medium text-text">{device.nome}</p><p className="text-xs text-text-muted">{device.tipo === "painel" ? "Painel de TV" : "Totem"}</p><Badge tone={device.ativo ? "success" : "neutral"}>{device.ativo ? "Ativo" : "Revogado"}</Badge></div>{device.ativo && <Button variant="ghost" icon={Trash} className="text-danger" onClick={() => { if (window.confirm(`Revogar ${device.nome}?`)) revokeDevice.mutate(device.id); }}>Revogar</Button>}</div>)}</div>}
      </CardBody></Card>
      <Card><CardHeader title="Tipos de senha" description="A lista vem da configuração real da clínica." /><CardBody className="flex flex-col gap-3"><div className="flex flex-wrap items-end gap-2"><Input label="Nome" value={newType.nome} onChange={(e) => setNewType({ ...newType, nome: e.target.value })} /><Input label="Prefixo" maxLength={8} value={newType.prefixo} onChange={(e) => setNewType({ ...newType, prefixo: e.target.value.toUpperCase() })} wrapperClassName="w-28" /><label className="flex h-10 items-center gap-2 text-sm"><input type="checkbox" checked={newType.preferencial} onChange={(e) => setNewType({ ...newType, preferencial: e.target.checked })} /> Preferencial</label><Button icon={Add} disabled={!newType.nome || !newType.prefixo} onClick={() => saveType.mutate({ ...newType, ativo: true }, { onSuccess: () => setNewType({ nome: "", prefixo: "", preferencial: false }) })}>Adicionar</Button></div><ErrorText error={types.error ?? saveType.error} />{types.data?.map((type) => <div key={type.id} className="flex items-center justify-between border-b border-border py-2.5"><span className="font-medium">{type.nome} <span className="text-sm text-text-muted">({type.prefixo})</span></span><div className="flex items-center gap-2">{type.preferencial && <Badge tone="warning">Preferencial</Badge>}<Button size="xs" variant="ghost" onClick={() => saveType.mutate({ id: type.id, nome: type.nome, prefixo: type.prefixo, preferencial: type.preferencial, ativo: !type.ativo })}>{type.ativo ? "Desativar" : "Ativar"}</Button></div></div>)}</CardBody></Card>
      <Card><CardHeader title="Guichês" description="Defina quais tipos cada guichê chama e a ordem da fila." /><CardBody className="flex flex-col gap-3"><div className="flex items-end gap-2"><Input label="Nome do guichê" value={newCounter} onChange={(e) => setNewCounter(e.target.value)} /><Button icon={Add} disabled={!newCounter.trim()} onClick={() => saveCounter.mutate({ nome: newCounter.trim(), ativo: true, tipos: (types.data ?? []).filter((t) => t.ativo).map((t, index) => ({ tipoId: t.id, ordem: index + 1 })) }, { onSuccess: () => setNewCounter("") })}>Adicionar</Button></div><ErrorText error={counters.error ?? saveCounter.error} />{counters.data?.map((counter) => <div key={counter.id} className="flex items-center justify-between border-b border-border py-3"><div><p className="font-medium">{counter.nome}</p><p className="text-sm text-text-muted">{counter.tipos.map((type) => type.tipoNome).join(" · ") || "Nenhum tipo configurado"}</p></div><Button size="xs" variant="ghost" onClick={() => saveCounter.mutate({ id: counter.id, nome: counter.nome, ativo: !counter.ativo, tipos: counter.tipos.map((type) => ({ tipoId: type.tipoId, ordem: type.ordem })) })}>{counter.ativo ? "Desativar" : "Ativar"}</Button></div>)}</CardBody></Card>
    </div></div>;
}
