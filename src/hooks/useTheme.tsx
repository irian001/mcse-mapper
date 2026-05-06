import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "system" | "retro" | "norton";

interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: "light" | "dark" | "retro" | "norton";
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "auditeletric-theme";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(resolved: "light" | "dark" | "retro" | "norton") {
  const root = document.documentElement;
  root.classList.remove("dark", "retro", "norton");
  if (resolved === "dark") root.classList.add("dark");
  if (resolved === "retro") root.classList.add("retro");
  if (resolved === "norton") root.classList.add("norton");
}

const VALID = ["light", "dark", "system", "retro", "norton"];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "dark";
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    return stored && VALID.includes(stored) ? stored : "dark";
  });

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark" | "retro" | "norton">(() => {
    if (typeof window === "undefined") return "dark";
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    const t = stored && VALID.includes(stored) ? stored : "dark";
    return t === "system" ? getSystemTheme() : (t as "light" | "dark" | "retro" | "norton");
  });

  useEffect(() => {
    const resolved = theme === "system" ? getSystemTheme() : theme;
    setResolvedTheme(resolved);
    applyTheme(resolved);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const resolved = getSystemTheme();
      setResolvedTheme(resolved);
      applyTheme(resolved);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme: setThemeState }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
