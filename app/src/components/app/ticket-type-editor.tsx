"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteTicketTypeAction, saveTicketTypeAction } from "@/lib/actions";
import type { TicketType } from "@/lib/types";

type FormState = {
  name: string;
  colorHex: string;
  prefix: string;
  startNumber: number;
  active: boolean;
};

function toForm(t: TicketType | null): FormState {
  return t
    ? { name: t.name, colorHex: t.colorHex, prefix: t.prefix, startNumber: t.startNumber, active: t.active }
    : { name: "", colorHex: "#1d55d6", prefix: "", startNumber: 1, active: true };
}

export function TicketTypeEditor({ ticketTypes }: { ticketTypes: TicketType[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(ticketTypes[0]?.id ?? null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(toForm(ticketTypes[0] ?? null));
  const [saving, setSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selected = creating ? null : ticketTypes.find((t) => t.id === selectedId) ?? null;

  function select(t: TicketType) {
    setCreating(false);
    setSelectedId(t.id);
    setForm(toForm(t));
  }

  function startCreate() {
    setCreating(true);
    setSelectedId(null);
    setForm(toForm(null));
  }

  async function onSave() {
    setSaving(true);
    await saveTicketTypeAction(creating ? null : selectedId, {
      name: form.name,
      colorHex: form.colorHex,
      prefix: form.prefix.toUpperCase(),
      startNumber: form.startNumber,
      active: form.active,
    });
    setSaving(false);
    setCreating(false);
    router.refresh();
  }

  function onDelete() {
    if (!selectedId) return;
    startTransition(async () => {
      await deleteTicketTypeAction(selectedId);
      router.refresh();
    });
    setSelectedId(null);
  }

  return (
    <div className="grid gap-6 md:grid-cols-[220px_1fr]">
      <div className="flex flex-col gap-2">
        <Button size="sm" onClick={startCreate}>
          + Inserir
        </Button>
        <ul className="flex flex-col gap-1">
          {ticketTypes.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => select(t)}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-on-accent ${
                  selected?.id === t.id ? "ring-2 ring-accent ring-offset-1" : ""
                }`}
                style={{ backgroundColor: t.colorHex }}
              >
                {t.name}
                {!t.active && <span className="text-xs opacity-80">(inativo)</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex max-w-md flex-col gap-4 rounded-md border border-border bg-surface-raised p-4">
        <Input label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <div className="flex items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="color" className="text-xs font-medium text-text-muted">
              Cor
            </label>
            <div className="flex items-center gap-2">
              <input
                id="color"
                type="color"
                value={form.colorHex}
                onChange={(e) => setForm({ ...form, colorHex: e.target.value })}
                className="h-10 w-10 cursor-pointer rounded-md border border-border-input bg-bg"
              />
              <input
                aria-label="Cor em hexadecimal"
                value={form.colorHex}
                onChange={(e) => setForm({ ...form, colorHex: e.target.value })}
                className="h-10 w-28 rounded-md border border-border-input bg-bg px-2 text-base text-text"
              />
            </div>
          </div>
          <Input
            label="Sigla"
            value={form.prefix}
            onChange={(e) => setForm({ ...form, prefix: e.target.value })}
            placeholder="Ex.: CON"
          />
          <Input
            label="Nº de início"
            type="number"
            min={1}
            value={form.startNumber}
            onChange={(e) => setForm({ ...form, startNumber: Number(e.target.value) })}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-text">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
          Ativo (aparece no totem)
        </label>
        <div className="flex gap-2">
          <Button onClick={onSave} loading={saving} disabled={!form.name || !form.prefix}>
            {creating ? "Inserir" : "Salvar"}
          </Button>
          {!creating && selected && (
            <Button variant="danger" onClick={onDelete} loading={isPending}>
              Excluir
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
