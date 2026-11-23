import { useCallback, useEffect, useState } from "react";

export const THEME_STORAGE_KEY = "growco-theme";
export type Theme = "light" | "dark";

const readStoredTheme = (): Theme => {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
};

/**
 * Tema do sistema (área logada). Aplica a classe `dark` no <html> enquanto o
 * layout do app estiver montado e remove ao sair (a landing page não é afetada).
 */
export function useAppTheme() {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    setThemeState(readStoredTheme());
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    return () => root.classList.remove("dark");
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* armazenamento indisponível: o tema vale só nesta sessão */
    }
  }, []);

  return { theme, isDark: theme === "dark", setTheme };
}

/** Para componentes (ex.: gráficos) que precisam saber se está no escuro. */
export function useIsDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const update = () => setDark(root.classList.contains("dark"));
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return dark;
}
