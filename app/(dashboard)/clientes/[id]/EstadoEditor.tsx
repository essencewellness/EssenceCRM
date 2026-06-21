"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { ChevronDown } from "lucide-react"
import { ESTADO_CRM_CONFIG } from "@/lib/etiquetas"
import { atualizarEstadoCliente } from "../actions"
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
    setEstadoLocal(estado)
    startTransition(async () => {
      await atualizarEstadoCliente(clienteId, estado)
    })
  }

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setAberto(o => !o)}
        disabled={isPending}
        style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          padding: "5px 12px 5px 10px", borderRadius: "100px",
          fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em",
          fontFamily: "var(--font-sans, sans-serif)",
          color: cfg.cor, backgroundColor: cfg.bg, border: `1px solid ${cfg.border}`,
          cursor: isPending ? "wait" : "pointer",
          opacity: isPending ? 0.7 : 1,
          transition: "all 150ms",
        }}
      >
        {cfg.label}
        <ChevronDown size={11} style={{ opacity: 0.6, transform: aberto ? "rotate(180deg)" : "none", transition: "transform 150ms" }} />
      </button>

      {aberto && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0,
          backgroundColor: "#fff", border: "1px solid #ddd6c4",
          borderRadius: "4px", boxShadow: "0 4px 16px rgba(22,26,38,0.10)",
          zIndex: 50, minWidth: "160px", overflow: "hidden",
        }}>
          {ESTADOS.map(([estado, c]) => (
            <button
              key={estado}
              onClick={() => selecionar(estado)}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                width: "100%", padding: "8px 12px",
                fontSize: "12px", fontFamily: "var(--font-sans, sans-serif)",
                color: estado === estadoLocal ? c.cor : "#6d6d6d",
                backgroundColor: estado === estadoLocal ? c.bg : "transparent",
                border: "none", cursor: "pointer", textAlign: "left",
                transition: "background-color 100ms",
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = c.bg)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = estado === estadoLocal ? c.bg : "transparent")}
            >
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: c.cor, flexShrink: 0 }} />
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
