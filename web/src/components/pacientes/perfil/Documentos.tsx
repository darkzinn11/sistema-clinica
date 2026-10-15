import { IconCircle } from "@/components/ui/icon-circle";
import { DocumentDownload, DocumentText1, Printer } from "iconsax-reactjs";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { Patient } from "@/lib/mock/core";
import { professionalById } from "@/lib/mock/core";
import { dateBR } from "@/lib/format";
import { documentsForPatient, type PatientDocument } from "@/lib/mock/pacientes";

const TYPE_LABEL: Record<PatientDocument["type"], string> = {
  atestado: "Atestado",
  declaracao: "Declaração",
  laudo: "Laudo",
  encaminhamento: "Encaminhamento",
};

export function Documentos({ patient }: { patient: Patient }) {
  const docs = documentsForPatient(patient.id);

  return (
    <Card>
      <CardHeader title="Documentos" description="Atestados, declarações, laudos e encaminhamentos emitidos para o paciente." />
      <CardBody>
        {docs.length === 0 ? (
          <EmptyState icon={DocumentText1} title="Nenhum documento emitido" />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {docs.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <IconCircle tone="neutral" size="md">
                    <DocumentText1 size={17} aria-hidden />
                  </IconCircle>
                  <div>
                    <p className="text-sm font-medium text-text">{d.title}</p>
                    <p className="text-xs text-text-muted">
                      {TYPE_LABEL[d.type]} · {dateBR(d.date)} · {professionalById(d.professionalId)?.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={d.status === "assinado" ? "success" : "neutral"}>{d.status === "assinado" ? "Assinado" : "Rascunho"}</Badge>
                  <Button size="sm" variant="ghost" iconOnly icon={DocumentDownload} aria-label={`Baixar ${d.title}`} />
                  <Button size="sm" variant="ghost" iconOnly icon={Printer} aria-label={`Imprimir ${d.title}`} onClick={() => window.print()} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
