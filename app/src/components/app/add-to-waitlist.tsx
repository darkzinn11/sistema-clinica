"use client";

import { useState, useTransition } from "react";
import { PatientCombobox } from "@/components/app/patient-combobox";
import { addToWaitlistAction } from "@/lib/actions";
import type { Professional, Patient } from "@/lib/types";
import { Button } from "@/components/ui/button";

export function AddToWaitlist({ professionals }: { professionals: Professional[] }) {
  const [open, setOpen] = useState(false);
  const [professionalId, setProfessionalId] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        + Adicionar paciente
      </Button>
    );
  }

  function onSelect(patient: Patient) {
    startTransition(async () => {
      await addToWaitlistAction(patient.id, professionalId || undefined);
      setOpen(false);
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-surface-raised p-3">
      <select
        aria-label="Profissional (opcional)"
        value={professionalId}
        onChange={(e) => setProfessionalId(e.target.value)}
        className="h-9 rounded-md border border-border-input bg-bg px-2 text-sm text-text"
      >
        <option value="">Qualquer profissional</option>
        {professionals.map((p) => (
          <option key={p.id} value={p.id}>
            {p.fullName}
          </option>
        ))}
      </select>
      <PatientCombobox onSelect={onSelect} />
      <button type="button" className="self-end text-xs text-text-muted underline" onClick={() => setOpen(false)}>
        cancelar
      </button>
      {isPending && <span className="text-xs text-text-muted">Adicionando…</span>}
    </div>
  );
}
