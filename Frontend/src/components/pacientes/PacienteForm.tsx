import { Add, CloseCircle, Warning2 } from "iconsax-reactjs";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { FormSection } from "@/components/ui/misc";
import { Switch } from "@/components/ui/overlay";
import { useDuplicates, useOrigins, usePriorities, type Patient, type PatientForm } from "@/lib/api/pacientes";
import {
  CIVIL_STATUS, EDUCATION_LEVELS, IDENTIFICATION_COLORS, SEXES, SKIN_COLORS, UFS, ageFrom, formatCpf, onlyDigits,
} from "@/lib/pacientes/options";
import { cn } from "@/lib/cn";

/** Estado do formulário: tudo texto (campo vazio vira nulo ao enviar), como o usuário digita. */
interface Values {
  nome: string; nomeSocial: string; cpf: string; semCpf: boolean; estrangeiro: boolean; nascimento: string; sexo: string;
  corIdentificacao: string; alturaCm: string; pesoKg: string; prioridadeId: string;
  celular: string; celular2: string; telefone: string; telefone2: string; email: string; email2: string;
  cep: string; logradouro: string; numeroEndereco: string; complemento: string; bairro: string; cidade: string; estado: string; pais: string;
  profissao: string; escolaridade: string; naturalidade: string; estadoCivil: string; nacionalidade: string; rg: string;
  origemId: string; indicacao: string; religiao: string; cns: string; corPele: string;
  observacoes: string; avisoAtivo: boolean; avisoTexto: string;
  parentes: { nome: string; parentesco: string; cpf: string; responsavelFinanceiro: boolean }[];
}

const text = (value: string | null | undefined) => value ?? "";
const number = (value: number | null | undefined) => (value === null || value === undefined ? "" : String(value));

function initialValues(p?: Patient): Values {
  return {
    nome: text(p?.nome), nomeSocial: text(p?.nomeSocial), cpf: text(p?.cpf), semCpf: p?.semCpf ?? false, estrangeiro: p?.estrangeiro ?? false,
    nascimento: text(p?.nascimento), sexo: text(p?.sexo), corIdentificacao: text(p?.corIdentificacao), alturaCm: number(p?.alturaCm), pesoKg: number(p?.pesoKg),
    prioridadeId: text(p?.prioridadeId), celular: text(p?.celular), celular2: text(p?.celular2), telefone: text(p?.telefone), telefone2: text(p?.telefone2),
    email: text(p?.email), email2: text(p?.email2), cep: text(p?.cep), logradouro: text(p?.logradouro), numeroEndereco: text(p?.numeroEndereco),
    complemento: text(p?.complemento), bairro: text(p?.bairro), cidade: text(p?.cidade), estado: text(p?.estado), pais: p?.pais ?? "Brasil",
    profissao: text(p?.profissao), escolaridade: text(p?.escolaridade), naturalidade: text(p?.naturalidade), estadoCivil: text(p?.estadoCivil),
    nacionalidade: text(p?.nacionalidade), rg: text(p?.rg), origemId: text(p?.origemId), indicacao: text(p?.indicacao), religiao: text(p?.religiao),
    cns: text(p?.cns), corPele: text(p?.corPele), observacoes: text(p?.observacoes), avisoAtivo: p?.avisoAtivo ?? false, avisoTexto: text(p?.avisoTexto),
    parentes: (p?.parentes ?? []).map((r) => ({ nome: r.nome, parentesco: text(r.parentesco), cpf: text(r.cpf), responsavelFinanceiro: r.responsavelFinanceiro })),
  };
}

const blankToNull = (value: string) => (value.trim() === "" ? null : value.trim());
const decimal = (value: string) => (value.trim() === "" ? null : Number(value.replace(",", ".")));

function toForm(v: Values): PatientForm {
  return {
    nome: v.nome.trim(), nomeSocial: blankToNull(v.nomeSocial), cpf: v.semCpf ? null : blankToNull(onlyDigits(v.cpf)), semCpf: v.semCpf, estrangeiro: v.estrangeiro,
    nascimento: blankToNull(v.nascimento), sexo: blankToNull(v.sexo), corIdentificacao: blankToNull(v.corIdentificacao), alturaCm: decimal(v.alturaCm), pesoKg: decimal(v.pesoKg),
    prioridadeId: blankToNull(v.prioridadeId), celular: blankToNull(v.celular), celular2: blankToNull(v.celular2), telefone: blankToNull(v.telefone), telefone2: blankToNull(v.telefone2),
    email: blankToNull(v.email), email2: blankToNull(v.email2), cep: blankToNull(onlyDigits(v.cep)), logradouro: blankToNull(v.logradouro), numeroEndereco: blankToNull(v.numeroEndereco),
    complemento: blankToNull(v.complemento), bairro: blankToNull(v.bairro), cidade: blankToNull(v.cidade), estado: blankToNull(v.estado), pais: blankToNull(v.pais),
    profissao: blankToNull(v.profissao), escolaridade: blankToNull(v.escolaridade), naturalidade: blankToNull(v.naturalidade), estadoCivil: blankToNull(v.estadoCivil),
    nacionalidade: blankToNull(v.nacionalidade), rg: blankToNull(v.rg), origemId: blankToNull(v.origemId), indicacao: blankToNull(v.indicacao), religiao: blankToNull(v.religiao),
    cns: blankToNull(onlyDigits(v.cns)), corPele: blankToNull(v.corPele), observacoes: blankToNull(v.observacoes), avisoAtivo: v.avisoAtivo, avisoTexto: v.avisoAtivo ? blankToNull(v.avisoTexto) : null,
    parentes: v.parentes.filter((r) => r.nome.trim() !== "").map((r) => ({
      nome: r.nome.trim(), parentesco: blankToNull(r.parentesco), cpf: blankToNull(onlyDigits(r.cpf)), responsavelFinanceiro: r.responsavelFinanceiro,
    })),
  };
}

function problems(v: Values): string[] {
  const list: string[] = [];
  if (!v.nome.trim()) list.push("Informe o nome do paciente.");
  if (!v.semCpf && !v.estrangeiro && onlyDigits(v.cpf).length !== 11) list.push("Informe o CPF completo, ou marque \"Sem CPF\" ou \"Estrangeiro\".");
  if (onlyDigits(v.celular).length < 10) list.push("Informe o celular com DDD.");
  if (v.avisoAtivo && !v.avisoTexto.trim()) list.push("Escreva o texto do aviso.");
  if (v.cns && onlyDigits(v.cns).length !== 15) list.push("O CNS tem 15 dígitos.");
  return list;
}

const IMC_LABEL = (imc: number) => (imc < 18.5 ? "abaixo do peso" : imc < 25 ? "peso normal" : imc < 30 ? "sobrepeso" : "obesidade");

/** Cadastro completo do paciente, nos campos da tela Pacientes > Inserir do Feegow. Serve para cadastrar e para editar. */
export function PacienteForm({
  initial, submitting, error, submitLabel, onSubmit, onCancel,
}: {
  initial?: Patient;
  submitting: boolean;
  error: string | null;
  submitLabel: string;
  onSubmit: (form: PatientForm) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState<Values>(() => initialValues(initial));
  const [tried, setTried] = useState(false);
  const priorities = usePriorities();
  const origins = useOrigins();
  const set = <K extends keyof Values>(key: K, value: Values[K]) => setV((prev) => ({ ...prev, [key]: value }));

  const found = problems(v);
  const age = ageFrom(v.nascimento || null);
  const height = decimal(v.alturaCm), weight = decimal(v.pesoKg);
  const imc = height && weight && height > 0 ? Math.round((weight / (height / 100) ** 2) * 10) / 10 : null;

  // Possíveis duplicados enquanto digita (ao editar, o próprio paciente não conta).
  const cpfDigits = onlyDigits(v.cpf);
  const duplicates = useDuplicates({
    cpf: !v.semCpf && cpfDigits.length === 11 ? cpfDigits : undefined,
    celular: onlyDigits(v.celular) || undefined,
    nome: v.nome.trim() || undefined,
    nascimento: v.nascimento || undefined,
  }, true);
  const others = useMemo(() => (duplicates.data ?? []).filter((d) => d.paciente.id !== initial?.id), [duplicates.data, initial?.id]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTried(true);
    if (found.length === 0) onSubmit(toForm(v));
  }

  const reasonLabel = { cpf: "mesmo CPF", telefone: "mesmo telefone", nome_nascimento: "mesmo nome e nascimento" } as const;

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Card>
        <CardBody>
          {others.length > 0 && (
            <div role="alert" className="mb-5 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning-bg px-4 py-3 text-sm text-warning">
              <Warning2 size={18} variant="Bold" aria-hidden className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Pode já existir um cadastro</p>
                <ul className="mt-1 flex flex-col gap-0.5">
                  {others.map((d) => (
                    <li key={d.paciente.id}>
                      <Link to={`/pacientes/${d.paciente.id}`} className="font-medium underline">{d.paciente.nome}</Link>
                      {" "}({d.motivos.map((m) => reasonLabel[m]).join(", ")}){!d.paciente.ativo && " — inativo"}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <FormSection title="Identificação" description="Nome, documento e dados básicos.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Nome completo" required value={v.nome} onChange={(e) => set("nome", e.target.value)} wrapperClassName="sm:col-span-2" />
              <Input label="Nome social" value={v.nomeSocial} onChange={(e) => set("nomeSocial", e.target.value)} wrapperClassName="sm:col-span-2" />
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 sm:col-span-2">
                <Checkbox label="Sem CPF" checked={v.semCpf} onChange={(e) => setV((prev) => ({ ...prev, semCpf: e.target.checked, cpf: e.target.checked ? "" : prev.cpf }))} />
                <Checkbox label="Estrangeiro" checked={v.estrangeiro} onChange={(e) => set("estrangeiro", e.target.checked)} />
              </div>
              <Input label="CPF" required={!v.semCpf && !v.estrangeiro} disabled={v.semCpf} inputMode="numeric" value={v.semCpf ? "" : formatCpf(v.cpf)}
                onChange={(e) => set("cpf", onlyDigits(e.target.value).slice(0, 11))} placeholder="000.000.000-00" />
              <Input label="RG" value={v.rg} onChange={(e) => set("rg", e.target.value)} />
              <Input type="date" label="Nascimento" value={v.nascimento} onChange={(e) => set("nascimento", e.target.value)} hint={age !== null ? `${age} anos` : undefined} />
              <Select label="Sexo" value={v.sexo} onChange={(e) => set("sexo", e.target.value)} options={[{ value: "", label: "Não informado" }, ...SEXES.map((s) => ({ value: s, label: s }))]} />
              <Input label="Altura (cm)" inputMode="decimal" value={v.alturaCm} onChange={(e) => set("alturaCm", e.target.value)} />
              <Input label="Peso (kg)" inputMode="decimal" value={v.pesoKg} onChange={(e) => set("pesoKg", e.target.value)}
                hint={imc !== null ? `IMC ${imc.toLocaleString("pt-BR")} (${IMC_LABEL(imc)})` : undefined} />
              <Select label="Prioridade" value={v.prioridadeId} onChange={(e) => set("prioridadeId", e.target.value)}
                options={[{ value: "", label: "Sem prioridade" }, ...(priorities.data ?? []).map((p) => ({ value: p.id, label: p.nome }))]} />
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-text">Cor de identificação</span>
                <span className="text-xs text-text-muted">Marca o paciente com uma cor para a recepção reconhecê-lo (aparece na lista e na ficha).</span>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" aria-label="Sem cor" onClick={() => set("corIdentificacao", "")}
                    className={cn("h-7 w-7 rounded-full border-2 border-dashed border-border-strong", v.corIdentificacao === "" && "ring-2 ring-accent ring-offset-2")} />
                  {IDENTIFICATION_COLORS.map((color) => (
                    <button key={color} type="button" aria-label={`Cor ${color}`} onClick={() => set("corIdentificacao", color)} style={{ background: color }}
                      className={cn("h-7 w-7 rounded-full", v.corIdentificacao.toLowerCase() === color.toLowerCase() && "ring-2 ring-accent ring-offset-2")} />
                  ))}
                </div>
              </div>
              {initial?.numeroProntuario != null && <Input label="Nº do prontuário" value={String(initial.numeroProntuario)} readOnly hint="Gerado pelo sistema" />}
            </div>
          </FormSection>

          <FormSection title="Contato" description="O celular é obrigatório: é por ele que a clínica confirma consultas.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Celular" required inputMode="tel" value={v.celular} onChange={(e) => set("celular", e.target.value)} placeholder="(98) 99999-9999" />
              <Input label="Celular 2" inputMode="tel" value={v.celular2} onChange={(e) => set("celular2", e.target.value)} />
              <Input label="Telefone" inputMode="tel" value={v.telefone} onChange={(e) => set("telefone", e.target.value)} />
              <Input label="Telefone 2" inputMode="tel" value={v.telefone2} onChange={(e) => set("telefone2", e.target.value)} />
              <Input label="E-mail" type="email" value={v.email} onChange={(e) => set("email", e.target.value)} />
              <Input label="E-mail 2" type="email" value={v.email2} onChange={(e) => set("email2", e.target.value)} />
            </div>
          </FormSection>

          <FormSection title="Endereço">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
              <Input label="CEP" inputMode="numeric" value={v.cep} onChange={(e) => set("cep", e.target.value)} placeholder="00000-000" wrapperClassName="sm:col-span-2" />
              <Input label="Logradouro" value={v.logradouro} onChange={(e) => set("logradouro", e.target.value)} wrapperClassName="sm:col-span-4" />
              <Input label="Número" value={v.numeroEndereco} onChange={(e) => set("numeroEndereco", e.target.value)} wrapperClassName="sm:col-span-2" />
              <Input label="Complemento" value={v.complemento} onChange={(e) => set("complemento", e.target.value)} wrapperClassName="sm:col-span-4" />
              <Input label="Bairro" value={v.bairro} onChange={(e) => set("bairro", e.target.value)} wrapperClassName="sm:col-span-2" />
              <Input label="Cidade" value={v.cidade} onChange={(e) => set("cidade", e.target.value)} wrapperClassName="sm:col-span-2" />
              <Select label="Estado" value={v.estado} onChange={(e) => set("estado", e.target.value)} wrapperClassName="sm:col-span-1"
                options={[{ value: "", label: "—" }, ...UFS.map((u) => ({ value: u, label: u }))]} />
              <Input label="País" value={v.pais} onChange={(e) => set("pais", e.target.value)} wrapperClassName="sm:col-span-1" />
            </div>
          </FormSection>

          <FormSection title="Dados complementares">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Profissão" value={v.profissao} onChange={(e) => set("profissao", e.target.value)} />
              <Select label="Escolaridade" value={v.escolaridade} onChange={(e) => set("escolaridade", e.target.value)} options={[{ value: "", label: "Não informada" }, ...EDUCATION_LEVELS.map((s) => ({ value: s, label: s }))]} />
              <Input label="Naturalidade" value={v.naturalidade} onChange={(e) => set("naturalidade", e.target.value)} />
              <Input label="Nacionalidade" value={v.nacionalidade} onChange={(e) => set("nacionalidade", e.target.value)} />
              <Select label="Estado civil" value={v.estadoCivil} onChange={(e) => set("estadoCivil", e.target.value)} options={[{ value: "", label: "Não informado" }, ...CIVIL_STATUS.map((s) => ({ value: s, label: s }))]} />
              <Select label="Cor da pele" value={v.corPele} onChange={(e) => set("corPele", e.target.value)} options={[{ value: "", label: "Não informada" }, ...SKIN_COLORS.map((s) => ({ value: s, label: s }))]} />
              <Input label="Religião" value={v.religiao} onChange={(e) => set("religiao", e.target.value)} />
              <Input label="CNS (cartão do SUS)" inputMode="numeric" value={v.cns} onChange={(e) => set("cns", e.target.value)} hint="15 dígitos" />
              <Select label="Como conheceu a clínica (origem)" value={v.origemId} onChange={(e) => set("origemId", e.target.value)}
                options={[{ value: "", label: "Não informada" }, ...(origins.data ?? []).map((o) => ({ value: o.id, label: o.nome }))]} />
              <Input label="Indicação" value={v.indicacao} onChange={(e) => set("indicacao", e.target.value)} hint="Quem indicou, se foi indicação" />
            </div>
          </FormSection>

          <FormSection title="Observações e aviso" description="O aviso aparece em destaque sempre que o cadastro for aberto.">
            <Textarea label="Observações" value={v.observacoes} onChange={(e) => set("observacoes", e.target.value)} rows={3} />
            <Switch checked={v.avisoAtivo} onChange={(checked) => set("avisoAtivo", checked)} label="Aviso ativo" description="Mostra uma mensagem em destaque para a recepção." />
            {v.avisoAtivo && <Textarea label="Texto do aviso" required value={v.avisoTexto} onChange={(e) => set("avisoTexto", e.target.value)} rows={2} />}
          </FormSection>

          <FormSection title="Parentes e responsáveis" description="Pessoas relacionadas. Marque quem é o responsável financeiro.">
            {v.parentes.length === 0 && <p className="text-sm text-text-muted">Nenhum parente cadastrado.</p>}
            {v.parentes.map((r, index) => (
              <div key={index} className="grid grid-cols-1 gap-3 rounded-lg bg-surface px-3 py-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                <Input label="Nome" value={r.nome} onChange={(e) => setV((prev) => ({ ...prev, parentes: prev.parentes.map((x, i) => (i === index ? { ...x, nome: e.target.value } : x)) }))} />
                <Input label="Parentesco" value={r.parentesco} onChange={(e) => setV((prev) => ({ ...prev, parentes: prev.parentes.map((x, i) => (i === index ? { ...x, parentesco: e.target.value } : x)) }))} />
                <Input label="CPF" inputMode="numeric" value={formatCpf(r.cpf)} onChange={(e) => setV((prev) => ({ ...prev, parentes: prev.parentes.map((x, i) => (i === index ? { ...x, cpf: onlyDigits(e.target.value).slice(0, 11) } : x)) }))} />
                <div className="flex items-center gap-3">
                  <Checkbox label="Resp. financeiro" checked={r.responsavelFinanceiro}
                    onChange={(e) => setV((prev) => ({ ...prev, parentes: prev.parentes.map((x, i) => (i === index ? { ...x, responsavelFinanceiro: e.target.checked } : x)) }))} />
                  <Button type="button" variant="ghost" size="sm" iconOnly icon={CloseCircle} aria-label="Remover parente" onClick={() => setV((prev) => ({ ...prev, parentes: prev.parentes.filter((_, i) => i !== index) }))} />
                </div>
              </div>
            ))}
            <div>
              <Button type="button" variant="secondary" size="sm" icon={Add} onClick={() => setV((prev) => ({ ...prev, parentes: [...prev.parentes, { nome: "", parentesco: "", cpf: "", responsavelFinanceiro: false }] }))}>
                Adicionar parente
              </Button>
            </div>
          </FormSection>

          {tried && found.length > 0 && (
            <ul role="alert" className="mt-4 list-disc rounded-lg bg-danger-bg px-6 py-3 text-sm text-danger">
              {found.map((p) => <li key={p}>{p}</li>)}
            </ul>
          )}
          {error && <p role="alert" className="mt-4 rounded-lg bg-danger-bg px-4 py-3 text-sm text-danger">{error}</p>}
        </CardBody>
      </Card>

      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" variant="primary" loading={submitting}>{submitLabel}</Button>
      </div>
    </form>
  );
}
