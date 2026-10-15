import Link from "next/link";

const SECTIONS = [
  { href: "/configuracoes/tipos-de-senha", label: "Tipos de Senha" },
  { href: "/configuracoes/guiches", label: "Guichês" },
  { href: "/configuracoes/chamada-de-tv", label: "Chamada de TV" },
];

export default function ConfiguracoesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <nav aria-label="Opções de configuração" className="flex shrink-0 flex-row gap-1 md:w-56 md:flex-col">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-md px-3 py-2 text-base font-medium text-text-muted hover:bg-surface hover:text-text"
          >
            {s.label}
          </Link>
        ))}
      </nav>
      <div className="flex-1">{children}</div>
    </div>
  );
}
