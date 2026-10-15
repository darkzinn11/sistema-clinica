import { Add, SearchNormal1 } from "iconsax-reactjs";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Drawer, Modal } from "@/components/ui/overlay";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR, TableFooter } from "@/components/ui/table";
import { dateBR } from "@/lib/format";
import { patients, procedureById, procedures } from "@/lib/mock/core";
import { AUTORIZACAO_STATUS_META, CONVENIOS, type AutorizacaoStatus, type Autorizacao as AutorizacaoType, autorizacoes, insuranceName } from "@/lib/mock/faturamento";

export default function Autorizacoes() {
  const [extras, setExtras] = useState<AutorizacaoType[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);

  const [insuranceId, setInsuranceId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [procedureId, setProcedureId] = useState("");
  const [justificativa, setJustificativa] = useState("");

  const all = useMemo(() => [...extras, ...autorizacoes], [extras]);

  const filtered = all.filter((a) => {
    if (status && a.status !== status) return false;
    if (search) {
      const name = patients.find((p) => p.id === a.patientId)?.name.toLowerCase() ?? "";
      if (!name.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const patientPool = insuranceId ? patients.filter((p) => p.insuranceId === insuranceId) : patients;
  const candidatos = procedures.filter((p) => p.kind === "exame" || p.kind === "procedimento");

  function resetForm() {
    setInsuranceId("");
    setPatientId("");
    setProcedureId("");
    setJustificativa("");
  }

  function enviar() {
    const nova: AutorizacaoType = {
      id: `aut-novo-${Date.now()}`,
      patientId,
      procedureId,
      insuranceId,
      justificativa,
      status: "em_analise",
      solicitadoEm: new Date().toISOString().slice(0, 10),
    };
    setExtras((prev) => [nova, ...prev]);
    setDrawerOpen(false);
    setConfirm("Solicitação enviada ao convênio. Acompanhe o status na lista.");
    resetForm();
  }

  const podeEnviar = Boolean(insuranceId && patientId && procedureId && justificativa);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Autorizações"
        description="Solicitações de autorização prévia junto aos convênios."
        breadcrumbs={[{ label: "Faturamento TISS", href: "/faturamento" }, { label: "Autorizações" }]}
        actions={<Button variant="primary" icon={Add} onClick={() => setDrawerOpen(true)}>Nova solicitação</Button>}
      />

      <Card>
        <CardBody className="flex flex-wrap items-center gap-2 border-b border-border">
          <Input icon={SearchNormal1} placeholder="Buscar por beneficiário" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar autorizações" wrapperClassName="min-w-56 flex-1" />
          <Select
            aria-label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            placeholder="Todos os status"
            wrapperClassName="w-56"
            options={(Object.keys(AUTORIZACAO_STATUS_META) as AutorizacaoStatus[]).map((s) => ({ value: s, label: AUTORIZACAO_STATUS_META[s].label }))}
          />
        </CardBody>
        {filtered.length === 0 ? (
          <EmptyState title="Nenhuma solicitação encontrada" description="Ajuste os filtros ou crie uma nova solicitação." />
        ) : (
          <>
            <Table>
              <THead>
                <TR><TH>Beneficiário</TH><TH>Convênio</TH><TH>Procedimento</TH><TH>Justificativa</TH><TH>Status</TH><TH>Senha</TH><TH>Validade</TH><TH>Solicitado em</TH></TR>
              </THead>
              <TBody>
                {filtered.slice(0, 30).map((a) => {
                  const patient = patients.find((p) => p.id === a.patientId);
                  const proc = procedureById(a.procedureId);
                  const meta = AUTORIZACAO_STATUS_META[a.status as AutorizacaoStatus];
                  return (
                    <TR key={a.id}>
                      <TD className="font-medium text-text">{patient?.name ?? "—"}</TD>
                      <TD className="text-text-muted">{insuranceName(a.insuranceId)}</TD>
                      <TD>{proc?.name ?? "—"}</TD>
                      <TD className="max-w-64 truncate text-text-muted" title={a.justificativa}>{a.justificativa}</TD>
                      <TD><Badge tone={meta.tone} dot>{meta.label}</Badge></TD>
                      <TD className="tabular">{a.senha ?? "—"}</TD>
                      <TD className="text-text-muted">{a.validade ? dateBR(a.validade) : "—"}</TD>
                      <TD className="text-text-muted">{dateBR(a.solicitadoEm)}</TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
            <TableFooter total={filtered.length} pageSize={30} label="solicitações" />
          </>
        )}
      </Card>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Nova solicitação de autorização"
        description="Envie uma solicitação prévia ao convênio do beneficiário."
        footer={<><Button variant="secondary" onClick={() => setDrawerOpen(false)}>Cancelar</Button><Button variant="primary" onClick={enviar} disabled={!podeEnviar}>Enviar solicitação</Button></>}
      >
        <div className="flex flex-col gap-4">
          <Select label="Convênio" required placeholder="Selecione o convênio" value={insuranceId} onChange={(e) => { setInsuranceId(e.target.value); setPatientId(""); }} options={CONVENIOS.map((c) => ({ value: c.id, label: c.name }))} />
          <Select label="Beneficiário" required placeholder="Selecione o beneficiário" value={patientId} onChange={(e) => setPatientId(e.target.value)} options={patientPool.map((p) => ({ value: p.id, label: p.name }))} />
          <Select label="Procedimento (TUSS)" required placeholder="Selecione o procedimento" value={procedureId} onChange={(e) => setProcedureId(e.target.value)} options={candidatos.map((p) => ({ value: p.id, label: `${p.tuss} — ${p.name}` }))} />
          <Textarea label="Justificativa clínica" required rows={4} value={justificativa} onChange={(e) => setJustificativa(e.target.value)} placeholder="Descreva a indicação clínica para o procedimento." />
        </div>
      </Drawer>

      <Modal open={Boolean(confirm)} onClose={() => setConfirm(null)} title="Solicitação enviada" description={confirm ?? undefined} footer={<Button variant="primary" onClick={() => setConfirm(null)}>Entendi</Button>} />
    </div>
  );
}
