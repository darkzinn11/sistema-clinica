import { IconCircle } from "@/components/ui/icon-circle";
import { useState } from "react";
import { DocumentText, Refresh, TickCircle } from "iconsax-reactjs";
import { Card, CardBody } from "@/components/ui/card";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer, Switch } from "@/components/ui/overlay";
import { Input } from "@/components/ui/input";
import { integrations, type Integration, type IntegrationStatus } from "@/lib/mock/configuracoes";

const STATUS_LABEL: Record<IntegrationStatus, { label: string; tone: Tone }> = {
  conectado: { label: "Conectado", tone: "success" },
  nao_conectado: { label: "Não conectado", tone: "neutral" },
  erro: { label: "Erro", tone: "danger" },
};

function ApiTokenFields() {
  const [token, setToken] = useState("sk_live_••••••••••••3F2A");
  const [regenerated, setRegenerated] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <Input label="Token de acesso" value={token} readOnly className="font-mono" />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          icon={Refresh}
          onClick={() => {
            setToken(`sk_live_••••••••••••${Math.random().toString(16).slice(2, 6).toUpperCase()}`);
            setRegenerated(true);
            setTimeout(() => setRegenerated(false), 2200);
          }}
        >
          Gerar novo token
        </Button>
        {regenerated && (
          <span className="flex items-center gap-1.5 text-sm text-success">
            <TickCircle size={14} variant="Bold" aria-hidden /> Token atualizado
          </span>
        )}
        <Button size="sm" variant="ghost" icon={DocumentText} onClick={() => window.open("https://docs.vidaplena.com.br/api", "_blank", "noopener")}>
          Ver documentação
        </Button>
      </div>
    </div>
  );
}

function IntegrationDrawer({ integration, onClose }: { integration: Integration; onClose: () => void }) {
  const [active, setActive] = useState(integration.status === "conectado");
  const status = STATUS_LABEL[integration.status];
  return (
    <Drawer
      open
      onClose={onClose}
      title={integration.name}
      description={integration.description}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={onClose}>Salvar</Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2.5">
          <span className="text-sm text-text-muted">Status atual</span>
          <Badge tone={status.tone} dot>{status.label}</Badge>
        </div>
        <Switch label="Integração ativa" description="Desativar interrompe a troca de dados imediatamente." checked={active} onChange={setActive} />
        {integration.id === "api" && <ApiTokenFields />}
        {integration.id === "whatsapp" && <Input label="Número conectado" value="+55 (98) 93200-1000" readOnly />}
        {integration.id === "nfse" && <Input label="Código do município (prefeitura)" defaultValue="2111300" />}
        {integration.id === "lab" && <p className="text-sm text-danger">Última sincronização falhou: tempo de resposta excedido. Verifique a conexão do laboratório parceiro.</p>}
        {integration.lastSync && <p className="text-sm text-text-muted">Última sincronização: {integration.lastSync}</p>}
      </div>
    </Drawer>
  );
}

export default function Integracoes() {
  const [openId, setOpenId] = useState<string | null>(null);
  const openIntegration = integrations.find((i) => i.id === openId) ?? null;

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {integrations.map((i) => {
          const status = STATUS_LABEL[i.status];
          return (
            <Card key={i.id}>
              <CardBody className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <IconCircle tone="accent" size="lg">
                    <i.icon size={20} aria-hidden />
                  </IconCircle>
                  <Badge tone={status.tone} dot>{status.label}</Badge>
                </div>
                <div>
                  <p className="text-base font-semibold text-text">{i.name}</p>
                  <p className="mt-0.5 text-sm text-text-muted">{i.description}</p>
                </div>
                <Button variant="secondary" size="sm" className="mt-1 self-start" onClick={() => setOpenId(i.id)}>
                  Configurar
                </Button>
              </CardBody>
            </Card>
          );
        })}
      </div>
      {openIntegration && <IntegrationDrawer integration={openIntegration} onClose={() => setOpenId(null)} />}
    </div>
  );
}
