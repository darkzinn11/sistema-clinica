import { useCallback, useEffect, useState } from "react";

/**
 * Favoritos e "vistos recentemente" do catálogo de relatórios. Guardado em
 * localStorage só pra sobreviver à navegação entre o catálogo e um relatório
 * dentro do protótipo — não é persistência de backend.
 */

const FAVORITES_KEY = "vp.relatorios.favoritos";
const RECENTS_KEY = "vp.relatorios.recentes";
const MAX_RECENTS = 6;

function readList(key: string): string[] {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function writeList(key: string, value: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Armazenamento indisponível (modo privado etc.) — ignora silenciosamente.
  }
}

export function useFavoriteReports() {
  const [favorites, setFavorites] = useState<string[]>(() => readList(FAVORITES_KEY));

  const toggle = useCallback((slug: string) => {
    setFavorites((prev) => {
      const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug];
      writeList(FAVORITES_KEY, next);
      return next;
    });
  }, []);

  const isFavorite = useCallback((slug: string) => favorites.includes(slug), [favorites]);

  return { favorites, toggle, isFavorite };
}

export function useRecentReports() {
  const [recents, setRecents] = useState<string[]>(() => readList(RECENTS_KEY));

  const register = useCallback((slug: string) => {
    setRecents((prev) => {
      const next = [slug, ...prev.filter((s) => s !== slug)].slice(0, MAX_RECENTS);
      writeList(RECENTS_KEY, next);
      return next;
    });
  }, []);

  return { recents, register };
}

/** Registra a visita assim que a tela de relatório monta. */
export function useRegisterRecentReport(slug: string | undefined) {
  const { register } = useRecentReports();
  useEffect(() => {
    if (slug) register(slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);
}
