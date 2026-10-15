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

/** Layout das telas internas: shell + carregamento sob demanda + volta ao topo ao navegar. */
export function ShellLayout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <AppShell>
      <div key={pathname} className="ui-page-enter">
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </div>
    </AppShell>
  );
}
