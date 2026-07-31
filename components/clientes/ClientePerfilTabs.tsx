"use client"

// Tabs do perfil de cliente com indicador champagne deslizante (motion layoutId).
// Aceita conteúdo server-rendered passado como React nodes — padrão Next.js 15.

import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"

export interface PerfilTab {
  value: string
  label: string
  badge?: number
  content: React.ReactNode
}

interface ClientePerfilTabsProps {
  tabs: PerfilTab[]
  defaultValue?: string
}

export function ClientePerfilTabs({ tabs, defaultValue }: ClientePerfilTabsProps) {
  const [active, setActive] = useState(defaultValue ?? tabs[0]?.value ?? "")
  const activeTab = tabs.find(t => t.value === active)

  return (
    <div>
      {/* Lista de tabs */}
      <div
        role="tablist"
        aria-label="Secções do perfil"
        style={{
          display: "flex",
          borderBottom: "1px solid rgba(212,184,134,0.16)",
          overflowX: "auto",
          scrollbarWidth: "none",
        }}
      >
        {tabs.map(tab => {
          const isActive = tab.value === active
          return (
            <button
              key={tab.value}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.value}`}
              id={`tab-${tab.value}`}
              onClick={() => setActive(tab.value)}
              style={{
                position: "relative",
                padding: "10px 18px 12px",
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontFamily: "var(--font-sans, sans-serif)",
                fontSize: "12.5px",
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "var(--nuit-bone)" : "var(--nuit-bone-soft)",
                letterSpacing: "0.01em",
                transition: "color 180ms ease",
                whiteSpace: "nowrap",
                outline: "none",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {tab.label}

              {tab.badge != null && tab.badge > 0 && (
                <span style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  minWidth: "16px", height: "16px", padding: "0 4px",
                  fontSize: "9px", fontWeight: 700,
                  backgroundColor: isActive ? "var(--nuit-champagne)" : "rgba(185,160,122,0.3)",
                  color: isActive ? "var(--nuit-midnight)" : "var(--nuit-bone-soft)",
                  borderRadius: "100px",
                  transition: "background-color 180ms ease, color 180ms ease",
                }}>
                  {tab.badge > 99 ? "99+" : tab.badge}
                </span>
              )}

              {/* Indicador champagne deslizante */}
              {isActive && (
                <motion.div
                  layoutId="perfil-tab-indicator"
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "1px",
                    backgroundColor: "var(--nuit-champagne)",
                  }}
                  transition={{ type: "spring", stiffness: 520, damping: 38, mass: 0.8 }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Painel activo — fade + slide leve */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active}
          role="tabpanel"
          id={`panel-${active}`}
          aria-labelledby={`tab-${active}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          style={{ paddingTop: "20px" }}
        >
          {activeTab?.content}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
