"use client";

import { useEffect, useState } from "react";

// Same key as the script in app/layout.tsx that sets the theme before the page paints
export const THEME_STORAGE_KEY = "vh-theme";

type Theme = "light" | "dark";

// The theme in use right now: the explicit choice if there is one, otherwise the system setting
function currentTheme(): Theme {
  const picked = document.documentElement.dataset.theme;
  if (picked === "light" || picked === "dark") return picked;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(currentTheme());
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private mode or blocked storage: the theme still changes for this visit
    }
    setTheme(next);
  }

  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
      title={isDark ? "โหมดสว่าง" : "โหมดมืด"}
      className="btn btn-ghost"
      style={{ minHeight: 40, padding: "0.4rem 0.9rem", whiteSpace: "nowrap" }}
    >
      {isDark ? "☀ สว่าง" : "☾ มืด"}
    </button>
  );
}
