/**
 * Thème de l'interface : celui du système, ou un choix explicite.
 *
 * Les tokens sombres vivent sous la classe `dark` (`src/styles/tokens.css`), posée
 * ici sur `<html>`. Le choix suit le compte, dans les préférences utilisateur
 * (`theme`), mais il est aussi gardé dans le stockage local : les préférences
 * arrivent après le premier rendu, et sans ce cache la page s'afficherait un instant
 * dans l'autre thème à chaque chargement.
 */
export const THEMES = ["system", "light", "dark"] as const;

export type Theme = (typeof THEMES)[number];

const STORAGE_KEY = "oc3.theme";

const media = () => window.matchMedia("(prefers-color-scheme: dark)");

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && THEMES.includes(value as Theme);
}

/** Thème mis en cache localement, « système » tant que rien n'a été choisi. */
export function cachedTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isTheme(stored) ? stored : "system";
  } catch {
    // Navigation privée ou stockage refusé : le thème du système fera l'affaire.
    return "system";
  }
}

export function applyTheme(theme: Theme): void {
  const dark = theme === "dark" || (theme === "system" && media().matches);
  document.documentElement.classList.toggle("dark", dark);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Sans cache, le thème reste correct : il sera réappliqué au chargement suivant.
  }
}

/**
 * Suit le réglage du système tant que le thème vaut « système ». Rend la fonction
 * de désabonnement.
 */
export function watchSystemTheme(current: () => Theme): () => void {
  const query = media();
  const onChange = () => {
    if (current() === "system") applyTheme("system");
  };
  query.addEventListener("change", onChange);
  return () => {
    query.removeEventListener("change", onChange);
  };
}
