"use client"

// Tabs animadas com indicador champagne deslizante (motion layoutId).
// Drop-in para substituir Tabs+TabsList+TabsTrigger+TabsContent em páginas cliente.

import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"

export interface NuitTab {
  value: string
  label: string
  badge?: number
  content: React.ReactNode
}

interface NuitMotionTabsProps {
  tabs: NuitTab[]
  defaultValue?: string
  className?: string
}

export function NuitMotionTabs({ tabs, defaultValue, className }: NuitMotionTabsProps) {
  const [active, setActive] = useState(defaultValue ?? tabs[0]?.value ?? "")

  const activeTab = tabs.find(t => t.value === active)

  return (
    <div className={className}>
      {/* Tab list */}
      <div
        role="tablist"
        style={{
          display: "flex",
          borderBottom: "1px solid var(--rule-soft)",
          gap: "0",
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
                padding: "11px 18px 12px",
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontFamily: "var(--font-sans, sans-serif)",
                fontSize: "12px",
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "var(--nuit-bone)" : "var(--nuit-bone-soft)",
                letterSpacing: "0.01em",
                transition: "color 180ms ease",
                whiteSpace: "nowrap",
                outline: "none",
              }}
            >
              {tab.label}

              {tab.badge != null && tab.badge > 0 && (
                <span style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  minWidth: "16px", height: "16px", padding: "0 4px",
                  fontSize: "9px", fontWeight: 700,
                  backgroundColor: "var(--nuit-champagne)",
                  color: "var(--nuit-midnight)",
                  borderRadius: "100px",
                }}>
                  {tab.badge > 99 ? "99+" : tab.badge}
                </span>
              )}

              {/* Indicador deslizante — layoutId garante animação suave entre tabs */}
              {isActive && (
                <motion.div
                  layoutId="nuit-tab-indicator"
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "1px",
                    backgroundColor: "var(--nuit-champagne)",
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 38, mass: 0.8 }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          role="tabpanel"
          id={`panel-${active}`}
          aria-labelledby={`tab-${active}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          {activeTab?.content}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
