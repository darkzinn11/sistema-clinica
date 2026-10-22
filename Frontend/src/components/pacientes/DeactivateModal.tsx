import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/overlay";
import { ApiError } from "@/lib/api/client";
import { useDeactivatePatient } from "@/lib/api/pacientes";

const REASONS = [
  { value: "sem_vinculo", label: "Sem vínculo com a clínica" },
  { value: "obito", label: "Óbito" },
  { value: "sem_motivo", label: "Sem motivo informado" },
] as const;

/** Inativar com motivo: o paciente sai das buscas, o histórico fica e o cadastro pode ser reativado. */
export function DeactivateModal({ patient, onClose, onDone }: { patient: { id: string; nome: string } | null; onClose: () => void; onDone: (name: string) => void }) {
  const deactivate = useDeactivatePatient();
  const [reason, setReason] = useState<(typeof REASONS)[number]["value"]>("sem_vinculo");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    if (!patient) return;
    setError(null);
    deactivate.mutateAsync({ id: patient.id, motivo: reason, observacao: note.trim() || undefined })
      .then(() => { setNote(""); onDone(patient.nome); })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Não foi possível inativar."));
  }

  return (
    <Modal
      open={patient !== null}
      onClose={onClose}
      title="Inativar paciente"
      description={patient ? `${patient.nome} deixa de aparecer nas buscas. O histórico é mantido e o cadastro pode ser reativado.` : undefined}
      tone="danger"
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Voltar</Button>
          <Button variant="danger" size="sm" loading={deactivate.isPending} onClick={confirm}>Inativar</Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Select label="Motivo" value={reason} onChange={(e) => setReason(e.target.value as typeof reason)} options={REASONS.map((r) => ({ value: r.value, label: r.label }))} />
        <Input label="Observação (opcional)" value={note} onChange={(e) => setNote(e.target.value)} />
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      </div>
    </Modal>
  );
}
