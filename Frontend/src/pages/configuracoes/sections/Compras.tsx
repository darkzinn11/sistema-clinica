import { Add, Trash } from "iconsax-reactjs";
import { Card, CardBody } from "@/components/ui/card";
import { FormSection } from "@/components/ui/misc";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { brl } from "@/lib/format";
import { SaveBar } from "@/components/configuracoes/SaveBar";
import { useSettingsState } from "@/components/configuracoes/useSettingsState";
import { preferredSuppliers, purchaseApprovalTiers } from "@/lib/mock/configuracoes";

interface State {
  tiers: typeof purchaseApprovalTiers;
  suppliers: string[];
  autoMinStock: boolean;
  autoReorderDays: string;
}

export default function Compras() {
  const s = useSettingsState<State>({ tiers: purchaseApprovalTiers, suppliers: preferredSuppliers, autoMinStock: true, autoReorderDays: "15" });
  const v = s.value;

  return (
    <div>
      <Card>
        <CardBody>
          <FormSection title="Fluxo de aprovação por valor" description="Compras acima do limite exigem aprovação de um nível superior.">
            <div className="flex flex-col gap-2">
              {v.tiers.map((t, i) => {
                const floor = i > 0 ? v.tiers[i - 1].upToCents : 0;
                const range = t.upToCents ? `${floor ? `${brl(floor)} a ` : "até "}${brl(t.upToCents)}` : `acima de ${brl(floor ?? 0)}`;
                return (
                  <div key={t.id} className="flex flex-wrap items-center gap-3 rounded-lg px-3 py-2.5">
                    <Badge tone="neutral" size="md" className="tabular shrink-0">{range}</Badge>
                    <span className="flex-1" />
                    <Input
                      aria-label={`Aprovador para ${range}`}
                      value={t.approver}
                      onChange={(e) => s.set({ ...v, tiers: v.tiers.map((x, xi) => (xi === i ? { ...x, approver: e.target.value } : x)) })}
                      wrapperClassName="w-60"
                    />
                  </div>
                );
              })}
            </div>
          </FormSection>

          <FormSection title="Fornecedores preferenciais" description="Sugeridos primeiro ao abrir uma nova requisição de compra.">
            <div className="flex flex-wrap gap-2">
              {v.suppliers.map((sup) => (
                <Badge key={sup} tone="accent" size="md" className="gap-2 pr-1.5">
                  {sup}
                  <button type="button" aria-label={`Remover ${sup}`} onClick={() => s.set({ ...v, suppliers: v.suppliers.filter((x) => x !== sup) })} className="rounded-full p-0.5 hover:bg-accent/20">
                    <Trash size={12} aria-hidden />
                  </button>
                </Badge>
              ))}
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={Add}
              className="self-start"
              onClick={() => s.set({ ...v, suppliers: [...v.suppliers, `Novo fornecedor ${v.suppliers.length + 1}`] })}
            >
              Adicionar fornecedor
            </Button>
          </FormSection>

          <FormSection title="Estoque mínimo automático" description="Gera requisição de compra sozinha quando um item bate no mínimo.">
            <Switch label="Gerar requisição automaticamente" checked={v.autoMinStock} onChange={(c) => s.set({ ...v, autoMinStock: c })} />
            <Input label="Prazo estimado de reposição" type="number" suffix="dias" value={v.autoReorderDays} onChange={(e) => s.set({ ...v, autoReorderDays: e.target.value })} wrapperClassName="max-w-xs" />
          </FormSection>
        </CardBody>
      </Card>
      <SaveBar dirty={s.dirty} onDiscard={s.discard} onSave={s.save} />
    </div>
  );
}
