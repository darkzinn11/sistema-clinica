import { useMemo, useState } from "react";
import { Copy, ExportSquare, TickCircle } from "iconsax-reactjs";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { FormSection } from "@/components/ui/misc";
import { Checkbox, Input, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { SaveBar } from "@/components/configuracoes/SaveBar";
import { useSettingsState } from "@/components/configuracoes/useSettingsState";
import { professionals, clinic } from "@/lib/mock/core";

const PUBLIC_LINK = "https://agendar.vidaplena.com.br/centro";

interface State {
  enabled: boolean;
  minLeadHours: string;
  maxLeadDays: string;
  requireConfirmation: boolean;
  cancellationPolicy: string;
  professionalIds: string[];
}

function BookingPreview() {
  const specialties = useMemo(() => Array.from(new Set(professionals.map((p) => p.specialty))), []);
  const [specialty, setSpecialty] = useState(specialties[0]);
  const profsForSpecialty = professionals.filter((p) => p.specialty === specialty);
  const [profId, setProfId] = useState<string | undefined>(profsForSpecialty[0]?.id);
  const prof = professionals.find((p) => p.id === profId) ?? profsForSpecialty[0];
  const slots = ["09:00", "09:30", "10:00", "11:20", "14:00", "15:30"];
  const [slot, setSlot] = useState(slots[0]);

  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-xl bg-surface-raised shadow-pop">
      <div className="bg-accent px-4 py-3 text-on-accent">
        <p className="text-sm font-semibold">{clinic.name}</p>
        <p className="text-xs opacity-80">Agendamento online</p>
      </div>
      <div className="flex flex-col gap-3 p-4">
        <Select
          label="Especialidade"
          value={specialty}
          onChange={(e) => {
            setSpecialty(e.target.value);
            setProfId(professionals.find((p) => p.specialty === e.target.value)?.id);
          }}
          options={specialties.map((s) => ({ value: s, label: s }))}
        />
        <Select
          label="Profissional"
          value={profId}
          onChange={(e) => setProfId(e.target.value)}
          options={profsForSpecialty.map((p) => ({ value: p.id, label: p.name }))}
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">Horário — {prof?.name.split(" ")[1] ?? ""}</span>
          <div className="grid grid-cols-3 gap-1.5">
            {slots.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSlot(s)}
                className={
                  "tabular rounded-md border px-2 py-1.5 text-sm transition-colors " +
                  (s === slot ? "border-accent bg-accent-muted text-accent" : "border-border-strong text-text-muted hover:text-text")
                }
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <Button variant="primary" className="w-full justify-center">
          Confirmar agendamento
        </Button>
      </div>
    </div>
  );
}

export default function AgendamentoOnline() {
  const s = useSettingsState<State>({
    enabled: true,
    minLeadHours: "2",
    maxLeadDays: "60",
    requireConfirmation: true,
    cancellationPolicy: "24h",
    professionalIds: professionals.filter((p) => p.color % 4 !== 3).map((p) => p.id),
  });
  const v = s.value;
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(PUBLIC_LINK);
    } catch {
      // ambiente sem permissão de área de transferência — ignora
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <Card>
        <CardBody>
          <FormSection title="Agendamento online" description="Pacientes marcam consultas direto pelo link público, sem passar pela recepção.">
            <Switch label="Ativar agendamento online" checked={v.enabled} onChange={(c) => s.set({ ...v, enabled: c })} />
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-surface px-3 py-2.5">
              <span className="min-w-0 flex-1 truncate font-mono text-sm text-text">{PUBLIC_LINK}</span>
              <Button size="sm" variant="secondary" icon={copied ? TickCircle : Copy} onClick={copyLink}>
                {copied ? "Copiado" : "Copiar"}
              </Button>
              <Button size="sm" variant="ghost" iconOnly aria-label="Abrir link público" icon={ExportSquare} onClick={() => window.open(PUBLIC_LINK, "_blank", "noopener")} />
            </div>
          </FormSection>

          <FormSection title="Regras" description="Limites e condições para quem agenda pelo link.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Antecedência mínima" type="number" suffix="horas" value={v.minLeadHours} onChange={(e) => s.set({ ...v, minLeadHours: e.target.value })} />
              <Input label="Antecedência máxima" type="number" suffix="dias" value={v.maxLeadDays} onChange={(e) => s.set({ ...v, maxLeadDays: e.target.value })} />
            </div>
            <Switch label="Exige confirmação da recepção" description="Agendamentos ficam como 'não confirmado' até alguém validar." checked={v.requireConfirmation} onChange={(c) => s.set({ ...v, requireConfirmation: c })} />
            <Select
              label="Política de cancelamento"
              value={v.cancellationPolicy}
              onChange={(e) => s.set({ ...v, cancellationPolicy: e.target.value })}
              options={[
                { value: "livre", label: "Cancelamento livre" },
                { value: "24h", label: "Até 24h antes" },
                { value: "48h", label: "Até 48h antes" },
              ]}
              wrapperClassName="max-w-sm"
            />
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-text">Profissionais disponíveis para agendamento online</span>
              <div className="flex flex-col gap-2 rounded-lg p-3">
                {professionals.map((p) => (
                  <Checkbox
                    key={p.id}
                    checked={v.professionalIds.includes(p.id)}
                    onChange={(e) =>
                      s.set({
                        ...v,
                        professionalIds: e.target.checked ? [...v.professionalIds, p.id] : v.professionalIds.filter((id) => id !== p.id),
                      })
                    }
                    label={
                      <>
                        {p.name} <span className="text-sm text-text-muted">— {p.specialty}</span>
                      </>
                    }
                  />
                ))}
              </div>
            </div>
          </FormSection>
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Pré-visualização" description="Como o paciente vê o widget de agendamento no site." />
        <CardBody className="bg-surface">
          <BookingPreview />
        </CardBody>
      </Card>

      <SaveBar dirty={s.dirty} onDiscard={s.discard} onSave={s.save} />
    </div>
  );
}
