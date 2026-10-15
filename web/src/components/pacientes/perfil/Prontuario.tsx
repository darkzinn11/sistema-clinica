import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ClipboardText, ClipboardTick, DocumentText1, NoteText, Printer, ReceiptText, SearchNormal1 } from "iconsax-reactjs";
import type { Icon as IconType } from "iconsax-reactjs";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Timeline, type TimelineEntry } from "@/components/ui/misc";
import { EmptyState } from "@/components/ui/empty-state";
import type { Patient } from "@/lib/mock/core";
import { TODAY, professionalById, professionals } from "@/lib/mock/core";
import { dateBR } from "@/lib/format";
import { clinicalHistoryForPatient, normalizeName, type ClinicalEntryType } from "@/lib/mock/pacientes";

const TYPE_META: Record<ClinicalEntryType, { label: string; icon: IconType; tone: "accent" | "info" | "warning" | "success" | "neutral" }> = {
  evolucao: { label: "Evolução", icon: NoteText, tone: "accent" },
  anamnese: { label: "Anamnese", icon: ClipboardText, tone: "info" },
  exame: { label: "Exame", icon: ClipboardTick, tone: "warning" },
  prescricao: { label: "Prescrição", icon: ReceiptText, tone: "success" },
  atestado: { label: "Atestado", icon: DocumentText1, tone: "neutral" },
};

function daysAgo(iso: string): number {
  return Math.round((new Date(`${TODAY}T12:00:00`).getTime() - new Date(`${iso}T12:00:00`).getTime()) / 86_400_000);
}

export function Prontuario({ patient }: { patient: Patient }) {
  const navigate = useNavigate();
  const [tipo, setTipo] = useState<"all" | ClinicalEntryType>("all");
  const [profissionalId, setProfissionalId] = useState("all");
  const [periodo, setPeriodo] = useState<"all" | "30" | "90">("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const entries = useMemo(() => clinicalHistoryForPatient(patient.id), [patient.id]);

  const filtered = entries.filter((e) => {
    if (tipo !== "all" && e.type !== tipo) return false;
    if (profissionalId !== "all" && e.professionalId !== profissionalId) return false;
    if (periodo !== "all" && daysAgo(e.date) > Number(periodo)) return false;
    if (search && !normalizeName(e.title + " " + e.body).includes(normalizeName(search))) return false;
    return true;
  });

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const timelineEntries: TimelineEntry[] = filtered.map((e) => {
    const meta = TYPE_META[e.type];
    const isOpen = expanded.has(e.id);
    return {
      id: e.id,
      icon: meta.icon,
      tone: meta.tone,
      title: (
        <span className="flex items-center gap-2">
          {e.title}
          <span className="text-sm font-normal text-text-muted">· {meta.label}</span>
        </span>
      ),
      meta: (
        <span>
          {dateBR(e.date)} {e.time} · {professionalById(e.professionalId)?.name}
        </span>
      ),
      body: (
        <div className="flex flex-col gap-2">
          <p>{isOpen ? e.body : e.summary}</p>
          <button type="button" onClick={() => toggle(e.id)} className="self-start text-sm font-medium text-accent hover:underline">
            {isOpen ? "Ver menos" : "Ver mais"}
          </button>
        </div>
      ),
    };
  });

  return (
    <Card>
      <CardHeader
        title="Prontuário"
        description="Linha do tempo de evoluções, anamneses, exames, prescrições e atestados."
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" icon={Printer} onClick={() => window.print()}>
              Imprimir
            </Button>
            <Button size="sm" variant="primary" onClick={() => navigate("/atendimento")}>
              Nova evolução
            </Button>
          </div>
        }
      />
      <CardBody className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <Input icon={SearchNormal1} placeholder="Buscar no prontuário…" aria-label="Buscar no prontuário" value={search} onChange={(e) => setSearch(e.target.value)} wrapperClassName="min-w-48 flex-1" />
          <Select
            aria-label="Tipo de registro"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as "all" | ClinicalEntryType)}
            wrapperClassName="w-44"
            options={[{ value: "all", label: "Todos os tipos" }, ...Object.entries(TYPE_META).map(([value, m]) => ({ value, label: m.label }))]}
          />
          <Select
            aria-label="Profissional"
            value={profissionalId}
            onChange={(e) => setProfissionalId(e.target.value)}
            wrapperClassName="w-52"
            options={[{ value: "all", label: "Todos os profissionais" }, ...professionals.map((p) => ({ value: p.id, label: p.name }))]}
          />
          <Select
            aria-label="Período"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value as "all" | "30" | "90")}
            wrapperClassName="w-40"
            options={[{ value: "all", label: "Qualquer período" }, { value: "30", label: "Últimos 30 dias" }, { value: "90", label: "Últimos 90 dias" }]}
          />
        </div>

        {timelineEntries.length > 0 ? <Timeline entries={timelineEntries} /> : <EmptyState icon={ClipboardText} title="Nenhum registro encontrado" description="Ajuste os filtros para ver mais resultados." />}
      </CardBody>
    </Card>
  );
}
