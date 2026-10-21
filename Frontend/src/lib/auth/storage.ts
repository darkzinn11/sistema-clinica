import type { StoredSession } from "./types";

// Decisão do dono do produto: o token fica em localStorage (a sessão sobrevive a fechar a aba).
// Mitigações: sessão com prazo, logout que revoga no servidor, e nunca renderizar HTML vindo da API.
const SESSION_KEY = "multisaude.sessao";
const CLINIC_KEY = "multisaude.clinica";

export function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as StoredSession;
    if (!session.accessToken || !session.usuario || new Date(session.expiraEm).getTime() <= Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function saveSession(session: StoredSession) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* modo privado: a sessão vale só nesta aba */ }
}

export function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch { /* nada a limpar */ }
}

/** O código da clínica não é segredo: lembrar poupa digitar a cada entrada. */
export function lastClinicCode(): string {
  try { return localStorage.getItem(CLINIC_KEY) ?? ""; } catch { return ""; }
}

export function rememberClinicCode(code: string) {
  try { localStorage.setItem(CLINIC_KEY, code); } catch { /* sem lembrança */ }
}
