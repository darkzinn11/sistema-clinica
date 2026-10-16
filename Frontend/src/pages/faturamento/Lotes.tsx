import { Add, ArchiveBox, ArrowLeft2, ArrowRight2, ClipboardTick, Clock, DocumentText, Moneys, TickCircle, Warning2 } from "iconsax-reactjs";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/charts";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Checkbox, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/overlay";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR, TableFooter } from "@/components/ui/table";
import { brl, dateBR } from "@/lib/format";
import { CONVENIOS, LOTE_STATUS_META, type LoteStatus, guiaById, guiaDisplayPatientName, guias, insuranceName, lotes } from "@/lib/mock/faturamento";

export default function Lotes() {
  const navigate = useNavigate();
  const [fecharOpen, setFecharOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [convenioEscolhido, setConvenioEscolhido] = useState("");
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [confirmado, setConfirmado] = useState(false);

  const totalAberto = lotes.filter((l) => l.status === "aberto").length;
  const valorEnviado = lotes.filter((l) => l.status === "enviado").reduce((s, l) => s + l.valorCents, 0);
  const pendenteConferencia = lotes.filter((l) => l.status === "fechado" && !l.conferido).length;
  const valorTotal = lotes.reduce((s, l) => s + l.valorCents, 0);

  const guiasProntasConvenio = useMemo(() => guias.filter((g) => g.insuranceId === convenioEscolhido && g.status === "pronta"), [convenioEscolhido]);

  function toggleGuia(id: string) {
    setSelecionadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function abrirFechar() {
    setStep(0);
    setConvenioEscolhido("");
    setSelecionadas(new Set());
    setConfirmado(false);
    setFecharOpen(true);
  }

  function confirmarFechamento() {
    setConfirmado(true);
  }

  const totalSelecionado = Array.from(selecionadas).reduce((s, id) => s + (guiaById(id)?.valorCents ?? 0), 0);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Lotes"
        description="Agrupamentos de guias enviados aos convênios."
        breadcrumbs={[{ label: "Faturamento TISS", href: "/faturamento" }, { label: "Lotes" }]}
        actions={<Button variant="primary" icon={Add} onClick={abrirFechar}>Fechar novo lote</Button>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4 ui-stat-strip" data-columns="4">
        <StatCard icon={<ArchiveBox />} label="Lotes em aberto" value={totalAberto} />
        <StatCard icon={<Clock />} label="Aguardando retorno" value={brl(valorEnviado)} />
        <StatCard icon={<DocumentText />} label="Pendentes de conferência" value={pendenteConferencia} />
        <StatCard icon={<Moneys />} label="Valor total em lotes" value={brl(valorTotal)} />
      </div>

      <Card>
        {lotes.length === 0 ? (
          <EmptyState title="Nenhum lote criado" description="Feche um lote a partir das guias prontas." />
        ) : (
          <>
            <Table>
              <THead>
                <TR><TH>Número</TH><TH>Convênio</TH><TH align="right">Guias</TH><TH align="right">Valor</TH><TH>Status</TH><TH>Conferência</TH><TH>Data de envio</TH></TR>
              </THead>
              <TBody>
                {lotes.slice(0, 30).map((l) => (
                  <TR key={l.id} interactive onClick={() => navigate(`/faturamento/lotes/${l.id}`)}>
                    <TD className="tabular font-medium text-text">{l.numero}</TD>
                    <TD>{insuranceName(l.insuranceId)}</TD>
                    <TD numeric>{l.guiaIds.length}</TD>
                    <TD numeric>{brl(l.valorCents)}</TD>
                    <TD><Badge tone={LOTE_STATUS_META[l.status as LoteStatus].tone} dot>{LOTE_STATUS_META[l.status as LoteStatus].label}</Badge></TD>
                    <TD>
                      {l.conferido ? (
                        <span className="inline-flex items-center gap-1 text-sm text-success"><TickCircle size={14} aria-hidden />Conferido</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-sm text-warning"><Warning2 size={14} aria-hidden />Pendente</span>
                      )}
                    </TD>
                    <TD className="text-text-muted">{l.dataEnvio ? dateBR(l.dataEnvio) : "—"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <TableFooter total={lotes.length} pageSize={30} label="lotes" />
          </>
        )}
      </Card>

      <Modal
        open={fecharOpen}
        onClose={() => setFecharOpen(false)}
        title={confirmado ? "Lote fechado" : "Fechar novo lote"}
        description={confirmado ? undefined : "Escolha o convênio e as guias prontas que farão parte deste lote."}
        icon={confirmado ? TickCircle : ClipboardTick}
        tone={confirmado ? "accent" : "accent"}
        size="lg"
        footer={
          confirmado ? (
            <Button variant="primary" onClick={() => setFecharOpen(false)}>Concluir</Button>
          ) : step === 0 ? (
            <Button variant="primary" iconRight={ArrowRight2} disabled={!convenioEscolhido} onClick={() => setStep(1)}>Continuar</Button>
          ) : step === 1 ? (
            <>
              <Button variant="secondary" icon={ArrowLeft2} onClick={() => setStep(0)}>Voltar</Button>
              <Button variant="primary" iconRight={ArrowRight2} disabled={selecionadas.size === 0} onClick={() => setStep(2)}>Continuar</Button>
            </>
          ) : (
            <>
              <Button variant="secondary" icon={ArrowLeft2} onClick={() => setStep(1)}>Voltar</Button>
              <Button variant="primary" onClick={confirmarFechamento}>Confirmar fechamento</Button>
            </>
          )
        }
      >
        {confirmado ? (
          <p className="text-base text-text">
            {selecionadas.size} guia{selecionadas.size === 1 ? "" : "s"} da {insuranceName(convenioEscolhido)} foram agrupadas em um novo lote no valor de {brl(totalSelecionado)}.
          </p>
        ) : step === 0 ? (
          <Select label="Convênio" required placeholder="Selecione o convênio" value={convenioEscolhido} onChange={(e) => setConvenioEscolhido(e.target.value)} options={CONVENIOS.map((c) => ({ value: c.id, label: c.name }))} />
        ) : step === 1 ? (
          guiasProntasConvenio.length === 0 ? (
            <EmptyState title="Nenhuma guia pronta" description="Este convênio não tem guias prontas para lote no momento." />
          ) : (
            <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
              {guiasProntasConvenio.map((g) => (
                <Checkbox
                  key={g.id}
                  className="rounded-full px-3 py-2 text-sm hover:bg-surface"
                  checked={selecionadas.has(g.id)}
                  onChange={() => toggleGuia(g.id)}
                  label={
                    <span className="flex w-full items-center justify-between gap-3">
                      <span className="flex items-center gap-2.5">
                        <span className="tabular font-medium text-text">{g.numero}</span>
                        <span className="text-text-muted">{guiaDisplayPatientName(g)}</span>
                      </span>
                      <span className="tabular text-text-muted">{brl(g.valorCents)}</span>
                    </span>
                  }
                />
              ))}
            </div>
          )
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-text-muted">Confira o resumo antes de confirmar o fechamento do lote.</p>
            <div className="flex items-center justify-between rounded-lg bg-surface px-4 py-3">
              <span className="text-text-muted">Convênio</span>
              <span className="font-medium text-text">{insuranceName(convenioEscolhido)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-surface px-4 py-3">
              <span className="text-text-muted">Guias selecionadas</span>
              <span className="font-medium text-text">{selecionadas.size}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-accent-muted px-4 py-3">
              <span className="text-accent">Valor total do lote</span>
              <span className="tabular font-display font-semibold text-accent">{brl(totalSelecionado)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
