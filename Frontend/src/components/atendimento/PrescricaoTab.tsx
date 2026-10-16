import { Add, Printer, Trash } from "iconsax-reactjs";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Modal, Switch } from "@/components/ui/overlay";
import { dateLong } from "@/lib/format";
import { MEDICAMENTOS, MEDICAMENTOS_FAVORITOS, VIAS_ADMINISTRACAO } from "@/lib/mock/atendimento";
import { TODAY } from "@/lib/mock/core";
import type { PrescricaoItem } from "@/components/atendimento/types";

export function PrescricaoTab({
  items,
  onChange,
  controlada,
  onControladaChange,
  patientName,
  professionalName,
}: {
  items: PrescricaoItem[];
  onChange: (items: PrescricaoItem[]) => void;
  controlada: boolean;
  onControladaChange: (v: boolean) => void;
  patientName: string;
  professionalName: string;
}) {
  const counter = useRef(0);
  const [preview, setPreview] = useState(false);

  function nextId() {
    counter.current += 1;
    return `rx-${counter.current}`;
  }

  function addRow(medicamentoId = "") {
    const med = MEDICAMENTOS.find((m) => m.id === medicamentoId);
    onChange([...items, { id: nextId(), medicamentoId, posologia: med?.posologiaPadrao ?? "", quantidade: "1", via: "Oral" }]);
  }

  function updateRow(id: string, patch: Partial<PrescricaoItem>) {
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function removeRow(id: string) {
    onChange(items.filter((it) => it.id !== id));
  }

  function onPickMedicamento(id: string, medicamentoId: string) {
    const med = MEDICAMENTOS.find((m) => m.id === medicamentoId);
    updateRow(id, { medicamentoId, posologia: med?.posologiaPadrao ?? "" });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-text-muted">Favoritos:</span>
        {MEDICAMENTOS_FAVORITOS.map((id) => {
          const med = MEDICAMENTOS.find((m) => m.id === id);
          if (!med) return null;
          return (
            <button
              key={id}
              type="button"
              onClick={() => addRow(id)}
              className="inline-flex items-center gap-1 rounded-full border border-border-strong bg-surface-raised px-2.5 py-1 text-sm text-text hover:bg-surface"
            >
              <Add size={17} variant="Linear" aria-hidden />
              {med.name}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3">
        {items.length === 0 && <p className="text-sm text-text-muted">Nenhum item adicionado. Use os favoritos acima ou "Adicionar item".</p>}
        {items.map((item) => (
          <div key={item.id} className="grid grid-cols-1 gap-3 rounded-lg p-3 sm:grid-cols-[2fr_1.6fr_0.8fr_1fr_auto]">
            <Select
              aria-label="Medicamento"
              value={item.medicamentoId}
              onChange={(e) => onPickMedicamento(item.id, e.target.value)}
              placeholder="Selecionar medicamento…"
              options={MEDICAMENTOS.map((m) => ({ value: m.id, label: `${m.name} (${m.forma})` }))}
            />
            <input
              aria-label="Posologia"
              value={item.posologia}
              onChange={(e) => updateRow(item.id, { posologia: e.target.value })}
              placeholder="Posologia"
              className="h-9 w-full rounded-full border border-border-strong bg-surface-raised px-3 text-base text-text placeholder:text-text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            />
            <input
              aria-label="Quantidade"
              value={item.quantidade}
              onChange={(e) => updateRow(item.id, { quantidade: e.target.value })}
              placeholder="Qtd."
              className="h-9 w-full rounded-full border border-border-strong bg-surface-raised px-3 text-base text-text placeholder:text-text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            />
            <Select aria-label="Via" value={item.via} onChange={(e) => updateRow(item.id, { via: e.target.value })} options={VIAS_ADMINISTRACAO.map((v) => ({ value: v, label: v }))} />
            <Button size="sm" variant="ghost" iconOnly aria-label="Remover item" icon={Trash} onClick={() => removeRow(item.id)} />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
        <Button variant="secondary" size="sm" icon={Add} onClick={() => addRow()}>
          Adicionar item
        </Button>
        <Button variant="secondary" size="sm" icon={Printer} onClick={() => setPreview(true)} disabled={items.length === 0}>
          Pré-visualizar impressão
        </Button>
      </div>

      <div className="border-t border-border pt-4">
        <Switch checked={controlada} onChange={onControladaChange} label="Receita de controle especial" description="Gera receituário em duas vias conforme a Portaria 344/98." />
      </div>

      <Modal open={preview} onClose={() => setPreview(false)} title="Pré-visualização da receita" size="md">
        <div className="flex flex-col gap-4 rounded-lg bg-surface p-5 font-sans text-sm">
          <div>
            <p className="font-display text-lg font-semibold text-text">Receituário{controlada ? " de controle especial" : ""}</p>
            <p className="text-text-muted">{dateLong(TODAY)}</p>
          </div>
          <div className="text-text">
            <p>
              <span className="text-text-muted">Paciente: </span>
              {patientName}
            </p>
            <p>
              <span className="text-text-muted">Profissional: </span>
              {professionalName}
            </p>
          </div>
          <ol className="flex flex-col gap-2 border-t border-border pt-3">
            {items.map((item, i) => {
              const med = MEDICAMENTOS.find((m) => m.id === item.medicamentoId);
              return (
                <li key={item.id}>
                  <p className="font-medium text-text">
                    {i + 1}. {med?.name ?? "Medicamento não selecionado"} — {item.quantidade}
                  </p>
                  <p className="text-text-muted">
                    {item.posologia || "—"} · via {item.via}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </Modal>
    </div>
  );
}
