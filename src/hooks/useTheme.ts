"use client";

import { useCallback, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark";

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>("light");

  // Leer inicial (mantener light en SSR y solo aplicar dark si usuario lo tenía guardado, después del primer paint)
  useEffect(() => {
    const stored = window.localStorage.getItem("theme") as ThemeMode | null;
    const body = document.body;
    if (stored === "dark") {
      setTheme("dark");
      body.classList.add("dark");
    } else {
      body.classList.remove("dark");
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next: ThemeMode = prev === "light" ? "dark" : "light";
      window.localStorage.setItem("theme", next);
      document.body.classList.toggle("dark", next === "dark");
      return next;
    });
  }, []);

  const setThemeExplicit = useCallback((next: ThemeMode) => {
    setTheme(next);
    window.localStorage.setItem("theme", next);
    document.body.classList.toggle("dark", next === "dark");
  }, []);

  return { theme, toggleTheme, setTheme: setThemeExplicit };
}