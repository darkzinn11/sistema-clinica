"use client";

import { useId, useRef, useState, useTransition } from "react";
import { searchPatientsAction } from "@/lib/actions";
import type { Patient } from "@/lib/types";
import { Button } from "@/components/ui/button";

export function PatientCombobox({
  onSelect,
  onCreateNew,
}: {
  onSelect: (patient: Patient) => void;
  onCreateNew?: (name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Patient[]>([]);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const listboxId = useId();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onChange(value: string) {
    setQuery(value);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const found = value.trim().length >= 2 ? await searchPatientsAction(value) : [];
        setResults(found);
      });
    }, 250);
  }

  return (
    <div className="relative flex flex-col gap-1">
      <label htmlFor="patient-search" className="text-xs font-medium text-text-muted">
        Paciente
      </label>
      <input
        id="patient-search"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        autoComplete="off"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="Nome, CPF, telefone ou data de nascimento"
        className="h-10 rounded-md border border-border-input bg-bg px-3 text-base text-text placeholder:text-text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      />
      {open && query.trim().length >= 2 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute top-full z-10 mt-1 w-full rounded-md border border-border bg-surface-raised shadow-[var(--shadow-card)]"
        >
          {isPending && <li className="px-3 py-2 text-sm text-text-muted">Buscando…</li>}
          {!isPending && results.length === 0 && (
            <li className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-text-muted">
              Nenhum paciente encontrado.
              {onCreateNew && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    onCreateNew(query);
                    setOpen(false);
                  }}
                >
                  Cadastrar novo
                </Button>
              )}
            </li>
          )}
          {results.map((patient) => (
            <li key={patient.id} role="option" aria-selected="false">
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-text hover:bg-surface"
                onClick={() => {
                  onSelect(patient);
                  setQuery(patient.fullName);
                  setOpen(false);
                }}
              >
                {patient.fullName}
                <span className="ml-2 text-text-subtle">{patient.mobilePhone}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
