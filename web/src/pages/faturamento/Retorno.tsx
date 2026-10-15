import { IconCircle } from "@/components/ui/icon-circle";
import { CloseCircle, DocumentUpload, ShieldTick, TickCircle } from "iconsax-reactjs";
import { type DragEvent, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/charts";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Textarea } from "@/components/ui/input";
import { Drawer, Modal } from "@/components/ui/overlay";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR, TableFooter } from "@/components/ui/table";
import { brl, dateBR } from "@/lib/format";
import { TODAY } from "@/lib/mock/core";
import { type GlosaRow, glosasList, insuranceName } from "@/lib/mock/faturamento";

export default function Retorno() {
  const [dragOver, setDragOver] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [recursoRow, setRecursoRow] = useState<GlosaRow | null>(null);
  const [justificativa, setJustificativa] = useState("");
  const [valorRecursado, setValorRecursado] = useState("");
  const [aceitas, setAceitas] = useState<Set<string>>(new Set());
  const [recursadas, setRecursadas] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  const mesAtual = TODAY.slice(0, 7);
  const glosadoNoMes = useMemo(() => glosasList.filter((g) => g.dataRetorno.slice(0, 7) === mesAtual).reduce((s, g) => s + g.valorCents, 0), [mesAtual]);
  const recursado = useMemo(() => glosasList.filter((g) => g.recurso).reduce((s, g) => s + (g.recurso?.valorRecursadoCents ?? 0), 0), []);
  const recuperado = useMemo(() => glosasList.filter((g) => g.recurso?.status === "aceito").reduce((s, g) => s + (g.recurso?.valorRecursadoCents ?? 0), 0), []);

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    setImportModal(true);
  }

  function abrirRecurso(row: GlosaRow) {
    setRecursoRow(row);
    setJustificativa("");
    setValorRecursado((row.valorCents / 100).toFixed(2));
  }

  function enviarRecurso() {
    if (!recursoRow) return;
    setRecursadas((prev) => new Set(prev).add(recursoRow.guiaId));
    setToast(`Recurso enviado para ${insuranceName(recursoRow.insuranceId)} no valor de ${brl(Number(valorRecursado) * 100 || recursoRow.valorCents)}.`);
    setRecursoRow(null);
    setTimeout(() => setToast(null), 4000);
  }

  function aceitarGlosa(row: GlosaRow) {
    setAceitas((prev) => new Set(prev).add(row.guiaId));
    setToast(`Glosa da guia ${row.guiaNumero} aceita — valor baixado do faturamento.`);
    setTimeout(() => setToast(null), 4000);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Retorno e glosas" description="Processe o demonstrativo do convênio e trate as glosas recebidas." breadcrumbs={[{ label: "Faturamento TISS", href: "/faturamento" }, { label: "Retorno e glosas" }]} />

      <Card className="mb-6">
        <CardBody>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => setImportModal(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setImportModal(true)}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${dragOver ? "border-accent bg-accent-muted/40" : "border-border-strong bg-surface"}`}
          >
            <IconCircle tone="accent" size="xl">
              <DocumentUpload size={20} aria-hidden />
            </IconCircle>
            <p className="text-base font-medium text-text">Arraste o demonstrativo XML aqui ou clique para selecionar</p>
            <p className="text-sm text-text-muted">Aceita o arquivo de retorno TISS enviado pelo convênio.</p>
          </div>
        </CardBody>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3 ui-stat-strip" data-columns="3">
        <StatCard label="Glosado no mês" value={brl(glosadoNoMes)} />
        <StatCard label="Valor recursado" value={brl(recursado)} />
        <StatCard label="Recuperado" value={brl(recuperado)} />
      </div>

      <Card>
        <CardHeader title="Glosas" description="Itens glosados retornados pelos convênios." />
        {glosasList.length === 0 ? (
          <EmptyState title="Nenhuma glosa" description="Nenhuma glosa foi recebida até o momento." />
        ) : (
          <>
            <Table>
              <THead>
                <TR><TH>Guia</TH><TH>Convênio</TH><TH>Item</TH><TH>Motivo</TH><TH align="right">Valor</TH><TH>Data</TH><TH>Ação</TH></TR>
              </THead>
              <TBody>
                {glosasList.slice(0, 30).map((row) => {
                  const resolvida = recursadas.has(row.guiaId) || aceitas.has(row.guiaId) || Boolean(row.recurso);
                  return (
                    <TR key={row.guiaId}>
                      <TD className="tabular font-medium text-text">{row.guiaNumero}</TD>
                      <TD className="text-text-muted">{insuranceName(row.insuranceId)}</TD>
                      <TD>{row.itemDescricao}</TD>
                      <TD>
                        <span className="font-medium text-text">{row.codigo}</span>
                        <span className="block text-sm text-text-muted">{row.descricao}</span>
                      </TD>
                      <TD numeric>{brl(row.valorCents)}</TD>
                      <TD className="text-text-muted">{dateBR(row.dataRetorno)}</TD>
                      <TD>
                        {resolvida ? (
                          aceitas.has(row.guiaId) ? (
                            <Badge tone="neutral" dot>Glosa aceita</Badge>
                          ) : row.recurso ? (
                            <Badge tone={row.recurso.status === "aceito" ? "success" : row.recurso.status === "negado" ? "danger" : "warning"} dot>
                              {row.recurso.status === "aceito" ? "Recurso aceito" : row.recurso.status === "negado" ? "Recurso negado" : "Recurso em análise"}
                            </Badge>
                          ) : (
                            <Badge tone="warning" dot>Recurso enviado</Badge>
                          )
                        ) : (
                          <div className="flex items-center gap-2">
                            <Button size="xs" variant="primary" onClick={() => abrirRecurso(row)}>Recursar</Button>
                            <Button size="xs" variant="ghost" onClick={() => aceitarGlosa(row)}>Aceitar</Button>
                          </div>
                        )}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
            <TableFooter total={glosasList.length} pageSize={30} label="glosas" />
          </>
        )}
      </Card>

      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-md bg-text px-4 py-2.5 text-sm font-medium text-bg shadow-pop">{toast}</div>}

      <Drawer
        open={Boolean(recursoRow)}
        onClose={() => setRecursoRow(null)}
        title="Recurso de glosa"
        description={recursoRow ? `Guia ${recursoRow.guiaNumero} · ${recursoRow.descricao}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRecursoRow(null)}>Cancelar</Button>
            <Button variant="primary" icon={ShieldTick} onClick={enviarRecurso} disabled={!justificativa}>Enviar recurso</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Textarea label="Justificativa" required rows={5} value={justificativa} onChange={(e) => setJustificativa(e.target.value)} placeholder="Explique por que a glosa deve ser revertida, citando a documentação anexada." />
          <Input type="number" min={0} step="0.01" label="Valor recursado" suffix="R$" value={valorRecursado} onChange={(e) => setValorRecursado(e.target.value)} />
          <p className="text-sm text-text-muted">Anexos simulados: guia de autorização, relatório de atendimento.</p>
        </div>
      </Drawer>

      <Modal
        open={importModal}
        onClose={() => setImportModal(false)}
        title="Demonstrativo processado"
        description="O arquivo de retorno foi lido e as guias foram atualizadas conforme o conteúdo simulado deste protótipo."
        icon={TickCircle}
        footer={<Button variant="primary" onClick={() => setImportModal(false)}>Entendi</Button>}
      >
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <CloseCircle size={14} className="text-danger" aria-hidden />
          Nenhuma alteração real é feita neste protótipo — esta é apenas uma simulação do fluxo.
        </div>
      </Modal>
    </div>
  );
}
