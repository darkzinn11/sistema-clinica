import { CloseCircle, DocumentDownload, RefreshCircle, TickCircle, Warning2 } from "iconsax-reactjs";
import { useState } from "react";
import { useParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DescriptionList } from "@/components/ui/misc";
import { Modal } from "@/components/ui/overlay";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { brl, dateBR } from "@/lib/format";
import { GUIA_STATUS_META, GUIA_TIPO_LABEL, type GuiaStatus, type GuiaTipo, guiaById, guiaDisplayPatientName, insuranceName, loteById, loteValidacao } from "@/lib/mock/faturamento";

export default function LoteDetalhe() {
  const { id } = useParams();
  const lote = id ? loteById(id) : undefined;
  const [modal, setModal] = useState<{ title: string; description: string } | null>(null);

  if (!lote) {
    return (
      <div className="mx-auto max-w-5xl">
        <PageHeader title="Lote não encontrado" breadcrumbs={[{ label: "Faturamento TISS", href: "/faturamento" }, { label: "Lotes", href: "/faturamento/lotes" }]} />
        <Card>
          <EmptyState title="Lote não encontrado" description="Ele pode ter sido removido ou o link está incorreto." />
        </Card>
      </div>
    );
  }

  const guiasDoLote = lote.guiaIds.map((gid) => guiaById(gid)).filter((g): g is NonNullable<typeof g> => Boolean(g));
  const validacao = loteValidacao(lote);
  const erros = validacao.filter((v) => v.tipo === "erro");

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={`Lote ${lote.numero}`}
        description={`${insuranceName(lote.insuranceId)} · ${guiasDoLote.length} guias`}
        breadcrumbs={[{ label: "Faturamento TISS", href: "/faturamento" }, { label: "Lotes", href: "/faturamento/lotes" }, { label: lote.numero }]}
        meta={<Badge tone={erros.length ? "danger" : "success"} dot>{lote.status === "enviado" || lote.status === "processado" ? "Enviado" : erros.length ? "Com pendência" : "Pronto para envio"}</Badge>}
        actions={
          <>
            <Button variant="secondary" icon={DocumentDownload} onClick={() => setModal({ title: "XML gerado", description: `O arquivo TISS_${lote.numero}.xml foi gerado com os dados deste lote.` })}>Baixar XML</Button>
            <Button variant="primary" icon={RefreshCircle} disabled={erros.length > 0} onClick={() => setModal({ title: "Lote reenviado", description: "O lote foi reenviado para o convênio para novo processamento." })}>Reenviar</Button>
          </>
        }
      />

      <div className="mb-6">
        <DescriptionList
          columns={3}
          items={[
            { label: "Convênio", value: insuranceName(lote.insuranceId) },
            { label: "Guias", value: guiasDoLote.length },
            { label: "Valor total", value: brl(lote.valorCents) },
            { label: "Data de envio", value: lote.dataEnvio ? dateBR(lote.dataEnvio) : "Ainda não enviado" },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Guias do lote" />
          <Table>
            <THead>
              <TR><TH>Número</TH><TH>Tipo</TH><TH>Beneficiário</TH><TH align="right">Valor</TH><TH>Status</TH></TR>
            </THead>
            <TBody>
              {guiasDoLote.map((g) => (
                <TR key={g.id}>
                  <TD className="tabular font-medium text-text">{g.numero}</TD>
                  <TD>{GUIA_TIPO_LABEL[g.tipo as GuiaTipo]}</TD>
                  <TD>{guiaDisplayPatientName(g)}</TD>
                  <TD numeric>{brl(g.valorCents)}</TD>
                  <TD><Badge tone={GUIA_STATUS_META[g.status as GuiaStatus].tone} dot size="sm">{GUIA_STATUS_META[g.status as GuiaStatus].label}</Badge></TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>

        <Card>
          <CardHeader title="Validação do XML" description={validacao.length === 0 ? "Nenhuma pendência encontrada." : `${validacao.length} ocorrência${validacao.length === 1 ? "" : "s"}`} />
          <CardBody>
            {validacao.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-success">
                <TickCircle size={16} aria-hidden />
                XML validado sem erros.
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {validacao.map((v, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    {v.tipo === "erro" ? <CloseCircle size={16} className="mt-0.5 shrink-0 text-danger" aria-hidden /> : <Warning2 size={16} className="mt-0.5 shrink-0 text-warning" aria-hidden />}
                    <div>
                      <p className={v.tipo === "erro" ? "font-medium text-danger" : "font-medium text-warning"}>Guia {v.guiaNumero} · {v.campo}</p>
                      <p className="text-text-muted">{v.mensagem}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Modal open={Boolean(modal)} onClose={() => setModal(null)} title={modal?.title ?? ""} description={modal?.description} footer={<Button variant="primary" onClick={() => setModal(null)}>Entendi</Button>} />
    </div>
  );
}
