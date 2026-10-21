import { ArrowRotateLeft, Call, CloseCircle, Monitor, Scan, VolumeHigh } from "iconsax-reactjs";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";
import { patientById } from "@/lib/mock/core";
import { GUICHES, TICKET_TYPES, type TicketTypeCode } from "@/lib/mock/recepcao";
import { useSenhasQueue } from "@/lib/senhas-queue-context";
import { cn } from "@/lib/cn";

/**
 * Acesso rápido ao chamador de senha, fixo em qualquer tela do sistema.
 * Sem backdrop: o painel fica docado à direita por cima do conteúdo, mas não
 * bloqueia cliques no resto da tela — o usuário pode continuar navegando e
 * trabalhando em outras telas com o painel aberto.
 *
 * O botão de abrir fica no canto inferior direito, então o título + fechar
 * ficam na barra de baixo (não em cima): abrir e fechar acontece praticamente
 * no mesmo ponto da tela, sem precisar mover o mouse.
 */
export function FloatingTicketCaller() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { guiche, setGuiche, fila, setFila, current, waiting, queueStats, history, chamarProxima, chamarNovamente, naoCompareceu, rechamar } = useSenhasQueue();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Chamador de senha, ${waiting.length} aguardando`}
          title="Chamador de senha"
          className="ui-button ms-gradient-button fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-pop"
        >
          <VolumeHigh size={24} variant="Bold" aria-hidden />
          {waiting.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[11px] font-semibold text-surface-raised">
              {waiting.length}
            </span>
          )}
        </button>
      )}

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Chamador de senha"
          className="ui-side-panel-enter fixed bottom-4 right-4 top-20 z-40 flex w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-pop"
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
            <ButtonLink to="/senhas" onClick={() => setOpen(false)} variant="ghost" size="sm">
              Tela completa
            </ButtonLink>
            <div className="flex gap-1">
              <ButtonLink to="/totem" target="_blank" rel="noreferrer" variant="ghost" size="sm" iconOnly aria-label="Abrir totem" icon={Scan} />
              <ButtonLink to="/tv" target="_blank" rel="noreferrer" variant="ghost" size="sm" iconOnly aria-label="Abrir painel de TV" icon={Monitor} />
            </div>
          </div>

          <div className="ui-scrollbar flex-1 overflow-y-auto px-4 py-4">
            <div className="flex flex-col items-center gap-3 rounded-xl bg-surface py-6 text-center">
              {current ? (
                <>
                  <p className="font-display text-3xl font-semibold tracking-tight text-text">{current.code}</p>
                  <p className="text-sm text-text-muted">
                    Guichê <span className="font-semibold text-text">{current.guiche}</span> · chamado às {current.calledAt}
                  </p>
                </>
              ) : (
                <EmptyState title="Nenhuma senha chamada" compact className="px-0 py-0" />
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <Select
                label="Fila"
                value={fila}
                onChange={(e) => setFila(e.target.value as "todas" | TicketTypeCode)}
                wrapperClassName="[&_label]:text-xs"
              >
                <option value="todas">Todas</option>
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
                wrapperClassName="[&_label]:text-xs"
              />
            </div>

            <div className="mt-3 flex flex-col gap-2">
              <Button variant="primary" icon={Call} onClick={chamarProxima}>
                Chamar próxima
              </Button>
              <div className="flex gap-2">
                <Button variant="secondary" icon={ArrowRotateLeft} onClick={chamarNovamente} disabled={!current} className="flex-1">
                  Repetir
                </Button>
                <Button variant="danger" icon={CloseCircle} onClick={naoCompareceu} disabled={!current} className="flex-1">
                  Não veio
                </Button>
              </div>
            </div>

            <div className="mt-5 border-t border-border pt-4">
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.07em] text-text-subtle">Filas aguardando</p>
              <div className="flex flex-col gap-1.5">
                {queueStats.map((q) => (
                  <button
                    key={q.code}
                    type="button"
                    onClick={() => setFila(q.code)}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors",
                      fila === q.code ? "bg-accent-muted text-text" : "text-text-muted hover:bg-surface",
                    )}
                  >
                    <span>{q.longLabel}</span>
                    <Badge tone={q.count > 0 ? "accent" : "neutral"}>{q.count}</Badge>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 border-t border-border pt-4">
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.07em] text-text-subtle">Últimos chamados</p>
              {history.length === 0 ? (
                <p className="px-1 text-sm text-text-muted">Nenhuma chamada ainda.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {history.map((s) => {
                    const patient = patientById(s.patientId);
                    return (
                      <div key={s.id} className="flex items-center gap-2 rounded-lg px-1 py-1.5 text-sm">
                        <span className="w-14 shrink-0 font-semibold text-text">{s.code}</span>
                        <span className="min-w-0 flex-1 truncate text-text-muted">{patient?.name ?? "—"}</span>
                        <Badge tone={s.status === "nao_compareceu" ? "danger" : s.status === "atendido" ? "accent" : "info"} size="sm">
                          {s.status === "nao_compareceu" ? "Não veio" : s.status === "atendido" ? "Atendido" : s.calledAt}
                        </Badge>
                        <Button
                          size="xs"
                          variant="ghost"
                          iconOnly
                          aria-label={`Chamar novamente a senha ${s.code}`}
                          icon={ArrowRotateLeft}
                          onClick={() => rechamar(s.id)}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-between border-t border-border px-4 py-3.5">
            <div className="flex items-center gap-2">
              <VolumeHigh size={18} variant="Bulk" className="text-accent" aria-hidden />
              <p className="text-base font-semibold text-text">Chamador de senha</p>
            </div>
            <Button variant="ghost" size="sm" iconOnly aria-label="Fechar" icon={CloseCircle} onClick={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
