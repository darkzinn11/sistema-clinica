const TZ = "America/Fortaleza";

export function brl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** "13/10/2026" */
export function dateBR(iso: string): string {
  return new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("pt-BR", { timeZone: TZ });
}

/** "13 out" */
export function dateShort(iso: string): string {
  return new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: TZ })
    .replace(".", "");
}

/** "terça-feira, 13 de outubro de 2026" */
export function dateLong(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TZ,
  });
}

/** "14:30" */
export function time(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
}

export function addDaysIso(dateIso: string, days: number): string {
  const d = new Date(`${dateIso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Diferença em dias inteiros entre duas datas ISO (to − from). */
export function daysBetweenIso(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T12:00:00Z`) - Date.parse(`${fromIso}T12:00:00Z`)) / 86_400_000);
}

export function weekdayShort(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short", timeZone: TZ }).replace(".", "");
}

export function age(birthIso: string, refIso: string): number {
  const b = new Date(`${birthIso}T12:00:00`);
  const r = new Date(`${refIso}T12:00:00`);
  let a = r.getFullYear() - b.getFullYear();
  if (r.getMonth() < b.getMonth() || (r.getMonth() === b.getMonth() && r.getDate() < b.getDate())) a -= 1;
  return a;
}

export function pct(n: number, digits = 0): string {
  return `${n.toLocaleString("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: digits })}%`;
}
