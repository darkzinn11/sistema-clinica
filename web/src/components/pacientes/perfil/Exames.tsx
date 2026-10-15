import { ClipboardTick } from "iconsax-reactjs";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Tone } from "@/components/ui/badge";
import { Table, THead, TBody, TH, TR, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import type { Patient } from "@/lib/mock/core";
import { procedureById, professionalById } from "@/lib/mock/core";
import { dateBR } from "@/lib/format";
import { examOrdersForPatient, type ExamOrder } from "@/lib/mock/pacientes";

const STATUS_TONE: Record<ExamOrder["status"], Tone> = { solicitado: "warning", coletado: "info", resultado_disponivel: "success" };
const STATUS_LABEL: Record<ExamOrder["status"], string> = { solicitado: "Solicitado", coletado: "Coletado", resultado_disponivel: "Resultado disponível" };

export function Exames({ patient }: { patient: Patient }) {
  const orders = examOrdersForPatient(patient.id);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader title="Pedidos de exame" description="Status de cada solicitação, da requisição ao resultado." />
        <CardBody>
          {orders.length === 0 ? (
            <EmptyState icon={ClipboardTick} title="Nenhum exame solicitado" />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Exame</TH>
                  <TH>Profissional</TH>
                  <TH>Solicitado em</TH>
                  <TH>Coletado em</TH>
                  <TH>Resultado em</TH>
                  <TH>Status</TH>
                </tr>
              </THead>
              <TBody>
                {orders.map((o) => (
                  <TR key={o.id}>
                    <TD>{procedureById(o.procedureId)?.name}</TD>
                    <TD>{professionalById(o.professionalId)?.name}</TD>
                    <TD className="whitespace-nowrap">{dateBR(o.requestedAt)}</TD>
                    <TD className="whitespace-nowrap">{o.collectedAt ? dateBR(o.collectedAt) : <span className="text-text-subtle">—</span>}</TD>
                    <TD className="whitespace-nowrap">{o.resultAt ? dateBR(o.resultAt) : <span className="text-text-subtle">—</span>}</TD>
                    <TD>
                      <Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>

      {orders
        .filter((o) => o.results && o.results.length > 0)
        .map((o) => (
          <Card key={`${o.id}-results`}>
            <CardHeader title={`Resultado — ${procedureById(o.procedureId)?.name}`} description={o.resultAt ? dateBR(o.resultAt) : undefined} />
            <CardBody>
              <Table>
                <THead>
                  <tr>
                    <TH>Exame</TH>
                    <TH align="right">Resultado</TH>
                    <TH>Referência</TH>
                    <TH>Status</TH>
                  </tr>
                </THead>
                <TBody>
                  {o.results!.map((r) => {
                    const outOfRange = r.value < r.refMin || r.value > r.refMax;
                    return (
                      <TR key={r.name}>
                        <TD>{r.name}</TD>
                        <TD numeric className={outOfRange ? "font-semibold text-danger" : undefined}>
                          {r.value} {r.unit}
                        </TD>
                        <TD className="tabular whitespace-nowrap text-text-muted">
                          {r.refMin} – {r.refMax} {r.unit}
                        </TD>
                        <TD>
                          <Badge tone={outOfRange ? "danger" : "success"} dot>
                            {outOfRange ? "Fora da referência" : "Normal"}
                          </Badge>
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </CardBody>
          </Card>
        ))}
    </div>
  );
}
