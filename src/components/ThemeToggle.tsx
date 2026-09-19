import { useState } from "react";
import { applyTheme, type Theme } from "../lib/theme";
import Icon from "./Icon";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(
    () => (document.documentElement.getAttribute("data-theme") as Theme) ?? "light",
  );

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  }

  return (
    <button
      type="button"
      className="icon-btn"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light" : "Switch to dark"}
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} />
    </button>
  );
}
