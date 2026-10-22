import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@/lib/auth/auth";

/** Telas internas só com sessão; sem ela, volta ao login e depois para onde a pessoa queria ir. */
export function RequireAuth() {
  const { session } = useAuth();
  const location = useLocation();
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}
