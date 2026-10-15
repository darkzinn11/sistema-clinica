"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/login/actions";

const LINKS = [
  { href: "/agenda", label: "Agenda" },
  { href: "/checkin", label: "Check-in" },
  { href: "/confirmacoes", label: "Confirmações" },
  { href: "/espera", label: "Sala de espera" },
  { href: "/senhas", label: "Chamar senha" },
  { href: "/configuracoes", label: "Configurações" },
];

export function TopNav() {
  const pathname = usePathname();
  return (
    <header className="border-b border-border bg-surface-raised">
      <div className="mx-auto flex max-w-6xl items-center gap-4 overflow-x-auto px-6 py-3 sm:gap-6">
        <span className="shrink-0 text-base font-semibold text-text">Clínica</span>
        <nav className="flex shrink-0 items-center gap-1" aria-label="Navegação principal">
          {LINKS.map((link) => {
            const active = pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-base font-medium transition-colors ${
                  active ? "bg-accent-muted text-accent" : "text-text-muted hover:bg-surface hover:text-text"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <form action={signOutAction} className="ml-auto shrink-0">
          <button type="submit" className="text-sm text-text-muted underline hover:text-text">
            Sair
          </button>
        </form>
      </div>
    </header>
  );
}
