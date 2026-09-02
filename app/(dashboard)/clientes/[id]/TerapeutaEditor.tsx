"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
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
  const [posicao, setPosicao] = useState({ top: 0, left: 0 })
  const [atualId, setAtualId] = useState(terapeutaAtualId)
  const [isPending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)
  const painelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!aberto) return
    function handler(e: MouseEvent) {
      const alvo = e.target as Node
      // O painel vive num portal em document.body — fora da árvore de
      // `ref`, por isso tem de ser verificado à parte (mesmo padrão de
      // TagsSection.tsx e EstadoEditor.tsx).
      if (ref.current?.contains(alvo)) return
      if (painelRef.current?.contains(alvo)) return
      setAberto(false)
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

  const GOLD = "var(--nuit-champagne-soft)"

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
        ref={triggerRef}
        onClick={() => {
          if (!aberto && triggerRef.current) {
            const r = triggerRef.current.getBoundingClientRect()
            setPosicao({ top: r.bottom + 6, left: r.left })
          }
          setAberto((o) => !o)
        }}
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

      {aberto && typeof document !== "undefined" && createPortal(
        <div
          ref={painelRef}
          style={{
          // "fixed" + coordenadas calculadas ao abrir, num portal em
          // document.body — fora da árvore com os cartões animados
          // (motion/framer, que criam stacking contexts via transform); um
          // z-index normal não ganha a um irmão nessas condições, só sair
          // da árvore resolve (mesmo bug e fix de EstadoEditor.tsx, o
          // dropdown ao lado — reportado pelo Nuno 2026-09-02).
          position: "fixed", top: `${posicao.top}px`, left: `${posicao.left}px`,
          backgroundColor: "var(--nuit-overlay)", border: "1px solid rgba(212,184,134,0.30)",
          borderRadius: "4px", boxShadow: "0 12px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.30)",
          zIndex: 200, minWidth: "180px", overflow: "hidden",
        }}>
          {terapeutas.map((t) => (
            <button
              key={t.id}
              onClick={() => selecionar(t.id)}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                width: "100%", padding: "9px 12px",
                fontSize: "12px", fontFamily: "var(--font-sans, sans-serif)",
                color: t.id === atualId ? GOLD : "var(--nuit-bone-soft)",
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
              color: !atualId ? "var(--destructive)" : "var(--nuit-bone-soft)",
              backgroundColor: "transparent",
              border: "none", borderTop: "1px solid rgba(212,184,134,0.12)", cursor: "pointer", textAlign: "left",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(176,96,80,0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            Sem terapeuta
          </button>
        </div>,
        document.body
      )}
    </div>
  )
}
