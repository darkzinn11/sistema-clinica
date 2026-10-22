import { Suspense, useEffect } from "react";
import { Outlet, useLocation } from "react-router";
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
const REAL_ROUTES = ["/inicio", "/agenda", "/agenda/semana", "/agenda/salas", "/agenda/check-in"];

function DemoNotice() {
  return (
    <div role="note" className="mb-4 rounded-lg bg-warning-bg px-4 py-2.5 text-sm text-warning">
      <strong>Tela de demonstração.</strong> Os dados abaixo são de exemplo e ainda não vêm do sistema.
    </div>
  );
}

/** Layout das telas internas: shell + carregamento sob demanda + volta ao topo ao navegar. */
export function ShellLayout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <AppShell>
      <div key={pathname} className="ui-page-enter">
        {!REAL_ROUTES.includes(pathname.replace(/\/$/, "") || "/") && <DemoNotice />}
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </div>
    </AppShell>
  );
}
