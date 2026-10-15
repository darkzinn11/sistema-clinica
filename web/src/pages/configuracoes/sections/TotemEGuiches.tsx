import { useState } from "react";
import { Add, Copy, ExportSquare, ScanBarcode, Trash } from "iconsax-reactjs";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/overlay";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { SeriesColorPicker } from "@/components/configuracoes/ColorField";
import { SaveBar } from "@/components/configuracoes/SaveBar";
import { useSettingsState } from "@/components/configuracoes/useSettingsState";
import { defaultGuiches, defaultTicketTypes, type Guiche, type TicketType } from "@/lib/mock/configuracoes";
import { locations } from "@/lib/mock/core";

let nextTicketId = 100;
let nextGuicheId = 100;

interface State {
  ticketTypes: TicketType[];
  guiches: Guiche[];
}

function TicketTypesPanel({ value, onChange }: { value: TicketType[]; onChange: (v: TicketType[]) => void }) {
  const [selectedId, setSelectedId] = useState(value[0]?.id);
  const selected = value.find((t) => t.id === selectedId) ?? value[0];

  function update(patch: Partial<TicketType>) {
    if (!selected) return;
    onChange(value.map((t) => (t.id === selected.id ? { ...t, ...patch } : t)));
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col divide-y divide-border rounded-lg">
        {value.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelectedId(t.id)}
            className={cn("flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface", t.id === selected?.id && "bg-accent-muted")}
          >
            <span aria-hidden className="h-3 w-3 shrink-0 rounded-full" style={{ background: `var(--c-series-${t.color + 1})` }} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-text">{t.name}</span>
              <span className="text-xs text-text-muted">Sigla {t.sigla} · inicia em {t.startNumber}</span>
            </span>
            {t.preferential && <Badge tone="warning" size="sm">Preferencial</Badge>}
            {!t.active && <Badge tone="neutral" size="sm">Inativo</Badge>}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            const t: TicketType = { id: `tt-${nextTicketId++}`, name: "Novo tipo de senha", color: 0, sigla: "N", startNumber: 1, preferential: false, active: true };
            onChange([...value, t]);
            setSelectedId(t.id);
          }}
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium text-accent hover:bg-accent-muted"
        >
          <Add size={21} variant="Linear" aria-hidden /> Novo tipo de senha
        </button>
      </div>

      {selected && (
        <div className="flex flex-col gap-3 rounded-lg p-4">
          <Input label="Nome" value={selected.name} onChange={(e) => update({ name: e.target.value })} />
          <Input label="Sigla" value={selected.sigla} maxLength={3} onChange={(e) => update({ sigla: e.target.value.toUpperCase() })} wrapperClassName="w-24" />
          <Input label="Número inicial" type="number" value={selected.startNumber} onChange={(e) => update({ startNumber: Number(e.target.value) })} wrapperClassName="w-32" />
          <SeriesColorPicker label="Cor de identificação" value={selected.color} onChange={(i) => update({ color: i })} />
          <Switch label="Preferencial" description="Prioriza na fila de chamada." checked={selected.preferential} onChange={(c) => update({ preferential: c })} />
          <Switch label="Ativo" checked={selected.active} onChange={(c) => update({ active: c })} />
          <Button variant="ghost" size="sm" icon={Trash} className="self-start text-danger hover:bg-danger-bg" onClick={() => onChange(value.filter((t) => t.id !== selected.id))}>
            Remover tipo
          </Button>
        </div>
      )}
    </div>
  );
}

function GuichesPanel({ value, onChange }: { value: Guiche[]; onChange: (v: Guiche[]) => void }) {
  function update(id: string, patch: Partial<Guiche>) {
    onChange(value.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }
  return (
    <div className="flex flex-col gap-3">
      {value.map((g) => (
        <div key={g.id} className="flex flex-col gap-3 rounded-lg p-3 sm:flex-row sm:items-start">
          <Input label="Nome do guichê" value={g.name} onChange={(e) => update(g.id, { name: e.target.value })} wrapperClassName="sm:w-52" />
          <div className="flex-1">
            <span className="mb-1.5 block text-sm font-medium text-text">Salas atendidas</span>
            <div className="flex flex-wrap gap-1.5">
              {locations.map((loc) => {
                const active = g.rooms.includes(loc.id);
                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => update(g.id, { rooms: active ? g.rooms.filter((r) => r !== loc.id) : [...g.rooms, loc.id] })}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                      active ? "border-accent/40 bg-accent-muted text-accent" : "border-border-strong text-text-muted hover:text-text",
                    )}
                  >
                    {loc.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:mt-6">
            <Switch label="Ativo" checked={g.active} onChange={(c) => update(g.id, { active: c })} />
            <Button variant="ghost" iconOnly aria-label={`Remover ${g.name}`} icon={Trash} onClick={() => onChange(value.filter((x) => x.id !== g.id))} className="text-danger hover:bg-danger-bg" />
          </div>
        </div>
      ))}
      <Button
        variant="secondary"
        size="sm"
        icon={Add}
        className="self-start"
        onClick={() => onChange([...value, { id: `g-${nextGuicheId++}`, name: `Guichê ${value.length + 1}`, rooms: [], active: true }])}
      >
        Novo guichê
      </Button>
    </div>
  );
}

function PublicLinkRow({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-3 rounded-lg p-4 sm:flex-row sm:items-center">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-border-strong text-text-subtle" aria-hidden>
        <ScanBarcode size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text">{label}</p>
        <p className="truncate font-mono text-sm text-text-muted">{url}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          icon={Copy}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
            } catch {
              // sem permissão de área de transferência
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? "Copiado" : "Copiar"}
        </Button>
        <Button size="sm" variant="ghost" iconOnly aria-label={`Abrir ${label}`} icon={ExportSquare} onClick={() => window.open(url, "_blank", "noopener")} />
      </div>
    </div>
  );
}

export default function TotemEGuiches() {
  const s = useSettingsState<State>({ ticketTypes: defaultTicketTypes, guiches: defaultGuiches });
  const v = s.value;

  return (
    <div>
      <Card>
        <CardHeader title="Totem e guichês" description="Tipos de senha, guichês de atendimento e os links públicos de totem e TV." />
        <CardBody>
          <Tabs tabs={[{ label: "Tipos de senha" }, { label: "Guichês" }, { label: "Links públicos" }]}>
            {(active) =>
              active === 0 ? (
                <TicketTypesPanel value={v.ticketTypes} onChange={(tt) => s.set({ ...v, ticketTypes: tt })} />
              ) : active === 1 ? (
                <GuichesPanel value={v.guiches} onChange={(g) => s.set({ ...v, guiches: g })} />
              ) : (
                <div className="flex flex-col gap-3">
                  <PublicLinkRow label="Totem de autoatendimento" url="https://totem.vidaplena.com.br/centro" />
                  <PublicLinkRow label="Painel de chamada (TV)" url="https://tv.vidaplena.com.br/centro" />
                </div>
              )
            }
          </Tabs>
        </CardBody>
      </Card>
      <SaveBar dirty={s.dirty} onDiscard={s.discard} onSave={s.save} />
    </div>
  );
}
