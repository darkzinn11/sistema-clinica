import { Link } from "react-router";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/shell/brand-logo";

/**
 * Tela cheia: fundo branco com brilhos suaves da marca nos cantos, painel verde arredondado com título,
 * subtítulo e ilustração à esquerda, e o formulário centralizado à direita (logo no topo). No celular, só o formulário.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="ms-auth flex min-h-screen lg:p-8 xl:p-10">
      <div className="ms-auth__panel relative hidden w-[46%] max-w-[860px] shrink-0 flex-col overflow-hidden rounded-[48px] px-12 pt-16 lg:flex xl:px-16 xl:pt-20">
        <h2 className="max-w-[460px] font-display text-[36px] font-bold leading-[1.15] tracking-tight text-white xl:text-[44px]">
          Sua clínica organizada em um só lugar
        </h2>
        <p className="mt-4 max-w-[400px] text-base leading-relaxed text-white/85 xl:text-lg">
          Agenda, recepção, prontuário e faturamento num painel simples para toda a equipe.
        </p>
        <img
          src="/illustrations/globais/graficos-sem-dados.svg"
          alt=""
          aria-hidden="true"
          draggable={false}
          className="pointer-events-none mt-auto aspect-[4/3] w-[92%] max-w-[600px] self-center object-cover"
        />
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-[400px]">
          <Link to="/login" className="mb-8 flex items-center justify-center">
            <BrandLogo className="h-11 w-auto" />
          </Link>
          {children}
        </div>
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
