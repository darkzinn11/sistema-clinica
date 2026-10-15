import { Add, CloseCircle, SearchNormal1 } from "iconsax-reactjs";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { FormSection } from "@/components/ui/misc";
import { CID10_LIST, EVOLUCAO_TEMPLATES, ultimaEvolucaoFor } from "@/lib/mock/atendimento";
import type { EvolucaoState } from "@/components/atendimento/types";

export function EvolucaoTab({
  value,
  onChange,
  patientId,
}: {
  value: EvolucaoState;
  onChange: (next: EvolucaoState) => void;
  patientId: string;
}) {
  const [cidSearch, setCidSearch] = useState("");

  function set<K extends keyof EvolucaoState>(key: K, v: EvolucaoState[K]) {
    onChange({ ...value, [key]: v });
  }

  function applyTemplate(id: string) {
    const t = EVOLUCAO_TEMPLATES.find((tpl) => tpl.id === id);
    if (!t) return;
    onChange({ ...value, queixaPrincipal: t.queixaPrincipal, hda: t.hda, exameFisico: t.exameFisico, conduta: t.conduta });
  }

  function useLastEvolucao() {
    const t = ultimaEvolucaoFor(patientId);
    onChange({ ...value, queixaPrincipal: t.queixaPrincipal, hda: t.hda, exameFisico: t.exameFisico, conduta: t.conduta });
  }

  function addCid(code: string) {
    const cid = CID10_LIST.find((c) => c.code === code);
    if (!cid || value.cids.some((c) => c.code === code)) return;
    onChange({ ...value, cids: [...value.cids, cid] });
    setCidSearch("");
  }

  function removeCid(code: string) {
    onChange({ ...value, cids: value.cids.filter((c) => c.code !== code) });
  }

  const matches =
    cidSearch.trim().length > 0
      ? CID10_LIST.filter((c) => c.code.toLowerCase().includes(cidSearch.toLowerCase()) || c.label.toLowerCase().includes(cidSearch.toLowerCase())).slice(0, 6)
      : [];

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-5">
        <Select
          label="Modelo de evolução"
          placeholder="Escolher modelo…"
          options={EVOLUCAO_TEMPLATES.map((t) => ({ value: t.id, label: t.label }))}
          onChange={(e) => e.target.value && applyTemplate(e.target.value)}
          wrapperClassName="w-64"
        />
        <Button variant="secondary" size="sm" onClick={useLastEvolucao}>
          Usar última evolução como base
        </Button>
      </div>

      <FormSection title="Queixa principal" description="O que motivou a consulta, nas palavras do paciente.">
        <Textarea
          aria-label="Queixa principal"
          rows={2}
          value={value.queixaPrincipal}
          onChange={(e) => set("queixaPrincipal", e.target.value)}
          placeholder="Ex.: dor de cabeça há 3 dias"
        />
      </FormSection>

      <FormSection title="HDA" description="História da doença atual.">
        <Textarea aria-label="História da doença atual" rows={3} value={value.hda} onChange={(e) => set("hda", e.target.value)} />
      </FormSection>

      <FormSection title="Exame físico" description="Achados ao exame físico realizado nesta consulta.">
        <Textarea aria-label="Exame físico" rows={3} value={value.exameFisico} onChange={(e) => set("exameFisico", e.target.value)} />
      </FormSection>

      <FormSection title="Hipótese diagnóstica" description="Busque e adicione um ou mais códigos CID-10.">
        <div className="relative">
          <Input
            aria-label="Buscar CID-10"
            icon={SearchNormal1}
            value={cidSearch}
            onChange={(e) => setCidSearch(e.target.value)}
            placeholder="Buscar por código ou descrição…"
          />
          {matches.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-surface-raised shadow-pop">
              {matches.map((c) => (
                <li key={c.code}>
                  <button
                    type="button"
                    onClick={() => addCid(c.code)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface"
                  >
                    <Add size={19} variant="Linear" aria-hidden className="text-text-subtle" />
                    <span className="font-medium text-text">{c.code}</span>
                    <span className="truncate text-text-muted">{c.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {value.cids.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {value.cids.map((c) => (
              <Badge key={c.code} tone="accent" size="md">
                {c.code} · {c.label}
                <button type="button" aria-label={`Remover ${c.code}`} onClick={() => removeCid(c.code)} className="ml-0.5">
                  <CloseCircle size={13} aria-hidden />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </FormSection>

      <FormSection title="Conduta" description="Orientações, prescrição e próximos passos.">
        <Textarea aria-label="Conduta" rows={3} value={value.conduta} onChange={(e) => set("conduta", e.target.value)} />
      </FormSection>
    </div>
  );
}
