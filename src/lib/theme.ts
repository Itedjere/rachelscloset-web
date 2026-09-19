/*
 * Read the stored preference, fall back to the system setting, and stamp
 * data-theme on <html>. Applied before React mounts so there is no flash of the
 * wrong theme.
 */

export type Theme = "light" | "dark";

const STORAGE_KEY = "rc-theme";

function stored(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "dark" || value === "light" ? value : null;
  } catch {
    return null;
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);

  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Theme just won't persist between visits.
  }
}

/** Called from the entry point before the first paint. */
export function bootstrapTheme(): Theme {
  const theme =
    stored() ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

  document.documentElement.setAttribute("data-theme", theme);

  return theme;
}
