import { useState } from "react";
import { CardTick1, Printer, ReceiptText, Wallet2 } from "iconsax-reactjs";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TH, TR, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/overlay";
import { Select, Input } from "@/components/ui/input";
import type { Patient } from "@/lib/mock/core";
import { brl, dateBR } from "@/lib/format";
import { financialEntriesForPatient, proposalsForPatient, type FinancialEntry, type Proposal } from "@/lib/mock/pacientes";

const ENTRY_STATUS_TONE: Record<FinancialEntry["status"], Tone> = { pago: "success", pendente: "warning", atrasado: "danger" };
const ENTRY_STATUS_LABEL: Record<FinancialEntry["status"], string> = { pago: "Pago", pendente: "Pendente", atrasado: "Atrasado" };
const PROPOSAL_STATUS_TONE: Record<Proposal["status"], Tone> = { aguardando: "warning", aprovada: "success", recusada: "danger" };
const PROPOSAL_STATUS_LABEL: Record<Proposal["status"], string> = { aguardando: "Aguardando aprovação", aprovada: "Aprovada", recusada: "Recusada" };

const METHODS = ["Pix", "Cartão de crédito", "Cartão de débito", "Dinheiro", "Boleto"];
const INSTALLMENTS = Array.from({ length: 12 }, (_, i) => `${i + 1}x`);

export function Financeiro({ patient }: { patient: Patient }) {
  const [entries, setEntries] = useState(() => financialEntriesForPatient(patient.id));
  const [balanceCents, setBalanceCents] = useState(patient.balanceCents);
  const proposals = proposalsForPatient(patient.id);
  const [showDrawer, setShowDrawer] = useState(false);
  const [forma, setForma] = useState(METHODS[0]);
  const [parcelas, setParcelas] = useState(INSTALLMENTS[0]);
  const [valor, setValor] = useState((balanceCents / 100).toFixed(2).replace(".", ","));
  const [banner, setBanner] = useState<string | null>(null);

  function receberPagamento() {
    setEntries((prev) => prev.map((e) => (e.status !== "pago" ? { ...e, status: "pago", method: forma } : e)));
    setBalanceCents(0);
    setBanner(`Pagamento de ${brl(balanceCents)} recebido via ${forma}${parcelas !== "1x" ? ` em ${parcelas}` : ""}.`);
    setShowDrawer(false);
  }

  const receipts = entries.filter((e) => e.status === "pago");

  return (
    <div className="flex flex-col gap-5">
      {banner && <p className="rounded-lg bg-accent-muted px-3 py-2 text-sm text-accent">{banner}</p>}

      <Card>
        <CardHeader
          title="Saldo"
          actions={
            balanceCents > 0 ? (
              <Button size="sm" variant="primary" icon={CardTick1} onClick={() => setShowDrawer(true)}>
                Receber pagamento
              </Button>
            ) : undefined
          }
        />
        <CardBody>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-muted">Saldo em aberto</span>
            <span className={balanceCents > 0 ? "font-display text-xl font-semibold text-danger" : "font-display text-xl font-semibold text-success"}>
              {balanceCents > 0 ? brl(balanceCents) : "Em dia"}
            </span>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Lançamentos" />
        <CardBody>
          {entries.length === 0 ? (
            <EmptyState icon={Wallet2} title="Nenhum lançamento" />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Data</TH>
                  <TH>Descrição</TH>
                  <TH>Forma</TH>
                  <TH align="right">Valor</TH>
                  <TH>Status</TH>
                </tr>
              </THead>
              <TBody>
                {entries.map((e) => (
                  <TR key={e.id}>
                    <TD className="whitespace-nowrap">{dateBR(e.date)}</TD>
                    <TD>{e.description}</TD>
                    <TD>{e.method ?? <span className="text-text-subtle">—</span>}</TD>
                    <TD numeric className={e.status === "pago" ? "text-success" : "text-danger"}>
                      {brl(e.amountCents)}
                    </TD>
                    <TD>
                      <Badge tone={ENTRY_STATUS_TONE[e.status]}>{ENTRY_STATUS_LABEL[e.status]}</Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Recibos" description="Disponíveis para lançamentos já pagos." />
        <CardBody>
          {receipts.length === 0 ? (
            <EmptyState icon={ReceiptText} title="Nenhum recibo disponível" />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {receipts.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-text">{r.description}</p>
                    <p className="text-xs text-text-muted">
                      {dateBR(r.date)} · {brl(r.amountCents)}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" icon={Printer} onClick={() => window.print()}>
                    Imprimir
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Propostas" description="Orçamentos enviados ao paciente." />
        <CardBody>
          {proposals.length === 0 ? (
            <EmptyState icon={ReceiptText} title="Nenhuma proposta enviada" />
          ) : (
            <ul className="flex flex-col gap-3">
              {proposals.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg p-3">
                  <div>
                    <p className="text-sm font-medium text-text">{p.title}</p>
                    <p className="text-xs text-text-muted">{dateBR(p.date)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular font-medium text-text">{brl(p.amountCents)}</span>
                    <Badge tone={PROPOSAL_STATUS_TONE[p.status]}>{PROPOSAL_STATUS_LABEL[p.status]}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Modal
        open={showDrawer}
        onClose={() => setShowDrawer(false)}
        title="Receber pagamento"
        description={`Saldo em aberto: ${brl(balanceCents)}`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDrawer(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={receberPagamento}>
              Confirmar recebimento
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Select label="Forma de pagamento" value={forma} onChange={(e) => setForma(e.target.value)} options={METHODS.map((m) => ({ value: m, label: m }))} />
          <Input label="Valor" value={valor} onChange={(e) => setValor(e.target.value)} suffix="BRL" />
          <Select
            label="Parcelas"
            value={parcelas}
            onChange={(e) => setParcelas(e.target.value)}
            disabled={forma !== "Cartão de crédito"}
            options={INSTALLMENTS.map((p) => ({ value: p, label: p }))}
          />
        </div>
      </Modal>
    </div>
  );
}
