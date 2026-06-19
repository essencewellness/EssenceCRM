"use client"

import { useState, useTransition } from "react"
import { Trash2, X } from "lucide-react"
import { eliminarCliente } from "./actions"

interface Props {
  clienteId: string
  primeiroNome: string
}

export function DeleteClienteButton({ clienteId, primeiroNome }: Props) {
  const [aberto, setAberto] = useState(false)
  const [input, setInput] = useState("")
  const [isPending, startTransition] = useTransition()

  const confirmado = input.trim().toLowerCase() === primeiroNome.trim().toLowerCase()

  function handleApagar() {
    if (!confirmado) return
    startTransition(() => eliminarCliente(clienteId))
  }

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        title="Apagar contacto"
        style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          padding: "8px 14px", borderRadius: "8px",
          backgroundColor: "transparent",
          border: "1px solid rgba(176,96,80,0.25)",
          color: "rgba(176,96,80,0.6)",
          fontFamily: "var(--font-sans, sans-serif)",
          fontSize: "11px", fontWeight: 600, letterSpacing: "0.04em",
          cursor: "pointer", transition: "all 150ms",
        }}
        className="hover:bg-[rgba(176,96,80,0.06)] hover:border-[rgba(176,96,80,0.5)] hover:text-[#b06050]"
      >
        <Trash2 size={12} />
        Apagar
      </button>

      {aberto && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            backgroundColor: "rgba(22,26,38,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "20px",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) { setAberto(false); setInput("") } }}
          onKeyDown={(e) => { if (e.key === "Escape") { setAberto(false); setInput("") } }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="apagar-titulo"
            style={{
              backgroundColor: "#ffffff", borderRadius: "14px",
              border: "1px solid #ddd6c4",
              padding: "28px 32px", width: "100%", maxWidth: "420px",
              boxShadow: "0 8px 32px rgba(22,26,38,0.12)",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{
                width: "38px", height: "38px", borderRadius: "10px",
                backgroundColor: "rgba(176,96,80,0.08)",
                border: "1px solid rgba(176,96,80,0.22)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <Trash2 size={16} color="#b06050" />
              </div>
              <button
                onClick={() => { setAberto(false); setInput("") }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#9d9d9a", padding: "4px" }}
              >
                <X size={16} />
              </button>
            </div>

            <h2 id="apagar-titulo" style={{
              fontFamily: "var(--font-heading, Georgia, serif)",
              fontSize: "18px", fontWeight: 400, color: "#161a26",
              marginBottom: "8px",
            }}>
              Apagar contacto
            </h2>

            <p style={{
              fontFamily: "var(--font-body, sans-serif)",
              fontSize: "13px", color: "#6d6d6d", lineHeight: 1.6,
              marginBottom: "20px",
            }}>
              Esta ação é <strong>irreversível</strong>. Todas as sessões e mensagens associadas serão também eliminadas.
            </p>

            {/* Confirmação por nome */}
            <div style={{ marginBottom: "20px" }}>
              <label htmlFor="confirm-nome" style={{
                fontFamily: "var(--font-sans, sans-serif)",
                fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em",
                color: "#9d9d9a", textTransform: "uppercase",
                display: "block", marginBottom: "8px",
              }}>
                Escreve <span style={{ color: "#b06050" }}>{primeiroNome}</span> para confirmar
              </label>
              <input
                id="confirm-nome"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={primeiroNome}
                autoFocus
                style={{
                  width: "100%", height: "40px", padding: "0 12px",
                  borderRadius: "8px",
                  border: `1px solid ${confirmado ? "rgba(160,169,150,0.6)" : "#ddd6c4"}`,
                  backgroundColor: confirmado ? "rgba(160,169,150,0.05)" : "#efe9db",
                  fontFamily: "var(--font-body, sans-serif)",
                  fontSize: "14px", color: "#161a26",
                  outline: "none", boxSizing: "border-box",
                  transition: "border-color 150ms",
                }}
              />
            </div>

            {/* Botões */}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => { setAberto(false); setInput("") }}
                style={{
                  padding: "9px 18px", borderRadius: "8px",
                  backgroundColor: "transparent",
                  border: "1px solid #ddd6c4",
                  fontFamily: "var(--font-sans, sans-serif)",
                  fontSize: "12px", fontWeight: 600, color: "#6d6d6d",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleApagar}
                disabled={!confirmado || isPending}
                style={{
                  padding: "9px 18px", borderRadius: "8px",
                  backgroundColor: confirmado ? "#b06050" : "rgba(176,96,80,0.12)",
                  border: "none",
                  fontFamily: "var(--font-sans, sans-serif)",
                  fontSize: "12px", fontWeight: 600,
                  color: confirmado ? "#ffffff" : "rgba(176,96,80,0.4)",
                  cursor: confirmado ? "pointer" : "not-allowed",
                  transition: "all 150ms",
                }}
              >
                {isPending ? "A apagar…" : "Apagar contacto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
