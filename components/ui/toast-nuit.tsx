"use client"

import { AnimatePresence, motion } from "motion/react"
import { createContext, useCallback, useContext, useState } from "react"
import { CheckCircle2, Info, X, XCircle, Send } from "lucide-react"

type ToastType = "success" | "error" | "info" | "queue"

interface ToastItem {
  id: string
  type: ToastType
  message: string
}

interface ToastCtx {
  toast: (message: string, type?: ToastType) => void
}

const Ctx = createContext<ToastCtx>({ toast: () => {} })

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  function dismiss(id: string) {
    setItems(p => p.filter(t => t.id !== id))
  }

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = Math.random().toString(36).slice(2)
    setItems(p => [...p, { id, type, message }])
    setTimeout(() => dismiss(id), type === "queue" ? 5500 : 4000)
  }, [])

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        style={{
          position: "fixed", bottom: "28px", right: "28px",
          zIndex: 9999, display: "flex", flexDirection: "column-reverse",
          gap: "10px", pointerEvents: "none",
        }}
      >
        <AnimatePresence mode="popLayout">
          {items.map(t => {
            const cfg = {
              success: { Icon: CheckCircle2, color: "#6fcf97", border: "rgba(95,122,95,0.45)", accent: "rgba(95,122,95,0.08)" },
              error:   { Icon: XCircle,      color: "var(--destructive)", border: "rgba(176,96,80,0.45)",  accent: "rgba(176,96,80,0.08)"  },
              info:    { Icon: Info,          color: "var(--nuit-champagne-soft)", border: "rgba(212,184,134,0.40)", accent: "rgba(212,184,134,0.06)" },
              queue:   { Icon: Send,          color: "var(--nuit-champagne-soft)", border: "rgba(185,160,122,0.45)", accent: "rgba(185,160,122,0.08)" },
            }[t.type]
            const { Icon } = cfg

            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 80, scale: 0.88 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 60, scale: 0.90, transition: { duration: 0.2 } }}
                transition={{ type: "spring", stiffness: 380, damping: 26 }}
                role="status"
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "12px 14px",
                  backgroundColor: cfg.accent as string,
                  border: `1px solid ${cfg.border}`,
                  borderLeft: `3px solid ${cfg.color}`,
                  borderRadius: "6px",
                  boxShadow: "0 12px 40px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.35)",
                  maxWidth: "380px", minWidth: "240px",
                  fontFamily: "var(--font-sans, sans-serif)",
                  pointerEvents: "auto",
                  backdropFilter: "blur(8px)",
                }}
              >
                <motion.div
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.05 }}
                >
                  <Icon size={16} color={cfg.color} style={{ flexShrink: 0, display: "block" }} />
                </motion.div>
                <span style={{ color: "var(--nuit-bone)", fontSize: "13px", flex: 1, lineHeight: 1.45 }}>
                  {t.message}
                </span>
                <motion.button
                  whileHover={{ scale: 1.2, rotate: 90 }}
                  whileTap={{ scale: 0.85 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  onClick={() => dismiss(t.id)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--nuit-smoke)", padding: "2px",
                    display: "flex", alignItems: "center", flexShrink: 0,
                  }}
                  aria-label="Fechar"
                >
                  <X size={13} />
                </motion.button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  return useContext(Ctx)
}
