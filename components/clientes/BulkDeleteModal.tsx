"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { Trash2, X } from "lucide-react"

interface ClienteComSessoes {
  id: string
  nome: string
  sessoes: number
}

interface Props {
  clienteIds: string[]
  onClose: () => void
  onSuccess: () => void
}

const PALAVRA_CONFIRMACAO = "ELIMINAR"

export function BulkDeleteModal({ clienteIds, onClose, onSuccess }: Props) {
  const [input, setInput] = useState("")
  const [apagarSessoesConfirmado, setApagarSessoesConfirmado] = useState(false)
  const [clientesComSessoes, setClientesComSessoes] = useState<ClienteComSessoes[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const textoOk = input.trim().toUpperCase() === PALAVRA_CONFIRMACAO
  const precisaConfirmarSessoes = (clientesComSessoes?.length ?? 0) > 0
  const confirmado = textoOk && (!precisaConfirmarSessoes || apagarSessoesConfirmado)

  async function handleEliminar() {
    if (!confirmado) return
    setErro(null)
    setLoading(true)
    try {
      const res = await fetch("/api/v1/clientes/bulk-eliminar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteIds,
          apagarSessoes: precisaConfirmarSessoes ? apagarSessoesConfirmado : false,
        }),
      })
      if (!res.ok) {
        setErro("Não foi possível apagar os clientes. Tenta novamente.")
        return
      }
      const json = await res.json()
      if (json.data?.bloqueado) {
        setClientesComSessoes(json.data.clientesComSessoes)
      } else {
        onSuccess()
      }
    } catch {
      setErro("Não foi possível apagar os clientes. Tenta novamente.")
    } finally {
      setLoading(false)
    }
  }

  const totalSessoes = clientesComSessoes?.reduce((soma, c) => soma + c.sessoes, 0) ?? 0

  // Portal para document.body: a barra de ações tem um transform (-translate-x-1/2),
  // que cria um containing block novo — sem isto, este overlay "position: fixed"
  // ficava preso dentro da barra em vez de cobrir o ecrã inteiro
  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        backgroundColor: "rgba(22,26,38,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      onKeyDown={(e) => { if (e.key === "Escape") onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-apagar-titulo"
        style={{
          backgroundColor: "var(--nuit-overlay)", borderRadius: "10px",
          border: "1px solid rgba(212,184,134,0.18)",
          padding: "28px 32px", width: "100%", maxWidth: "440px",
          boxShadow: "0 16px 48px rgba(14,17,25,0.50)",
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
            <Trash2 size={16} color="var(--destructive)" />
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#9d9d9a", padding: "4px" }}
          >
            <X size={16} />
          </button>
        </div>

        <h2 id="bulk-apagar-titulo" style={{
          fontFamily: "var(--font-heading, Georgia, serif)",
          fontSize: "18px", fontWeight: 400, color: "var(--nuit-bone)",
          marginBottom: "8px",
        }}>
          Apagar {clienteIds.length} {clienteIds.length === 1 ? "contacto" : "contactos"}
        </h2>

        <p style={{
          fontFamily: "var(--font-body, sans-serif)",
          fontSize: "13px", color: "var(--nuit-bone-soft)", lineHeight: 1.6,
          marginBottom: "20px",
        }}>
          Esta ação é <strong>irreversível</strong> — os contactos selecionados são apagados definitivamente da base de dados.
        </p>

        {/* Confirmação por palavra */}
        <div style={{ marginBottom: "20px" }}>
          <label htmlFor="bulk-confirm-input" style={{
            fontFamily: "var(--font-sans, sans-serif)",
            fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em",
            color: "var(--nuit-bone-soft)", textTransform: "uppercase",
            display: "block", marginBottom: "8px",
          }}>
            Escreve <span style={{ color: "var(--destructive)" }}>{PALAVRA_CONFIRMACAO}</span> para confirmar
          </label>
          <input
            id="bulk-confirm-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={PALAVRA_CONFIRMACAO}
            autoFocus
            style={{
              width: "100%", height: "40px", padding: "0 12px",
              borderRadius: "8px",
              border: `1px solid ${textoOk ? "rgba(160,169,150,0.6)" : "rgba(212,184,134,0.22)"}`,
              backgroundColor: textoOk ? "rgba(160,169,150,0.05)" : "var(--nuit-midnight)",
              fontFamily: "var(--font-body, sans-serif)",
              fontSize: "14px", color: "var(--nuit-bone)",
              outline: "none", boxSizing: "border-box",
              transition: "border-color 150ms",
            }}
          />
        </div>

        {/* Aviso de sessões associadas — só aparece depois de tentar apagar */}
        {precisaConfirmarSessoes && (
          <label
            htmlFor="bulk-apagar-sessoes"
            style={{
              display: "flex", alignItems: "flex-start", gap: "10px",
              padding: "12px 14px", borderRadius: "8px",
              backgroundColor: "rgba(176,96,80,0.05)",
              border: `1px solid ${apagarSessoesConfirmado ? "rgba(176,96,80,0.5)" : "rgba(212,184,134,0.18)"}`,
              marginBottom: "16px", cursor: "pointer", transition: "border-color 150ms",
            }}
          >
            <input
              id="bulk-apagar-sessoes"
              type="checkbox"
              checked={apagarSessoesConfirmado}
              onChange={(e) => setApagarSessoesConfirmado(e.target.checked)}
              style={{ width: "16px", height: "16px", marginTop: "1px", accentColor: "var(--destructive)", cursor: "pointer", flexShrink: 0 }}
            />
            <span style={{
              fontFamily: "var(--font-body, sans-serif)",
              fontSize: "12.5px", color: "var(--nuit-bone-soft, #c9c3b4)", lineHeight: 1.5,
            }}>
              {clientesComSessoes!.length} {clientesComSessoes!.length === 1 ? "destes clientes tem" : "destes clientes têm"} sessões associadas
              ({totalSessoes} no total). Marca esta opção para apagar também as <strong>sessões</strong>.
            </span>
          </label>
        )}

        {/* Erro do servidor */}
        {erro && (
          <p style={{
            fontFamily: "var(--font-body, sans-serif)",
            fontSize: "12.5px", color: "var(--destructive)", lineHeight: 1.5, marginBottom: "16px",
          }}>
            {erro}
          </p>
        )}

        {/* Botões */}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "9px 18px", borderRadius: "8px",
              backgroundColor: "transparent",
              border: "1px solid rgba(212,184,134,0.20)",
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: "12px", fontWeight: 600, color: "var(--nuit-bone-soft)",
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleEliminar}
            disabled={!confirmado || loading}
            style={{
              padding: "9px 18px", borderRadius: "8px",
              backgroundColor: confirmado ? "var(--destructive)" : "rgba(176,96,80,0.12)",
              border: "none",
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: "12px", fontWeight: 600,
              color: confirmado ? "#ffffff" : "rgba(176,96,80,0.4)",
              cursor: confirmado ? "pointer" : "not-allowed",
              transition: "all 150ms",
            }}
          >
            {loading ? "A apagar…" : precisaConfirmarSessoes ? "Confirmar eliminação" : "Eliminar contactos"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
