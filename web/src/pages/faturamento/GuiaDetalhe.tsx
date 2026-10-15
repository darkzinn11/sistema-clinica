import { ClipboardClose, DocumentCopy, Edit2, Printer, ReceiptItem, Send2, ShieldTick, TickCircle, Warning2 } from "iconsax-reactjs";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DescriptionList, Timeline } from "@/components/ui/misc";
import { Drawer, Modal } from "@/components/ui/overlay";
import { Input, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { age, brl, dateBR } from "@/lib/format";
import { patientById, professionalById, locationName } from "@/lib/mock/core";
import { GUIA_STATUS_META, GUIA_TIPO_LABEL, type GuiaStatus, type GuiaTipo, guiaById, insuranceName } from "@/lib/mock/faturamento";

const HISTORICO_TONE: Record<GuiaStatus, "accent" | "success" | "warning" | "danger" | "info" | "neutral"> = {
  em_digitacao: "neutral",
  pronta: "info",
  em_lote: "accent",
  enviada: "warning",
  paga: "success",
  glosada: "danger",
};

export default function GuiaDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const guia = id ? guiaById(id) : undefined;
  const [recursoOpen, setRecursoOpen] = useState(false);
  const [justificativa, setJustificativa] = useState("");
  const [valorRecursado, setValorRecursado] = useState("");
  const [modal, setModal] = useState<{ title: string; description: string } | null>(null);

  if (!guia) {
    return (
      <div className="mx-auto max-w-5xl">
        <PageHeader title="Guia não encontrada" breadcrumbs={[{ label: "Faturamento TISS", href: "/faturamento" }, { label: "Guias", href: "/faturamento/guias" }]} />
        <Card>
          <EmptyState icon={ReceiptItem} title="Guia não encontrada" description="Ela pode ter sido removida ou o link está incorreto." />
        </Card>
      </div>
    );
  }

  const patient = patientById(guia.patientId);
  const professional = professionalById(guia.professionalId);
  const statusMeta = GUIA_STATUS_META[guia.status as GuiaStatus];

  function enviarRecurso() {
    setRecursoOpen(false);
    setModal({ title: "Recurso enviado", description: `Recurso de glosa enviado para ${insuranceName(guia!.insuranceId)} no valor de ${valorRecursado ? brl(Number(valorRecursado) * 100) : "—"}.` });
    setJustificativa("");
    setValorRecursado("");
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={`Guia ${guia.numero}`}
        description={`${GUIA_TIPO_LABEL[guia.tipo as GuiaTipo]} · ${insuranceName(guia.insuranceId)}`}
        breadcrumbs={[{ label: "Faturamento TISS", href: "/faturamento" }, { label: "Guias", href: "/faturamento/guias" }, { label: guia.numero }]}
        meta={<Badge tone={statusMeta.tone} dot size="md">{statusMeta.label}</Badge>}
        actions={
          <>
            <Button variant="secondary" icon={Edit2} onClick={() => navigate(`/faturamento/guias/nova?tipo=${guia.tipo}`)}>Editar</Button>
            <Button variant="secondary" icon={Printer} onClick={() => window.print()}>Imprimir</Button>
            <Button variant="secondary" icon={DocumentCopy} onClick={() => setModal({ title: "Guia duplicada", description: "Uma cópia desta guia foi criada como rascunho em Guias." })}>Duplicar</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader title="Beneficiário e atendimento" />
            <CardBody>
              <DescriptionList
                columns={3}
                items={[
                  { label: "Beneficiário", value: patient?.name },
                  { label: "Idade", value: patient ? `${age(patient.birthDate, guia.dataAtendimento)} anos` : undefined },
                  { label: "Carteirinha", value: guia.carteirinha },
                  { label: "Convênio", value: insuranceName(guia.insuranceId) },
                  { label: "Elegibilidade", value: guia.elegibilidade === "elegivel" ? "Elegível" : guia.elegibilidade === "inelegivel" ? "Inelegível" : "Não verificado" },
                  { label: "Caráter", value: guia.caraterAtendimento === "urgencia" ? "Urgência" : "Eletivo" },
                  { label: "Profissional solicitante", value: professional?.name },
                  { label: "Local de atendimento", value: locationName(guia.localId) },
                  { label: "Data de atendimento", value: dateBR(guia.dataAtendimento) },
                  { label: "Senha de autorização", value: guia.senhaAutorizacao },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Procedimentos" description={`${guia.itens.length} item${guia.itens.length === 1 ? "" : "ns"}`} />
            <Table>
              <THead>
                <TR><TH>TUSS</TH><TH>Descrição</TH><TH align="right">Qtd.</TH><TH align="right">Valor unit.</TH><TH align="right">Total</TH></TR>
              </THead>
              <TBody>
                {guia.itens.map((it) => (
                  <TR key={it.id}>
                    <TD className="tabular">{it.tuss}</TD>
                    <TD>{it.descricao}</TD>
                    <TD numeric>{it.quantidade}</TD>
                    <TD numeric>{brl(it.valorUnitCents)}</TD>
                    <TD numeric>{brl(it.quantidade * it.valorUnitCents)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <div className="flex items-center justify-end gap-3 border-t border-border px-4 py-3">
              <span className="text-sm text-text-muted">Valor total da guia</span>
              <span className="tabular font-display text-lg font-semibold text-text">{brl(guia.valorCents)}</span>
            </div>
          </Card>

          {guia.glosa && (
            <Card>
              <CardHeader
                title="Glosa"
                description={`Código ${guia.glosa.codigo} · retorno em ${dateBR(guia.glosa.dataRetorno)}`}
                actions={!guia.glosa.recurso ? <Button size="sm" variant="primary" icon={Send2} onClick={() => setRecursoOpen(true)}>Abrir recurso</Button> : undefined}
              />
              <CardBody className="flex flex-col gap-3">
                <div className="flex items-start gap-3 rounded-md bg-danger-bg px-3 py-3 text-danger">
                  <Warning2 size={18} className="mt-0.5 shrink-0" aria-hidden />
                  <div>
                    <p className="font-medium">{guia.glosa.descricao}</p>
                    <p className="text-sm">Item glosado: {guia.glosa.itemDescricao} · valor glosado {brl(guia.glosa.valorCents)}</p>
                  </div>
                </div>
                {guia.glosa.recurso ? (
                  <div className="flex items-center justify-between rounded-md bg-surface px-3 py-2.5 text-sm">
                    <span className="flex items-center gap-2 text-text-muted">
                      {guia.glosa.recurso.status === "aceito" ? <TickCircle size={16} className="text-success" aria-hidden /> : guia.glosa.recurso.status === "negado" ? <ClipboardClose size={16} className="text-danger" aria-hidden /> : <Warning2 size={16} className="text-warning" aria-hidden />}
                      Recurso enviado em {dateBR(guia.glosa.recurso.dataEnvio)} — {guia.glosa.recurso.status === "aceito" ? "aceito pelo convênio" : guia.glosa.recurso.status === "negado" ? "negado pelo convênio" : "em análise"}
                    </span>
                    <span className="tabular font-medium text-text">{brl(guia.glosa.recurso.valorRecursadoCents)}</span>
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">Nenhum recurso aberto para esta glosa.</p>
                )}
              </CardBody>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Linha do tempo" />
            <CardBody>
              <Timeline
                entries={guia.historico.map((h) => ({
                  id: h.status,
                  icon: h.status === "glosada" ? Warning2 : h.status === "paga" ? TickCircle : ReceiptItem,
                  tone: HISTORICO_TONE[h.status],
                  title: h.label,
                  meta: dateBR(h.data),
                }))}
              />
            </CardBody>
          </Card>
          {guia.loteId && (
            <Card>
              <CardHeader title="Lote" />
              <CardBody>
                <Button variant="secondary" className="w-full" onClick={() => navigate(`/faturamento/lotes/${guia.loteId}`)}>Ver lote desta guia</Button>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      <Drawer open={recursoOpen} onClose={() => setRecursoOpen(false)} title="Recurso de glosa" description={`Guia ${guia.numero} · ${guia.glosa?.descricao ?? ""}`} footer={<><Button variant="secondary" onClick={() => setRecursoOpen(false)}>Cancelar</Button><Button variant="primary" icon={ShieldTick} onClick={enviarRecurso} disabled={!justificativa}>Enviar recurso</Button></>}>
        <div className="flex flex-col gap-4">
          <Textarea label="Justificativa" required rows={5} value={justificativa} onChange={(e) => setJustificativa(e.target.value)} placeholder="Explique por que a glosa deve ser revertida, citando a documentação anexada." />
          <Input type="number" min={0} step="0.01" label="Valor recursado" suffix="R$" value={valorRecursado} onChange={(e) => setValorRecursado(e.target.value)} placeholder={(guia.glosa ? (guia.glosa.valorCents / 100).toFixed(2) : "0,00")} />
          <p className="text-sm text-text-muted">Anexos simulados: guia de autorização, relatório de atendimento.</p>
        </div>
      </Drawer>

      <Modal open={Boolean(modal)} onClose={() => setModal(null)} title={modal?.title ?? ""} description={modal?.description} footer={<Button variant="primary" onClick={() => setModal(null)}>Entendi</Button>} />
    </div>
  );
}
