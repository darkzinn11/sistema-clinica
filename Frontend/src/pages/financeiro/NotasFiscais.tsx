import { useMemo, useState } from "react";
import { Add, ReceiptMinus, ReceiptText, SearchNormal1, Warning2 } from "iconsax-reactjs";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Segmented } from "@/components/ui/tabs";
import { Table, TBody, TD, TH, THead, TR, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/charts";
import { Modal } from "@/components/ui/overlay";
import { EmptyState } from "@/components/ui/empty-state";
import { brl, dateBR } from "@/lib/format";
import { patients, procedures } from "@/lib/mock/core";
import { notasFiscais, type NotaFiscal } from "@/lib/mock/financeiro";

type StatusFiltro = "todos" | "emitida" | "processando" | "erro" | "cancelada";

const STATUS_LABEL: Record<NotaFiscal["status"], string> = { emitida: "Emitida", processando: "Processando", cancelada: "Cancelada", erro: "Erro" };
const STATUS_TONE: Record<NotaFiscal["status"], "success" | "info" | "neutral" | "danger"> = { emitida: "success", processando: "info", cancelada: "neutral", erro: "danger" };

export default function NotasFiscais() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFiltro>("todos");
  const [emitirAberto, setEmitirAberto] = useState(false);
  const [tomador, setTomador] = useState("");
  const [servico, setServico] = useState("");
  const [valor, setValor] = useState("");
  const [aliquota, setAliquota] = useState(3);

  const filtradas = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notasFiscais.filter((n) => {
      if (status !== "todos" && n.status !== status) return false;
      if (q && !n.tomadorNome.toLowerCase().includes(q) && !n.numero.includes(q)) return false;
      return true;
    });
  }, [search, status]);

  const totalEmitido = notasFiscais.filter((n) => n.status === "emitida").reduce((s, n) => s + n.valorCents, 0);
  const totalIss = notasFiscais.filter((n) => n.status === "emitida").reduce((s, n) => s + n.issCents, 0);
  const comErro = notasFiscais.filter((n) => n.status === "erro").length;

  const valorCents = Math.round(Number(valor.replace(",", ".")) * 100) || 0;
  const issPreview = Math.round((valorCents * aliquota) / 100);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Notas fiscais"
        description="Emissão e acompanhamento de NFS-e dos serviços prestados."
        breadcrumbs={[{ label: "Financeiro", href: "/financeiro" }, { label: "Notas fiscais" }]}
        actions={
          <Button variant="primary" icon={Add} onClick={() => setEmitirAberto(true)}>
            Emitir NFS-e
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 ui-stat-strip" data-columns="3">
        <StatCard icon={<ReceiptText />} label="Total emitido" value={brl(totalEmitido)} />
        <StatCard icon={<ReceiptMinus />} label="ISS retido" value={brl(totalIss)} />
        <StatCard label="Notas com erro" value={String(comErro)} icon={comErro > 0 ? <Warning2 size={18} /> : undefined} />
      </div>

      <Card className="mt-5">
        <CardHeader title="Notas emitidas" />
        <CardBody className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input icon={SearchNormal1} placeholder="Buscar por tomador ou número…" value={search} onChange={(e) => setSearch(e.target.value)} wrapperClassName="w-64" aria-label="Buscar notas fiscais" />
            <Segmented
              label="Status"
              value={status}
              onChange={setStatus}
              options={[
                { value: "todos", label: "Todos" },
                { value: "emitida", label: "Emitidas" },
                { value: "processando", label: "Processando" },
                { value: "erro", label: "Com erro" },
                { value: "cancelada", label: "Canceladas" },
              ]}
            />
          </div>

          {filtradas.length === 0 ? (
            <EmptyState title="Nenhuma nota encontrada" description="Ajuste os filtros ou emita uma nova NFS-e." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Número</TH>
                  <TH>Emissão</TH>
                  <TH>Tomador</TH>
                  <TH>Serviço</TH>
                  <TH align="right">ISS</TH>
                  <TH align="right">Valor</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {filtradas.slice(0, 20).map((n) => (
                  <TR key={n.id}>
                    <TD className="tabular">{n.numero}</TD>
                    <TD>{dateBR(n.dataEmissao)}</TD>
                    <TD className="max-w-48 truncate">{n.tomadorNome}</TD>
                    <TD className="max-w-48 truncate">{n.servico}</TD>
                    <TD numeric>{brl(n.issCents)} <span className="text-text-subtle">({n.aliquotaIss}%)</span></TD>
                    <TD numeric className="font-medium">{brl(n.valorCents)}</TD>
                    <TD>
                      <div className="flex flex-col gap-0.5">
                        <Badge tone={STATUS_TONE[n.status]} dot size="sm">{STATUS_LABEL[n.status]}</Badge>
                        {n.erro && <span className="text-xs text-danger">{n.erro}</span>}
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
          <TableFooter total={filtradas.length} label="notas" />
        </CardBody>
      </Card>

      <Modal
        open={emitirAberto}
        onClose={() => setEmitirAberto(false)}
        title="Emitir NFS-e"
        description="Nota fiscal de serviço eletrônica."
        footer={
          <>
            <Button variant="ghost" onClick={() => setEmitirAberto(false)}>Cancelar</Button>
            <Button variant="primary" onClick={() => setEmitirAberto(false)}>Emitir nota</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Select
            label="Tomador"
            required
            placeholder="Buscar paciente ou convênio"
            value={tomador}
            onChange={(e) => setTomador(e.target.value)}
            options={patients.slice(0, 30).map((p) => ({ value: p.id, label: p.name }))}
          />
          <Select label="Serviço" required placeholder="Selecione" value={servico} onChange={(e) => setServico(e.target.value)} options={procedures.filter((p) => p.priceCents > 0).map((p) => ({ value: p.id, label: p.name }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Valor" required suffix="BRL" inputMode="decimal" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} />
            <Select label="Alíquota de ISS" value={String(aliquota)} onChange={(e) => setAliquota(Number(e.target.value))} options={[2, 2.5, 3, 5].map((v) => ({ value: String(v), label: `${v}%` }))} />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-surface px-4 py-3">
            <span className="text-sm text-text-muted">ISS estimado</span>
            <span className="tabular font-semibold text-text">{brl(issPreview)}</span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
