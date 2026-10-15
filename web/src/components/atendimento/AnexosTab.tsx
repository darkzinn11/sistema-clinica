import { DocumentText, Gallery, GalleryAdd, Trash } from "iconsax-reactjs";
import { useRef, useState } from "react";
import type { DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { Anexo } from "@/lib/mock/atendimento";

function kindFor(filename: string): Anexo["kind"] {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "imagem";
  if (ext === "pdf") return "pdf";
  return "documento";
}

export function AnexosTab({ anexos, onChange }: { anexos: Anexo[]; onChange: (anexos: Anexo[]) => void }) {
  const [dragOver, setDragOver] = useState(false);
  const counter = useRef(0);

  function addFiles(names: string[]) {
    if (names.length === 0) return;
    const today = new Date().toLocaleDateString("pt-BR");
    const novos: Anexo[] = names.map((name) => {
      counter.current += 1;
      return { id: `anexo-novo-${counter.current}`, name, kind: kindFor(name), addedAt: today };
    });
    onChange([...novos, ...anexos]);
  }

  function onDrop(e: DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    setDragOver(false);
    const names = Array.from(e.dataTransfer.files).map((f) => f.name);
    addFiles(names.length > 0 ? names : [`documento-${anexos.length + 1}.pdf`]);
  }

  function remove(id: string) {
    onChange(anexos.filter((a) => a.id !== id));
  }

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={() => addFiles([`anexo-${anexos.length + 1}.pdf`])}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-center transition-colors ${
          dragOver ? "border-accent bg-accent-muted" : "border-border-strong bg-surface hover:bg-surface/70"
        }`}
      >
        <GalleryAdd size={28} className="text-text-subtle" aria-hidden />
        <p className="text-base font-medium text-text">Arraste arquivos aqui ou clique para simular um envio</p>
        <p className="text-sm text-text-muted">Imagens, PDFs e documentos</p>
      </button>

      {anexos.length === 0 ? (
        <EmptyState icon={Gallery} title="Nenhum anexo" description="Os arquivos enviados durante o atendimento aparecem aqui." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {anexos.map((a) => (
            <div key={a.id} className="flex flex-col gap-2 rounded-lg bg-surface-raised p-3">
              <span className="flex h-16 w-full items-center justify-center rounded-md bg-surface text-text-subtle">
                {a.kind === "imagem" ? <Gallery size={26} aria-hidden /> : <DocumentText size={26} aria-hidden />}
              </span>
              <p className="truncate text-sm font-medium text-text" title={a.name}>
                {a.name}
              </p>
              <div className="flex items-center justify-between">
                <p className="text-xs text-text-subtle">{a.addedAt}</p>
                <Button size="xs" variant="ghost" iconOnly aria-label={`Remover ${a.name}`} icon={Trash} onClick={() => remove(a.id)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
