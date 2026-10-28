import { useState } from "react";
import { Computing, InfoCircle, Monitor, Moon, Sun1, TickCircle } from "iconsax-reactjs";
import { PageHeader } from "@/components/ui/page-header";
import LiquidTabs from "@/components/pinui/LiquidTabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FormSection, Skeleton } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { PasswordStrength } from "@/components/auth/password-strength";
import { usePreferences } from "@/components/shell/preferences";
import { ApiError } from "@/lib/api/client";
import { useChangePassword, useRevokeOtherSessions, useRevokeSession, useSessions, useUpdateMe } from "@/lib/api/conta";
import { useAuth, useMe } from "@/lib/auth/auth";
import { cn } from "@/lib/cn";

const message = (error: unknown) => (error instanceof ApiError ? error.message : "Não foi possível concluir. Tente de novo.");
const when = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** Nome editável; e-mail, função, unidade e clínica só aparecem (quem muda é o administrador). */
function DadosPessoais() {
  const me = useMe();
  const { updateUser } = useAuth();
  const update = useUpdateMe();
  const [name, setName] = useState(me.nome);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changed = name.trim() !== me.nome && name.trim() !== "";

  function save() {
    setError(null);
    setSaved(false);
    update.mutateAsync(name.trim()).then((user) => { updateUser(user); setName(user.nome); setSaved(true); }).catch((e) => setError(message(e)));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Avatar name={me.nome} size="xl" />
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-semibold text-text">{me.nome}</p>
          <p className="text-sm text-text-muted">{me.papel} · {me.unidadeNome} · {me.clinicaNome}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Nome completo" value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} maxLength={160} wrapperClassName="sm:col-span-2" />
        <Input label="E-mail" value={me.email} readOnly hint="É com ele que você entra. Para trocar, fale com o administrador." />
        <Input label="Função" value={me.papel} readOnly hint="Definida pelo administrador." />
        <Input label="Unidade desta sessão" value={me.unidadeNome} readOnly hint="Para trabalhar em outra unidade, saia e entre de novo." />
        <Input label="Clínica" value={me.clinicaNome} readOnly />
      </div>
      {error && <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>}
      {saved && <p role="status" className="flex items-center gap-1.5 text-sm text-success"><TickCircle size={16} variant="Bold" aria-hidden /> Nome atualizado.</p>}
      <div>
        <Button variant="primary" disabled={!changed} loading={update.isPending} onClick={save}>Salvar nome</Button>
      </div>
    </div>
  );
}

function AlterarSenha() {
  const change = useChangePassword();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mismatch = confirm !== "" && confirm !== next;
  const valid = current !== "" && next.length >= 12 && next === confirm && next !== current;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setDone(false);
    change.mutateAsync({ senhaAtual: current, novaSenha: next })
      .then(() => { setDone(true); setCurrent(""); setNext(""); setConfirm(""); })
      .catch((e) => setError(message(e)));
  }

  return (
    <FormSection variant="stacked" title="Alterar senha" description="Ao trocar, os outros dispositivos conectados com a sua conta são desconectados.">
      <form onSubmit={submit} className="flex max-w-md flex-col gap-4">
        <Input label="Senha atual" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
        <Input label="Nova senha" type="password" autoComplete="new-password" required minLength={12} maxLength={72} value={next} onChange={(e) => setNext(e.target.value)} hint="No mínimo 12 caracteres." />
        {next && <PasswordStrength password={next} />}
        <Input label="Confirmar nova senha" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} error={mismatch ? "As senhas não são iguais." : undefined} />
        {error && <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>}
        {done && <p role="status" className="flex items-center gap-1.5 text-sm text-success"><TickCircle size={16} variant="Bold" aria-hidden /> Senha alterada. Os outros dispositivos foram desconectados.</p>}
        <div><Button type="submit" variant="primary" disabled={!valid} loading={change.isPending}>Alterar senha</Button></div>
      </form>
    </FormSection>
  );
}

function Sessoes() {
  const sessions = useSessions();
  const revoke = useRevokeSession();
  const revokeOthers = useRevokeOtherSessions();
  const others = (sessions.data ?? []).filter((s) => !s.atual).length;
  return (
    <FormSection
      variant="stacked"
      title="Sessões ativas"
      description="Onde a sua conta está conectada agora. A lista mostra início e validade; o sistema não registra o aparelho."
      actions={others > 0 ? <Button size="sm" variant="secondary" loading={revokeOthers.isPending} onClick={() => revokeOthers.mutate()}>Encerrar as outras</Button> : undefined}
    >
      {sessions.isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : sessions.isError ? (
        <EmptyState title="Não foi possível carregar as sessões." description={sessions.error.message} />
      ) : (
        <div className="-mx-4">
          <Table>
            <THead>
              <TR>
                <TH>Iniciada em</TH>
                <TH>Válida até</TH>
                <TH>Unidade</TH>
                <TH>Situação</TH>
                <TH align="right">Ação</TH>
              </TR>
            </THead>
            <TBody>
              {sessions.data.map((s) => (
                <TR key={s.id}>
                  <TD className="tabular">{when(s.criadaEm)}</TD>
                  <TD className="tabular text-text-muted">{when(s.expiraEm)}</TD>
                  <TD className="text-text-muted">{s.unidadeNome}</TD>
                  <TD>{s.atual ? <Badge tone="success" dot size="sm">Esta sessão</Badge> : <Badge tone="neutral" size="sm">Outra sessão</Badge>}</TD>
                  <TD align="right">
                    {!s.atual && <Button size="sm" variant="ghost" loading={revoke.isPending && revoke.variables === s.id} onClick={() => revoke.mutate(s.id)}>Encerrar</Button>}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </FormSection>
  );
}

/** Tema e densidade são preferências deste navegador: mudam de verdade e ficam guardadas aqui. */
function Preferencias() {
  const { theme, density, setTheme, setDensity } = usePreferences();
  const themes = [
    { id: "light" as const, label: "Claro", icon: Sun1 },
    { id: "dark" as const, label: "Escuro", icon: Moon },
    { id: "system" as const, label: "Sistema", icon: Computing },
  ];
  return (
    <FormSection variant="stacked" title="Preferências" description="Aparência da sua conta neste navegador.">
      <div role="radiogroup" aria-label="Tema" className="grid grid-cols-3 gap-3">
        {themes.map((t) => (
          <button key={t.id} type="button" role="radio" aria-checked={theme === t.id} onClick={() => setTheme(t.id)}
            className={cn("flex flex-col items-center gap-2 rounded-lg p-4 transition-colors", theme === t.id ? "bg-accent-muted text-accent" : "bg-surface text-text-muted hover:bg-surface-raised hover:text-text")}>
            <t.icon size={22} aria-hidden />
            <span className="text-sm font-medium">{t.label}</span>
          </button>
        ))}
      </div>
      <div role="radiogroup" aria-label="Densidade" className="grid grid-cols-2 gap-3">
        {[{ id: "comfortable" as const, label: "Confortável" }, { id: "compact" as const, label: "Compacto" }].map((d) => (
          <button key={d.id} type="button" role="radio" aria-checked={density === d.id} onClick={() => setDensity(d.id)}
            className={cn("flex items-center justify-center gap-2 rounded-full p-3 transition-colors", density === d.id ? "bg-accent-muted text-accent" : "bg-surface text-text-muted hover:bg-surface-raised hover:text-text")}>
            <Monitor size={18} aria-hidden />
            <span className="text-sm font-medium">{d.label}</span>
          </button>
        ))}
      </div>
      <p className="flex items-start gap-2 text-sm text-text-muted">
        <InfoCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
        Estas escolhas valem só para este navegador; em outro aparelho você escolhe de novo.
      </p>
    </FormSection>
  );
}

export default function Perfil() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader card title="Meu perfil" description="Seus dados, a segurança da conta e as preferências deste navegador." breadcrumbs={[{ label: "Conta" }, { label: "Meu perfil" }]} />
      <LiquidTabs label="Seções do perfil" tabs={[{ label: "Dados pessoais" }, { label: "Segurança" }, { label: "Preferências" }]}>
        {(active) =>
          active === 0 ? <DadosPessoais /> : active === 1 ? (
            <div className="flex flex-col"><AlterarSenha /><Sessoes /></div>
          ) : <Preferencias />
        }
      </LiquidTabs>
    </div>
  );
}
