import { IconCircle } from "@/components/ui/icon-circle";
import { useMemo, useState } from "react";
import { Add, Calculator, Lock1, Minus, MoneyAdd, MoneyRemove, Strongbox2, TickCircle } from "iconsax-reactjs";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/overlay";
import { Tabs } from "@/components/ui/tabs";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarList } from "@/components/ui/charts";
import { EmptyState } from "@/components/ui/empty-state";
import { brl, dateBR } from "@/lib/format";
import { TODAY } from "@/lib/mock/core";
import { caixaHoje, cofre, entradasPorFormaCaixa, historicoCaixas as historicoInicial, type MovimentoCaixa } from "@/lib/mock/financeiro";

const CEDULAS = [200, 100, 50, 20, 10, 5, 2];
const MOEDAS = [1, 0.5, 0.25, 0.1, 0.05];

function nowHm(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function Caixa() {
  const [movimentos, setMovimentos] = useState<MovimentoCaixa[]>(caixaHoje.movimentos);
  const [historico, setHistorico] = useState(historicoInicial);
  const [fechado, setFechado] = useState(false);
  const [modal, setModal] = useState<"sangria" | "suprimento" | "fechamento" | null>(null);
  const [valorModal, setValorModal] = useState("");
  const [contagem, setContagem] = useState<Record<number, number>>({});
  const [observacao, setObservacao] = useState("");

  const saldoAtual = caixaHoje.saldoInicialCents + movimentos.reduce((s, m) => s + m.valorCents, 0);
  const entradas = movimentos.filter((m) => m.tipo === "recebimento").reduce((s, m) => s + m.valorCents, 0);
  const saidas = movimentos.filter((m) => m.tipo !== "recebimento" && m.valorCents < 0).reduce((s, m) => s + Math.abs(m.valorCents), 0);
  const breakdown = useMemo(() => entradasPorFormaCaixa(), []);

  const totalContado = [...CEDULAS, ...MOEDAS].reduce((s, v) => s + Math.round(v * 100) * (contagem[v] ?? 0), 0);
  const diferenca = totalContado - saldoAtual;

  function closeModal() {
    setModal(null);
    setValorModal("");
  }

  function confirmarMovimento() {
    const valor = Math.round(Number(valorModal.replace(",", ".")) * 100);
    if (!valor || modal === "fechamento" || modal === null) return;
    setMovimentos((prev) => [
      ...prev,
      {
        id: `mv-extra-${prev.length}`,
        hora: nowHm(),
        tipo: modal,
        descricao: modal === "sangria" ? "Sangria manual" : "Suprimento de troco",
        valorCents: modal === "sangria" ? -valor : valor,
      },
    ]);
    closeModal();
  }

  function confirmarFechamento() {
    setHistorico((prev) => [{ id: `ch-novo-${prev.length}`, data: TODAY, responsavel: caixaHoje.abertoPor, esperadoCents: saldoAtual, contadoCents: totalContado }, ...prev]);
    setFechado(true);
    setModal(null);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Caixa"
        description="Controle do caixa da recepção: movimentações do dia, sangrias, suprimentos e fechamento com conferência."
        breadcrumbs={[{ label: "Financeiro", href: "/financeiro" }, { label: "Caixa" }]}
      />

      {fechado ? (
        <Card className="mb-5 border-success/30 bg-success-bg/40">
          <CardBody className="flex items-center gap-3">
            <TickCircle size={22} variant="Bold" className="text-success" aria-hidden />
            <div>
              <p className="font-medium text-text">Caixa fechado com sucesso</p>
              <p className="text-sm text-text-muted">Contado {brl(totalContado)} · esperado {brl(saldoAtual)} · diferença {brl(diferenca)}</p>
            </div>
          </CardBody>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title={caixaHoje.nome}
            description={`Aberto por ${caixaHoje.abertoPor} às ${caixaHoje.abertoAs}`}
            actions={
              !fechado && (
                <div className="flex gap-2">
                  <Button variant="secondary" icon={MoneyRemove} onClick={() => setModal("sangria")}>Sangria</Button>
                  <Button variant="secondary" icon={MoneyAdd} onClick={() => setModal("suprimento")}>Suprimento</Button>
                  <Button variant="primary" icon={Lock1} onClick={() => setModal("fechamento")}>Fechar caixa</Button>
                </div>
              )
            }
          />
          <CardBody className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Metric label="Saldo inicial" value={brl(caixaHoje.saldoInicialCents)} />
              <Metric label="Entradas" value={brl(entradas)} tone="success" />
              <Metric label="Saídas" value={brl(saidas)} tone="danger" />
              <Metric label="Saldo atual" value={brl(saldoAtual)} strong />
            </div>
            <p className="text-sm text-text-muted">{movimentos.length} movimentações registradas hoje</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Entradas por forma de pagamento" />
          <CardBody>
            {breakdown.length === 0 ? <EmptyState title="Sem entradas ainda" className="py-6" /> : <BarList title="Entradas por forma de pagamento" data={breakdown} format={brl} />}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader title="Movimentações" description="Recebimentos, sangrias e suprimentos do dia, em ordem cronológica." />
        <Table>
          <THead>
            <TR>
              <TH>Hora</TH>
              <TH>Descrição</TH>
              <TH>Tipo</TH>
              <TH>Forma</TH>
              <TH align="right">Valor</TH>
            </TR>
          </THead>
          <TBody>
            {movimentos.map((m) => (
              <TR key={m.id}>
                <TD>{m.hora}</TD>
                <TD>{m.descricao}</TD>
                <TD>
                  <Badge tone={m.tipo === "recebimento" ? "success" : m.tipo === "sangria" ? "warning" : "info"} size="sm">
                    {m.tipo === "recebimento" ? "Recebimento" : m.tipo === "sangria" ? "Sangria" : "Suprimento"}
                  </Badge>
                </TD>
                <TD>{m.formaPagamento ?? "—"}</TD>
                <TD numeric className={m.valorCents >= 0 ? "text-success" : "text-danger"}>
                  {m.valorCents >= 0 ? "+" : "−"}
                  {brl(Math.abs(m.valorCents))}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>

      <Card className="mt-5">
        <CardBody>
          <Tabs tabs={[{ label: "Histórico de caixas" }, { label: "Cofre" }]}>
            {(active) =>
              active === 0 ? (
                <Table>
                  <THead>
                    <TR>
                      <TH>Data</TH>
                      <TH>Responsável</TH>
                      <TH align="right">Esperado</TH>
                      <TH align="right">Contado</TH>
                      <TH align="right">Diferença</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {historico.map((h) => {
                      const dif = h.contadoCents - h.esperadoCents;
                      return (
                        <TR key={h.id}>
                          <TD>{dateBR(h.data)}</TD>
                          <TD>{h.responsavel}</TD>
                          <TD numeric>{brl(h.esperadoCents)}</TD>
                          <TD numeric>{brl(h.contadoCents)}</TD>
                          <TD numeric className={dif === 0 ? "text-text-muted" : dif > 0 ? "text-success" : "text-danger"}>
                            {dif === 0 ? "—" : `${dif > 0 ? "+" : "−"}${brl(Math.abs(dif))}`}
                          </TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              ) : (
                <div className="flex flex-col gap-4 p-1">
                  <div className="flex items-center gap-3 rounded-lg bg-surface p-4">
                    <IconCircle tone="accent" size="lg">
                      <Strongbox2 size={20} aria-hidden />
                    </IconCircle>
                    <div>
                      <p className="text-sm text-text-muted">Saldo do cofre</p>
                      <p className="font-display text-xl font-semibold text-text">{brl(cofre.saldoCents)}</p>
                    </div>
                  </div>
                  <Table>
                    <THead>
                      <TR>
                        <TH>Data</TH>
                        <TH>Descrição</TH>
                        <TH align="right">Valor</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {cofre.movimentos.map((m) => (
                        <TR key={m.id}>
                          <TD>{dateBR(m.data)}</TD>
                          <TD>{m.descricao}</TD>
                          <TD numeric className={m.valorCents >= 0 ? "text-success" : "text-danger"}>
                            {m.valorCents >= 0 ? "+" : "−"}
                            {brl(Math.abs(m.valorCents))}
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </div>
              )
            }
          </Tabs>
        </CardBody>
      </Card>

      <Modal
        open={modal === "sangria" || modal === "suprimento"}
        onClose={closeModal}
        title={modal === "sangria" ? "Registrar sangria" : "Registrar suprimento"}
        description={modal === "sangria" ? "Retirada de dinheiro do caixa (ex.: envio ao cofre)." : "Entrada de dinheiro no caixa (ex.: troco inicial)."}
        icon={modal === "sangria" ? MoneyRemove : MoneyAdd}
        tone={modal === "sangria" ? "warning" : "accent"}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>Cancelar</Button>
            <Button variant="primary" onClick={confirmarMovimento}>Confirmar</Button>
          </>
        }
      >
        <Input label="Valor" suffix="BRL" inputMode="decimal" placeholder="0,00" value={valorModal} onChange={(e) => setValorModal(e.target.value)} autoFocus />
      </Modal>

      <Modal
        open={modal === "fechamento"}
        onClose={closeModal}
        title="Fechar caixa"
        description="Conte o dinheiro em caixa e confira com o saldo esperado pelo sistema."
        size="lg"
        icon={Calculator}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>Cancelar</Button>
            <Button variant="primary" icon={Lock1} onClick={confirmarFechamento}>Confirmar fechamento</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-text">Cédulas</h3>
            <div className="flex flex-col gap-2">
              {CEDULAS.map((v) => (
                <ContagemRow key={v} valor={v} quantidade={contagem[v] ?? 0} onChange={(q) => setContagem((p) => ({ ...p, [v]: q }))} />
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-text">Moedas</h3>
            <div className="flex flex-col gap-2">
              {MOEDAS.map((v) => (
                <ContagemRow key={v} valor={v} quantidade={contagem[v] ?? 0} onChange={(q) => setContagem((p) => ({ ...p, [v]: q }))} />
              ))}
            </div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-4 rounded-lg bg-surface p-4">
          <Metric label="Esperado" value={brl(saldoAtual)} />
          <Metric label="Contado" value={brl(totalContado)} />
          <Metric label="Diferença" value={brl(diferenca)} tone={diferenca === 0 ? undefined : diferenca > 0 ? "success" : "danger"} strong />
        </div>
        <Textarea label="Observação" className="mt-4" placeholder="Explique eventuais diferenças…" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
      </Modal>
    </div>
  );
}

function ContagemRow({ valor, quantidade, onChange }: { valor: number; quantidade: number; onChange: (q: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-text-muted">{brl(Math.round(valor * 100))}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" aria-label="Diminuir" onClick={() => onChange(Math.max(0, quantidade - 1))} className="flex h-7 w-7 items-center justify-center rounded-md border border-border-strong text-text-muted hover:bg-surface">
          <Minus size={14} aria-hidden />
        </button>
        <input
          type="number"
          min={0}
          value={quantidade}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className="h-7 w-14 rounded-md border border-border-strong bg-surface-raised text-center text-sm tabular text-text"
          aria-label={`Quantidade de notas/moedas de ${brl(Math.round(valor * 100))}`}
        />
        <button type="button" aria-label="Aumentar" onClick={() => onChange(quantidade + 1)} className="flex h-7 w-7 items-center justify-center rounded-md border border-border-strong text-text-muted hover:bg-surface">
          <Add size={19} variant="Linear" aria-hidden />
        </button>
      </div>
    </div>
  );
}

function Metric({ label, value, tone, strong }: { label: string; value: string; tone?: "success" | "danger"; strong?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-sm text-text-muted">{label}</span>
      <span className={`tabular font-display text-lg font-semibold ${tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-text"} ${strong ? "text-xl" : ""}`}>{value}</span>
    </div>
  );
}
