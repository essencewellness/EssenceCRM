"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "motion/react"
import { ChevronDown } from "lucide-react"
import { ESTADO_CRM_CONFIG } from "@/lib/etiquetas"
import { atualizarEstadoCliente } from "../actions"
import { useToast } from "@/components/ui/toast-nuit"
import type { EstadoCliente } from "@/lib/prisma-client"

const ESTADOS = Object.entries(ESTADO_CRM_CONFIG) as [EstadoCliente, typeof ESTADO_CRM_CONFIG[string]][]

interface Props {
  clienteId: string
  estadoAtual: EstadoCliente
}

export function EstadoEditor({ clienteId, estadoAtual }: Props) {
  const [aberto, setAberto] = useState(false)
  const [posicao, setPosicao] = useState({ top: 0, left: 0 })
  const [estadoLocal, setEstadoLocal] = useState(estadoAtual)
  const [isPending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)
  const painelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const primeiroItemRef = useRef<HTMLButtonElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (!aberto) return
    function handler(e: MouseEvent) {
      const alvo = e.target as Node
      // O painel vive num portal em document.body (ver comentário no style
      // abaixo) — fora da árvore de `ref`, por isso tem de ser verificado
      // à parte, senão qualquer clique dentro dele fechava o dropdown.
      if (ref.current?.contains(alvo)) return
      if (painelRef.current?.contains(alvo)) return
      setAberto(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [aberto])

  // Ao abrir, move o foco para o primeiro item do painel — quem navega por
  // teclado não devia ter de dar Tab a partir do botão até lá chegar.
  useEffect(() => {
    if (aberto) primeiroItemRef.current?.focus()
  }, [aberto])

  function fechar() {
    setAberto(false)
    triggerRef.current?.focus()
  }

  const cfg = ESTADO_CRM_CONFIG[estadoLocal] ?? ESTADO_CRM_CONFIG.novo

  function selecionar(estado: EstadoCliente) {
    setAberto(false)
    triggerRef.current?.focus()
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
        ref={triggerRef}
        onClick={() => {
          if (!aberto && triggerRef.current) {
            const r = triggerRef.current.getBoundingClientRect()
            setPosicao({ top: r.bottom + 6, left: r.left })
          }
          setAberto(o => !o)
        }}
        disabled={isPending}
        aria-haspopup="listbox"
        aria-expanded={aberto}
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

      {typeof document !== "undefined" && createPortal(
      <AnimatePresence>
        {aberto && (
          <motion.div
            ref={painelRef}
            role="listbox"
            aria-label="Estados possíveis"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation()
                fechar()
              }
            }}
            initial={{ opacity: 0, scale: 0.94, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -4, transition: { duration: 0.14 } }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
            style={{
              // "fixed" + coordenadas calculadas ao abrir (não "absolute"):
              // num portal em document.body, fora da árvore com os cartões
              // animados (motion/framer, que criam stacking contexts via
              // transform) — um z-index normal não ganha a um irmão nessas
              // condições, só sair da árvore resolve (mesmo bug e mesmo fix
              // de TagsSection.tsx, 2026-08-22 — reapareceu aqui porque este
              // dropdown ainda estava com position:absolute + zIndex local,
              // reportado pelo Nuno 2026-09-02 com o texto de "Timeline" e o
              // "2" dos Vouchers a aparecer por cima da lista).
              position: "fixed", top: `${posicao.top}px`, left: `${posicao.left}px`,
              backgroundColor: "var(--nuit-overlay)", border: "1px solid rgba(212,184,134,0.30)",
              borderRadius: "6px", boxShadow: "0 12px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.30)",
              zIndex: 200, minWidth: "160px", overflow: "hidden",
              transformOrigin: "top left",
            }}
          >
            {ESTADOS.map(([estado, c], i) => (
              <motion.button
                key={estado}
                ref={i === 0 ? primeiroItemRef : undefined}
                role="option"
                aria-selected={estado === estadoLocal}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.025, duration: 0.18 }}
                onClick={() => selecionar(estado)}
                whileHover={{ backgroundColor: c.bg, x: 2 }}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  width: "100%", padding: "8px 12px",
                  fontSize: "12px", fontFamily: "var(--font-sans, sans-serif)",
                  color: estado === estadoLocal ? c.cor : "var(--nuit-bone-soft)",
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
      </AnimatePresence>,
      document.body
      )}
    </div>
  )
}
