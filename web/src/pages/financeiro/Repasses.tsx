import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Drawer } from "@/components/ui/overlay";
import { DescriptionList, Steps } from "@/components/ui/misc";
import { brl, dateBR } from "@/lib/format";
import { patientById, procedureById, professionalById } from "@/lib/mock/core";
import { COMPETENCIAS, competenciaLabel, repassesPorCompetencia, type RepasseProfissional } from "@/lib/mock/financeiro";

const STATUS_LABEL: Record<RepasseProfissional["status"], string> = { pendente: "Pendente", aprovado: "Aprovado", pago: "Pago" };
const STATUS_TONE: Record<RepasseProfissional["status"], "warning" | "info" | "success"> = { pendente: "warning", aprovado: "info", pago: "success" };

export default function Repasses() {
  const [competencia, setCompetencia] = useState(COMPETENCIAS[COMPETENCIAS.length - 1]);
  const [detalheId, setDetalheId] = useState<string | null>(null);
  const [fechamentoAberto, setFechamentoAberto] = useState(false);
  const [passo, setPasso] = useState(0);
  const [statusOverride, setStatusOverride] = useState<Record<string, RepasseProfissional["status"]>>({});

  const repasses = useMemo(() => repassesPorCompetencia(competencia), [competencia]);
  const efetivos = repasses.map((r) => ({ ...r, status: statusOverride[r.professionalId] ?? r.status }));
  const detalhe = efetivos.find((r) => r.professionalId === detalheId) ?? null;

  const totalARepassar = efetivos.reduce((s, r) => s + r.aRepassarCents, 0);
  const pendentes = efetivos.filter((r) => r.status === "pendente").length;

  function avancarFechamento() {
    if (passo < 2) {
      setPasso((p) => p + 1);
      return;
    }
    setStatusOverride((prev) => {
      const next = { ...prev };
      for (const r of efetivos) next[r.professionalId] = "pago";
      return next;
    });
    setFechamentoAberto(false);
    setPasso(0);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Repasses"
        description="Produção e repasse por profissional, por competência."
        breadcrumbs={[{ label: "Financeiro", href: "/financeiro" }, { label: "Repasses" }]}
        actions={
          <div className="flex items-center gap-3">
            <Select aria-label="Competência" value={competencia} onChange={(e) => setCompetencia(e.target.value)} options={COMPETENCIAS.map((c) => ({ value: c, label: competenciaLabel(c) }))} wrapperClassName="w-48" />
            <Button variant="primary" onClick={() => setFechamentoAberto(true)}>
              Fechar competência
            </Button>
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Metric label="Competência" value={competenciaLabel(competencia)} />
        <Metric label="Total a repassar" value={brl(totalARepassar)} />
        <Metric label="Pendentes de aprovação" value={String(pendentes)} />
      </div>

      <Card>
        <CardHeader title="Repasse por profissional" />
        <Table>
          <THead>
            <TR>
              <TH>Profissional</TH>
              <TH align="right">Produção bruta</TH>
              <TH align="right">Regra</TH>
              <TH align="right">Descontos</TH>
              <TH align="right">A repassar</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {efetivos.map((r) => {
              const prof = professionalById(r.professionalId);
              return (
                <TR key={r.professionalId} interactive onClick={() => setDetalheId(r.professionalId)}>
                  <TD>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={prof?.name ?? ""} size="sm" />
                      <div>
                        <p className="font-medium text-text">{prof?.name}</p>
                        <p className="text-xs text-text-muted">{prof?.specialty}</p>
                      </div>
                    </div>
                  </TD>
                  <TD numeric>{brl(r.producaoBrutaCents)}</TD>
                  <TD numeric>{r.regraPercent}%</TD>
                  <TD numeric className="text-danger">−{brl(r.descontosCents)}</TD>
                  <TD numeric className="font-semibold">{brl(r.aRepassarCents)}</TD>
                  <TD>
                    <Badge tone={STATUS_TONE[r.status]} dot size="sm">{STATUS_LABEL[r.status]}</Badge>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </Card>

      <Drawer open={Boolean(detalhe)} onClose={() => setDetalheId(null)} width="lg" title={professionalById(detalhe?.professionalId ?? "")?.name ?? ""} description={competenciaLabel(competencia)}>
        {detalhe && (
          <div className="flex flex-col gap-6">
            <DescriptionList
              columns={2}
              items={[
                { label: "Produção bruta", value: brl(detalhe.producaoBrutaCents) },
                { label: "Regra de repasse", value: `${detalhe.regraPercent}%` },
                { label: "Descontos", value: brl(detalhe.descontosCents) },
                { label: "A repassar", value: brl(detalhe.aRepassarCents) },
              ]}
            />
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-text">Itens do período ({detalhe.itens.length})</h3>
              <Table>
                <THead>
                  <TR>
                    <TH>Data</TH>
                    <TH>Paciente</TH>
                    <TH>Procedimento</TH>
                    <TH align="right">Valor</TH>
                    <TH align="right">%</TH>
                    <TH align="right">Repasse</TH>
                  </TR>
                </THead>
                <TBody>
                  {detalhe.itens.map((it) => (
                    <TR key={it.id}>
                      <TD>{dateBR(it.data)}</TD>
                      <TD className="max-w-40 truncate">{patientById(it.pacienteId)?.name}</TD>
                      <TD className="max-w-48 truncate">{procedureById(it.procedimentoId)?.name}</TD>
                      <TD numeric>{brl(it.valorCents)}</TD>
                      <TD numeric>{it.percentual}%</TD>
                      <TD numeric className="font-medium">{brl(it.repasseCents)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </section>
          </div>
        )}
      </Drawer>

      <Drawer
        open={fechamentoAberto}
        onClose={() => {
          setFechamentoAberto(false);
          setPasso(0);
        }}
        title="Fechar competência"
        description={competenciaLabel(competencia)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setFechamentoAberto(false)}>Cancelar</Button>
            <Button variant="primary" onClick={avancarFechamento}>{passo < 2 ? "Avançar" : "Confirmar pagamento"}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-6">
          <Steps steps={["Conferir", "Aprovar", "Pagar"]} current={passo} />
          {passo === 0 && (
            <p className="text-base text-text-muted">
              Confira os {efetivos.length} repasses da competência de {competenciaLabel(competencia)}, totalizando {brl(totalARepassar)}. Nenhum valor será alterado nesta etapa.
            </p>
          )}
          {passo === 1 && <p className="text-base text-text-muted">Ao aprovar, todos os repasses pendentes ficam disponíveis para pagamento.</p>}
          {passo === 2 && <p className="text-base text-text-muted">Confirme para marcar todos os repasses desta competência como pagos.</p>}
        </div>
      </Drawer>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-surface-raised p-4 shadow-card">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="font-display text-xl font-semibold text-text">{value}</span>
    </div>
  );
}
