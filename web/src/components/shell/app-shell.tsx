
import { useLocation } from "react-router";
import { type ReactNode, useEffect, useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { CommandPalette } from "./command-palette";
import { useStoredBoolean } from "./preferences";

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useStoredBoolean("ui-sidebar-collapsed", false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = useLocation().pathname;

  useEffect(() => {
    // fecha o menu mobile ao trocar de tela
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="ms-app-shell flex min-h-screen min-w-0 bg-bg" data-sidebar-collapsed={collapsed ? "true" : "false"}>
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-on-accent">
        Pular para o conteúdo
      </a>

      <div className="sticky top-0 hidden h-screen shrink-0 py-3 pl-3 lg:block">
        <Sidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed(!collapsed)} />
      </div>

      {mobileOpen && (
        <div className="ui-backdrop-enter fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-overlay" onClick={() => setMobileOpen(false)} aria-hidden />
          <div className="ui-mobile-sidebar-enter relative h-full w-fit shadow-pop">
            <Sidebar collapsed={false} mobile onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenSearch={() => setSearchOpen(true)} onOpenMobileNav={() => setMobileOpen(true)} />
        <main id="conteudo" className="min-w-0 flex-1 px-4 pb-8 pt-6 sm:px-6 lg:px-8 lg:pt-7">
          <div className="ui-shell-content">
            {children}
          </div>
        </main>
      </div>

      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
