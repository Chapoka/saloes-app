import { useState, useEffect, useCallback, createContext, useContext } from "react";

const PALETTE_THEMES = {
  barbearia_amber: {
    sidebarBg: "#1A1A1A",
    sidebarBorder: "#2A2A2A",
    sidebarHover: "#252525",
    sidebarActive: "linear-gradient(135deg, #F5A623, #C8A97E)",
    sidebarText: "#A0A0A0",
    sidebarTextActive: "#1A1A1A",
    contentBg: "#121212",
    cardBg: "#1E1E1E",
    cardBorder: "#2A2A2A",
    cardText: "#FAFAFA",
    cardTextMuted: "#9E9E9E",
    heroOverlay: "linear-gradient(160deg, rgba(26,26,26,0.98), rgba(245,166,35,0.08))",
    accentGlow: "rgba(245,166,35,0.12)",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    info: "#6366F1",
  },
  barbearia_cyber: {
    sidebarBg: "#1A1A2E",
    sidebarBorder: "#2A2A40",
    sidebarHover: "#22223A",
    sidebarActive: "linear-gradient(135deg, #FF1744, #FF5252)",
    sidebarText: "#9E9EB0",
    sidebarTextActive: "#FFFFFF",
    contentBg: "#0F0F1A",
    cardBg: "#1A1A2E",
    cardBorder: "#2A2A40",
    cardText: "#FAFAFA",
    cardTextMuted: "#9E9EB0",
    heroOverlay: "linear-gradient(160deg, rgba(26,26,46,0.98), rgba(255,23,68,0.08))",
    accentGlow: "rgba(0,229,255,0.12)",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    info: "#00E5FF",
  },
  barbearia_kinetic: {
    sidebarBg: "#0b1326",
    sidebarBorder: "#162038",
    sidebarHover: "#121D35",
    sidebarActive: "linear-gradient(135deg, #00BCD4, #00E5FF)",
    sidebarText: "#7A8BA0",
    sidebarTextActive: "#FFFFFF",
    contentBg: "#0b1326",
    cardBg: "#111B30",
    cardBorder: "#1C2A45",
    cardText: "#E8F0FE",
    cardTextMuted: "#7A8BA0",
    heroOverlay: "linear-gradient(160deg, rgba(11,19,38,0.98), rgba(0,188,212,0.08))",
    accentGlow: "rgba(0,229,255,0.12)",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    info: "#00E5FF",
  },
  salao: {
    sidebarBg: "#FFFFFF",
    sidebarBorder: "#F1F5F9",
    sidebarHover: "#FFF1F5",
    sidebarActive: "linear-gradient(135deg, #DB2777, #EC4899)",
    sidebarText: "#64748B",
    sidebarTextActive: "#FFFFFF",
    contentBg: "#F8FAFC",
    cardBg: "#FFFFFF",
    cardBorder: "#F1F5F9",
    cardText: "#0F172A",
    cardTextMuted: "#94A3B8",
    heroOverlay: "linear-gradient(160deg, rgba(255,255,255,0.98), rgba(252,231,245,0.4))",
    accentGlow: "rgba(219,39,119,0.08)",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    info: "#6366F1",
  },
  clinica: {
    sidebarBg: "#FFFFFF",
    sidebarBorder: "#F1F5F9",
    sidebarHover: "#ECFDF5",
    sidebarActive: "linear-gradient(135deg, #059669, #10B981)",
    sidebarText: "#64748B",
    sidebarTextActive: "#FFFFFF",
    contentBg: "#F8FAFC",
    cardBg: "#FFFFFF",
    cardBorder: "#F1F5F9",
    cardText: "#0F172A",
    cardTextMuted: "#94A3B8",
    heroOverlay: "linear-gradient(160deg, rgba(255,255,255,0.98), rgba(209,250,229,0.4))",
    accentGlow: "rgba(5,150,105,0.08)",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    info: "#0EA5E9",
  },
  studio: {
    sidebarBg: "#FFFFFF",
    sidebarBorder: "#F1F5F9",
    sidebarHover: "#F5F3FF",
    sidebarActive: "linear-gradient(135deg, #7C3AED, #8B5CF6)",
    sidebarText: "#64748B",
    sidebarTextActive: "#FFFFFF",
    contentBg: "#F8FAFC",
    cardBg: "#FFFFFF",
    cardBorder: "#F1F5F9",
    cardText: "#0F172A",
    cardTextMuted: "#94A3B8",
    heroOverlay: "linear-gradient(160deg, rgba(255,255,255,0.98), rgba(245,243,255,0.4))",
    accentGlow: "rgba(124,58,237,0.08)",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    info: "#6366F1",
  },
};

const DARK_OVERRIDES = {
  barbearia_amber: {
    sidebarBg: "#1A1A1A",
    sidebarBorder: "#2A2A2A",
    sidebarHover: "#252525",
    sidebarActive: "linear-gradient(135deg, #F5A623, #C8A97E)",
    sidebarText: "#B0B0B0",
    sidebarTextActive: "#1A1A1A",
    contentBg: "#121212",
    cardBg: "#1E1E1E",
    cardBorder: "#2A2A2A",
    cardText: "#FAFAFA",
    cardTextMuted: "#9E9E9E",
    heroOverlay: "linear-gradient(160deg, rgba(18,18,18,0.97), rgba(245,166,35,0.1))",
    accentGlow: "rgba(245,166,35,0.15)",
  },
  barbearia_cyber: {
    sidebarBg: "#1A1A2E",
    sidebarBorder: "#2A2A40",
    sidebarHover: "#22223A",
    sidebarActive: "linear-gradient(135deg, #FF1744, #FF5252)",
    sidebarText: "#9E9EB0",
    sidebarTextActive: "#FFFFFF",
    contentBg: "#0F0F1A",
    cardBg: "#1A1A2E",
    cardBorder: "#2A2A40",
    cardText: "#FAFAFA",
    cardTextMuted: "#9E9EB0",
    heroOverlay: "linear-gradient(160deg, rgba(15,15,26,0.97), rgba(255,23,68,0.1))",
    accentGlow: "rgba(0,229,255,0.15)",
  },
  barbearia_kinetic: {
    sidebarBg: "#0b1326",
    sidebarBorder: "#162038",
    sidebarHover: "#121D35",
    sidebarActive: "linear-gradient(135deg, #00BCD4, #00E5FF)",
    sidebarText: "#7A8BA0",
    sidebarTextActive: "#FFFFFF",
    contentBg: "#0b1326",
    cardBg: "#111B30",
    cardBorder: "#1C2A45",
    cardText: "#E8F0FE",
    cardTextMuted: "#7A8BA0",
    heroOverlay: "linear-gradient(160deg, rgba(11,19,38,0.97), rgba(0,188,212,0.1))",
    accentGlow: "rgba(0,229,255,0.15)",
  },
  salao: {
    sidebarBg: "#0b1326",
    sidebarBorder: "#1E293B",
    sidebarHover: "#171f33",
    sidebarActive: "linear-gradient(135deg, #571bc1, #c0c1ff)",
    sidebarText: "#c7c4d7",
    sidebarTextActive: "#FFFFFF",
    contentBg: "#0b1326",
    cardBg: "#1E293B",
    cardBorder: "#2d3449",
    cardText: "#dae2fd",
    cardTextMuted: "#c7c4d7",
    heroOverlay: "linear-gradient(160deg, rgba(11,19,38,0.97), rgba(30,41,59,0.9))",
    accentGlow: "rgba(87,27,193,0.15)",
  },
  clinica: {
    sidebarBg: "#0b1326",
    sidebarBorder: "#1E293B",
    sidebarHover: "#171f33",
    sidebarActive: "linear-gradient(135deg, #10B981, #c0c1ff)",
    sidebarText: "#c7c4d7",
    sidebarTextActive: "#FFFFFF",
    contentBg: "#0b1326",
    cardBg: "#1E293B",
    cardBorder: "#2d3449",
    cardText: "#dae2fd",
    cardTextMuted: "#c7c4d7",
    heroOverlay: "linear-gradient(160deg, rgba(11,19,38,0.97), rgba(30,41,59,0.9))",
    accentGlow: "rgba(16,185,129,0.15)",
  },
  studio: {
    sidebarBg: "#0b1326",
    sidebarBorder: "#1E293B",
    sidebarHover: "#171f33",
    sidebarActive: "linear-gradient(135deg, #c0c1ff, #ffb95f)",
    sidebarText: "#c7c4d7",
    sidebarTextActive: "#0d0096",
    contentBg: "#0b1326",
    cardBg: "#1E293B",
    cardBorder: "#2d3449",
    cardText: "#dae2fd",
    cardTextMuted: "#c7c4d7",
    heroOverlay: "linear-gradient(160deg, rgba(11,19,38,0.97), rgba(30,41,59,0.9))",
    accentGlow: "rgba(192,193,255,0.15)",
  },
};

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem("theme_mode") || "dark");

  useEffect(() => {
    const root = document.documentElement;
    if (mode === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
      root.style.colorScheme = "light";
    }
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

export function useThemeMode(brandingPalette = "barbearia_amber") {
  const ctx = useContext(ThemeContext);
  const mode = ctx?.mode || "dark";
  const isDark = mode === "dark";

  const paletteTheme = PALETTE_THEMES[brandingPalette] || PALETTE_THEMES.barbearia_amber;
  const darkOverrides = isDark ? (DARK_OVERRIDES[brandingPalette] || DARK_OVERRIDES.barbearia_amber) : {};

  return {
    isDark,
    mode: isDark ? "dark" : "light",
    ...paletteTheme,
    ...darkOverrides,
  };
}

export function useToggleTheme() {
  const ctx = useContext(ThemeContext);
  return ctx?.toggleTheme || (() => {});
}

export { PALETTE_THEMES };
