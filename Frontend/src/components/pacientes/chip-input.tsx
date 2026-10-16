import { Add } from "iconsax-reactjs";
import { useId, useState } from "react";
import { Select } from "@/components/ui/input";
import { CLINICAL_ALERT_TYPES } from "@/lib/mock/pacientes";

export interface ClinicalAlert {
  type: string;
  text: string;
}

/**
 * Entrada de alertas clínicos: escolhe o tipo, digita e confirma com Enter
 * (ou clicando em adicionar); cada alerta vira um chip removível.
 */
export function ChipInput({ value, onChange }: { value: ClinicalAlert[]; onChange: (v: ClinicalAlert[]) => void }) {
  const [type, setType] = useState(CLINICAL_ALERT_TYPES[0]);
  const [text, setText] = useState("");
  const id = useId();

  function add() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onChange([...value, { type, text: trimmed }]);
    setText("");
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-end gap-2">
        <Select
          label="Tipo"
          wrapperClassName="w-44"
          value={type}
          onChange={(e) => setType(e.target.value)}
          options={CLINICAL_ALERT_TYPES.map((t) => ({ value: t, label: t }))}
        />
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor={id} className="text-sm font-medium text-text">
            Descrição do alerta
          </label>
          <div className="flex gap-2">
            <input
              id={id}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
              placeholder="Ex.: Alergia a dipirona"
              className="h-9 w-full rounded-full border border-border-strong bg-surface-raised px-3 text-base text-text placeholder:text-text-subtle focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            />
            <button
              type="button"
              onClick={add}
              aria-label="Adicionar alerta"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-muted text-accent hover:brightness-95"
            >
              <Add size={21} variant="Linear" aria-hidden />
            </button>
          </div>
        </div>
      </div>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((a, i) => (
            <li key={`${a.type}-${a.text}-${i}`} className="inline-flex items-center gap-1.5 rounded-full bg-danger-bg px-2.5 py-1 text-sm text-danger">
              <span className="font-medium">{a.type}:</span> {a.text}
              <button
                type="button"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                aria-label={`Remover alerta ${a.text}`}
                className="ml-0.5 rounded-full p-0.5 hover:bg-danger/15"
              >
                <Add size={12} aria-hidden className="rotate-45" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
