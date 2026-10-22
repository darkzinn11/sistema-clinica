import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError, configureApi } from "@/lib/api/client";
import { clearSession, loadSession, saveSession } from "./storage";
import type { ClinicOption, LoginResponse, StoredSession, UnitOption } from "./types";

export interface LoginInput {
  email: string;
  senha: string;
  /** Só depois que o servidor pediu para escolher a clínica. */
  clinicaId?: string;
  unidadeId?: string;
}

/** O servidor pede para escolher a unidade (depois de validar a senha). */
export class UnitChoiceRequired extends Error {
  readonly units: UnitOption[];
  constructor(units: UnitOption[]) {
    super("Escolha a unidade.");
    this.units = units;
  }
}

/** O servidor pede para escolher a clínica (a pessoa tem conta com o mesmo e-mail e senha em mais de uma). */
export class ClinicChoiceRequired extends Error {
  readonly clinics: ClinicOption[];
  constructor(clinics: ClinicOption[]) {
    super("Escolha a clínica.");
    this.clinics = clinics;
  }
}

interface AuthContextValue {
  session: StoredSession | null;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  can: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<StoredSession | null>(() => loadSession());

  const end = useCallback(() => {
    clearSession();
    setSession(null);
    queryClient.clear();   // nada da clínica anterior pode aparecer para o próximo usuário
  }, [queryClient]);

  useEffect(() => {
    configureApi({ token: () => loadSession()?.accessToken ?? null, onUnauthorized: end });
  }, [end]);

  // Se o prazo vencer com a aba aberta, sai sem esperar a próxima chamada falhar.
  useEffect(() => {
    if (!session) return;
    const left = new Date(session.expiraEm).getTime() - Date.now();
    const timer = window.setTimeout(end, Math.max(0, Math.min(left, 2_147_000_000)));
    return () => window.clearTimeout(timer);
  }, [session, end]);

  const login = useCallback(async (input: LoginInput) => {
    try {
      const response = await api<LoginResponse>("/auth/login", {
        method: "POST", public: true,
        body: { tenantId: input.clinicaId, email: input.email.trim(), senha: input.senha, unidadeId: input.unidadeId },
      });
      const next: StoredSession = { accessToken: response.accessToken, expiraEm: response.expiraEm, usuario: response.usuario };
      queryClient.clear();
      saveSession(next);
      setSession(next);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409 && error.body && typeof error.body === "object") {
        if ("clinicas" in error.body) throw new ClinicChoiceRequired((error.body as { clinicas: ClinicOption[] }).clinicas);
        if ("unidades" in error.body) throw new UnitChoiceRequired((error.body as { unidades: UnitOption[] }).unidades);
      }
      throw error;
    }
  }, [queryClient]);

  const logout = useCallback(async () => {
    try { await api("/auth/logout", { method: "POST" }); } catch { /* sem rede ou já expirada: sai do mesmo jeito */ }
    end();
  }, [end]);

  const value = useMemo<AuthContextValue>(() => ({
    session, login, logout,
    can: (permission) => session?.usuario.permissoes.includes(permission) ?? false,
  }), [session, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth fora do AuthProvider");
  return value;
}

/** Só para telas protegidas: a sessão existe. */
export function useMe() {
  const { session } = useAuth();
  if (!session) throw new Error("useMe fora de uma tela protegida");
  return session.usuario;
}
