import { ArrowRotateLeft, Call, CloseCircle, Monitor, Scan, UserTick } from "iconsax-reactjs";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { NOW_TIME, patientById } from "@/lib/mock/core";
import { GUICHES, type Senha, type TicketTypeCode, TICKET_TYPES, initialSenhas, waitMinutes } from "@/lib/mock/recepcao";

const HISTORY_LIMIT = 8;

export default function ChamarSenha() {
  const [senhas, setSenhas] = useState<Senha[]>(initialSenhas);
  const [guiche, setGuiche] = useState<number>(GUICHES[0]);
  const [fila, setFila] = useState<"todas" | TicketTypeCode>("todas");
  const [currentId, setCurrentId] = useState<string | null>(() => {
    const called = senhas.filter((s) => s.status === "chamado" || s.status === "atendido" || s.status === "nao_compareceu");
    return called.sort((a, b) => (b.calledAt ?? "").localeCompare(a.calledAt ?? ""))[0]?.id ?? null;
  });

  const current = senhas.find((s) => s.id === currentId) ?? null;
  const waiting = senhas.filter((s) => s.status === "esperando");

  const queueStats = TICKET_TYPES.map((t) => {
    const items = waiting.filter((s) => s.type === t.code);
    const longest = items.length ? Math.max(...items.map((s) => waitMinutes(s.createdAt))) : 0;
    return { ...t, count: items.length, longest };
  });

  const history = senhas
    .filter((s) => s.status === "chamado" || s.status === "atendido" || s.status === "nao_compareceu")
    .sort((a, b) => (b.calledAt ?? "").localeCompare(a.calledAt ?? ""))
    .slice(0, HISTORY_LIMIT);

  function chamarProxima() {
    const pool = waiting
      .filter((s) => fila === "todas" || s.type === fila)
      .sort((a, b) => Number(b.preferential) - Number(a.preferential) || a.createdAt.localeCompare(b.createdAt));
    const next = pool[0];
    if (!next) return;
    setSenhas((prev) => prev.map((s) => (s.id === next.id ? { ...s, status: "chamado", calledAt: NOW_TIME, guiche } : s)));
    setCurrentId(next.id);
  }

  function chamarNovamente() {
    if (!current) return;
    setSenhas((prev) => prev.map((s) => (s.id === current.id ? { ...s, calledAt: NOW_TIME, guiche } : s)));
  }

  function naoCompareceu() {
    if (!current) return;
    setSenhas((prev) => prev.map((s) => (s.id === current.id ? { ...s, status: "nao_compareceu" } : s)));
    setCurrentId(null);
  }

  function rechamar(id: string) {
    setSenhas((prev) => prev.map((s) => (s.id === id ? { ...s, status: "chamado", calledAt: NOW_TIME, guiche } : s)));
    setCurrentId(id);
  }

  function remover(id: string) {
    setSenhas((prev) => prev.filter((s) => s.id !== id));
    if (currentId === id) setCurrentId(null);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Chamar senha"
        description="Console do operador: chame a próxima senha, repita a chamada ou registre quem não compareceu."
        breadcrumbs={[{ label: "Recepção" }, { label: "Chamar senha" }]}
        actions={
          <>
            <ButtonLink to="/totem" target="_blank" rel="noreferrer" variant="secondary" icon={Scan}>
              Abrir totem
            </ButtonLink>
            <ButtonLink to="/tv" target="_blank" rel="noreferrer" variant="secondary" icon={Monitor}>
              Abrir painel de TV
            </ButtonLink>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.1fr]">
        <Card>
          <CardHeader title="Senha atual" description="Chamada em destaque para o paciente visualizar no painel." />
          <CardBody className="flex flex-col items-center gap-4 py-8 text-center">
            {current ? (
              <>
                <p className="font-display text-display font-semibold tracking-tight text-text">{current.code}</p>
                <p className="text-lg text-text-muted">
                  Guichê <span className="font-semibold text-text">{current.guiche}</span> · chamado às {current.calledAt}
                </p>
                {current.preferential && (
                  <Badge tone="accent" icon={UserTick}>
                    Atendimento preferencial
                  </Badge>
                )}
              </>
            ) : (
              <p className="py-6 text-base text-text-muted">Nenhuma senha chamada no momento.</p>
            )}

            <div className="mt-2 grid w-full grid-cols-2 gap-3 border-t border-border pt-5">
              <Select label="Fila" value={fila} onChange={(e) => setFila(e.target.value as "todas" | TicketTypeCode)}>
                <option value="todas">Todas (ordem de chegada)</option>
                {TICKET_TYPES.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.label}
                  </option>
                ))}
              </Select>
              <Select
                label="Guichê"
                value={String(guiche)}
                onChange={(e) => setGuiche(Number(e.target.value))}
                options={GUICHES.map((g) => ({ value: String(g), label: `Guichê ${g}` }))}
              />
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row">
              <Button variant="primary" size="lg" icon={Call} onClick={chamarProxima} className="flex-1">
                Chamar próxima
              </Button>
              <Button variant="secondary" size="lg" icon={ArrowRotateLeft} onClick={chamarNovamente} disabled={!current}>
                Chamar novamente
              </Button>
              <Button variant="danger" size="lg" icon={CloseCircle} onClick={naoCompareceu} disabled={!current}>
                Não compareceu
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Filas por tipo" description="Senhas aguardando e maior espera em cada fila." />
          <CardBody className="grid grid-cols-2 gap-3">
            {queueStats.map((q) => (
              <button
                key={q.code}
                type="button"
                onClick={() => setFila(q.code)}
                className={`flex flex-col gap-1 rounded-lg p-4 text-left transition-colors ${
                  fila === q.code ? "bg-accent-muted" : "bg-surface hover:bg-surface/70"
                }`}
              >
                <span className="text-sm text-text-muted">{q.longLabel}</span>
                <span className="font-display text-2xl font-semibold text-text">{q.count}</span>
                <span className="text-xs text-text-subtle">{q.count > 0 ? `maior espera: ${q.longest} min` : "sem espera"}</span>
              </button>
            ))}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader title="Histórico de chamadas" description="Últimas senhas chamadas, com opção de repetir ou remover." />
        {history.length === 0 ? (
          <EmptyState title="Nenhuma chamada ainda" description="As senhas chamadas vão aparecer aqui." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Senha</TH>
                <TH>Paciente</TH>
                <TH>Guichê</TH>
                <TH>Horário</TH>
                <TH>Status</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {history.map((s) => {
                const patient = patientById(s.patientId);
                return (
                  <TR key={s.id}>
                    <TD className="font-medium">{s.code}</TD>
                    <TD>{patient?.name ?? "—"}</TD>
                    <TD numeric>{s.guiche}</TD>
                    <TD numeric>{s.calledAt}</TD>
                    <TD>
                      <Badge
                        tone={s.status === "nao_compareceu" ? "danger" : s.status === "atendido" ? "accent" : "info"}
                        dot
                      >
                        {s.status === "nao_compareceu" ? "Não compareceu" : s.status === "atendido" ? "Atendido" : "Chamado"}
                      </Badge>
                    </TD>
                    <TD align="right">
                      <div className="flex justify-end gap-1">
                        <Button size="xs" variant="ghost" iconOnly aria-label="Chamar novamente" icon={ArrowRotateLeft} onClick={() => rechamar(s.id)} />
                        <Button size="xs" variant="ghost" iconOnly aria-label="Remover do histórico" icon={CloseCircle} onClick={() => remover(s.id)} />
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
