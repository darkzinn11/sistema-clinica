import { useEffect, useRef, useState } from "react";
import { Hospital, ShieldSearch, ShieldTick } from "iconsax-reactjs";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Tone } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { DescriptionList } from "@/components/ui/misc";
import { EmptyState } from "@/components/ui/empty-state";
import type { Patient } from "@/lib/mock/core";
import { dateBR } from "@/lib/format";
import { coveragesForPatient, type CoveragePlan } from "@/lib/mock/pacientes";

const ELIGIBILITY_TONE: Record<CoveragePlan["eligibility"], Tone> = { elegivel: "success", pendente: "warning", inelegivel: "danger" };
const ELIGIBILITY_LABEL: Record<CoveragePlan["eligibility"], string> = { elegivel: "Elegível", pendente: "Verificação pendente", inelegivel: "Inelegível" };

export function Convenios({ patient }: { patient: Patient }) {
  const [coverages, setCoverages] = useState(() => coveragesForPatient(patient.id));
  const [checking, setChecking] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  function verificar(insuranceId: string) {
    setChecking(insuranceId);
    timeoutRef.current = setTimeout(() => {
      setCoverages((prev) => prev.map((c) => (c.insuranceId === insuranceId ? { ...c, eligibility: "elegivel" } : c)));
      setChecking(null);
    }, 900);
  }

  if (coverages.length === 0) {
    return (
      <Card>
        <CardBody>
          <EmptyState
            icon={Hospital}
            title="Paciente particular"
            description="Este paciente não tem convênio cadastrado."
            action={
              <ButtonLink to={`/pacientes/${patient.id}/dados`} variant="secondary">
                Adicionar convênio
              </ButtonLink>
            }
          />
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {coverages.map((c) => (
        <Card key={c.insuranceId}>
          <CardHeader
            title={c.insuranceLabel}
            description={`Plano ${c.plan}`}
            actions={
              <Button size="sm" variant="secondary" icon={ShieldSearch} loading={checking === c.insuranceId} onClick={() => verificar(c.insuranceId)}>
                Verificar elegibilidade
              </Button>
            }
          />
          <CardBody className="flex flex-col gap-4">
            <DescriptionList
              columns={3}
              items={[
                { label: "Carteirinha", value: c.card },
                { label: "Validade", value: dateBR(c.validUntil) },
                { label: "Titular", value: c.holder },
              ]}
            />
            <div className="flex items-center gap-2">
              <ShieldTick size={16} aria-hidden className="text-text-subtle" />
              <Badge tone={ELIGIBILITY_TONE[c.eligibility]} dot>
                {ELIGIBILITY_LABEL[c.eligibility]}
              </Badge>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
