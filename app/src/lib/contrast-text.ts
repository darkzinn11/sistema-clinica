/**
 * Decide branco ou preto pro texto em cima de uma cor de fundo dinâmica
 * (cor vem de dado do usuário — tipo de senha, config do painel — não dá
 * pra fixar um token). Mesma fórmula de luminância do contrast.py do
 * replica-design.
 */
export function readableTextColor(backgroundHex: string): "#ffffff" | "#161a20" {
  const hex = backgroundHex.replace("#", "");
  const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const chan = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
  return luminance > 0.45 ? "#161a20" : "#ffffff";
}
