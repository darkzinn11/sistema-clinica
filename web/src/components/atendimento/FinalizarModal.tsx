import { CloseCircle, TickCircle } from "iconsax-reactjs";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, Switch } from "@/components/ui/overlay";

const RETORNO_OPTIONS = ["Sem retorno", "7 dias", "15 dias", "30 dias", "60 dias"];

export interface ChecklistSummary {
  evolucaoPreenchida: boolean;
  prescricaoCount: number;
  examesCount: number;
  documentosCount: number;
}

function ChecklistRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {ok ? <TickCircle size={16} className="text-success" aria-hidden /> : <CloseCircle size={16} className="text-text-subtle" aria-hidden />}
      <span className={ok ? "text-text" : "text-text-muted"}>{label}</span>
    </li>
  );
}

export function FinalizarModal({
  open,
  onClose,
  onConfirm,
  summary,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  summary: ChecklistSummary;
}) {
  const [assinar, setAssinar] = useState(true);
  const [imprimir, setImprimir] = useState(false);
  const [whatsapp, setWhatsapp] = useState(false);
  const [retorno, setRetorno] = useState("Sem retorno");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Finalizar atendimento"
      description="Confira o resumo antes de encerrar a consulta."
      size="md"
      icon={TickCircle}
      tone="accent"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Voltar
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            Confirmar e finalizar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div>
          <p className="mb-2 text-sm font-semibold text-text-muted">Resumo do atendimento</p>
          <ul className="flex flex-col gap-1.5">
            <ChecklistRow ok={summary.evolucaoPreenchida} label="Evolução registrada" />
            <ChecklistRow ok={summary.prescricaoCount > 0} label={`Prescrição (${summary.prescricaoCount} item${summary.prescricaoCount === 1 ? "" : "s"})`} />
            <ChecklistRow ok={summary.examesCount > 0} label={`Exames solicitados (${summary.examesCount})`} />
            <ChecklistRow ok={summary.documentosCount > 0} label={`Documentos gerados (${summary.documentosCount})`} />
          </ul>
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <Switch checked={assinar} onChange={setAssinar} label="Assinar digitalmente" description="Aplica certificado digital aos documentos gerados." />
          <Switch checked={imprimir} onChange={setImprimir} label="Imprimir ao finalizar" />
          <Switch checked={whatsapp} onChange={setWhatsapp} label="Enviar por WhatsApp" description="Envia receita e documentos ao paciente." />
        </div>

        <div className="border-t border-border pt-4">
          <p className="mb-2 text-sm font-medium text-text">Agendar retorno</p>
          <div className="flex flex-wrap gap-2">
            {RETORNO_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setRetorno(opt)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  retorno === opt ? "border-accent/40 bg-accent-muted text-accent" : "border-border-strong bg-surface-raised text-text-muted hover:text-text"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
