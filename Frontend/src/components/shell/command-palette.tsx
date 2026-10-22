import { ArrowRight2, SearchNormal1 } from "iconsax-reactjs";
import type { Icon as IconType } from "iconsax-reactjs";
import { useNavigate } from "react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { searchableLinks } from "@/lib/nav";
import { QUICK_ACTIONS } from "@/lib/quick-actions";
import { usePatientSearch } from "@/lib/api/agenda";
import { formatCpf } from "@/lib/pacientes/options";
import { Avatar } from "@/components/ui/avatar";
import { Kbd } from "@/components/ui/misc";
import { cn } from "@/lib/cn";

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

type Result =
  | { kind: "action" | "page"; id: string; label: string; sub?: string; href: string; icon: IconType; external?: boolean }
  | { kind: "patient"; id: string; label: string; sub: string; href: string };

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const links = useMemo(() => searchableLinks(), []);
  // Pacientes de verdade: a busca vai ao backend (com um pequeno atraso para não consultar a cada letra).
  const [typed, setTyped] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setTyped(query), 300);
    return () => window.clearTimeout(timer);
  }, [query]);
  const found = usePatientSearch(typed).data;

  const groups = useMemo(() => {
    const q = norm(query.trim());
    const match = (...fields: (string | undefined)[]) => !q || fields.some((f) => f && norm(f).includes(q));
    const actions: Result[] = QUICK_ACTIONS.filter((a) => match(a.label, a.keywords)).map((a) => ({ kind: "action", id: a.href, label: a.label, href: a.href, icon: a.icon }));
    const pages: Result[] = links
      .filter((l) => match(l.label, l.trail, l.keywords))
      .slice(0, q ? 8 : 6)
      .map((l) => ({ kind: "page", id: l.href + l.trail, label: l.label, sub: l.trail, href: l.href, icon: l.icon, external: l.external }));
    const pats: Result[] = q.length >= 2
      ? (found ?? []).slice(0, 6).map((p) => ({ kind: "patient", id: p.id, label: p.nome, sub: [p.cpf ? formatCpf(p.cpf) : "Sem CPF", p.celular].filter(Boolean).join(" · "), href: `/pacientes/${p.id}` }))
      : [];
    return [
      { title: "Ações rápidas", items: actions },
      { title: "Pacientes", items: pats },
      { title: "Telas", items: pages },
    ].filter((g) => g.items.length > 0);
  }, [query, links, found]);

  const flat = groups.flatMap((g) => g.items);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function go(r: Result) {
    onClose();
    if ("external" in r && r.external) window.open(r.href, "_blank");
    else navigate(r.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(flat.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" && flat[active]) {
      e.preventDefault();
      go(flat[active]);
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  if (!open) return null;
  let index = -1;
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]">
      <div className="absolute inset-0 bg-overlay" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label="Busca global" className="relative w-full max-w-xl overflow-hidden rounded-xl border border-border bg-surface-raised shadow-pop">
        <div className="flex items-center gap-3 border-b border-border px-4">
          <SearchNormal1 size={18} aria-hidden className="text-text-subtle" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-list"
            aria-activedescendant={flat[active] ? `cmdk-${active}` : undefined}
            placeholder="Buscar paciente (nome, CPF, telefone), tela ou ação…"
            className="h-13 flex-1 bg-transparent py-4 text-md text-text placeholder:text-text-subtle focus:outline-none"
          />
          <Kbd>Esc</Kbd>
        </div>
        <ul id="cmdk-list" ref={listRef} role="listbox" className="max-h-[60vh] overflow-y-auto p-2">
          {groups.length === 0 && <li className="px-3 py-8 text-center text-base text-text-muted">Nada encontrado para “{query}”.</li>}
          {groups.map((g) => (
            <li key={g.title} role="presentation" className="mb-1 last:mb-0">
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-text-subtle">{g.title}</p>
              <ul role="presentation">
                {g.items.map((r) => {
                  index += 1;
                  const i = index;
                  const selected = i === active;
                  return (
                    <li
                      key={r.kind + r.id}
                      id={`cmdk-${i}`}
                      data-index={i}
                      role="option"
                      aria-selected={selected}
                      onMouseMove={() => setActive(i)}
                      onClick={() => go(r)}
                      className={cn("flex cursor-pointer items-center gap-3 rounded-full px-3 py-2", selected ? "bg-surface" : "")}
                    >
                      {r.kind === "patient" ? (
                        <Avatar name={r.label} size="sm" />
                      ) : (
                        <span aria-hidden className="inline-flex h-8 w-8 shrink-0 items-center justify-center" style={{ color: "var(--c-accent)" }}>
                          <r.icon size={21} variant="Linear" />
                        </span>
                      )}
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-base text-text">{r.label}</span>
                        {r.sub && <span className="truncate text-sm text-text-muted">{r.sub}</span>}
                      </span>
                      {selected && <ArrowRight2 size={14} aria-hidden className="text-text-subtle" />}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-xs text-text-muted">
          <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navegar</span>
          <span className="flex items-center gap-1"><Kbd>↵</Kbd> abrir</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
