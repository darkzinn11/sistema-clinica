import { useState } from "react";
import { Input, Select } from "@/components/ui/input";
import type { Patient } from "@/lib/mock/core";
import { insuranceName, insurances, TODAY } from "@/lib/mock/core";
import { age, dateBR } from "@/lib/format";
import { addressForPatient, complementaryInfoForPatient, CIVIL_STATUS, CONTACT_PREF, EDUCATION_LEVELS, PROFESSIONS, UFS } from "@/lib/mock/pacientes";
import { EditableSection } from "@/components/pacientes/perfil/editable-section";
import { useEditToggle } from "@/components/pacientes/perfil/use-edit-toggle";

export function Dados({ patient }: { patient: Patient }) {
  const addr = addressForPatient(patient.id);
  const comp = complementaryInfoForPatient(patient.id);

  const pessoais = useEditToggle();
  const [nome, setNome] = useState(patient.name);
  const [sexo, setSexo] = useState(patient.sex);
  const [estadoCivil, setEstadoCivil] = useState(comp.estadoCivil);
  const [escolaridade, setEscolaridade] = useState(comp.escolaridade);

  const contato = useEditToggle();
  const [celular, setCelular] = useState(patient.phone);
  const [email, setEmail] = useState(patient.email);
  const [contatoPref, setContatoPref] = useState(CONTACT_PREF[0].value);

  const endereco = useEditToggle();
  const [cep, setCep] = useState(addr.cep);
  const [logradouro, setLogradouro] = useState(addr.logradouro);
  const [numero, setNumero] = useState(addr.numero);
  const [complemento, setComplemento] = useState(addr.complemento);
  const [bairro, setBairro] = useState(addr.bairro);
  const [cidade, setCidade] = useState(addr.cidade);
  const [uf, setUf] = useState(addr.uf);

  const convenio = useEditToggle();
  const [convenioId, setConvenioId] = useState(patient.insuranceId);
  const [carteirinha, setCarteirinha] = useState(patient.insuranceCard);

  const complementares = useEditToggle();
  const [profissao, setProfissao] = useState(comp.profissao);
  const [comoConheceu, setComoConheceu] = useState(patient.leadSource);

  return (
    <div className="flex flex-col gap-5">
      <EditableSection
        title="Dados pessoais"
        editing={pessoais.editing}
        onEditToggle={pessoais.open}
        onSave={pessoais.close}
        items={[
          { label: "Nome completo", value: nome },
          { label: "Data de nascimento", value: `${dateBR(patient.birthDate)} (${age(patient.birthDate, TODAY)} anos)` },
          { label: "Sexo", value: sexo === "F" ? "Feminino" : "Masculino" },
          { label: "CPF", value: patient.cpf },
          { label: "Estado civil", value: estadoCivil },
          { label: "Escolaridade", value: escolaridade },
        ]}
        form={
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} wrapperClassName="sm:col-span-2" />
            <Select label="Sexo" value={sexo} onChange={(e) => setSexo(e.target.value as Patient["sex"])} options={[{ value: "F", label: "Feminino" }, { value: "M", label: "Masculino" }]} />
            <Select label="Estado civil" value={estadoCivil} onChange={(e) => setEstadoCivil(e.target.value)} options={CIVIL_STATUS.map((c) => ({ value: c, label: c }))} />
            <Select label="Escolaridade" value={escolaridade} onChange={(e) => setEscolaridade(e.target.value)} options={EDUCATION_LEVELS.map((c) => ({ value: c, label: c }))} />
          </div>
        }
      />

      <EditableSection
        title="Contato"
        editing={contato.editing}
        onEditToggle={contato.open}
        onSave={contato.close}
        items={[
          { label: "Celular", value: celular },
          { label: "E-mail", value: email },
          { label: "Preferência de contato", value: CONTACT_PREF.find((c) => c.value === contatoPref)?.label },
        ]}
        form={
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Celular" value={celular} onChange={(e) => setCelular(e.target.value)} />
            <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Select
              label="Preferência de contato"
              value={contatoPref}
              onChange={(e) => setContatoPref(e.target.value)}
              options={CONTACT_PREF}
              wrapperClassName="sm:col-span-2"
            />
          </div>
        }
      />

      <EditableSection
        title="Endereço"
        editing={endereco.editing}
        onEditToggle={endereco.open}
        onSave={endereco.close}
        items={[
          { label: "CEP", value: cep },
          { label: "Logradouro", value: `${logradouro}, ${numero}${complemento ? ` — ${complemento}` : ""}` },
          { label: "Bairro", value: bairro },
          { label: "Cidade/UF", value: `${cidade}/${uf}` },
        ]}
        form={
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Input label="CEP" value={cep} onChange={(e) => setCep(e.target.value)} />
            <Input label="Logradouro" value={logradouro} onChange={(e) => setLogradouro(e.target.value)} wrapperClassName="sm:col-span-2" />
            <Input label="Número" value={numero} onChange={(e) => setNumero(e.target.value)} />
            <Input label="Complemento" value={complemento} onChange={(e) => setComplemento(e.target.value)} />
            <Input label="Bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} />
            <Input label="Cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
            <Select label="UF" value={uf} onChange={(e) => setUf(e.target.value)} options={UFS.map((u) => ({ value: u, label: u }))} />
          </div>
        }
      />

      <EditableSection
        title="Convênio"
        editing={convenio.editing}
        onEditToggle={convenio.open}
        onSave={convenio.close}
        items={[
          { label: "Convênio", value: insuranceName(convenioId) },
          { label: "Nº da carteirinha", value: carteirinha || "—" },
        ]}
        form={
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select label="Convênio" value={convenioId} onChange={(e) => setConvenioId(e.target.value)} options={insurances.map((i) => ({ value: i.id, label: i.name }))} />
            <Input label="Nº da carteirinha" value={carteirinha} onChange={(e) => setCarteirinha(e.target.value)} disabled={convenioId === "i0"} />
          </div>
        }
      />

      <EditableSection
        title="Complementares"
        editing={complementares.editing}
        onEditToggle={complementares.open}
        onSave={complementares.close}
        items={[
          { label: "Como conheceu a clínica", value: comoConheceu },
          { label: "Profissão", value: profissao },
        ]}
        form={
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Como conheceu a clínica" value={comoConheceu} onChange={(e) => setComoConheceu(e.target.value)} />
            <Select label="Profissão" value={profissao} onChange={(e) => setProfissao(e.target.value)} options={PROFESSIONS.map((p) => ({ value: p, label: p }))} />
          </div>
        }
      />
    </div>
  );
}
