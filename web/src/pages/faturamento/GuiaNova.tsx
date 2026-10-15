import { IconCircle } from "@/components/ui/icon-circle";
import { Activity, Add, ArrowLeft2, ClipboardTick, Hospital, Profile2User, SaveAdd, ShieldTick, Trash, UserTick, Warning2 } from "iconsax-reactjs";
import type { Icon as IconType } from "iconsax-reactjs";
import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { DescriptionList, FormSection, Steps } from "@/components/ui/misc";
import { Modal } from "@/components/ui/overlay";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/tabs";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { brl, dateBR } from "@/lib/format";
import { clinic, patients, professionals, locations } from "@/lib/mock/core";
import { CONVENIOS, GUIA_TIPO_LABEL, type GuiaItem, type GuiaTipo, catalogoItens } from "@/lib/mock/faturamento";

const TIPO_CARDS: { tipo: GuiaTipo; icon: IconType; description: string }[] = [
  { tipo: "consulta", icon: UserTick, description: "Atendimento de consulta eletiva com um profissional." },
  { tipo: "sadt", icon: Activity, description: "Serviço de apoio diagnóstico e terapêutico — exames e procedimentos." },
  { tipo: "honorarios", icon: Profile2User, description: "Honorários de profissional em atendimento isolado." },
  { tipo: "internacao", icon: Hospital, description: "Diárias, taxas e materiais de um período de internação." },
  { tipo: "quimioterapia", icon: ClipboardTick, description: "Sessão de quimioterapia e medicação antineoplásica." },
];

function ChoiceCards() {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Nova guia" description="Escolha o tipo de guia TISS que você quer emitir." breadcrumbs={[{ label: "Faturamento TISS", href: "/faturamento" }, { label: "Guias", href: "/faturamento/guias" }, { label: "Nova guia" }]} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TIPO_CARDS.map((c) => (
          <Link key={c.tipo} to={`/faturamento/guias/nova?tipo=${c.tipo}`} className="flex flex-col gap-3 rounded-lg bg-surface-raised p-5 shadow-card transition-colors hover:bg-accent-muted/30">
            <IconCircle tone="accent" size="lg">
              <c.icon size={20} aria-hidden />
            </IconCircle>
            <span className="text-md font-semibold text-text">{GUIA_TIPO_LABEL[c.tipo]}</span>
            <span className="text-sm text-text-muted">{c.description}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

type DraftItem = GuiaItem;

export default function GuiaNova() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tipoParam = searchParams.get("tipo") as GuiaTipo | null;

  const [insuranceId, setInsuranceId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [carteirinha, setCarteirinha] = useState("");
  const [elegibilidade, setElegibilidade] = useState<"nao_verificado" | "elegivel" | "inelegivel">("nao_verificado");
  const [professionalId, setProfessionalId] = useState("");
  const [localId, setLocalId] = useState("");
  const [dataAtendimento, setDataAtendimento] = useState("");
  const [carater, setCarater] = useState<"eletivo" | "urgencia">("eletivo");
  const [senha, setSenha] = useState("");
  const [itens, setItens] = useState<DraftItem[]>([]);
  const [itemTuss, setItemTuss] = useState("");
  const [itemQtd, setItemQtd] = useState(1);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [validada, setValidada] = useState(false);
  const [loteModal, setLoteModal] = useState(false);

  const tipo = tipoParam ?? "consulta";
  const catalogo = useMemo(() => catalogoItens(tipo), [tipo]);

  if (!tipoParam) return <ChoiceCards />;

  const patientPool = insuranceId ? patients.filter((p) => p.insuranceId === insuranceId) : patients;
  const selectedPatient = patients.find((p) => p.id === patientId);

  function selectPatient(id: string) {
    setPatientId(id);
    setElegibilidade("nao_verificado");
    const p = patients.find((pp) => pp.id === id);
    if (p?.insuranceCard) setCarteirinha(p.insuranceCard);
  }

  function verificarElegibilidade() {
    if (!patientId) return;
    const hash = patientId.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
    setElegibilidade(hash % 10 === 0 ? "inelegivel" : "elegivel");
  }

  function addItem() {
    const cat = catalogo.find((c) => c.tuss === itemTuss);
    if (!cat) return;
    setItens((prev) => [...prev, { id: `${Date.now()}`, tuss: cat.tuss, descricao: cat.descricao, quantidade: itemQtd, valorUnitCents: cat.valorCents }]);
    setItemTuss("");
    setItemQtd(1);
  }

  function removeItem(id: string) {
    setItens((prev) => prev.filter((i) => i.id !== id));
  }

  const totalCents = itens.reduce((s, i) => s + i.quantidade * i.valorUnitCents, 0);

  const pendencias: { id: string; label: string }[] = [];
  if (!patientId) pendencias.push({ id: "f-beneficiario", label: "Selecione o beneficiário" });
  if (!carteirinha) pendencias.push({ id: "f-carteirinha", label: "Informe o número da carteirinha" });
  if (!professionalId) pendencias.push({ id: "f-profissional", label: "Selecione o profissional solicitante" });
  if (!dataAtendimento) pendencias.push({ id: "f-data", label: "Informe a data de atendimento" });
  if (!localId) pendencias.push({ id: "f-local", label: "Selecione o local de atendimento" });
  if (itens.length === 0) pendencias.push({ id: "f-itens", label: "Adicione ao menos um procedimento" });

  const current = pendencias.length === 0 ? (validada ? 2 : 1) : 0;

  function focusField(id: string) {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.querySelector<HTMLElement>("input, select, textarea")?.focus();
  }

  function salvarRascunho() {
    setSavedMsg("Rascunho salvo. Você pode continuar depois pela lista de guias.");
    setTimeout(() => setSavedMsg(null), 4000);
  }

  function validar() {
    setValidada(true);
    setSavedMsg("Guia validada — pronta para ser adicionada a um lote.");
    setTimeout(() => setSavedMsg(null), 4000);
  }

  function confirmarLote() {
    setLoteModal(false);
    navigate("/faturamento/guias");
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={`Nova guia · ${GUIA_TIPO_LABEL[tipo]}`}
        description="Preencha os dados conforme o layout TISS."
        breadcrumbs={[{ label: "Faturamento TISS", href: "/faturamento" }, { label: "Guias", href: "/faturamento/guias" }, { label: "Nova guia" }]}
        actions={<Link to="/faturamento/guias/nova" className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted hover:text-text"><ArrowLeft2 size={14} aria-hidden />Trocar tipo de guia</Link>}
      >
        <Steps steps={["Dados do atendimento", "Procedimentos", "Validação"]} current={current} />
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardBody>
              <FormSection title="Beneficiário" description="Dados do paciente e do plano.">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Select label="Convênio" placeholder="Selecione o convênio" value={insuranceId} onChange={(e) => { setInsuranceId(e.target.value); setPatientId(""); setCarteirinha(""); }} options={CONVENIOS.map((c) => ({ value: c.id, label: c.name }))} />
                  <div id="f-beneficiario">
                    <Select label="Beneficiário" required placeholder="Selecione o beneficiário" value={patientId} onChange={(e) => selectPatient(e.target.value)} options={patientPool.map((p) => ({ value: p.id, label: p.name }))} />
                  </div>
                  <div id="f-carteirinha">
                    <Input label="Carteirinha" required value={carteirinha} onChange={(e) => setCarteirinha(e.target.value)} />
                  </div>
                  <div className="flex items-end gap-2">
                    <Badge tone={elegibilidade === "elegivel" ? "success" : elegibilidade === "inelegivel" ? "danger" : "neutral"} dot icon={elegibilidade === "elegivel" ? ShieldTick : undefined} className="h-9">
                      {elegibilidade === "elegivel" ? "Elegível" : elegibilidade === "inelegivel" ? "Inelegível" : "Não verificado"}
                    </Badge>
                    <Button type="button" size="sm" variant="secondary" onClick={verificarElegibilidade} disabled={!patientId}>Verificar elegibilidade</Button>
                  </div>
                </div>
              </FormSection>

              <FormSection title="Contratado" description="Unidade executante.">
                <DescriptionList columns={2} items={[{ label: "Clínica", value: clinic.name }, { label: "CNPJ", value: clinic.cnpj }]} />
              </FormSection>

              <FormSection title="Solicitante" description="Profissional responsável pelo atendimento.">
                <div id="f-profissional">
                  <Select label="Profissional solicitante" required placeholder="Selecione o profissional" value={professionalId} onChange={(e) => setProfessionalId(e.target.value)} options={professionals.map((p) => ({ value: p.id, label: `${p.name} · ${p.specialty}` }))} />
                </div>
              </FormSection>

              <FormSection title="Atendimento" description="Quando e onde o atendimento ocorreu.">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div id="f-data">
                    <Input type="date" label="Data de atendimento" required value={dataAtendimento} onChange={(e) => setDataAtendimento(e.target.value)} />
                  </div>
                  <div id="f-local">
                    <Select label="Local de atendimento" required placeholder="Selecione o local" value={localId} onChange={(e) => setLocalId(e.target.value)} options={locations.map((l) => ({ value: l.id, label: l.name }))} />
                  </div>
                  <div className="sm:col-span-2">
                    <span className="mb-1.5 block text-sm font-medium text-text">Caráter do atendimento</span>
                    <Segmented label="Caráter do atendimento" value={carater} onChange={setCarater} options={[{ value: "eletivo", label: "Eletivo" }, { value: "urgencia", label: "Urgência" }]} />
                  </div>
                  {tipo !== "consulta" && <Input label="Senha de autorização" hint="Opcional — se já houver uma autorização prévia." value={senha} onChange={(e) => setSenha(e.target.value)} />}
                </div>
              </FormSection>

              <FormSection title="Procedimentos" description="Itens que compõem esta guia, com código TUSS.">
                <div id="f-itens" className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-end gap-2">
                    <Select label="Procedimento (TUSS)" placeholder="Buscar procedimento" value={itemTuss} onChange={(e) => setItemTuss(e.target.value)} wrapperClassName="min-w-64 flex-1" options={catalogo.map((c) => ({ value: c.tuss, label: `${c.tuss} — ${c.descricao}` }))} />
                    <Input type="number" min={1} label="Qtd." value={itemQtd} onChange={(e) => setItemQtd(Math.max(1, Number(e.target.value)))} wrapperClassName="w-20" />
                    <Button type="button" variant="secondary" icon={Add} onClick={addItem} disabled={!itemTuss}>Adicionar</Button>
                  </div>
                  {itens.length > 0 && (
                    <Table>
                      <THead>
                        <TR><TH>TUSS</TH><TH>Descrição</TH><TH align="right">Qtd.</TH><TH align="right">Valor unit.</TH><TH align="right">Total</TH><TH /></TR>
                      </THead>
                      <TBody>
                        {itens.map((it) => (
                          <TR key={it.id}>
                            <TD className="tabular">{it.tuss}</TD>
                            <TD>{it.descricao}</TD>
                            <TD numeric>{it.quantidade}</TD>
                            <TD numeric>{brl(it.valorUnitCents)}</TD>
                            <TD numeric>{brl(it.quantidade * it.valorUnitCents)}</TD>
                            <TD align="center">
                              <Button type="button" size="xs" variant="ghost" iconOnly icon={Trash} aria-label={`Remover ${it.descricao}`} onClick={() => removeItem(it.id)} />
                            </TD>
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                  )}
                </div>
              </FormSection>
            </CardBody>
          </Card>
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardHeader title={pendencias.length === 0 ? "Pronta para enviar" : `${pendencias.length} pendência${pendencias.length === 1 ? "" : "s"} antes de enviar`} />
            <CardBody className="flex flex-col gap-4">
              {pendencias.length > 0 ? (
                <ul className="flex flex-col gap-1">
                  {pendencias.map((p) => (
                    <li key={p.id}>
                      <button type="button" onClick={() => focusField(p.id)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-text-muted hover:bg-surface hover:text-text">
                        <Warning2 size={14} className="shrink-0 text-warning" aria-hidden />
                        {p.label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-center gap-2 text-sm text-success">
                  <ShieldTick size={16} aria-hidden />
                  Todos os campos obrigatórios preenchidos.
                </div>
              )}
              <div className="flex items-center justify-between border-t border-border pt-3 text-base">
                <span className="text-text-muted">Valor total</span>
                <span className="tabular font-display font-semibold text-text">{brl(totalCents)}</span>
              </div>
              {selectedPatient && (
                <p className="text-xs text-text-muted">Atendimento de {selectedPatient.name}{dataAtendimento ? ` em ${dateBR(dataAtendimento)}` : ""}.</p>
              )}
              <div className="flex flex-col gap-2">
                <Button type="button" variant="secondary" icon={SaveAdd} onClick={salvarRascunho}>Salvar rascunho</Button>
                <Button type="button" variant="subtle" onClick={validar} disabled={pendencias.length > 0}>Validar guia</Button>
                <Button type="button" variant="primary" onClick={() => setLoteModal(true)} disabled={pendencias.length > 0 || !validada}>Adicionar ao lote</Button>
              </div>
              {savedMsg && <p className="rounded-md bg-success-bg px-3 py-2 text-sm text-success">{savedMsg}</p>}
            </CardBody>
          </Card>
        </div>
      </div>

      <Modal
        open={loteModal}
        onClose={() => setLoteModal(false)}
        title="Adicionar guia ao lote"
        description="A guia será incluída no próximo lote em aberto para este convênio."
        icon={ClipboardTick}
        footer={
          <>
            <Button variant="secondary" onClick={() => setLoteModal(false)}>Cancelar</Button>
            <Button variant="primary" onClick={confirmarLote}>Confirmar</Button>
          </>
        }
      />
    </div>
  );
}
