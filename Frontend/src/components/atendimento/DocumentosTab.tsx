import { IconCircle } from "@/components/ui/icon-circle";
import { DocumentText, Hospital, Send2, TickCircle } from "iconsax-reactjs";
import type { Icon as IconType } from "iconsax-reactjs";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/overlay";
import type { DocumentoGerado } from "@/components/atendimento/types";
import { atestadoTemplate, declaracaoComparecimentoTemplate, encaminhamentoTemplate, relatorioTemplate } from "@/lib/mock/atendimento";
import type { Patient } from "@/lib/mock/core";

type TemplateId = "atestado" | "comparecimento" | "encaminhamento" | "relatorio";

const TEMPLATE_META: Record<TemplateId, { label: string; icon: IconType; description: string }> = {
  atestado: { label: "Atestado médico", icon: DocumentText, description: "Afastamento por dias determinados." },
  comparecimento: { label: "Declaração de comparecimento", icon: TickCircle, description: "Confirma presença no horário da consulta." },
  encaminhamento: { label: "Encaminhamento", icon: Send2, description: "Para avaliação com outro especialista." },
  relatorio: { label: "Relatório médico", icon: Hospital, description: "Resumo clínico para terceiros." },
};

export function DocumentosTab({
  patient,
  generated,
  onGenerate,
}: {
  patient: Patient;
  generated: DocumentoGerado[];
  onGenerate: (doc: DocumentoGerado) => void;
}) {
  const [open, setOpen] = useState<TemplateId | null>(null);
  const [dias, setDias] = useState("1");
  const [entrada, setEntrada] = useState("09:00");
  const [saida, setSaida] = useState("10:00");
  const [especialidade, setEspecialidade] = useState("");
  const [motivo, setMotivo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [texto, setTexto] = useState("");

  function buildText(id: TemplateId): string {
    if (id === "atestado") return atestadoTemplate(patient, Number(dias) || 1);
    if (id === "comparecimento") return declaracaoComparecimentoTemplate(patient, entrada, saida);
    if (id === "encaminhamento") return encaminhamentoTemplate(patient, especialidade || "especialidade a definir", motivo);
    return relatorioTemplate(patient, conteudo);
  }

  function openTemplate(id: TemplateId) {
    setOpen(id);
    setTexto(buildText(id));
  }

  function regenerate() {
    if (open) setTexto(buildText(open));
  }

  function save() {
    if (!open) return;
    onGenerate({ id: `doc-${Date.now()}-${open}`, templateId: open, label: TEMPLATE_META[open].label, content: texto });
    setOpen(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(Object.keys(TEMPLATE_META) as TemplateId[]).map((id) => {
          const meta = TEMPLATE_META[id];
          const Icon = meta.icon;
          const count = generated.filter((d) => d.templateId === id).length;
          return (
            <button
              key={id}
              type="button"
              onClick={() => openTemplate(id)}
              className="flex flex-col gap-2 rounded-lg bg-surface-raised p-4 text-left shadow-card transition-colors hover:bg-surface"
            >
              <div className="flex items-center justify-between">
                <IconCircle tone="accent" size="md">
                  <Icon size={18} aria-hidden />
                </IconCircle>
                {count > 0 && (
                  <Badge tone="success" dot size="sm">
                    {count} gerado{count > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              <p className="font-medium text-text">{meta.label}</p>
              <p className="text-sm text-text-muted">{meta.description}</p>
            </button>
          );
        })}
      </div>

      <Modal
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open ? TEMPLATE_META[open].label : ""}
        description="Revise os dados, gere o texto e edite antes de concluir."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(null)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={save}>
              Gerar e concluir
            </Button>
          </>
        }
      >
        {open && (
          <div className="flex flex-col gap-4">
            {open === "atestado" && <Input label="Dias de afastamento" type="number" min={1} value={dias} onChange={(e) => setDias(e.target.value)} />}
            {open === "comparecimento" && (
              <div className="grid grid-cols-2 gap-3">
                <Input label="Horário de entrada" type="time" value={entrada} onChange={(e) => setEntrada(e.target.value)} />
                <Input label="Horário de saída" type="time" value={saida} onChange={(e) => setSaida(e.target.value)} />
              </div>
            )}
            {open === "encaminhamento" && (
              <>
                <Input label="Especialidade" value={especialidade} onChange={(e) => setEspecialidade(e.target.value)} placeholder="Ex.: Cardiologia" />
                <Textarea label="Motivo" rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
              </>
            )}
            {open === "relatorio" && <Textarea label="Conteúdo clínico" rows={4} value={conteudo} onChange={(e) => setConteudo(e.target.value)} />}

            <Button variant="secondary" size="sm" onClick={regenerate} className="self-start">
              Gerar texto
            </Button>

            <Textarea label="Texto do documento" rows={10} value={texto} onChange={(e) => setTexto(e.target.value)} />
          </div>
        )}
      </Modal>
    </div>
  );
}
