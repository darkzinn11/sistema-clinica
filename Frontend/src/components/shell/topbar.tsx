
import { Add, ArrowDown2, Building, Clock, Fatrows, FolderOpen, HamburgerMenu, LogoutCurve, Monitor, Moon, Notification, Profile, RowVertical, SearchNormal1, Sun1, TickCircle } from "iconsax-reactjs";
import { Link } from "react-router";
import { useEffect, useRef, useState } from "react";
import { clinic, currentUser, notifications } from "@/lib/mock/core";
import { Avatar } from "@/components/ui/avatar";
import { DropdownMenu } from "@/components/ui/overlay";
import { Kbd } from "@/components/ui/misc";
import { cn } from "@/lib/cn";
import { QUICK_ACTIONS } from "@/lib/quick-actions";
import { usePreferences } from "./preferences";

function NotificationsButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = notifications.filter((n) => n.unread).length;
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={`Notificações, ${unread} não lidas`}
        className="ui-topbar-control ui-topbar-pill relative flex h-12 w-12 items-center justify-center text-text-muted hover:text-text"
      >
        <Notification size={22} variant="Linear" aria-hidden />
        {unread > 0 && (
          <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-surface-raised">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-1.5 w-[360px] overflow-hidden rounded-xl border border-border bg-surface-raised shadow-pop">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-base font-semibold text-text">Notificações</p>
            <button type="button" className="text-sm text-accent hover:underline">Marcar todas como lidas</button>
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {notifications.map((n) => (
              <li key={n.id}>
                <Link to={n.href} onClick={() => setOpen(false)} className="flex gap-3 border-b border-border px-4 py-3 last:border-0 hover:bg-surface">
                  <span aria-hidden className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.unread ? "bg-accent" : "bg-transparent")} />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className={cn("text-base", n.unread ? "font-medium text-text" : "text-text-muted")}>{n.title}</span>
                    <span className="text-sm text-text-muted">{n.body}</span>
                    <span className="text-xs text-text-subtle">{n.time}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link to="/notificacoes" onClick={() => setOpen(false)} className="block border-t border-border px-4 py-2.5 text-center text-sm font-medium text-accent hover:bg-surface">
            Ver todas
          </Link>
        </div>
      )}
    </div>
  );
}

export function Topbar({ onOpenSearch, onOpenMobileNav }: { onOpenSearch: () => void; onOpenMobileNav: () => void }) {
  const { theme, density, setTheme, setDensity } = usePreferences();
  const [unit, setUnit] = useState(clinic.units[0].id);
  const [isScrolled, setIsScrolled] = useState(() => typeof window !== "undefined" && window.scrollY > 8);
  const unitName = clinic.units.find((u) => u.id === unit)?.name;

  useEffect(() => {
    const update = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
  }, []);


  return (
    <header
      data-scrolled={isScrolled ? "true" : "false"}
      className="ms-topbar pointer-events-none sticky top-0 z-30 h-17 min-w-0 shrink-0 px-4 sm:px-6 lg:h-19 lg:px-8"
    >
      <div className="ui-shell-content flex h-full items-center gap-2 sm:gap-3 [&>*]:pointer-events-auto">
      <button type="button" onClick={onOpenMobileNav} aria-label="Abrir menu" className="ui-topbar-control ui-topbar-pill flex h-10 w-10 items-center justify-center text-text-muted hover:text-text lg:hidden">
        <HamburgerMenu size={20} variant="Linear" aria-hidden />
      </button>

      <button
        type="button"
        onClick={onOpenSearch}
        aria-label="Abrir busca global de pacientes, telas e ações"
        title="Buscar (⌘K)"
        className="ui-topbar-control ui-search-trigger group flex h-12 min-w-0 flex-1 max-w-[420px] items-center gap-3 bg-surface-raised px-4 text-base text-text-muted transition-[box-shadow,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <SearchNormal1 size={18} variant="Linear" aria-hidden className="shrink-0 text-text-muted transition-colors group-hover:text-accent" />
        <span className="min-w-0 flex-1 truncate text-left font-medium">Buscar pacientes, telas ou ações...</span>
        <span aria-hidden="true" className="ui-search-shortcut hidden items-center gap-1 sm:flex">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <DropdownMenu
          label="Criar novo"
          items={QUICK_ACTIONS.map((a) => ({ label: a.label, icon: a.icon, href: a.href }))}
          trigger={(p) => (
            <button {...p} type="button" className="ui-button ms-gradient-button hidden h-12 items-center gap-2 rounded-full bg-accent px-5 text-base font-semibold text-on-accent shadow-card hover:bg-accent-strong sm:inline-flex">
              <Add size={20} variant="Linear" aria-hidden />
              Novo
              <ArrowDown2 size={16} variant="Linear" aria-hidden />
            </button>
          )}
        />

        <DropdownMenu
          label="Trocar unidade"
          items={clinic.units.map((u) => ({ label: u.name, icon: u.id === unit ? TickCircle : Building, onSelect: () => setUnit(u.id) }))}
          trigger={(p) => (
            <button {...p} type="button" className="ui-topbar-control ui-topbar-pill hidden h-12 items-center gap-2 whitespace-nowrap px-4 text-base text-text-muted hover:text-text lg:inline-flex">
              <Building size={20} variant="Linear" aria-hidden />
              {unitName}
              <ArrowDown2 size={16} variant="Linear" aria-hidden />
            </button>
          )}
        />

        <NotificationsButton />

        <DropdownMenu
          label="Conta"
          items={[
            { label: "Meu perfil", icon: Profile, href: "/perfil" },
            { label: "Arquivos", icon: FolderOpen, href: "/arquivos" },
            { label: "Registro de atividades", icon: Clock, href: "/logs" },
            { label: "", divider: true },
            { label: "Tema claro", icon: theme === "light" ? TickCircle : Sun1, onSelect: () => setTheme("light") },
            { label: "Tema escuro", icon: theme === "dark" ? TickCircle : Moon, onSelect: () => setTheme("dark") },
            { label: "Seguir o sistema", icon: theme === "system" ? TickCircle : Monitor, onSelect: () => setTheme("system") },
            { label: "", divider: true },
            density === "compact"
              ? { label: "Modo confortável", icon: RowVertical, onSelect: () => setDensity("comfortable") }
              : { label: "Modo compacto", icon: Fatrows, onSelect: () => setDensity("compact") },
            { label: "", divider: true },
            { label: "Sair", icon: LogoutCurve, href: "/login", danger: true },
          ]}
          trigger={(p) => (
            <button {...p} type="button" aria-label={`Conta de ${currentUser.name}`} className="ui-topbar-control ui-topbar-pill flex h-12 items-center gap-2 pl-1.5 pr-4">
              <Avatar name={currentUser.name} size="sm" />
              <span className="hidden flex-col text-left leading-tight xl:flex">
                <span className="text-sm font-medium text-text">{currentUser.name}</span>
                <span className="text-xs text-text-muted">{currentUser.role}</span>
              </span>
              <ArrowDown2 size={16} variant="Linear" aria-hidden className="hidden text-text-subtle xl:block" />
            </button>
          )}
        />
      </div>
      </div>
    </header>
  );
}
