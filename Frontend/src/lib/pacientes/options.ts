/** Listas fixas dos campos do cadastro de paciente (as da tela Pacientes > Inserir do Feegow que não são cadastro da clínica). */
/** "Não informado" é o campo vazio (primeira opção do seletor), não um valor guardado. */
export const SEXES = ["Feminino", "Masculino", "Outro"];
export const CIVIL_STATUS = ["Solteiro(a)", "Casado(a)", "União estável", "Separado(a)", "Divorciado(a)", "Viúvo(a)"];
export const EDUCATION_LEVELS = [
  "Sem escolaridade", "Fundamental incompleto", "Fundamental completo", "Médio incompleto", "Médio completo",
  "Superior incompleto", "Superior completo", "Pós-graduação",
];
export const SKIN_COLORS = ["Branca", "Preta", "Parda", "Amarela", "Indígena", "Não informada"];
export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];
export const IDENTIFICATION_COLORS = ["#16A34A", "#2563EB", "#9333EA", "#DB2777", "#EA580C", "#CA8A04", "#0891B2", "#475569"];

export const onlyDigits = (value: string) => value.replace(/\D/g, "");

export function formatCpf(value: string | null): string {
  const d = onlyDigits(value ?? "");
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : value ?? "";
}

export function formatPhone(value: string | null): string {
  const d = onlyDigits(value ?? "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return value ?? "";
}

export function formatCep(value: string | null): string {
  const d = onlyDigits(value ?? "");
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : value ?? "";
}

export function ageFrom(birth: string | null, today = new Date()): number | null {
  if (!birth) return null;
  const [y, m, d] = birth.split("-").map(Number);
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age -= 1;
  return age;
}
