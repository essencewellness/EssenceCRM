"use client"

import { useState, useTransition } from "react"
import { Trash2, X } from "lucide-react"
import { eliminarCliente } from "./actions"

interface Props {
  clienteId: string
  primeiroNome: string
  sessoesCount: number
}

export function DeleteClienteButton({ clienteId, primeiroNome, sessoesCount }: Props) {
  const [aberto, setAberto] = useState(false)
  const [input, setInput] = useState("")
  const [apagarSessoes, setApagarSessoes] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const temSessoes = sessoesCount > 0
  const nomeOk = input.trim().toLowerCase() === primeiroNome.trim().toLowerCase()
  // Se há sessões, a caixa tem de estar marcada (a cascata apaga-as na mesma)
  const confirmado = nomeOk && (!temSessoes || apagarSessoes)

  function fechar() {
    setAberto(false); setInput(""); setApagarSessoes(false); setErro(null)
  }

  function handleApagar() {
    if (!confirmado) return
    setErro(null)
    startTransition(async () => {
      const res = await eliminarCliente(clienteId, apagarSessoes)
      // Só regressa valor em caso de bloqueio (sucesso faz redirect)
      if (res && !res.ok) {
        setErro(`Este cliente tem ${res.sessoes} sessão(ões). Marca a opção para apagar tudo.`)
      }
    })
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
          onClick={(e) => { if (e.target === e.currentTarget) fechar() }}
          onKeyDown={(e) => { if (e.key === "Escape") fechar() }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="apagar-titulo"
            style={{
              backgroundColor: "var(--nuit-overlay)", borderRadius: "10px",
              border: "1px solid rgba(212,184,134,0.18)",
              padding: "28px 32px", width: "100%", maxWidth: "420px",
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
                <Trash2 size={16} color="#b06050" />
              </div>
              <button
                onClick={() => fechar()}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#9d9d9a", padding: "4px" }}
              >
                <X size={16} />
              </button>
            </div>

            <h2 id="apagar-titulo" style={{
              fontFamily: "var(--font-heading, Georgia, serif)",
              fontSize: "18px", fontWeight: 400, color: "var(--nuit-bone)",
              marginBottom: "8px",
            }}>
              Apagar contacto
            </h2>

            <p style={{
              fontFamily: "var(--font-body, sans-serif)",
              fontSize: "13px", color: "var(--nuit-bone-soft)", lineHeight: 1.6,
              marginBottom: "20px",
            }}>
              Esta ação é <strong>irreversível</strong> — o contacto é apagado definitivamente da base de dados.
            </p>

            {/* Confirmação por nome */}
            <div style={{ marginBottom: "20px" }}>
              <label htmlFor="confirm-nome" style={{
                fontFamily: "var(--font-sans, sans-serif)",
                fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em",
                color: "var(--nuit-bone-soft)", textTransform: "uppercase",
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
                  border: `1px solid ${confirmado ? "rgba(160,169,150,0.6)" : "rgba(212,184,134,0.22)"}`,
                  backgroundColor: confirmado ? "rgba(160,169,150,0.05)" : "var(--nuit-midnight)",
                  fontFamily: "var(--font-body, sans-serif)",
                  fontSize: "14px", color: "var(--nuit-bone)",
                  outline: "none", boxSizing: "border-box",
                  transition: "border-color 150ms",
                }}
              />
            </div>

            {/* Checkbox: apagar sessões (a cascata apaga-as na mesma) */}
            {temSessoes && (
              <label
                htmlFor="apagar-sessoes"
                style={{
                  display: "flex", alignItems: "flex-start", gap: "10px",
                  padding: "12px 14px", borderRadius: "8px",
                  backgroundColor: "rgba(176,96,80,0.05)",
                  border: `1px solid ${apagarSessoes ? "rgba(176,96,80,0.5)" : "rgba(212,184,134,0.18)"}`,
                  marginBottom: "16px", cursor: "pointer", transition: "border-color 150ms",
                }}
              >
                <input
                  id="apagar-sessoes"
                  type="checkbox"
                  checked={apagarSessoes}
                  onChange={(e) => setApagarSessoes(e.target.checked)}
                  style={{ width: "16px", height: "16px", marginTop: "1px", accentColor: "#b06050", cursor: "pointer", flexShrink: 0 }}
                />
                <span style={{
                  fontFamily: "var(--font-body, sans-serif)",
                  fontSize: "12.5px", color: "var(--nuit-bone-soft, #c9c3b4)", lineHeight: 1.5,
                }}>
                  Apagar também as <strong>{sessoesCount} sessão(ões)</strong> deste cliente
                </span>
              </label>
            )}

            {/* Erro do servidor */}
            {erro && (
              <p style={{
                fontFamily: "var(--font-body, sans-serif)",
                fontSize: "12.5px", color: "#b06050", lineHeight: 1.5, marginBottom: "16px",
              }}>
                {erro}
              </p>
            )}

            {/* Botões */}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => fechar()}
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
