
import { useEffect, useState } from "react";

export type ThemePref = "light" | "dark" | "system";
export type Density = "comfortable" | "compact";

function read(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // modo privado / armazenamento bloqueado: a preferência só não persiste
  }
}

function applyTheme(pref: ThemePref) {
  const dark = pref === "dark" || (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  if (dark) document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.removeAttribute("data-theme");
}

export function usePreferences() {
  const [theme, setThemeState] = useState<ThemePref>("light");
  const [density, setDensityState] = useState<Density>("comfortable");

  useEffect(() => {
    // lê o que o script de boot já aplicou, pra UI refletir o estado real
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(read("ui-theme", "light") as ThemePref);
    setDensityState(read("ui-density", "comfortable") as Density);
  }, []);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  return {
    theme,
    density,
    setTheme(pref: ThemePref) {
      write("ui-theme", pref);
      applyTheme(pref);
      setThemeState(pref);
    },
    setDensity(d: Density) {
      write("ui-density", d);
      if (d === "compact") document.documentElement.setAttribute("data-density", "compact");
      else document.documentElement.removeAttribute("data-density");
      setDensityState(d);
    },
  };
}

export function useStoredBoolean(key: string, fallback: boolean): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState(fallback);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(read(key, String(fallback)) === "true");
  }, [key, fallback]);
  return [
    value,
    (v: boolean) => {
      write(key, String(v));
      setValue(v);
    },
  ];
}
