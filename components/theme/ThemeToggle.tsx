"use client"

import { Sun, Moon } from "lucide-react"
import { useTheme } from "./ThemeProvider"

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme()
  const paraClaro = theme === "dark"

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={paraClaro ? "Mudar para modo claro" : "Mudar para modo escuro"}
      aria-label={paraClaro ? "Mudar para modo claro" : "Mudar para modo escuro"}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: compact ? "28px" : "30px", height: compact ? "28px" : "30px",
        borderRadius: "100px",
        background: "var(--nuit-overlay)",
        border: "1px solid rgba(212,184,134,0.16)",
        color: "var(--nuit-champagne)",
        cursor: "pointer",
        flexShrink: 0,
        transition: "opacity 150ms ease",
      }}
      className="hover:opacity-70"
    >
      {paraClaro ? <Sun size={14} strokeWidth={1.5} /> : <Moon size={14} strokeWidth={1.5} />}
    </button>
  )
}
