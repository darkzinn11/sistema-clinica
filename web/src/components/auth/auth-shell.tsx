import { TickCircle } from "iconsax-reactjs";
import { Link } from "react-router";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/shell/brand-logo";

const BENEFITS = [
  "Agenda, recepção e prontuário em um só lugar",
  "Confirmação automática por WhatsApp",
  "Faturamento TISS sem planilha paralela",
];

/** Painel de marca + formulário, lado a lado. Usado na tela de login. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <div className="relative hidden w-full shrink-0 flex-col justify-between overflow-hidden bg-accent px-10 py-10 text-on-accent lg:flex lg:w-[42%] xl:w-[38%]">
        <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.08]" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
          {Array.from({ length: 9 }).map((_, row) =>
            Array.from({ length: 6 }).map((_, col) => <circle key={`${row}-${col}`} cx={col * 80 + (row % 2) * 40} cy={row * 90} r={3} fill="currentColor" />),
          )}
        </svg>
        <Link to="/login" className="relative z-10 flex items-center">
          <img src="/Logos/Mono.svg" alt="MultiSaúde" className="h-7 w-auto" />
        </Link>
        <div className="relative z-10 flex flex-col gap-5">
          <h2 className="font-display text-2xl font-semibold leading-snug">Sua clínica, organizada do jeito que deveria ser.</h2>
          <ul className="flex flex-col gap-3 text-sm text-on-accent/90">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-2.5">
                <TickCircle size={18} variant="Bold" className="mt-0.5 shrink-0" aria-hidden />
                {b}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative z-10 text-xs text-on-accent/70">© 2026 MultiSaúde</p>
      </div>
      <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}

/** Layout centrado e mais leve — recuperação/redefinição de senha. */
export function AuthCenteredLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-bg px-6 py-12">
      <Link to="/login" className="flex items-center">
        <BrandLogo className="h-7 w-auto" />
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
