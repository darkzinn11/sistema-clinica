import { Suspense, useEffect } from "react";
import { Outlet, useLocation, useMatches } from "react-router";
import { AppShell } from "./app-shell";
import { Skeleton } from "@/components/ui/misc";

function PageFallback() {
  return (
    <div className="flex w-full flex-col gap-4" aria-busy="true" aria-label="Carregando">
      <Skeleton className="h-7 w-56" />
      <Skeleton className="h-4 w-80" />
      <Skeleton className="mt-4 h-64 w-full" />
    </div>
  );
}

/** Telas já ligadas ao backend. As demais ainda mostram dados de exemplo e avisam. */
const REAL_ROUTES = [
  "/inicio", "/agenda", "/agenda/semana", "/agenda/salas", "/agenda/check-in", "/agenda/mapa", "/agenda/confirmacoes",
  "/agenda/equipamentos", "/agenda/valores", "/cadastros/locais", "/cadastros/equipamentos", "/perfil", "/espera", "/senhas", "/configuracoes/totem-e-guiches",
];

function isReal(pathname: string): boolean {
  const clean = pathname.replace(/\/$/, "") || "/";
  return REAL_ROUTES.includes(clean) || clean.startsWith("/pacientes");
}

function DemoNotice() {
  return (
    <div role="note" className="mb-4 rounded-lg bg-warning-bg px-4 py-2.5 text-sm text-warning">
      <strong>Tela de demonstração.</strong> Os dados abaixo são de exemplo e ainda não vêm do sistema.
    </div>
  );
}

/**
 * Chave da tela: a rota (e seus parâmetros), não o endereço inteiro. Em telas com abas que são rotas
 * (/configuracoes/*, /pacientes/:id/*), trocar de aba muda o endereço mas não a tela — e a tela não pode
 * ser recriada, senão as abas não deslizam e a página volta ao topo.
 */
function usePageKey(): string {
  const matches = useMatches();
  const leaf = matches[matches.length - 1];
  if (!leaf) return "";
  const params = Object.entries(leaf.params).filter(([name]) => name !== "*");
  return `${leaf.id}:${params.map(([name, value]) => `${name}=${value}`).join("&")}`;
}

/** Layout das telas internas: shell + carregamento sob demanda + volta ao topo ao trocar de tela. */
export function ShellLayout() {
  const { pathname } = useLocation();
  const pageKey = usePageKey();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pageKey]);
  return (
    <AppShell>
      <div key={pageKey} className="ui-page-enter">
        {!isReal(pathname) && <DemoNotice />}
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </div>
    </AppShell>
  );
}
