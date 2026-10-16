import { Card, CardBody } from "@/components/ui/card";
import { FormSection } from "@/components/ui/misc";
import { Input, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/overlay";
import { SaveBar } from "@/components/configuracoes/SaveBar";
import { useSettingsState } from "@/components/configuracoes/useSettingsState";
import { clinic } from "@/lib/mock/core";
import { defaultBusinessHours } from "@/lib/mock/configuracoes";

interface GeraisState {
  name: string;
  cnpj: string;
  phone: string;
  unitId: string;
  timezone: string;
  hours: typeof defaultBusinessHours;
  defaultSlotMin: string;
  minLeadMin: string;
  allowEncaixe: boolean;
  blockHolidays: boolean;
  currency: string;
  dateFormat: string;
}

export default function Gerais() {
  const s = useSettingsState<GeraisState>({
    name: clinic.name,
    cnpj: clinic.cnpj,
    phone: clinic.phone,
    unitId: clinic.units[0].id,
    timezone: "america-fortaleza",
    hours: defaultBusinessHours,
    defaultSlotMin: "30",
    minLeadMin: "60",
    allowEncaixe: true,
    blockHolidays: true,
    currency: "BRL",
    dateFormat: "dd/mm/aaaa",
  });
  const v = s.value;

  return (
    <div>
      <Card>
        <CardBody>
          <FormSection title="Dados da unidade" description="Identificação usada em guias, notas fiscais e documentos.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Nome da clínica" value={v.name} onChange={(e) => s.set({ ...v, name: e.target.value })} />
              <Input label="CNPJ" value={v.cnpj} onChange={(e) => s.set({ ...v, cnpj: e.target.value })} />
              <Input label="Telefone" value={v.phone} onChange={(e) => s.set({ ...v, phone: e.target.value })} />
              <Select
                label="Unidade padrão"
                value={v.unitId}
                onChange={(e) => s.set({ ...v, unitId: e.target.value })}
                options={clinic.units.map((u) => ({ value: u.id, label: u.name }))}
              />
            </div>
          </FormSection>

          <FormSection title="Fuso horário" description="Usado em agenda, relatórios e horários exibidos ao paciente.">
            <Select
              label="Fuso horário"
              value={v.timezone}
              onChange={(e) => s.set({ ...v, timezone: e.target.value })}
              options={[
                { value: "america-fortaleza", label: "América/Fortaleza (GMT-3)" },
                { value: "america-sao_paulo", label: "América/São Paulo (GMT-3)" },
                { value: "america-manaus", label: "América/Manaus (GMT-4)" },
              ]}
              wrapperClassName="max-w-sm"
            />
          </FormSection>

          <FormSection title="Horário de funcionamento" description="Define os limites de agendamento em cada dia da semana.">
            <div className="flex flex-col divide-y divide-border rounded-lg">
              {v.hours.map((h, i) => (
                <div key={h.day} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                  <span className="w-24 shrink-0 text-sm font-medium text-text">{h.day}</span>
                  <Switch
                    label=""
                    checked={!h.closed}
                    onChange={(checked) =>
                      s.set({ ...v, hours: v.hours.map((x, xi) => (xi === i ? { ...x, closed: !checked } : x)) })
                    }
                  />
                  {h.closed ? (
                    <span className="text-sm text-text-muted">Fechado</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={h.open}
                        aria-label={`Abertura ${h.day}`}
                        className="w-28"
                        onChange={(e) => s.set({ ...v, hours: v.hours.map((x, xi) => (xi === i ? { ...x, open: e.target.value } : x)) })}
                      />
                      <span className="text-sm text-text-muted">até</span>
                      <Input
                        type="time"
                        value={h.close}
                        aria-label={`Fechamento ${h.day}`}
                        className="w-28"
                        onChange={(e) => s.set({ ...v, hours: v.hours.map((x, xi) => (xi === i ? { ...x, close: e.target.value } : x)) })}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </FormSection>

          <FormSection title="Preferências de agenda" description="Comportamento padrão ao criar novos agendamentos.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Intervalo padrão entre horários"
                value={v.defaultSlotMin}
                onChange={(e) => s.set({ ...v, defaultSlotMin: e.target.value })}
                options={[
                  { value: "15", label: "15 minutos" },
                  { value: "20", label: "20 minutos" },
                  { value: "30", label: "30 minutos" },
                  { value: "60", label: "60 minutos" },
                ]}
              />
              <Input
                label="Antecedência mínima para agendar"
                type="number"
                suffix="min"
                value={v.minLeadMin}
                onChange={(e) => s.set({ ...v, minLeadMin: e.target.value })}
              />
            </div>
            <Switch label="Permitir encaixe" description="Libera horários extras fora da grade padrão." checked={v.allowEncaixe} onChange={(c) => s.set({ ...v, allowEncaixe: c })} />
            <Switch label="Bloquear feriados automaticamente" description="Feriados nacionais ficam indisponíveis para agendamento." checked={v.blockHolidays} onChange={(c) => s.set({ ...v, blockHolidays: c })} />
          </FormSection>

          <FormSection title="Moeda e formatos" description="Como valores e datas aparecem em todo o sistema.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select label="Moeda" value={v.currency} onChange={(e) => s.set({ ...v, currency: e.target.value })} options={[{ value: "BRL", label: "Real (R$)" }]} />
              <Select
                label="Formato de data"
                value={v.dateFormat}
                onChange={(e) => s.set({ ...v, dateFormat: e.target.value })}
                options={[
                  { value: "dd/mm/aaaa", label: "31/12/2026" },
                  { value: "aaaa-mm-dd", label: "2026-12-31" },
                ]}
              />
            </div>
          </FormSection>
        </CardBody>
      </Card>
      <SaveBar dirty={s.dirty} onDiscard={s.discard} onSave={s.save} />
    </div>
  );
}
