import { useState } from "react";
import { Document, DocumentText, DocumentText1, DocumentUpload, Gallery } from "iconsax-reactjs";
import type { Icon as IconType } from "iconsax-reactjs";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Modal } from "@/components/ui/overlay";
import { EmptyState } from "@/components/ui/empty-state";
import { TODAY, type Patient } from "@/lib/mock/core";
import { dateBR } from "@/lib/format";
import { filesForPatient, type PatientFile } from "@/lib/mock/pacientes";

const KIND_ICON: Record<PatientFile["kind"], IconType> = { pdf: DocumentText1, imagem: Gallery, planilha: DocumentText, outro: Document };

function formatSize(kb: number): string {
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

export function Arquivos({ patient }: { patient: Patient }) {
  const [files, setFiles] = useState(() => filesForPatient(patient.id));
  const [preview, setPreview] = useState<PatientFile | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function simulateUpload() {
    const file: PatientFile = {
      id: `${patient.id}-file-upload-${files.length + 1}`,
      patientId: patient.id,
      name: "Novo arquivo enviado.pdf",
      kind: "pdf",
      sizeKb: 420,
      uploadedAt: TODAY,
    };
    setFiles((prev) => [file, ...prev]);
  }

  return (
    <Card>
      <CardHeader title="Arquivos" description="Imagens, PDFs e outros documentos anexados ao paciente." />
      <CardBody className="flex flex-col gap-5">
        <button
          type="button"
          onClick={simulateUpload}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            simulateUpload();
          }}
          className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${
            dragOver ? "border-accent bg-accent-muted" : "border-border-strong text-text-muted hover:bg-surface"
          }`}
        >
          <DocumentUpload size={22} aria-hidden />
          <p className="text-sm">
            Arraste um arquivo aqui ou <span className="font-medium text-accent">clique para selecionar</span>
          </p>
        </button>

        {files.length === 0 ? (
          <EmptyState icon={Document} title="Nenhum arquivo anexado" />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {files.map((f) => {
              const Icon = KIND_ICON[f.kind];
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setPreview(f)}
                  className="flex flex-col items-center gap-2 rounded-lg bg-surface p-4 text-center transition-colors hover:bg-surface-raised"
                >
                  <Icon size={28} aria-hidden className="text-text-subtle" />
                  <p className="w-full truncate text-xs font-medium text-text">{f.name}</p>
                  <p className="text-xs text-text-muted">{formatSize(f.sizeKb)}</p>
                </button>
              );
            })}
          </div>
        )}
      </CardBody>

      <Modal open={preview !== null} onClose={() => setPreview(null)} title={preview?.name ?? ""} size="sm">
        {preview && (
          <div className="flex flex-col items-center gap-3 py-4">
            {(() => {
              const Icon = KIND_ICON[preview.kind];
              return <Icon size={48} aria-hidden className="text-text-subtle" />;
            })()}
            <p className="text-sm text-text-muted">
              {formatSize(preview.sizeKb)} · enviado em {dateBR(preview.uploadedAt)}
            </p>
            <p className="text-xs text-text-subtle">Pré-visualização indisponível no protótipo.</p>
          </div>
        )}
      </Modal>
    </Card>
  );
}
