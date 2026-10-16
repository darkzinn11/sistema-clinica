import { TickCircle } from "iconsax-reactjs";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/** Barra fixa de "alterações não salvas" — some sozinha depois de salvar. */
export function SaveBar({ dirty, onDiscard, onSave }: { dirty: boolean; onDiscard: () => void; onSave: () => void }) {
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 2600);
    return () => clearTimeout(t);
  }, [justSaved]);

  if (!dirty && !justSaved) return null;

  return (
    <div className="sticky bottom-4 z-10 mt-6 flex items-center justify-between gap-4 rounded-xl border border-border-strong bg-surface-raised px-4 py-3 shadow-pop">
      {justSaved ? (
        <p className="flex items-center gap-2 text-sm font-medium text-success">
          <TickCircle size={16} variant="Bold" aria-hidden />
          Alterações salvas
        </p>
      ) : (
        <>
          <p className="text-sm text-text-muted">Alterações não salvas</p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onDiscard}>
              Descartar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onSave();
                setJustSaved(true);
              }}
            >
              Salvar
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
