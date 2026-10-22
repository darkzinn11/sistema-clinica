import { Calendar, Danger, Edit2, UserRemove, UserTick } from "iconsax-reactjs";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { WhatsappIcon } from "@/components/ui/whatsapp-icon";
import { dateBR } from "@/lib/format";
import type { Patient } from "@/lib/api/pacientes";
import { ageFrom, formatCpf, formatPhone, onlyDigits } from "@/lib/pacientes/options";

const REASON_LABEL: Record<string, string> = { sem_vinculo: "sem vínculo com a clínica", obito: "óbito", sem_motivo: "sem motivo informado" };

export function PerfilHeader({
  patient, priority, canEdit, canInactivate, reactivating, onDeactivate, onReactivate,
}: {
  patient: Patient;
  priority?: string;
  canEdit: boolean;
  canInactivate: boolean;
  reactivating: boolean;
  onDeactivate: () => void;
  onReactivate: () => void;
}) {
  const years = ageFrom(patient.nascimento);
  const digits = onlyDigits(patient.celular ?? "");
  const whatsapp = digits.length >= 10 ? `https://wa.me/${digits.length <= 11 ? `55${digits}` : digits}` : null;
  const schedule = `/agenda?novo=1&paciente=${patient.id}&nome=${encodeURIComponent(patient.nome)}`;

  return (
    <>
      {patient.avisoAtivo && patient.avisoTexto && (
        <div role="alert" className="mb-4 flex items-center gap-2.5 rounded-lg border border-danger/30 bg-danger-bg px-4 py-2.5 text-danger">
          <Danger size={18} variant="Bold" aria-hidden className="shrink-0" />
          <p className="text-sm font-medium">Aviso: {patient.avisoTexto}</p>
        </div>
      )}
      {!patient.ativo && (
        <div role="note" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface px-4 py-2.5 text-sm text-text-muted">
          <span>
            <strong className="text-text">Cadastro inativo</strong>
            {patient.inativadoMotivo ? ` (${REASON_LABEL[patient.inativadoMotivo] ?? patient.inativadoMotivo})` : ""}
            {patient.inativadoEm ? ` desde ${dateBR(patient.inativadoEm.slice(0, 10))}` : ""}
            {patient.inativadoObservacao ? `. ${patient.inativadoObservacao}` : ""}
          </span>
          {canInactivate && <Button size="sm" variant="primary" icon={UserTick} loading={reactivating} onClick={onReactivate}>Reativar</Button>}
        </div>
      )}

      <div className="mb-6 flex flex-col gap-5 rounded-xl bg-surface-raised p-5 shadow-card lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Avatar name={patient.nome} size="xl" />
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-semibold text-text">{patient.nome}</h1>
              {patient.corIdentificacao && <span aria-label="Cor de identificação" className="h-3.5 w-3.5 rounded-full" style={{ background: patient.corIdentificacao }} />}
              {priority && <Badge tone="info">{priority}</Badge>}
              {!patient.ativo && <Badge tone="neutral">Inativo</Badge>}
            </div>
            {patient.nomeSocial && <p className="text-sm text-text-muted">Nome social: {patient.nomeSocial}</p>}
            <p className="text-sm text-text-muted">
              {[
                patient.numeroProntuario ? `Prontuário ${patient.numeroProntuario}` : null,
                patient.cpf ? `CPF ${formatCpf(patient.cpf)}` : patient.estrangeiro ? "Estrangeiro" : "Sem CPF",
                patient.nascimento ? `${dateBR(patient.nascimento)}${years !== null ? ` (${years} anos)` : ""}` : null,
                patient.sexo,
              ].filter(Boolean).join(" · ")}
            </p>
            <p className="flex items-center gap-2 text-sm text-text-muted">
              {formatPhone(patient.celular) || "Sem celular"}
              {whatsapp && <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-success hover:underline"><WhatsappIcon size={14} aria-hidden /> WhatsApp</a>}
              {patient.email && <span>· {patient.email}</span>}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {patient.ativo && <ButtonLink to={schedule} variant="primary" icon={Calendar}>Agendar</ButtonLink>}
          {patient.ativo && canEdit && <ButtonLink to={`/pacientes/${patient.id}/editar`} variant="secondary" icon={Edit2}>Editar</ButtonLink>}
          {patient.ativo && canInactivate && <Button variant="ghost" icon={UserRemove} onClick={onDeactivate}>Inativar</Button>}
        </div>
      </div>
    </>
  );
}
