import { useEffect, useState } from "react";
import { CardTick, DocumentText, MoneyTick, Receipt21 } from "iconsax-reactjs";
import { Drawer } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { DescriptionList, FormSection, Timeline } from "@/components/ui/misc";
import { EmptyState } from "@/components/ui/empty-state";
import { brl, dateBR } from "@/lib/format";
import { TODAY } from "@/lib/mock/core";
import { FORMAS_PAGAMENTO, STATUS_LABEL, STATUS_TONE, historicoLancamento, type Lancamento } from "@/lib/mock/financeiro";

export function LancamentoDetailDrawer({
  lancamento,
  open,
  onClose,
  onRegistrarPagamento,
}: {
  lancamento: Lancamento | null;
  open: boolean;
  onClose: () => void;
  onRegistrarPagamento: (id: string, info: { formaPagamento: string; valor: number; data: string }) => void;
}) {
  const [registrando, setRegistrando] = useState(false);
  const [forma, setForma] = useState("Pix");
  const [dataPg, setDataPg] = useState(TODAY);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRegistrando(false);
    setForma("Pix");
    setDataPg(TODAY);
  }, [lancamento?.id]);

  if (!lancamento) return null;
  const l = lancamento;
  const podeReceber = l.status === "em_aberto" || l.status === "vencido" || l.status === "parcial";
  const temAnexo = Number(l.id.replace(/\D/g, "")) % 3 === 0;

  const parcelas = l.parcelaTotal
    ? Array.from({ length: l.parcelaTotal }, (_, i) => ({
        n: i + 1,
        status: i + 1 < (l.parcelaAtual ?? 1) ? "pago" : i + 1 === (l.parcelaAtual ?? 1) ? "atual" : "pendente",
      }))
    : [];

  return (
    <Drawer open={open} onClose={onClose} width="lg" title={l.descricao} description={l.contraparteNome}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <Badge tone={STATUS_TONE[l.status]} dot>
            {STATUS_LABEL[l.status]}
          </Badge>
          <p className={`font-display text-xl font-semibold ${l.tipo === "receita" ? "text-success" : "text-danger"}`}>{brl(l.valorCents)}</p>
        </div>

        <DescriptionList
          columns={2}
          items={[
            { label: l.tipo === "receita" ? "Paciente / convênio" : "Fornecedor", value: l.contraparteNome },
            { label: "Categoria", value: l.categoria },
            { label: "Centro de custo", value: l.centroCusto },
            { label: "Conta", value: l.conta },
            { label: "Forma de pagamento", value: l.formaPagamento },
            { label: "Vencimento", value: dateBR(l.vencimento) },
            { label: "Data de pagamento", value: l.dataPagamento ? dateBR(l.dataPagamento) : "—" },
            { label: "Recorrente", value: l.recorrente ? "Sim" : "Não" },
          ]}
        />

        {parcelas.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-text">Parcelas</h3>
            <ul className="flex flex-col divide-y divide-border rounded-lg">
              {parcelas.map((p) => (
                <li key={p.n} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-text">Parcela {p.n}/{l.parcelaTotal}</span>
                  <Badge size="sm" tone={p.status === "pago" ? "success" : p.status === "atual" ? "info" : "neutral"}>
                    {p.status === "pago" ? "Paga" : p.status === "atual" ? "Atual" : "Pendente"}
                  </Badge>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-text">Histórico</h3>
          <Timeline
            entries={historicoLancamento(l).map((h) => ({ id: h.id, icon: Receipt21, tone: "neutral" as const, title: h.titulo, meta: dateBR(h.data), body: h.corpo }))}
          />
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-text">Anexos</h3>
          {temAnexo ? (
            <div className="flex items-center gap-2.5 rounded-md border border-border-strong bg-surface px-3 py-2 text-sm">
              <DocumentText size={16} className="text-text-muted" aria-hidden />
              <span className="text-text">comprovante-{l.id}.pdf</span>
            </div>
          ) : (
            <EmptyState icon={DocumentText} title="Nenhum anexo" description="Nenhum comprovante foi anexado a este lançamento." className="py-6" />
          )}
        </section>

        {podeReceber && (
          <FormSection title="Registrar pagamento" description={l.tipo === "receita" ? "Confirme o recebimento deste lançamento." : "Confirme o pagamento deste lançamento."}>
            {registrando ? (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <Select label="Forma de pagamento" value={forma} onChange={(e) => setForma(e.target.value)} options={FORMAS_PAGAMENTO.map((f) => ({ value: f, label: f }))} />
                  <Input label="Data" type="date" value={dataPg} onChange={(e) => setDataPg(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button variant="primary" icon={MoneyTick} onClick={() => onRegistrarPagamento(l.id, { formaPagamento: forma, valor: l.valorCents, data: dataPg })}>
                    Confirmar {l.tipo === "receita" ? "recebimento" : "pagamento"}
                  </Button>
                  <Button variant="ghost" onClick={() => setRegistrando(false)}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <Button variant="primary" icon={CardTick} onClick={() => setRegistrando(true)} className="self-start">
                Registrar {l.tipo === "receita" ? "recebimento" : "pagamento"}
              </Button>
            )}
          </FormSection>
        )}
      </div>
    </Drawer>
  );
}
