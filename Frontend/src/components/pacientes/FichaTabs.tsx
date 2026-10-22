import { useState } from "react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DescriptionList, Skeleton } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { statusFromBackend } from "@/lib/api/status-map";
import { usePatientAppointments, usePatientHistory, useOrigins, usePriorities, type Patient } from "@/lib/api/pacientes";
import { brl, dateBR } from "@/lib/format";
import { clock } from "@/lib/agenda/time";
import { ageFrom, formatCep, formatCpf, formatPhone } from "@/lib/pacientes/options";

const dash = (value: string | number | null | undefined) => (value === null || value === undefined || value === "" ? undefined : String(value));

const FIELD_LABEL: Record<string, string> = {
  nome: "Nome", nomeSocial: "Nome social", cpf: "CPF", semCpf: "Sem CPF", estrangeiro: "Estrangeiro", nascimento: "Nascimento", sexo: "Sexo",
  corIdentificacao: "Cor de identificação", alturaCm: "Altura", pesoKg: "Peso", numeroProntuario: "Nº do prontuário", prioridadeId: "Prioridade",
  celular: "Celular", celular2: "Celular 2", telefone: "Telefone", telefone2: "Telefone 2", email: "E-mail", email2: "E-mail 2", cep: "CEP",
  logradouro: "Logradouro", numeroEndereco: "Número", complemento: "Complemento", bairro: "Bairro", cidade: "Cidade", estado: "Estado", pais: "País",
  profissao: "Profissão", escolaridade: "Escolaridade", naturalidade: "Naturalidade", estadoCivil: "Estado civil", nacionalidade: "Nacionalidade", rg: "RG",
  origemId: "Origem", indicacao: "Indicação", religiao: "Religião", cns: "CNS", corPele: "Cor da pele", observacoes: "Observações", avisoAtivo: "Aviso",
  avisoTexto: "Texto do aviso", parentes: "Parentes", ativo: "Situação (ativo/inativo)",
};

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} />
      <CardBody>{children}</CardBody>
    </Card>
  );
}

/** Visão rápida: contato, identificação, próxima e última consulta, observações e responsáveis. */
export function Resumo({ patient, canSeeAppointments }: { patient: Patient; canSeeAppointments: boolean }) {
  const appointments = usePatientAppointments(canSeeAppointments ? patient.id : undefined);
  const [now] = useState(() => new Date().toISOString());
  const all = appointments.data ?? [];
  const next = [...all].reverse().find((a) => a.inicio >= now && !["cancelado", "remarcado", "nao_compareceu"].includes(a.status));
  const last = all.find((a) => a.status === "atendido");
  const years = ageFrom(patient.nascimento);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Block title="Consultas">
        {!canSeeAppointments ? (
          <p className="text-sm text-text-muted">Sem permissão para ver os agendamentos.</p>
        ) : appointments.isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <DescriptionList columns={1} items={[
            { label: "Próxima consulta", value: next ? `${dateBR(next.data)} às ${clock(next.inicio)} · ${next.profissionalNome} · ${next.procedimentoNome}` : "Nenhuma marcada" },
            { label: "Última consulta", value: last ? `${dateBR(last.data)} · ${last.profissionalNome} · ${last.procedimentoNome}` : "Nenhuma atendida" },
            { label: "Total de agendamentos", value: String(all.length) },
          ]} />
        )}
      </Block>
      <Block title="Identificação">
        <DescriptionList columns={2} items={[
          { label: "Idade", value: years !== null ? `${years} anos` : undefined },
          { label: "Sexo", value: dash(patient.sexo) },
          { label: "Altura / peso", value: patient.alturaCm || patient.pesoKg ? `${patient.alturaCm ?? "—"} cm · ${patient.pesoKg ?? "—"} kg` : undefined },
          { label: "IMC", value: patient.imc !== null ? patient.imc.toLocaleString("pt-BR") : undefined },
          { label: "Estado civil", value: dash(patient.estadoCivil) },
          { label: "Profissão", value: dash(patient.profissao) },
        ]} />
      </Block>
      <Block title="Contato">
        <DescriptionList columns={2} items={[
          { label: "Celular", value: formatPhone(patient.celular) || undefined },
          { label: "Telefone", value: formatPhone(patient.telefone) || undefined },
          { label: "E-mail", value: dash(patient.email) },
          { label: "Cidade", value: [patient.cidade, patient.estado].filter(Boolean).join(" / ") || undefined },
        ]} />
      </Block>
      <Block title="Observações e responsáveis">
        {patient.observacoes && <p className="mb-3 text-sm leading-relaxed text-text">{patient.observacoes}</p>}
        {patient.parentes.length === 0 && !patient.observacoes && <p className="text-sm text-text-muted">Nada registrado.</p>}
        {patient.parentes.map((r) => (
          <p key={r.id ?? r.nome} className="flex flex-wrap items-center gap-2 text-sm text-text">
            {r.nome}{r.parentesco ? ` (${r.parentesco})` : ""}
            {r.responsavelFinanceiro && <Badge tone="accent" size="sm">Responsável financeiro</Badge>}
          </p>
        ))}
      </Block>
    </div>
  );
}

/** Todos os campos do cadastro, só leitura (para editar, o botão Editar do topo). */
export function Dados({ patient }: { patient: Patient }) {
  const priorities = usePriorities();
  const origins = useOrigins();
  const priority = priorities.data?.find((p) => p.id === patient.prioridadeId)?.nome;
  const origin = origins.data?.find((o) => o.id === patient.origemId)?.nome;
  const address = [patient.logradouro, patient.numeroEndereco, patient.complemento, patient.bairro].filter(Boolean).join(", ");
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Block title="Identificação">
        <DescriptionList columns={2} items={[
          { label: "Nome", value: patient.nome }, { label: "Nome social", value: dash(patient.nomeSocial) },
          { label: "CPF", value: patient.cpf ? formatCpf(patient.cpf) : patient.estrangeiro ? "Estrangeiro" : "Sem CPF" }, { label: "RG", value: dash(patient.rg) },
          { label: "Nascimento", value: patient.nascimento ? dateBR(patient.nascimento) : undefined }, { label: "Sexo", value: dash(patient.sexo) },
          { label: "Prioridade", value: priority }, { label: "Nº do prontuário", value: dash(patient.numeroProntuario) },
          { label: "CNS", value: dash(patient.cns) }, { label: "Cor da pele", value: dash(patient.corPele) },
        ]} />
      </Block>
      <Block title="Contato">
        <DescriptionList columns={2} items={[
          { label: "Celular", value: formatPhone(patient.celular) || undefined }, { label: "Celular 2", value: formatPhone(patient.celular2) || undefined },
          { label: "Telefone", value: formatPhone(patient.telefone) || undefined }, { label: "Telefone 2", value: formatPhone(patient.telefone2) || undefined },
          { label: "E-mail", value: dash(patient.email) }, { label: "E-mail 2", value: dash(patient.email2) },
        ]} />
      </Block>
      <Block title="Endereço">
        <DescriptionList columns={2} items={[
          { label: "CEP", value: patient.cep ? formatCep(patient.cep) : undefined }, { label: "Endereço", value: address || undefined },
          { label: "Cidade", value: dash(patient.cidade) }, { label: "Estado", value: dash(patient.estado) }, { label: "País", value: dash(patient.pais) },
        ]} />
      </Block>
      <Block title="Dados complementares">
        <DescriptionList columns={2} items={[
          { label: "Profissão", value: dash(patient.profissao) }, { label: "Escolaridade", value: dash(patient.escolaridade) },
          { label: "Naturalidade", value: dash(patient.naturalidade) }, { label: "Nacionalidade", value: dash(patient.nacionalidade) },
          { label: "Estado civil", value: dash(patient.estadoCivil) }, { label: "Religião", value: dash(patient.religiao) },
          { label: "Origem", value: origin }, { label: "Indicação", value: dash(patient.indicacao) },
        ]} />
      </Block>
      {patient.observacoes && <Block title="Observações"><p className="text-sm leading-relaxed text-text">{patient.observacoes}</p></Block>}
      {patient.parentes.length > 0 && (
        <Block title="Parentes e responsáveis">
          <div className="flex flex-col gap-2">
            {patient.parentes.map((r) => (
              <p key={r.id ?? r.nome} className="flex flex-wrap items-center gap-2 text-sm text-text">
                <strong>{r.nome}</strong>{r.parentesco ? ` · ${r.parentesco}` : ""}{r.cpf ? ` · CPF ${formatCpf(r.cpf)}` : ""}
                {r.responsavelFinanceiro && <Badge tone="accent" size="sm">Responsável financeiro</Badge>}
              </p>
            ))}
          </div>
        </Block>
      )}
    </div>
  );
}

/** Todos os agendamentos do paciente, de todas as unidades. */
export function Agendamentos({ patientId }: { patientId: string }) {
  const appointments = usePatientAppointments(patientId);
  if (appointments.isPending) return <Skeleton className="h-48 w-full" />;
  if (appointments.isError) return <Card><EmptyState title="Não foi possível carregar os agendamentos." description={appointments.error.message} /></Card>;
  if (appointments.data.length === 0) return <Card><EmptyState title="Nenhum agendamento" description="Este paciente ainda não tem consultas marcadas." /></Card>;
  const showValues = appointments.data.some((a) => a.valorCentavos !== null);
  return (
    <Card>
      <Table>
        <THead>
          <TR>
            <TH>Data</TH>
            <TH>Horário</TH>
            <TH>Unidade</TH>
            <TH>Profissional</TH>
            <TH>Procedimento</TH>
            <TH>Situação</TH>
            {showValues && <TH align="right">Valor</TH>}
          </TR>
        </THead>
        <TBody>
          {appointments.data.map((a) => (
            <TR key={a.id}>
              <TD className="tabular"><Link to={`/agenda?data=${a.data}`} className="hover:underline">{dateBR(a.data)}</Link></TD>
              <TD className="tabular">{clock(a.inicio)} – {clock(a.fim)}</TD>
              <TD className="text-text-muted">{a.unidadeNome}</TD>
              <TD>{a.profissionalNome}</TD>
              <TD className="text-text-muted">{a.procedimentoNome}</TD>
              <TD><StatusBadge status={statusFromBackend(a.status)} size="sm" /></TD>
              {showValues && <TD align="right" numeric>{a.valorCentavos === null ? "—" : brl(a.valorCentavos)}</TD>}
            </TR>
          ))}
        </TBody>
      </Table>
    </Card>
  );
}

/** Quem alterou o cadastro e quais campos (nunca os valores: o histórico guarda só os nomes dos campos). */
export function Alteracoes({ patientId }: { patientId: string }) {
  const history = usePatientHistory(patientId);
  if (history.isPending) return <Skeleton className="h-48 w-full" />;
  if (history.isError) return <Card><EmptyState title="Não foi possível carregar o histórico." description={history.error.message} /></Card>;
  if (history.data.length === 0) return <Card><EmptyState title="Nenhuma alteração registrada" description="O cadastro ainda não foi alterado depois de criado." /></Card>;
  return (
    <Card>
      <CardBody className="flex flex-col divide-y divide-border">
        {history.data.map((entry) => (
          <div key={entry.id} className="flex flex-wrap items-start justify-between gap-2 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <p className="text-sm font-medium text-text">{entry.usuarioNome ?? "Usuário removido"}</p>
              <p className="mt-1 flex flex-wrap gap-1.5">{entry.campos.map((c) => <Badge key={c} tone="neutral" size="sm">{FIELD_LABEL[c] ?? c}</Badge>)}</p>
            </div>
            <span className="tabular text-xs text-text-muted">{dateBR(entry.criadoEm.slice(0, 10))} às {new Date(entry.criadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
