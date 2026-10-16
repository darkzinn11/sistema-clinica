import { Add, SearchNormal1 } from "iconsax-reactjs";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Checkbox, Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/overlay";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR, TableFooter } from "@/components/ui/table";
import { brl, dateBR } from "@/lib/format";
import {
  CONVENIOS,
  GUIA_STATUS_META,
  GUIA_STATUS_ORDER,
  GUIA_TIPO_LABEL,
  GUIA_TIPO_OPTIONS,
  type GuiaStatus,
  type GuiaTipo,
  guiaDisplayPatientName,
  guiaDisplayProfessionalName,
  guias,
  insuranceName,
} from "@/lib/mock/faturamento";
import { professionals } from "@/lib/mock/core";

export default function Guias() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [convenio, setConvenio] = useState("");
  const [tipo, setTipo] = useState("");
  const [profissional, setProfissional] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return guias.filter((g) => {
      if (status && g.status !== status) return false;
      if (convenio && g.insuranceId !== convenio) return false;
      if (tipo && g.tipo !== tipo) return false;
      if (profissional && g.professionalId !== profissional) return false;
      if (term) {
        const patient = guiaDisplayPatientName(g).toLowerCase();
        if (!patient.includes(term) && !g.numero.includes(term)) return false;
      }
      return true;
    });
  }, [search, status, convenio, tipo, profissional]);

  const selecionaveis = filtered.filter((g) => g.status === "pronta");
  const todasSelecionadas = selecionaveis.length > 0 && selecionaveis.every((g) => selected.has(g.id));

  function toggleAll() {
    if (todasSelecionadas) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selecionaveis.map((g) => g.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function adicionarAoLote() {
    setConfirmMsg(`${selected.size} guia${selected.size === 1 ? "" : "s"} adicionada${selected.size === 1 ? "" : "s"} ao lote em aberto.`);
    setConfirmOpen(true);
    setSelected(new Set());
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Guias"
        description="Todas as guias TISS emitidas pela clínica."
        breadcrumbs={[{ label: "Faturamento TISS", href: "/faturamento" }, { label: "Guias" }]}
        actions={<ButtonLink to="/faturamento/guias/nova" variant="primary" icon={Add}>Nova guia</ButtonLink>}
      />

      <Card>
        <CardBody className="flex flex-col gap-3 border-b border-border">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              icon={SearchNormal1}
              placeholder="Buscar por beneficiário ou número da guia"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar guias"
              wrapperClassName="min-w-56 flex-1"
            />
            <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Todos os status" wrapperClassName="w-44" options={GUIA_STATUS_ORDER.map((s) => ({ value: s, label: GUIA_STATUS_META[s].label }))} />
            <Select aria-label="Convênio" value={convenio} onChange={(e) => setConvenio(e.target.value)} placeholder="Todos os convênios" wrapperClassName="w-48" options={CONVENIOS.map((c) => ({ value: c.id, label: c.name }))} />
            <Select aria-label="Tipo de guia" value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="Todos os tipos" wrapperClassName="w-48" options={GUIA_TIPO_OPTIONS} />
            <Select aria-label="Profissional" value={profissional} onChange={(e) => setProfissional(e.target.value)} placeholder="Todos os profissionais" wrapperClassName="w-52" options={professionals.map((p) => ({ value: p.id, label: p.name }))} />
          </div>
          {selected.size > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-accent-muted px-3 py-2 text-sm text-accent">
              <span>{selected.size} guia{selected.size === 1 ? "" : "s"} selecionada{selected.size === 1 ? "" : "s"}</span>
              <Button size="sm" variant="primary" onClick={adicionarAoLote}>Adicionar ao lote</Button>
            </div>
          )}
        </CardBody>
        {filtered.length === 0 ? (
          <EmptyState title="Nenhuma guia encontrada" description="Ajuste os filtros ou crie uma nova guia." action={<ButtonLink to="/faturamento/guias/nova" variant="primary" icon={Add}>Nova guia</ButtonLink>} />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH className="w-10">
                    <Checkbox className="justify-center" aria-label="Selecionar todas as guias prontas" checked={todasSelecionadas} onChange={toggleAll} />
                  </TH>
                  <TH>Número</TH>
                  <TH>Tipo</TH>
                  <TH>Beneficiário</TH>
                  <TH>Convênio</TH>
                  <TH>Profissional</TH>
                  <TH>Data</TH>
                  <TH align="right">Valor</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {filtered.slice(0, 30).map((g) => (
                  <TR key={g.id} interactive onClick={() => navigate(`/faturamento/guias/${g.id}`)}>
                    <TD onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        className="justify-center"
                        aria-label={`Selecionar guia ${g.numero}`}
                        disabled={g.status !== "pronta"}
                        checked={selected.has(g.id)}
                        onChange={() => toggleOne(g.id)}
                      />
                    </TD>
                    <TD className="tabular font-medium text-text">{g.numero}</TD>
                    <TD>{GUIA_TIPO_LABEL[g.tipo as GuiaTipo]}</TD>
                    <TD>{guiaDisplayPatientName(g)}</TD>
                    <TD className="text-text-muted">{insuranceName(g.insuranceId)}</TD>
                    <TD className="text-text-muted">{guiaDisplayProfessionalName(g)}</TD>
                    <TD className="tabular text-text-muted">{dateBR(g.dataAtendimento)}</TD>
                    <TD numeric>{brl(g.valorCents)}</TD>
                    <TD>
                      <Badge tone={GUIA_STATUS_META[g.status as GuiaStatus].tone} dot>{GUIA_STATUS_META[g.status as GuiaStatus].label}</Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <TableFooter total={filtered.length} pageSize={30} label="guias" />
          </>
        )}
      </Card>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Guias adicionadas" description={confirmMsg} footer={<Button variant="primary" onClick={() => setConfirmOpen(false)}>Entendi</Button>} />
    </div>
  );
}
