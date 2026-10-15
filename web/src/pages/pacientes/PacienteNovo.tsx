import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Gallery, InfoCircle, SearchNormal1, UserAdd } from "iconsax-reactjs";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Select, Checkbox } from "@/components/ui/input";
import { FormSection } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/tabs";
import { Button, ButtonLink } from "@/components/ui/button";
import { patients, insurances, leadSources, TODAY } from "@/lib/mock/core";
import { age } from "@/lib/format";
import { ChipInput, type ClinicalAlert } from "@/components/pacientes/chip-input";
import { CIVIL_STATUS, EDUCATION_LEVELS, CONTACT_PREF, PROFESSIONS, UFS, normalizeName, onlyDigits } from "@/lib/mock/pacientes";

const SAMPLE_ADDRESS = { logradouro: "Rua das Flores", bairro: "Centro", cidade: "São Luís", uf: "MA" };
/** Paciente mock usado como destino da navegação após salvar (não existe criação real no protótipo). */
const MOCK_NEW_PATIENT_ID = patients[0].id;

export default function Page() {
  const navigate = useNavigate();

  const [nome, setNome] = useState("");
  const [nomeSocial, setNomeSocial] = useState("");
  const [semCpf, setSemCpf] = useState(false);
  const [cpf, setCpf] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [sexo, setSexo] = useState<"F" | "M">("F");

  const [celular, setCelular] = useState("");
  const [isWhatsapp, setIsWhatsapp] = useState(true);
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [contatoPref, setContatoPref] = useState("whatsapp");

  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("MA");

  const [convenio, setConvenio] = useState("i0");
  const [carteirinha, setCarteirinha] = useState("");
  const [validade, setValidade] = useState("");
  const [plano, setPlano] = useState("");
  const [titular, setTitular] = useState("");

  const [comoConheceu, setComoConheceu] = useState(leadSources[0]);
  const [profissao, setProfissao] = useState("");
  const [estadoCivil, setEstadoCivil] = useState(CIVIL_STATUS[0]);
  const [escolaridade, setEscolaridade] = useState(EDUCATION_LEVELS[3]);
  const [respNome, setRespNome] = useState("");
  const [respCpf, setRespCpf] = useState("");
  const [respParentesco, setRespParentesco] = useState("");

  const [alerts, setAlerts] = useState<ClinicalAlert[]>([]);
  const [consentDados, setConsentDados] = useState(false);
  const [consentComunicacao, setConsentComunicacao] = useState(false);

  const [submitted, setSubmitted] = useState(false);

  const isMinor = nascimento ? age(nascimento, TODAY) < 18 : false;

  const duplicate = useMemo(() => {
    const nameNorm = normalizeName(nome);
    const cpfDigits = onlyDigits(cpf);
    if (nameNorm.length < 4 && cpfDigits.length < 11) return undefined;
    return patients.find((p) => (cpfDigits.length === 11 && onlyDigits(p.cpf) === cpfDigits) || (nameNorm.length >= 4 && normalizeName(p.name) === nameNorm));
  }, [nome, cpf]);

  function buscarCep() {
    if (!cep.trim()) return;
    setLogradouro(SAMPLE_ADDRESS.logradouro);
    setBairro(SAMPLE_ADDRESS.bairro);
    setCidade(SAMPLE_ADDRESS.cidade);
    setUf(SAMPLE_ADDRESS.uf);
  }

  function handleSave(goToAgenda: boolean) {
    setSubmitted(true);
    if (!nome.trim()) return;
    if (goToAgenda) navigate("/agenda?novo=1");
    else navigate(`/pacientes/${MOCK_NEW_PATIENT_ID}`);
  }

  return (
    <div className="mx-auto max-w-5xl pb-28">
      <PageHeader
        title="Novo paciente"
        description="Preencha os dados do paciente. Só o nome é obrigatório para começar — o restante pode ser completado depois."
        breadcrumbs={[{ label: "Início", href: "/inicio" }, { label: "Pacientes", href: "/pacientes" }, { label: "Novo paciente" }]}
      />

      {duplicate && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-warning/30 bg-warning-bg px-4 py-3 text-warning">
          <InfoCircle size={18} aria-hidden className="mt-0.5 shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-medium">Possível duplicado: {duplicate.name}</p>
            <p className="text-warning/90">Já existe um cadastro com nome ou CPF parecido. Confira antes de continuar.</p>
          </div>
          <ButtonLink to={`/pacientes/${duplicate.id}`} size="sm" variant="secondary">
            Abrir cadastro
          </ButtonLink>
        </div>
      )}

      <Card>
        <CardBody>
          <FormSection title="Identificação" description="Dados pessoais básicos do paciente.">
            <div className="flex flex-col gap-4 lg:flex-row">
              <div className="flex shrink-0 flex-col items-center gap-2">
                <div className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-full border-2 border-dashed border-border-strong text-text-subtle">
                  <Gallery size={22} aria-hidden />
                </div>
                <button type="button" className="text-xs font-medium text-accent hover:underline">
                  Adicionar foto
                </button>
              </div>
              <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Nome completo"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  error={submitted && !nome.trim() ? "Informe o nome do paciente." : undefined}
                  wrapperClassName="sm:col-span-2"
                />
                <Input label="Nome social" hint="Opcional" value={nomeSocial} onChange={(e) => setNomeSocial(e.target.value)} wrapperClassName="sm:col-span-2" />
                <div className="flex flex-col gap-1.5">
                  <Input label="CPF" value={cpf} onChange={(e) => setCpf(e.target.value)} disabled={semCpf} placeholder="000.000.000-00" />
                  <Checkbox label="Paciente sem CPF" checked={semCpf} onChange={(e) => setSemCpf(e.target.checked)} />
                </div>
                <Input label="Data de nascimento" type="date" value={nascimento} onChange={(e) => setNascimento(e.target.value)} />
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className="text-sm font-medium text-text">Sexo</span>
                  <Segmented label="Sexo" value={sexo} onChange={setSexo} options={[{ value: "F", label: "Feminino" }, { value: "M", label: "Masculino" }]} />
                </div>
              </div>
            </div>
          </FormSection>

          <FormSection title="Contato" description="Como a clínica deve falar com o paciente.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Input label="Celular" value={celular} onChange={(e) => setCelular(e.target.value)} placeholder="(98) 90000-0000" />
                <Checkbox label="Este número é WhatsApp" checked={isWhatsapp} onChange={(e) => setIsWhatsapp(e.target.checked)} />
              </div>
              <Input label="Telefone fixo" hint="Opcional" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(98) 3000-0000" />
              <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} wrapperClassName="sm:col-span-2" />
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="text-sm font-medium text-text">Preferência de contato</span>
                <Segmented label="Preferência de contato" value={contatoPref} onChange={setContatoPref} options={CONTACT_PREF.map((c) => ({ value: c.value, label: c.label }))} />
              </div>
            </div>
          </FormSection>

          <FormSection title="Endereço" description="Usado para correspondência e NFS-e.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <Input label="CEP" value={cep} onChange={(e) => setCep(e.target.value)} placeholder="00000-000" wrapperClassName="sm:col-span-1" />
              <div className="flex items-end sm:col-span-1">
                <Button type="button" variant="secondary" icon={SearchNormal1} onClick={buscarCep} className="w-full">
                  Buscar
                </Button>
              </div>
              <Input label="Logradouro" value={logradouro} onChange={(e) => setLogradouro(e.target.value)} wrapperClassName="sm:col-span-2" />
              <Input label="Número" value={numero} onChange={(e) => setNumero(e.target.value)} />
              <Input label="Complemento" hint="Opcional" value={complemento} onChange={(e) => setComplemento(e.target.value)} />
              <Input label="Bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} />
              <Input label="Cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
              <Select label="UF" value={uf} onChange={(e) => setUf(e.target.value)} options={UFS.map((u) => ({ value: u, label: u }))} wrapperClassName="sm:col-span-1" />
            </div>
          </FormSection>

          <FormSection title="Convênio" description="Se o paciente for particular, deixe em branco.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Convênio"
                value={convenio}
                onChange={(e) => setConvenio(e.target.value)}
                options={insurances.map((i) => ({ value: i.id, label: i.name }))}
              />
              <Input label="Nº da carteirinha" value={carteirinha} onChange={(e) => setCarteirinha(e.target.value)} disabled={convenio === "i0"} />
              <Input label="Validade" type="date" value={validade} onChange={(e) => setValidade(e.target.value)} disabled={convenio === "i0"} />
              <Input label="Plano" value={plano} onChange={(e) => setPlano(e.target.value)} disabled={convenio === "i0"} placeholder="Ex.: Standard" />
              <Input label="Titular" hint="Se diferente do paciente" value={titular} onChange={(e) => setTitular(e.target.value)} disabled={convenio === "i0"} wrapperClassName="sm:col-span-2" />
            </div>
          </FormSection>

          <FormSection title="Complementares" description="Ajuda a entender melhor o perfil do paciente.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select label="Como conheceu a clínica" value={comoConheceu} onChange={(e) => setComoConheceu(e.target.value)} options={leadSources.map((l) => ({ value: l, label: l }))} />
              <Select label="Profissão" value={profissao} onChange={(e) => setProfissao(e.target.value)} placeholder="Selecione" options={PROFESSIONS.map((p) => ({ value: p, label: p }))} />
              <Select label="Estado civil" value={estadoCivil} onChange={(e) => setEstadoCivil(e.target.value)} options={CIVIL_STATUS.map((c) => ({ value: c, label: c }))} />
              <Select label="Escolaridade" value={escolaridade} onChange={(e) => setEscolaridade(e.target.value)} options={EDUCATION_LEVELS.map((lvl) => ({ value: lvl, label: lvl }))} />
              {isMinor && (
                <div className="flex flex-col gap-4 rounded-lg bg-surface p-4 sm:col-span-2">
                  <p className="text-sm font-medium text-text">Responsável legal</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Input label="Nome do responsável" value={respNome} onChange={(e) => setRespNome(e.target.value)} wrapperClassName="sm:col-span-1" />
                    <Input label="CPF do responsável" value={respCpf} onChange={(e) => setRespCpf(e.target.value)} />
                    <Input label="Parentesco" value={respParentesco} onChange={(e) => setRespParentesco(e.target.value)} placeholder="Ex.: Mãe, pai…" />
                  </div>
                </div>
              )}
            </div>
          </FormSection>

          <FormSection title="Alertas clínicos" description="Alergias, condições e outros avisos que devem aparecer em destaque no perfil.">
            <ChipInput value={alerts} onChange={setAlerts} />
          </FormSection>

          <FormSection title="Consentimentos LGPD" description="Registrado com data e hora no momento do cadastro.">
            <div className="flex flex-col gap-3">
              <Checkbox
                label="O paciente autoriza o compartilhamento de dados com o convênio e laboratórios parceiros para fins de atendimento."
                checked={consentDados}
                onChange={(e) => setConsentDados(e.target.checked)}
              />
              <Checkbox
                label="O paciente aceita receber lembretes de consulta e comunicações da clínica por WhatsApp, SMS ou e-mail."
                checked={consentComunicacao}
                onChange={(e) => setConsentComunicacao(e.target.checked)}
              />
            </div>
          </FormSection>
        </CardBody>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface-raised/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-end gap-2 px-4 py-3 sm:px-6">
          <Button variant="ghost" onClick={() => navigate("/pacientes")}>
            Cancelar
          </Button>
          <Button variant="secondary" onClick={() => handleSave(true)}>
            Salvar e agendar
          </Button>
          <Button variant="primary" icon={UserAdd} onClick={() => handleSave(false)}>
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}
