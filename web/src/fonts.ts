/**
 * Fontes da interface.
 *
 * - Gilroy (Radomir Tinkov): os .woff2 em src/assets/fonts/gilroy/ são
 *   detectados no build. Com a família completa (Regular + Medium/SemiBold),
 *   ela vira a fonte de tudo. Com só o pacote FREE (Light + ExtraBold), fica
 *   nos títulos e números de destaque (`font-display`) — usar Light no corpo
 *   deixaria texto de 14px fino demais e a hierarquia de pesos confusa.
 * - Plus Jakarta Sans (OFL): corpo do texto e fallback.
 *
 * Pra ativar a família completa, basta adicionar os arquivos com o peso no
 * nome (Gilroy-Regular.woff2, Gilroy-Medium.woff2, Gilroy-SemiBold.woff2,
 * Gilroy-Bold.woff2) — nada mais muda.
 */
import "@fontsource-variable/plus-jakarta-sans";

const WEIGHTS: [RegExp, number][] = [
  [/thin|hairline/i, 100],
  [/ultra-?light|extra-?light/i, 200],
  [/light/i, 300],
  [/semi-?bold/i, 600],
  [/extra-?bold|ultra-?bold/i, 800],
  [/heavy|black/i, 900],
  [/bold/i, 700],
  [/medium/i, 500],
  [/regular|book|normal/i, 400],
];

const files = import.meta.glob("./assets/fonts/gilroy/*.{woff2,woff}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const faces = Object.entries(files).map(([path, url]) => {
  const name = path.split("/").pop() ?? "";
  return {
    url,
    weight: WEIGHTS.find(([re]) => re.test(name))?.[1] ?? 400,
    style: /italic/i.test(name) ? "italic" : "normal",
    format: name.endsWith(".woff2") ? "woff2" : "woff",
  };
});

if (faces.length > 0) {
  const tag = document.createElement("style");
  tag.dataset.font = "gilroy";
  tag.textContent = faces
    .map(
      (f) =>
        `@font-face{font-family:"Gilroy";src:url("${f.url}") format("${f.format}");font-weight:${f.weight};font-style:${f.style};font-display:swap;}`,
    )
    .join("\n");
  document.head.appendChild(tag);

  const weights = new Set(faces.map((f) => f.weight));
  const fullFamily = weights.has(400) && (weights.has(500) || weights.has(600));
  document.documentElement.dataset.gilroy = fullFamily ? "full" : "display";
}
