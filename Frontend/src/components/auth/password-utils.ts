/** Checagem de força de senha — compartilhada entre login, perfil e redefinição. */
export interface PasswordChecks {
  length: boolean;
  upper: boolean;
  lower: boolean;
  number: boolean;
  symbol: boolean;
}

export function passwordChecks(password: string): PasswordChecks {
  return {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
}

export function passwordScore(password: string): number {
  if (!password) return 0;
  const checks = passwordChecks(password);
  return Object.values(checks).filter(Boolean).length;
}
