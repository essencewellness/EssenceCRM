"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { ChevronDown, UserRound } from "lucide-react"
import { atribuirTerapeutaCliente } from "../actions"

interface Terapeuta {
  id: string
  name: string | null
}

interface Props {
  clienteId: string
  terapeutaAtualId: string | null
  terapeutas: Terapeuta[]
  podeEditar: boolean
}

export function TerapeutaEditor({ clienteId, terapeutaAtualId, terapeutas, podeEditar }: Props) {
  const [aberto, setAberto] = useState(false)
  const [atualId, setAtualId] = useState(terapeutaAtualId)
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

  const atual = terapeutas.find((t) => t.id === atualId)
  const label = atual?.name ?? "Sem terapeuta"

  function selecionar(id: string | null) {
    setAberto(false)
    setAtualId(id)
    startTransition(async () => {
      await atribuirTerapeutaCliente(clienteId, id)
    })
  }

  const GOLD = "#b9a07a"

  // Visualização estática (terapeutas não podem reatribuir)
  if (!podeEditar) {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: "6px",
        padding: "5px 12px", borderRadius: "100px",
        fontSize: "11px", fontWeight: 600,
        fontFamily: "var(--font-sans, sans-serif)",
        color: GOLD, backgroundColor: "rgba(185,160,122,0.10)",
        border: "1px solid rgba(185,160,122,0.28)",
      }}>
        <UserRound size={12} />
        {label}
      </span>
    )
  }

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setAberto((o) => !o)}
        disabled={isPending}
        title="Mudar terapeuta responsável"
        style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          padding: "5px 10px 5px 12px", borderRadius: "100px",
          fontSize: "11px", fontWeight: 600,
          fontFamily: "var(--font-sans, sans-serif)",
          color: GOLD, backgroundColor: "rgba(185,160,122,0.10)",
          border: "1px solid rgba(185,160,122,0.28)",
          cursor: isPending ? "wait" : "pointer",
          opacity: isPending ? 0.7 : 1,
          transition: "all 150ms",
        }}
      >
        <UserRound size={12} />
        {label}
        <ChevronDown size={11} style={{ opacity: 0.6, transform: aberto ? "rotate(180deg)" : "none", transition: "transform 150ms" }} />
      </button>

      {aberto && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0,
          backgroundColor: "var(--nuit-deep)", border: "1px solid rgba(212,184,134,0.22)",
          borderRadius: "4px", boxShadow: "0 8px 24px rgba(14,17,25,0.40)",
          zIndex: 50, minWidth: "180px", overflow: "hidden",
        }}>
          {terapeutas.map((t) => (
            <button
              key={t.id}
              onClick={() => selecionar(t.id)}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                width: "100%", padding: "9px 12px",
                fontSize: "12px", fontFamily: "var(--font-sans, sans-serif)",
                color: t.id === atualId ? GOLD : "var(--nuit-smoke)",
                backgroundColor: t.id === atualId ? "rgba(185,160,122,0.10)" : "transparent",
                border: "none", cursor: "pointer", textAlign: "left",
                transition: "background-color 100ms",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(185,160,122,0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = t.id === atualId ? "rgba(185,160,122,0.10)" : "transparent")}
            >
              <UserRound size={13} style={{ flexShrink: 0 }} />
              {t.name}
            </button>
          ))}
          <button
            onClick={() => selecionar(null)}
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              width: "100%", padding: "9px 12px",
              fontSize: "12px", fontFamily: "var(--font-sans, sans-serif)",
              color: !atualId ? "#b06050" : "var(--nuit-smoke-deep)",
              backgroundColor: "transparent",
              border: "none", borderTop: "1px solid rgba(212,184,134,0.12)", cursor: "pointer", textAlign: "left",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(176,96,80,0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            Sem terapeuta
          </button>
        </div>
      )}
    </div>
  )
}
