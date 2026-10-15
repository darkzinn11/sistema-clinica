import { Add, Trash } from "iconsax-reactjs";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SaveBar } from "@/components/configuracoes/SaveBar";
import { useSettingsState } from "@/components/configuracoes/useSettingsState";
import { defaultAgeRanges, type AgeRange } from "@/lib/mock/configuracoes";

let nextId = 100;

export default function FaixasEtarias() {
  const s = useSettingsState<AgeRange[]>(defaultAgeRanges);
  const v = s.value;

  function update(id: string, patch: Partial<AgeRange>) {
    s.set(v.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  return (
    <div>
      <Card>
        <CardHeader
          title="Faixas etárias"
          description="Usadas para relatórios e para a triagem sugerir protocolos por idade."
          actions={
            <Button
              size="sm"
              variant="secondary"
              icon={Add}
              onClick={() => s.set([...v, { id: `age-${nextId++}`, name: "Nova faixa", from: 0, to: 18 }])}
            >
              Nova faixa
            </Button>
          }
        />
        <CardBody>
          {v.length === 0 ? (
            <EmptyState title="Nenhuma faixa etária" description="Crie ao menos uma faixa para organizar relatórios por idade." />
          ) : (
            <div className="flex flex-col gap-3">
              {v.map((r) => (
                <div key={r.id} className="flex flex-wrap items-end gap-3 rounded-lg p-3">
                  <Input label="Nome" value={r.name} onChange={(e) => update(r.id, { name: e.target.value })} wrapperClassName="min-w-40 flex-1" />
                  <Input label="De" type="number" suffix="anos" value={r.from} onChange={(e) => update(r.id, { from: Number(e.target.value) })} wrapperClassName="w-32" />
                  <Input label="Até" type="number" suffix="anos" value={r.to} onChange={(e) => update(r.id, { to: Number(e.target.value) })} wrapperClassName="w-32" />
                  <Button variant="ghost" size="md" iconOnly aria-label={`Remover ${r.name}`} icon={Trash} onClick={() => s.set(v.filter((x) => x.id !== r.id))} className="text-danger hover:bg-danger-bg" />
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
      <SaveBar dirty={s.dirty} onDiscard={s.discard} onSave={s.save} />
    </div>
  );
}
