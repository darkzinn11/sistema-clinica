import { useState } from "react";
import {
  ArrowSwapHorizontal,
  Calendar,
  Call,
  Danger,
  Health,
  Link21,
  More,
  Printer,
  ReceiptAdd,
  UserRemove,
} from "iconsax-reactjs";
import { WhatsappIcon } from "@/components/ui/whatsapp-icon";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Drawer, DropdownMenu, Modal } from "@/components/ui/overlay";
import { Input } from "@/components/ui/input";
import type { Patient } from "@/lib/mock/core";
import { insuranceName, patients, TODAY } from "@/lib/mock/core";
import { age, dateBR } from "@/lib/format";
import { normalizeName, onlyDigits } from "@/lib/mock/pacientes";

export function PerfilHeader({ patient, onAction }: { patient: Patient; onAction: (message: string) => void }) {
  const [inactive, setInactive] = useState(false);
  const [confirmInactivate, setConfirmInactivate] = useState(false);
  const [showMerge, setShowMerge] = useState(false);
  const [showCobranca, setShowCobranca] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");

  const duplicates = patients.filter(
    (other) => other.id !== patient.id && (onlyDigits(other.cpf) === onlyDigits(patient.cpf) || normalizeName(other.name) === normalizeName(patient.name)),
  );

  function confirmCobranca() {
    onAction(`Cobrança${descricao ? ` "${descricao}"` : ""}${valor ? ` de R$ ${valor}` : ""} criada.`);
    setShowCobranca(false);
    setDescricao("");
    setValor("");
  }

  return (
    <>
      {patient.alerts.length > 0 && (
        <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-danger/30 bg-danger-bg px-4 py-2.5 text-danger">
          <Danger size={18} variant="Bold" aria-hidden className="shrink-0" />
          <p className="text-sm font-medium">Alertas clínicos: {patient.alerts.join(" · ")}</p>
        </div>
      )}

      <div className="mb-6 flex flex-col gap-5 rounded-xl bg-surface-raised p-5 shadow-card lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Avatar name={patient.name} size="xl" />
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-semibold text-text">{patient.name}</h1>
              {inactive && <Badge tone="neutral">Inativo</Badge>}
            </div>
            <p className="text-sm text-text-muted">
              {age(patient.birthDate, TODAY)} anos · {patient.sex === "F" ? "Feminino" : "Masculino"} · CPF {patient.cpf}
            </p>
            <p className="text-sm text-text-muted">
              {insuranceName(patient.insuranceId)}
              {patient.insuranceCard && ` · Carteirinha ${patient.insuranceCard}`}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="tabular text-sm text-text">{patient.phone}</span>
              <Button size="xs" variant="subtle" icon={Call} onClick={() => onAction("Discando para o paciente…")}>
                Ligar
              </Button>
              <Button size="xs" variant="subtle" icon={WhatsappIcon} onClick={() => onAction("Abrindo conversa no WhatsApp…")}>
                WhatsApp
              </Button>
            </div>
            {patient.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {patient.tags.map((t) => (
                  <Badge key={t} tone="accent">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-text-subtle">Paciente desde {dateBR(patient.createdAt)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ButtonLink to="/agenda?novo=1" variant="secondary" size="sm" icon={Calendar}>
            Agendar
          </ButtonLink>
          <ButtonLink to="/atendimento" variant="primary" size="sm" icon={Health}>
            Iniciar atendimento
          </ButtonLink>
          <Button variant="secondary" size="sm" icon={ReceiptAdd} onClick={() => setShowCobranca(true)}>
            Nova cobrança
          </Button>
          <DropdownMenu
            label="Mais ações do paciente"
            trigger={(p) => <Button {...p} variant="ghost" size="sm" iconOnly icon={More} aria-label="Mais ações" />}
            items={[
              { label: "Imprimir ficha", icon: Printer, onSelect: () => onAction("Impressão da ficha iniciada.") },
              { label: "Enviar link da área do paciente", icon: Link21, onSelect: () => onAction("Link da área do paciente enviado.") },
              { label: "Mesclar duplicados", icon: ArrowSwapHorizontal, divider: true, onSelect: () => setShowMerge(true) },
              { label: inactive ? "Reativar paciente" : "Inativar paciente", icon: UserRemove, danger: true, onSelect: () => (inactive ? setInactive(false) : setConfirmInactivate(true)) },
            ]}
          />
        </div>
      </div>

      <Modal
        open={confirmInactivate}
        onClose={() => setConfirmInactivate(false)}
        title="Inativar paciente"
        description={`${patient.name} deixará de aparecer nas listas ativas. Você pode reverter isso depois.`}
        icon={UserRemove}
        tone="danger"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmInactivate(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setInactive(true);
                setConfirmInactivate(false);
                onAction("Paciente marcado como inativo.");
              }}
            >
              Inativar
            </Button>
          </>
        }
      />

      <Modal
        open={showMerge}
        onClose={() => setShowMerge(false)}
        title="Mesclar duplicados"
        description={`Cadastros parecidos com ${patient.name}.`}
        icon={ArrowSwapHorizontal}
        footer={
          <Button variant="secondary" onClick={() => setShowMerge(false)}>
            Fechar
          </Button>
        }
      >
        {duplicates.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {duplicates.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2.5">
                  <Avatar name={d.name} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-text">{d.name}</p>
                    <p className="text-xs text-text-muted">{d.cpf}</p>
                  </div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => onAction(`Cadastros mesclados com ${d.name}.`)}>
                  Mesclar
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-muted">Nenhum cadastro duplicado encontrado.</p>
        )}
      </Modal>

      <Drawer
        open={showCobranca}
        onClose={() => setShowCobranca(false)}
        title="Nova cobrança"
        description={`Criar uma cobrança avulsa para ${patient.name}.`}
        width="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCobranca(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={confirmCobranca}>
              Criar cobrança
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input label="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Taxa de procedimento" />
          <Input label="Valor" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" suffix="BRL" />
        </div>
      </Drawer>
    </>
  );
}
