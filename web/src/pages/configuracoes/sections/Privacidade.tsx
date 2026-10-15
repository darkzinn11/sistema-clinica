import { useState } from "react";
import { Add, ClipboardText, Trash } from "iconsax-reactjs";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { FormSection } from "@/components/ui/misc";
import { Switch } from "@/components/ui/overlay";
import { Input, Select } from "@/components/ui/input";
import { Button, ButtonLink } from "@/components/ui/button";
import { SaveBar } from "@/components/configuracoes/SaveBar";
import { useSettingsState } from "@/components/configuracoes/useSettingsState";
import { ipAllowlistDefault } from "@/lib/mock/configuracoes";
import { patients } from "@/lib/mock/core";

interface State {
  omitirDadosSensiveis: boolean;
  exigirMotivoAcesso: boolean;
  allowlist: string[];
  retentionYears: string;
}

export default function Privacidade() {
  const s = useSettingsState<State>({ omitirDadosSensiveis: true, exigirMotivoAcesso: false, allowlist: ipAllowlistDefault, retentionYears: "20" });
  const v = s.value;
  const [newIp, setNewIp] = useState("");
  const [patientQuery, setPatientQuery] = useState("");
  const match = patients.find((p) => p.name.toLowerCase().includes(patientQuery.toLowerCase()) && patientQuery.length > 2);
  const [actionDone, setActionDone] = useState<string | null>(null);

  return (
    <div>
      <Card>
        <CardBody>
          <FormSection title="Omissão de dados sensíveis" description="Reduz a exposição de dados clínicos para quem não precisa deles.">
            <Switch
              label="Omitir dados sensíveis por padrão"
              description="Diagnósticos e anotações clínicas ficam ocultos até o usuário clicar em 'mostrar'."
              checked={v.omitirDadosSensiveis}
              onChange={(c) => s.set({ ...v, omitirDadosSensiveis: c })}
            />
            <Switch
              label="Exigir motivo para acessar prontuário fora do atendimento"
              description="Registra o motivo informado no log de auditoria."
              checked={v.exigirMotivoAcesso}
              onChange={(c) => s.set({ ...v, exigirMotivoAcesso: c })}
            />
          </FormSection>

          <FormSection title="Locais de acesso" description="Restrinja o acesso ao sistema a uma lista de IPs ou faixas conhecidas.">
            <div className="flex flex-col gap-2">
              {v.allowlist.map((ip) => (
                <div key={ip} className="flex items-center gap-2 rounded-md bg-surface px-3 py-2">
                  <span className="flex-1 font-mono text-sm text-text">{ip}</span>
                  <Button variant="ghost" size="sm" iconOnly aria-label={`Remover ${ip}`} icon={Trash} className="text-danger hover:bg-danger-bg" onClick={() => s.set({ ...v, allowlist: v.allowlist.filter((x) => x !== ip) })} />
                </div>
              ))}
            </div>
            <div className="flex items-end gap-2">
              <Input label="Adicionar IP ou faixa (CIDR)" placeholder="191.32.44.0/24" value={newIp} onChange={(e) => setNewIp(e.target.value)} wrapperClassName="flex-1" />
              <Button
                variant="secondary"
                icon={Add}
                onClick={() => {
                  if (!newIp.trim()) return;
                  s.set({ ...v, allowlist: [...v.allowlist, newIp.trim()] });
                  setNewIp("");
                }}
              >
                Adicionar
              </Button>
            </div>
          </FormSection>

          <FormSection title="Retenção de dados" description="Tempo mínimo de guarda de prontuários, conforme legislação vigente.">
            <Select
              label="Reter dados clínicos por"
              value={v.retentionYears}
              onChange={(e) => s.set({ ...v, retentionYears: e.target.value })}
              options={[
                { value: "10", label: "10 anos" },
                { value: "20", label: "20 anos (recomendado)" },
                { value: "indeterminado", label: "Indeterminado" },
              ]}
              wrapperClassName="max-w-sm"
            />
          </FormSection>
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Exportação e anonimização de paciente" description="Atenda solicitações de titulares de dados (LGPD, art. 18)." />
        <CardBody className="flex flex-col gap-3">
          <Input label="Buscar paciente" placeholder="Nome do paciente" value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)} />
          {match && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg p-3">
              <span className="text-sm font-medium text-text">{match.name}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setActionDone(`Dados de ${match.name} exportados.`)}>
                  Exportar dados
                </Button>
                <Button size="sm" variant="danger" onClick={() => setActionDone(`Dados de ${match.name} anonimizados.`)}>
                  Anonimizar
                </Button>
              </div>
            </div>
          )}
          {actionDone && <p className="text-sm text-success">{actionDone}</p>}
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardBody className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm text-text-muted">
            <ClipboardText size={16} aria-hidden /> Todo acesso a dados sensíveis fica registrado no log de auditoria.
          </p>
          <ButtonLink to="/logs" variant="ghost" size="sm">
            Ver registro de atividades
          </ButtonLink>
        </CardBody>
      </Card>

      <SaveBar dirty={s.dirty} onDiscard={s.discard} onSave={s.save} />
    </div>
  );
}
