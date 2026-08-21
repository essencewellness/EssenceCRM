"use client"

// Mesmo padrão já validado e em produção no Dashboard Financeiro
// (05_DASHBOARD_FINANCEIRO/client/src/contexts/ThemeContext.tsx) — replicado
// aqui em vez de reinventado. Alterna a classe `.dark` no <html> e persiste
// a escolha em localStorage.
import { createContext, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark"

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const STORAGE_KEY = "ew-crm-theme"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // O valor inicial real já foi aplicado ao <html> pelo script inline no
  // <head> (ver app/layout.tsx) antes deste componente montar — isto evita
  // o flash de tema errado durante a hidratação. Aqui só espelhamos o que
  // já está no DOM para o estado React ficar em sincronia.
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof document === "undefined") return "dark"
    return document.documentElement.classList.contains("dark") ? "dark" : "light"
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === "dark") root.classList.add("dark")
    else root.classList.remove("dark")
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"))

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme deve ser usado dentro de ThemeProvider")
  return ctx
}
