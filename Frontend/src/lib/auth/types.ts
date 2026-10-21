/** Formato do que o backend devolve em /auth/login e /auth/me. */
export interface Me {
  usuarioId: string;
  tenantId: string;
  unidadeId: string;
  nome: string;
  email: string;
  papel: string;
  permissoes: string[];
  clinicaNome: string;
  unidadeNome: string;
  codigoClinica: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiraEm: string;
  usuario: Me;
}

export interface StoredSession {
  accessToken: string;
  expiraEm: string;
  usuario: Me;
}

export interface UnitOption {
  id: string;
  nome: string;
}
