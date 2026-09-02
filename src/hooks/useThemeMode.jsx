import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { THEMES } from "@/lib/colorPalettes";

const ThemeContext = createContext();

function toRgb(hex) {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `${r} ${g} ${b}`;
}

function injectThemeCSS(mode) {
  const theme = THEMES[mode];
  let styleEl = document.getElementById("theme-tokens");
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "theme-tokens";
    document.head.appendChild(styleEl);
  }
  const s = theme.salon;
  const m = theme.m3;
  const salonVars = [
    `  --salon-bg: ${toRgb(s.bg)};`,
    `  --salon-surface: ${toRgb(s.surface)};`,
    `  --salon-primary: ${toRgb(s.primary)};`,
    `  --salon-primary-hover: ${toRgb(s["primary-hover"])};`,
    `  --salon-text-main: ${toRgb(s["text-main"])};`,
    `  --salon-text-muted: ${toRgb(s["text-muted"])};`,
    `  --salon-border: ${toRgb(s.border)};`,
    "",
    `  --salon-bg-hex: ${s.bg};`,
    `  --salon-surface-hex: ${s.surface};`,
    `  --salon-primary-hex: ${s.primary};`,
    `  --salon-primary-hover-hex: ${s["primary-hover"]};`,
    `  --salon-text-main-hex: ${s["text-main"]};`,
    `  --salon-text-muted-hex: ${s["text-muted"]};`,
    `  --salon-border-hex: ${s.border};`,
  ];
  const m3Vars = Object.entries(m)
    .map(([key, val]) => `  --${key}: ${toRgb(val)};`)
    .join("\n");
  const m3HexVars = Object.entries(m)
    .filter(([key]) => !key.startsWith("on-"))
    .map(([key, val]) => `  --${key}-hex: ${val};`)
    .join("\n");
  styleEl.textContent = `:root {\n${salonVars.join("\n")}\n${m3Vars}\n${m3HexVars}\n}`;
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem("theme_mode") || "dark");

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(mode);
    root.style.colorScheme = mode;
    injectThemeCSS(mode);
    localStorage.setItem("theme_mode", mode);
  }, [mode]);

  const toggleTheme = useCallback(() => {
    setMode(prev => prev === "dark" ? "light" : "dark");
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeMode() {
  const ctx = useContext(ThemeContext);
  const mode = ctx?.mode || "dark";
  const isDark = mode === "dark";
  const s = THEMES[mode].salon;

  return {
    isDark,
    mode,
    sidebarBg: s.surface,
    sidebarBorder: s.border,
    sidebarHover: s.border,
    sidebarActive: `linear-gradient(135deg, ${s.primary}, ${s["primary-hover"]})`,
    sidebarText: s["text-muted"],
    sidebarTextActive: isDark ? s.bg : "#ffffff",
    contentBg: s.bg,
    cardBg: s.surface,
    cardBorder: s.border,
    cardText: s["text-main"],
    cardTextMuted: s["text-muted"],
    pageBg: s.bg,
    mutedText: s["text-muted"],
    heroOverlay: isDark
      ? "linear-gradient(160deg, rgba(18,18,18,0.98), rgba(245,158,11,0.06))"
      : "linear-gradient(160deg, rgba(249,249,249,0.98), rgba(183,0,94,0.06))",
    accentGlow: isDark ? "rgba(245,158,11,0.10)" : "rgba(183,0,94,0.08)",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    info: isDark ? "#F59E0B" : "#db2777",
  };
}

export function useToggleTheme() {
  const ctx = useContext(ThemeContext);
  return ctx?.toggleTheme || (() => {});
}
