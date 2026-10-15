import { IconCircle } from "@/components/ui/icon-circle";
import { useState } from "react";
import { Camera, Computing, InfoCircle, Lock, Monitor, Moon, Scan, Sun1, TickCircle, Verify } from "iconsax-reactjs";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Checkbox, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/overlay";
import { FormSection } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { cn } from "@/lib/cn";
import { SaveBar } from "@/components/configuracoes/SaveBar";
import { useSettingsState } from "@/components/configuracoes/useSettingsState";
import { PasswordStrength } from "@/components/auth/password-strength";
import { currentUser } from "@/lib/mock/core";
import { connectedSessions } from "@/lib/mock/configuracoes";

const EVENTS = [
  "Agendamento confirmado",
  "Lembrete de consulta",
  "Pagamento recebido",
  "Resultado de exame disponível",
  "Lote TISS com glosa",
  "Estoque abaixo do mínimo",
];
const CHANNELS = ["E-mail", "SMS", "WhatsApp", "Push"];

function DadosPessoais() {
  const s = useSettingsState({ name: currentUser.name, email: currentUser.email, phone: "(98) 93200-1044", role: currentUser.role });
  const v = s.value;
  return (
    <div>
      <Card>
        <CardBody className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar name={v.name} size="xl" />
              <button type="button" aria-label="Alterar foto" className="ms-gradient-button absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface-raised bg-accent text-on-accent">
                <Camera size={14} aria-hidden />
              </button>
            </div>
            <div>
              <p className="text-base font-semibold text-text">{v.name}</p>
              <p className="text-sm text-text-muted">{v.role} · Unidade Centro</p>
            </div>
          </div>
          <FormSection title="Informações" description="Usadas na identificação dentro do sistema e em registros de auditoria.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Nome completo" value={v.name} onChange={(e) => s.set({ ...v, name: e.target.value })} />
              <Input label="Função" value={v.role} onChange={(e) => s.set({ ...v, role: e.target.value })} />
              <Input label="E-mail" type="email" value={v.email} onChange={(e) => s.set({ ...v, email: e.target.value })} />
              <Input label="Telefone" value={v.phone} onChange={(e) => s.set({ ...v, phone: e.target.value })} />
            </div>
          </FormSection>
        </CardBody>
      </Card>
      <SaveBar dirty={s.dirty} onDiscard={s.discard} onSave={s.save} />
    </div>
  );
}

function Seguranca() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [changed, setChanged] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);
  const mySessions = connectedSessions.filter((s) => s.user === currentUser.name);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader title="Trocar senha" description="Recomendamos trocar a senha a cada 90 dias." />
        <CardBody className="flex flex-col gap-4">
          <Input label="Senha atual" type="password" icon={Lock} value={current} onChange={(e) => setCurrent(e.target.value)} />
          <Input label="Nova senha" type="password" icon={Lock} value={next} onChange={(e) => setNext(e.target.value)} />
          <PasswordStrength password={next} />
          <Input label="Confirmar nova senha" type="password" icon={Lock} value={confirm} onChange={(e) => setConfirm(e.target.value)} error={confirm && confirm !== next ? "As senhas não coincidem." : undefined} />
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              disabled={!current || !next || next !== confirm}
              onClick={() => {
                setChanged(true);
                setCurrent("");
                setNext("");
                setConfirm("");
                setTimeout(() => setChanged(false), 3000);
              }}
            >
              Atualizar senha
            </Button>
            {changed && (
              <span className="flex items-center gap-1.5 text-sm text-success">
                <TickCircle size={16} variant="Bold" aria-hidden /> Senha atualizada
              </span>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Verificação em duas etapas" description="Exige um código do seu celular além da senha." />
        <CardBody className="flex flex-col gap-4">
          <Switch label="Ativar verificação em duas etapas" checked={twoFactor} onChange={setTwoFactor} />
          {twoFactor && (
            <div className="flex flex-col items-start gap-3 rounded-lg bg-surface p-4 sm:flex-row sm:items-center">
              <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-border-strong bg-surface-raised text-text-subtle">
                <Scan size={36} aria-hidden />
              </span>
              <div className="text-sm text-text-muted">
                <p className="font-medium text-text">Escaneie o QR code com seu app autenticador</p>
                <p className="mt-1">Google Authenticator, Authy ou similar. Depois, digite o código de 6 dígitos para confirmar.</p>
                <Input label="Código de verificação" placeholder="000000" className="mt-2 max-w-40 tabular" />
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Sessões ativas" description="Dispositivos conectados com a sua conta." />
        <CardBody className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>Dispositivo</TH>
                <TH>IP</TH>
                <TH>Local</TH>
                <TH>Última atividade</TH>
              </TR>
            </THead>
            <TBody>
              {mySessions.map((sess) => (
                <TR key={sess.id}>
                  <TD>
                    {sess.device} {sess.current && <Badge tone="accent" size="sm" className="ml-1">Esta sessão</Badge>}
                  </TD>
                  <TD className="font-mono text-sm">{sess.ip}</TD>
                  <TD>{sess.location}</TD>
                  <TD>{sess.lastActivity}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}

function Notificacoes() {
  const [grid, setGrid] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    EVENTS.forEach((_ev, ei) =>
      CHANNELS.forEach((_ch, ci) => {
        initial[`${ei}-${ci}`] = ci === 0 || (ci === 2 && ei < 2);
      }),
    );
    return initial;
  });
  return (
    <Card>
      <CardHeader title="Notificações" description="Escolha por onde quer ser avisado em cada tipo de evento." />
      <CardBody className="p-0">
        <Table>
          <THead>
            <TR>
              <TH>Evento</TH>
              {CHANNELS.map((c) => (
                <TH key={c} align="center">{c}</TH>
              ))}
            </TR>
          </THead>
          <TBody>
            {EVENTS.map((ev, ei) => (
              <TR key={ev}>
                <TD>{ev}</TD>
                {CHANNELS.map((c, ci) => (
                  <TD key={c} align="center">
                    <Checkbox
                      className="justify-center"
                      aria-label={`${ev} por ${c}`}
                      checked={grid[`${ei}-${ci}`] ?? false}
                      onChange={() => setGrid((g) => ({ ...g, [`${ei}-${ci}`]: !g[`${ei}-${ci}`] }))}
                    />
                  </TD>
                ))}
              </TR>
            ))}
          </TBody>
        </Table>
      </CardBody>
    </Card>
  );
}

function AssinaturaDigital() {
  return (
    <Card>
      <CardHeader title="Assinatura digital" description="Certificado usado para assinar laudos, receitas e atestados." />
      <CardBody className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <IconCircle tone="success" size="lg">
              <Verify size={20} aria-hidden />
            </IconCircle>
            <div>
              <p className="text-sm font-medium text-text">Certificado A1 — ICP-Brasil</p>
              <p className="text-sm text-text-muted">Titular: {currentUser.name} · válido até 14/03/2027</p>
            </div>
          </div>
          <Badge tone="success" dot>Válido</Badge>
        </div>
        <p className="flex items-start gap-2 text-sm text-text-muted">
          <InfoCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
          Documentos assinados com este certificado têm validade jurídica equivalente à assinatura manuscrita.
        </p>
        <Button variant="secondary" className="self-start">Renovar certificado</Button>
      </CardBody>
    </Card>
  );
}

function Preferencias() {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [compact, setCompact] = useState(false);
  const cards = [
    { id: "light" as const, label: "Claro", icon: Sun1 },
    { id: "dark" as const, label: "Escuro", icon: Moon },
    { id: "system" as const, label: "Sistema", icon: Computing },
  ];
  return (
    <Card>
      <CardHeader title="Preferências" description="Aparência da sua conta neste navegador." />
      <CardBody className="flex flex-col gap-5">
        <div role="radiogroup" aria-label="Tema" className="grid grid-cols-3 gap-3">
          {cards.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={theme === c.id}
              onClick={() => setTheme(c.id)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg p-4 transition-colors",
                theme === c.id ? "bg-accent-muted text-accent" : "bg-surface text-text-muted hover:bg-surface-raised hover:text-text",
              )}
            >
              <c.icon size={22} aria-hidden />
              <span className="text-sm font-medium">{c.label}</span>
            </button>
          ))}
        </div>
        <div role="radiogroup" aria-label="Densidade" className="grid grid-cols-2 gap-3">
          {[
            { id: false, label: "Confortável", icon: Monitor },
            { id: true, label: "Compacto", icon: Monitor },
          ].map((d) => (
            <button
              key={String(d.id)}
              type="button"
              role="radio"
              aria-checked={compact === d.id}
              onClick={() => setCompact(d.id)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg p-3 transition-colors",
                compact === d.id ? "bg-accent-muted text-accent" : "bg-surface text-text-muted hover:bg-surface-raised hover:text-text",
              )}
            >
              <d.icon size={18} aria-hidden />
              <span className="text-sm font-medium">{d.label}</span>
            </button>
          ))}
        </div>
        <p className="flex items-start gap-2 text-sm text-text-muted">
          <InfoCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
          Essa seleção é só um lembrete das suas preferências — o alternador que realmente muda o tema e a densidade fica no menu do seu usuário, no canto superior do sistema.
        </p>
      </CardBody>
    </Card>
  );
}

export default function Perfil() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Meu perfil" description="Seus dados, segurança da conta e preferências pessoais." breadcrumbs={[{ label: "Conta" }, { label: "Meu perfil" }]} />
      <Tabs tabs={[{ label: "Dados pessoais" }, { label: "Segurança" }, { label: "Notificações" }, { label: "Assinatura digital" }, { label: "Preferências" }]}>
        {(active) =>
          active === 0 ? <DadosPessoais /> : active === 1 ? <Seguranca /> : active === 2 ? <Notificacoes /> : active === 3 ? <AssinaturaDigital /> : <Preferencias />
        }
      </Tabs>
    </div>
  );
}
