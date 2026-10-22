/** Utilitários de data e hora da agenda. Datas são "AAAA-MM-DD" e horas "HH:mm", sempre no relógio da clínica. */

export function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function hm(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

/** 0 = domingo … 6 = sábado (a mesma convenção das grades do backend). */
export function weekday(iso: string): number {
  return new Date(`${iso}T12:00:00Z`).getUTCDay();
}

export function mondayOf(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  const back = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
}

/** Hoje e agora no relógio do navegador (a recepção fica na mesma cidade da clínica). */
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function nowMin(): number {
  return toMin(nowTime());
}

/** O backend manda "2026-10-21T14:20:00-03:00" com a hora da clínica: a hora está no próprio texto. */
export function clock(iso: string): string {
  return iso.slice(11, 16);
}
