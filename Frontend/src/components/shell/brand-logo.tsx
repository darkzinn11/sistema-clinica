import { useEffect, useState } from "react";

function isDarkTheme() {
  return document.documentElement.getAttribute("data-theme") === "dark";
}

/** Acompanha o tema realmente aplicado no <html>, inclusive quando a preferência é "sistema". */
function useIsDarkTheme() {
  const [dark, setDark] = useState(isDarkTheme);

  useEffect(() => {
    const observer = new MutationObserver(() => setDark(isDarkTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return dark;
}

/** Marca conforme tema e estado da barra lateral; mantém os arquivos originais. */
export function BrandLogo({ className, reduced = false }: { className?: string; reduced?: boolean }) {
  const dark = useIsDarkTheme();
  const src = reduced
    ? (dark ? "/Logos/mono%20reduzido.svg" : "/Logos/colorida%20reduzida.svg")
    : (dark ? "/Logos/Mono.svg" : "/Logos/Colorida.svg");
  return <img src={src} alt="MultiSaúde" className={className} />;
}
