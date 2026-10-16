import { useState } from "react";
import { ReceiptText, Refresh, Printer } from "iconsax-reactjs";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Tone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { Patient } from "@/lib/mock/core";
import { professionalById } from "@/lib/mock/core";
import { dateBR } from "@/lib/format";
import { prescriptionsForPatient, type Prescription } from "@/lib/mock/pacientes";

const STATUS_TONE: Record<Prescription["status"], Tone> = { ativa: "success", renovada: "accent", expirada: "neutral" };
const STATUS_LABEL: Record<Prescription["status"], string> = { ativa: "Ativa", renovada: "Renovada", expirada: "Expirada" };

export function Prescricoes({ patient }: { patient: Patient }) {
  const [prescriptions, setPrescriptions] = useState(() => prescriptionsForPatient(patient.id));
  const [banner, setBanner] = useState<string | null>(null);

  function renovar(id: string) {
    setPrescriptions((prev) => prev.map((p) => (p.id === id ? { ...p, status: "renovada" } : p)));
    setBanner("Prescrição renovada com os mesmos medicamentos.");
  }

  return (
    <Card>
      <CardHeader title="Prescrições" description="Receitas emitidas para o paciente, com os medicamentos de cada uma." />
      <CardBody className="flex flex-col gap-4">
        {banner && <p className="rounded-lg bg-accent-muted px-3 py-2 text-sm text-accent">{banner}</p>}
        {prescriptions.length === 0 ? (
          <EmptyState icon={ReceiptText} title="Nenhuma prescrição registrada" />
        ) : (
          prescriptions.map((p) => (
            <div key={p.id} className="rounded-lg p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-text">{dateBR(p.date)}</p>
                  <p className="text-sm text-text-muted">{professionalById(p.professionalId)?.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                  <Button size="sm" variant="secondary" icon={Refresh} disabled={p.status !== "expirada"} onClick={() => renovar(p.id)}>
                    Renovar
                  </Button>
                  <Button size="sm" variant="ghost" icon={Printer} onClick={() => window.print()}>
                    Imprimir
                  </Button>
                </div>
              </div>
              <ul className="flex flex-col gap-2">
                {p.medications.map((m) => (
                  <li key={m.name} className="rounded-lg bg-surface px-3 py-2 text-sm">
                    <p className="font-medium text-text">{m.name}</p>
                    <p className="text-text-muted">
                      {m.dose} · {m.frequency} · {m.duration}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </CardBody>
    </Card>
  );
}
