import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/overlay";
import { SaveBar } from "@/components/configuracoes/SaveBar";
import { useSettingsState } from "@/components/configuracoes/useSettingsState";
import { defaultRiskLevels, defaultVitalSigns, type RiskLevel } from "@/lib/mock/configuracoes";

interface State {
  levels: RiskLevel[];
  vitals: typeof defaultVitalSigns;
}

export default function Triagem() {
  const s = useSettingsState<State>({ levels: defaultRiskLevels, vitals: defaultVitalSigns });
  const v = s.value;

  function updateLevel(id: string, patch: Partial<RiskLevel>) {
    s.set({ ...v, levels: v.levels.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  }

  return (
    <div>
      <Card>
        <CardHeader title="Classificação de risco" description="Protocolo de triagem usado na sala de espera para priorizar o atendimento." />
        <CardBody className="flex flex-col gap-4">
          {v.levels.map((l) => (
            <div key={l.id} className="flex flex-col gap-3 rounded-lg p-3 sm:flex-row sm:items-start">
              <Badge tone={l.tone} dot size="md" className="shrink-0 sm:mt-6">
                {l.name}
              </Badge>
              <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-[1fr_140px]">
                <Input label="Nome do nível" value={l.name} onChange={(e) => updateLevel(l.id, { name: e.target.value })} />
                <Input label="Espera máxima" type="number" suffix="min" value={l.maxWaitMin} onChange={(e) => updateLevel(l.id, { maxWaitMin: Number(e.target.value) })} />
                <Textarea label="Descrição" value={l.description} onChange={(e) => updateLevel(l.id, { description: e.target.value })} className="sm:col-span-2" rows={2} />
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Sinais vitais obrigatórios" description="Quais sinais a recepção precisa registrar antes de liberar o paciente para a fila." />
        <CardBody className="flex flex-col divide-y divide-border">
          {v.vitals.map((vs, i) => (
            <div key={vs.id} className="py-3 first:pt-0 last:pb-0">
              <Switch
                label={vs.label}
                checked={vs.required}
                onChange={(checked) => s.set({ ...v, vitals: v.vitals.map((x, xi) => (xi === i ? { ...x, required: checked } : x)) })}
              />
            </div>
          ))}
        </CardBody>
      </Card>

      <SaveBar dirty={s.dirty} onDiscard={s.discard} onSave={s.save} />
    </div>
  );
}
