import { Add, CloseCircle, SearchNormal1 } from "iconsax-reactjs";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { EXAMES_TUSS, PAINEIS_EXAMES } from "@/lib/mock/atendimento";
import type { ExameItem } from "@/components/atendimento/types";

export function ExamesTab({
  items,
  onChange,
  justificativa,
  onJustificativaChange,
}: {
  items: ExameItem[];
  onChange: (items: ExameItem[]) => void;
  justificativa: string;
  onJustificativaChange: (v: string) => void;
}) {
  const [search, setSearch] = useState("");

  function addExame(tuss: string) {
    if (items.some((i) => i.tuss === tuss)) return;
    onChange([...items, { tuss }]);
    setSearch("");
  }

  function addPainel(tussList: string[]) {
    const toAdd = tussList.filter((t) => !items.some((i) => i.tuss === t)).map((tuss) => ({ tuss }));
    onChange([...items, ...toAdd]);
  }

  function removeExame(tuss: string) {
    onChange(items.filter((i) => i.tuss !== tuss));
  }

  const matches =
    search.trim().length > 0
      ? EXAMES_TUSS.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()) || e.tuss.includes(search)).slice(0, 6)
      : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-text-muted">Painéis rápidos:</span>
        {PAINEIS_EXAMES.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => addPainel(p.tuss)}
            className="inline-flex items-center gap-1 rounded-full border border-border-strong bg-surface-raised px-2.5 py-1 text-sm text-text hover:bg-surface"
          >
            <Add size={17} variant="Linear" aria-hidden />
            {p.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Input
          label="Buscar exame (TUSS)"
          icon={SearchNormal1}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou código TUSS…"
        />
        {matches.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-surface-raised shadow-pop">
            {matches.map((e) => (
              <li key={e.tuss}>
                <button type="button" onClick={() => addExame(e.tuss)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface">
                  <Add size={19} variant="Linear" aria-hidden className="text-text-subtle" />
                  <span className="font-medium text-text">{e.name}</span>
                  <span className="tabular text-text-subtle">{e.tuss}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState title="Nenhum exame solicitado" description="Busque exames acima ou use um dos painéis rápidos." />
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => {
            const exame = EXAMES_TUSS.find((e) => e.tuss === item.tuss);
            return (
              <li key={item.tuss} className="flex items-center justify-between gap-3 rounded-md bg-surface px-3 py-2.5">
                <div>
                  <p className="font-medium text-text">{exame?.name ?? item.tuss}</p>
                  <p className="tabular text-xs text-text-subtle">TUSS {item.tuss}</p>
                </div>
                <Button size="xs" variant="ghost" iconOnly aria-label="Remover exame" icon={CloseCircle} onClick={() => removeExame(item.tuss)} />
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        {items.length > 0 && (
          <Badge tone="accent" size="md">
            {items.length} exame{items.length > 1 ? "s" : ""} solicitado{items.length > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      <Textarea
        label="Justificativa clínica"
        hint="Obrigatória para convênios — descreva o motivo da solicitação."
        rows={3}
        value={justificativa}
        onChange={(e) => onJustificativaChange(e.target.value)}
      />
    </div>
  );
}
