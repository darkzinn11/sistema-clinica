import { useState } from "react";

/**
 * Estado de rascunho com "sujo/limpo" pra telas de configuração: `value` é o
 * rascunho em edição, `dirty` liga a barra de salvar, `save`/`discard`
 * confirmam ou descartam. Nada é enviado a lugar nenhum — isso só troca o
 * "salvo" local pelo rascunho atual.
 */
export function useSettingsState<T>(initial: T) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  return {
    value: draft,
    set(updater: T | ((d: T) => T)) {
      setDraft((d) => (typeof updater === "function" ? (updater as (d: T) => T)(d) : updater));
    },
    dirty,
    discard() {
      setDraft(saved);
    },
    save() {
      setSaved(draft);
    },
  };
}
