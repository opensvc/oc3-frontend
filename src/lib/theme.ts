/**
 * Interface theme: the system one, or an explicit choice.
 *
 * The dark tokens live under the `dark` class (`src/styles/tokens.css`), set here on
 * `<html>`. The choice follows the account, in the user preferences (`theme`), but it
 * is also kept in local storage: preferences arrive after the first render, and
 * without that cache the page would briefly show the other theme on every load.
 */
export const THEMES = ["system", "light", "dark"] as const;

export type Theme = (typeof THEMES)[number];

const STORAGE_KEY = "oc3.theme";

const media = () => window.matchMedia("(prefers-color-scheme: dark)");

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && THEMES.includes(value as Theme);
}

/** Theme cached locally, "system" as long as nothing has been chosen. */
export function cachedTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isTheme(stored) ? stored : "system";
  } catch {
    // Private browsing or storage refused: the system theme will do.
    return "system";
  }
}

export function applyTheme(theme: Theme): void {
  const dark = theme === "dark" || (theme === "system" && media().matches);
  document.documentElement.classList.toggle("dark", dark);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Without the cache the theme stays correct: it is applied again on the next load.
  }
}

/**
 * Follows the system setting as long as the theme is "system". Returns the
 * unsubscribe function.
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
