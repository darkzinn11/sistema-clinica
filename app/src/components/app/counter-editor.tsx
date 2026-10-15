"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteCounterAction, saveCounterAction } from "@/lib/actions";
import type { Counter, Location } from "@/lib/types";

export function CounterEditor({ counters, locations }: { counters: Counter[]; locations: Location[] }) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function onInsert() {
    if (!newName.trim()) return;
    setCreating(true);
    await saveCounterAction(null, { name: newName.trim(), coveredLocationIds: [] });
    setNewName("");
    setCreating(false);
    router.refresh();
  }

  function toggleLocation(counter: Counter, locationId: string) {
    const has = counter.coveredLocationIds.includes(locationId);
    const next = has
      ? counter.coveredLocationIds.filter((id) => id !== locationId)
      : [...counter.coveredLocationIds, locationId];
    startTransition(async () => {
      await saveCounterAction(counter.id, { name: counter.name, coveredLocationIds: next });
      router.refresh();
    });
  }

  function onDelete(counterId: string) {
    startTransition(async () => {
      await deleteCounterAction(counterId);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex max-w-sm items-end gap-2">
        <Input label="Novo guichê" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex.: Guichê 5" />
        <Button onClick={onInsert} loading={creating} disabled={!newName.trim()}>
          + Inserir
        </Button>
      </div>

      <ul className="flex flex-col gap-3">
        {counters.map((counter) => (
          <li key={counter.id} className="flex flex-col gap-2 rounded-md border border-border bg-surface-raised p-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-base font-medium text-text">{counter.name}</span>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-text-muted">Atende:</span>
              {locations.map((loc) => (
                <label key={loc.id} className="flex items-center gap-1 text-sm text-text">
                  <input
                    type="checkbox"
                    checked={counter.coveredLocationIds.includes(loc.id)}
                    onChange={() => toggleLocation(counter, loc.id)}
                  />
                  {loc.name}
                </label>
              ))}
              <Button size="sm" variant="danger" loading={isPending} onClick={() => onDelete(counter.id)}>
                Excluir
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
