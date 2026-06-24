"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ChevronDown } from "lucide-react"
import { ESTADO_CRM_CONFIG } from "@/lib/etiquetas"
import { atualizarEstadoCliente } from "../actions"
import { useToast } from "@/components/ui/toast-nuit"
import type { EstadoCliente } from "@prisma/client"

const ESTADOS = Object.entries(ESTADO_CRM_CONFIG) as [EstadoCliente, typeof ESTADO_CRM_CONFIG[string]][]

interface Props {
  clienteId: string
  estadoAtual: EstadoCliente
}

export function EstadoEditor({ clienteId, estadoAtual }: Props) {
  const [aberto, setAberto] = useState(false)
  const [estadoLocal, setEstadoLocal] = useState(estadoAtual)
  const [isPending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (!aberto) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [aberto])

  const cfg = ESTADO_CRM_CONFIG[estadoLocal] ?? ESTADO_CRM_CONFIG.novo

  function selecionar(estado: EstadoCliente) {
    setAberto(false)
    const anterior = estadoLocal
    setEstadoLocal(estado)
    startTransition(async () => {
      await atualizarEstadoCliente(clienteId, estado)
      if (estado !== anterior) {
        const novoCfg = ESTADO_CRM_CONFIG[estado]
        toast(`Estado alterado para ${novoCfg?.label ?? estado}.`, "info")
      }
    })
  }

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <motion.button
        onClick={() => setAberto(o => !o)}
        disabled={isPending}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 22 }}
        style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          padding: "5px 12px 5px 10px", borderRadius: "100px",
          fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em",
          fontFamily: "var(--font-sans, sans-serif)",
          cursor: isPending ? "wait" : "pointer",
          transition: "box-shadow 200ms",
        }}
      >
        {/* Badge animado quando o estado muda */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={estadoLocal}
            initial={{ opacity: 0, scale: 0.80, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.80, y: 4, transition: { duration: 0.12 } }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
            style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "5px 12px 5px 10px", borderRadius: "100px",
              color: cfg.cor, backgroundColor: cfg.bg, border: `1px solid ${cfg.border}`,
              fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em",
              fontFamily: "var(--font-sans, sans-serif)",
              opacity: isPending ? 0.7 : 1,
            }}
          >
            {cfg.label}
            <motion.span
              animate={{ rotate: aberto ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              style={{ display: "inline-flex", opacity: 0.6 }}
            >
              <ChevronDown size={11} />
            </motion.span>
          </motion.span>
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {aberto && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -4, transition: { duration: 0.14 } }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
            style={{
              position: "absolute", top: "calc(100% + 6px)", left: 0,
              backgroundColor: "var(--nuit-deep)", border: "1px solid rgba(212,184,134,0.22)",
              borderRadius: "4px", boxShadow: "0 8px 24px rgba(14,17,25,0.40)",
              zIndex: 50, minWidth: "160px", overflow: "hidden",
              transformOrigin: "top left",
            }}
          >
            {ESTADOS.map(([estado, c], i) => (
              <motion.button
                key={estado}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.025, duration: 0.18 }}
                onClick={() => selecionar(estado)}
                whileHover={{ backgroundColor: c.bg, x: 2 }}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  width: "100%", padding: "8px 12px",
                  fontSize: "12px", fontFamily: "var(--font-sans, sans-serif)",
                  color: estado === estadoLocal ? c.cor : "var(--nuit-smoke)",
                  backgroundColor: estado === estadoLocal ? c.bg : "transparent",
                  border: "none", cursor: "pointer", textAlign: "left",
                }}
              >
                <motion.span
                  animate={{ scale: estado === estadoLocal ? 1.2 : 1 }}
                  style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: c.cor, flexShrink: 0, display: "inline-block" }}
                />
                {c.label}
                {estado === estadoLocal && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{ marginLeft: "auto", fontSize: "10px", color: c.cor }}
                  >
                    ✓
                  </motion.span>
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
