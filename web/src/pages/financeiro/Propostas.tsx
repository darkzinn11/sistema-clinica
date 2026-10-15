import { useMemo, useState } from "react";
import { Add, CalendarTick, DocumentText, Moneys, SearchNormal1, TickCircle, Whatsapp } from "iconsax-reactjs";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Segmented } from "@/components/ui/tabs";
import { Table, TBody, TD, TH, THead, TR, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/charts";
import { Drawer } from "@/components/ui/overlay";
import { DescriptionList } from "@/components/ui/misc";
import { EmptyState } from "@/components/ui/empty-state";
import { brl, dateBR, pct } from "@/lib/format";
import { patientById, patients, procedures } from "@/lib/mock/core";
import { kpisPropostas, propostas as propostasIniciais, type Proposta } from "@/lib/mock/financeiro";

type StatusFiltro = "todos" | "rascunho" | "enviada" | "aprovada" | "recusada" | "expirada";

const STATUS_LABEL: Record<Proposta["status"], string> = { rascunho: "Rascunho", enviada: "Enviada", aprovada: "Aprovada", recusada: "Recusada", expirada: "Expirada" };
const STATUS_TONE: Record<Proposta["status"], "neutral" | "info" | "success" | "danger" | "warning"> = { rascunho: "neutral", enviada: "info", aprovada: "success", recusada: "danger", expirada: "warning" };

export default function Propostas() {
  const [propostas, setPropostas] = useState(propostasIniciais);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFiltro>("todos");
  const [detalheId, setDetalheId] = useState<string | null>(null);
  const [novaAberta, setNovaAberta] = useState(false);
  const [enviadoWpp, setEnviadoWpp] = useState(false);

  const kpis = kpisPropostas();
  const filtradas = useMemo(() => {
    const q = search.trim().toLowerCase();
    return propostas.filter((p) => {
      if (status !== "todos" && p.status !== status) return false;
      const pac = patientById(p.pacienteId)?.name.toLowerCase() ?? "";
      if (q && !pac.includes(q) && !p.numero.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [propostas, search, status]);

  const detalhe = propostas.find((p) => p.id === detalheId) ?? null;

  function converterEmAgendamento(id: string) {
    setPropostas((prev) => prev.map((p) => (p.id === id ? { ...p, status: "aprovada" } : p)));
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Propostas"
        description="Orçamentos enviados a pacientes — acompanhe envio, aprovação e conversão."
        breadcrumbs={[{ label: "Financeiro", href: "/financeiro" }, { label: "Propostas" }]}
        actions={
          <Button variant="primary" icon={Add} onClick={() => setNovaAberta(true)}>
            Nova proposta
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 ui-stat-strip" data-columns="3">
        <StatCard label="Propostas enviadas" value={String(kpis.enviadas)} icon={<DocumentText size={18} />} />
        <StatCard label="Taxa de aprovação" value={pct(kpis.taxaAprovacao)} icon={<TickCircle size={18} />} />
        <StatCard label="Valor em negociação" value={brl(kpis.emNegociacaoCents)} icon={<Moneys size={18} />} />
      </div>

      <Card className="mt-5">
        <CardHeader title="Todas as propostas" />
        <CardBody className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input icon={SearchNormal1} placeholder="Buscar por paciente ou número…" value={search} onChange={(e) => setSearch(e.target.value)} wrapperClassName="w-64" aria-label="Buscar propostas" />
            <Segmented
              label="Status"
              value={status}
              onChange={setStatus}
              options={[
                { value: "todos", label: "Todos" },
                { value: "rascunho", label: "Rascunho" },
                { value: "enviada", label: "Enviada" },
                { value: "aprovada", label: "Aprovada" },
                { value: "recusada", label: "Recusada" },
                { value: "expirada", label: "Expirada" },
              ]}
            />
          </div>

          {filtradas.length === 0 ? (
            <EmptyState title="Nenhuma proposta encontrada" description="Ajuste os filtros ou crie uma nova proposta." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Número</TH>
                  <TH>Paciente</TH>
                  <TH>Itens</TH>
                  <TH align="right">Valor</TH>
                  <TH>Validade</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {filtradas.map((p) => (
                  <TR key={p.id} interactive onClick={() => setDetalheId(p.id)}>
                    <TD className="tabular">{p.numero}</TD>
                    <TD className="max-w-48 truncate">{patientById(p.pacienteId)?.name}</TD>
                    <TD className="max-w-56 truncate text-text-muted">{p.itens.map((it) => it.descricao).join(", ")}</TD>
                    <TD numeric className="font-medium">{brl(p.valorCents)}</TD>
                    <TD>{dateBR(p.validade)}</TD>
                    <TD>
                      <Badge tone={STATUS_TONE[p.status]} dot size="sm">{STATUS_LABEL[p.status]}</Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
          <TableFooter total={filtradas.length} label="propostas" />
        </CardBody>
      </Card>

      <Drawer
        open={Boolean(detalhe)}
        onClose={() => {
          setDetalheId(null);
          setEnviadoWpp(false);
        }}
        width="lg"
        title={detalhe ? `Proposta ${detalhe.numero}` : ""}
        description={detalhe ? patientById(detalhe.pacienteId)?.name : undefined}
        footer={
          detalhe && (
            <>
              <Button variant="secondary" icon={Whatsapp} onClick={() => setEnviadoWpp(true)}>
                Enviar por WhatsApp
              </Button>
              <Button variant="secondary" icon={CalendarTick} onClick={() => converterEmAgendamento(detalhe.id)}>
                Converter em agendamento
              </Button>
              <Button variant="primary" icon={Moneys}>
                Gerar cobrança
              </Button>
            </>
          )
        }
      >
        {detalhe && (
          <div className="flex flex-col gap-6">
            {enviadoWpp && (
              <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success-bg px-4 py-2.5 text-sm text-success">
                <TickCircle size={16} aria-hidden />
                Proposta enviada por WhatsApp para {patientById(detalhe.pacienteId)?.phone}.
              </div>
            )}
            <div className="flex items-center justify-between">
              <Badge tone={STATUS_TONE[detalhe.status]} dot>{STATUS_LABEL[detalhe.status]}</Badge>
              <p className="font-display text-xl font-semibold text-text">{brl(detalhe.valorCents)}</p>
            </div>
            <DescriptionList
              columns={2}
              items={[
                { label: "Criado em", value: dateBR(detalhe.criadoEm) },
                { label: "Validade", value: dateBR(detalhe.validade) },
                { label: "Condição de pagamento", value: detalhe.condicaoPagamento },
                { label: "Desconto", value: detalhe.descontoCents > 0 ? brl(detalhe.descontoCents) : "—" },
              ]}
            />
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-text">Itens</h3>
              <ul className="flex flex-col divide-y divide-border rounded-lg">
                {detalhe.itens.map((it, i) => (
                  <li key={i} className="flex items-center justify-between px-3.5 py-2.5 text-sm">
                    <span className="text-text">{it.descricao}</span>
                    <span className="tabular font-medium text-text">{brl(it.valorCents)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </Drawer>

      <NovaProposta open={novaAberta} onClose={() => setNovaAberta(false)} />
    </div>
  );
}

function NovaProposta({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [paciente, setPaciente] = useState("");
  const [itemId, setItemId] = useState("");
  const [condicao, setCondicao] = useState("");

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Nova proposta"
      description="Monte um orçamento para enviar ao paciente."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={onClose}>Salvar como rascunho</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Select label="Paciente" required placeholder="Selecione" value={paciente} onChange={(e) => setPaciente(e.target.value)} options={patients.slice(0, 30).map((p) => ({ value: p.id, label: p.name }))} />
        <Select label="Procedimento" required placeholder="Adicionar item" value={itemId} onChange={(e) => setItemId(e.target.value)} options={procedures.filter((p) => p.priceCents > 0).map((p) => ({ value: p.id, label: `${p.name} · ${brl(p.priceCents)}` }))} />
        <Select
          label="Condição de pagamento"
          required
          placeholder="Selecione"
          value={condicao}
          onChange={(e) => setCondicao(e.target.value)}
          options={["À vista com 10% de desconto", "Em até 3x sem juros", "Em até 6x no cartão", "50% de entrada + 2x"].map((c) => ({ value: c, label: c }))}
        />
      </div>
    </Drawer>
  );
}
