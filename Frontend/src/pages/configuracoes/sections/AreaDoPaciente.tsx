import { IconCircle } from "@/components/ui/icon-circle";
import { Calendar, DollarCircle, DocumentText1, Edit2, ReceiptText, VideoPlay } from "iconsax-reactjs";
import type { Icon as IconType } from "iconsax-reactjs";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/overlay";
import { Badge } from "@/components/ui/badge";
import { SaveBar } from "@/components/configuracoes/SaveBar";
import { useSettingsState } from "@/components/configuracoes/useSettingsState";
import { BrandLogo } from "@/components/shell/brand-logo";
import { clinic } from "@/lib/mock/core";

const FEATURES: { key: keyof State["features"]; label: string; description: string; icon: IconType }[] = [
  { key: "verAgendamentos", label: "Ver agendamentos", description: "Histórico e próximas consultas do paciente.", icon: Calendar },
  { key: "remarcar", label: "Remarcar consulta", description: "Paciente pode remarcar sem ligar para a recepção.", icon: Edit2 },
  { key: "exames", label: "Resultados de exames", description: "Laudos liberados ficam disponíveis para download.", icon: DocumentText1 },
  { key: "receitas", label: "Receitas", description: "Receitas assinadas digitalmente, prontas para a farmácia.", icon: ReceiptText },
  { key: "pagamentos", label: "Pagamentos online", description: "Paga consultas e exames particulares pelo portal.", icon: DollarCircle },
  { key: "teleconsulta", label: "Teleconsulta", description: "Entra na videochamada direto pelo portal do paciente.", icon: VideoPlay },
];

interface State {
  features: {
    verAgendamentos: boolean;
    remarcar: boolean;
    exames: boolean;
    receitas: boolean;
    pagamentos: boolean;
    teleconsulta: boolean;
  };
}

export default function AreaDoPaciente() {
  const s = useSettingsState<State>({
    features: { verAgendamentos: true, remarcar: true, exames: true, receitas: false, pagamentos: false, teleconsulta: false },
  });
  const v = s.value;
  const activeCount = Object.values(v.features).filter(Boolean).length;

  return (
    <div>
      <Card>
        <CardHeader title="Área do paciente" description="Recursos liberados no portal e app que seus pacientes usam." actions={<Badge tone="accent">{activeCount} de 6 ativos</Badge>} />
        <CardBody className="flex flex-col divide-y divide-border">
          {FEATURES.map((f) => (
            <div key={f.key} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <IconCircle tone="accent" size="md">
                <f.icon size={18} aria-hidden />
              </IconCircle>
              <div className="min-w-0 flex-1">
                <Switch
                  label={f.label}
                  description={f.description}
                  checked={v.features[f.key]}
                  onChange={(c) => s.set({ features: { ...v.features, [f.key]: c } })}
                />
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Pré-visualização da marca" description="Como o cabeçalho do portal do paciente aparece." />
        <CardBody className="bg-surface">
          <div className="mx-auto flex max-w-sm items-center gap-3 rounded-xl bg-surface-raised px-4 py-3 shadow-card">
            <BrandLogo className="h-7 w-auto shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-text">{clinic.name}</p>
              <p className="truncate text-xs text-text-muted">Portal do paciente</p>
            </div>
            <Avatar name="Marina Albuquerque" size="sm" />
          </div>
        </CardBody>
      </Card>

      <SaveBar dirty={s.dirty} onDiscard={s.discard} onSave={s.save} />
    </div>
  );
}
