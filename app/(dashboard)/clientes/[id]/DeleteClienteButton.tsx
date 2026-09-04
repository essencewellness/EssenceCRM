"use client"

import { useState, useTransition } from "react"
import { createPortal } from "react-dom"
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
  // Escape hatch só para lixo de teste sem valor financeiro real — por
  // omissão as sessões ficam órfãs (preservadas no financeiro como "Cliente
  // eliminada"), nunca apagadas de vez (ver actions.ts, 2026-09-04).
  const [apagarSessoesDefinitivamente, setApagarSessoesDefinitivamente] = useState(false)
  const [isPending, startTransition] = useTransition()

  const temSessoes = sessoesCount > 0
  const nomeOk = input.trim().toLowerCase() === primeiroNome.trim().toLowerCase()
  const confirmado = nomeOk

  function fechar() {
    setAberto(false); setInput(""); setApagarSessoesDefinitivamente(false)
  }

  function handleApagar() {
    if (!confirmado) return
    startTransition(async () => {
      await eliminarCliente(clienteId, apagarSessoesDefinitivamente)
      // Sucesso faz redirect — não há resposta para tratar aqui.
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
        className="hover:bg-[rgba(176,96,80,0.06)] hover:border-[rgba(176,96,80,0.5)] hover:text-[var(--destructive)]"
      >
        <Trash2 size={12} />
        Apagar
      </button>

      {aberto && typeof document !== "undefined" && createPortal(
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 200,
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
                <Trash2 size={16} color="var(--destructive)" />
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
                Escreve <span style={{ color: "var(--destructive)" }}>{primeiroNome}</span> para confirmar
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

            {/* Aviso informativo: as sessões ficam preservadas por omissão */}
            {temSessoes && (
              <div style={{
                padding: "12px 14px", borderRadius: "8px",
                backgroundColor: "rgba(160,169,150,0.06)",
                border: "1px solid rgba(160,169,150,0.22)",
                marginBottom: "12px",
              }}>
                <p style={{
                  fontFamily: "var(--font-body, sans-serif)",
                  fontSize: "12.5px", color: "var(--nuit-bone-soft, #c9c3b4)", lineHeight: 1.5,
                }}>
                  Este contacto tem <strong>{sessoesCount} sessão(ões)</strong>. Ficam preservadas no
                  histórico financeiro como &ldquo;Cliente eliminada&rdquo; — deixam de estar ligadas
                  a um contacto, mas a receita não desaparece do /financeiro.
                </p>
              </div>
            )}

            {/* Checkbox: escape hatch só para lixo de teste sem valor financeiro */}
            {temSessoes && (
              <label
                htmlFor="apagar-sessoes-definitivamente"
                style={{
                  display: "flex", alignItems: "flex-start", gap: "10px",
                  padding: "12px 14px", borderRadius: "8px",
                  backgroundColor: "rgba(176,96,80,0.05)",
                  border: `1px solid ${apagarSessoesDefinitivamente ? "rgba(176,96,80,0.5)" : "rgba(212,184,134,0.18)"}`,
                  marginBottom: "16px", cursor: "pointer", transition: "border-color 150ms",
                }}
              >
                <input
                  id="apagar-sessoes-definitivamente"
                  type="checkbox"
                  checked={apagarSessoesDefinitivamente}
                  onChange={(e) => setApagarSessoesDefinitivamente(e.target.checked)}
                  style={{ width: "16px", height: "16px", marginTop: "1px", accentColor: "var(--destructive)", cursor: "pointer", flexShrink: 0 }}
                />
                <span style={{
                  fontFamily: "var(--font-body, sans-serif)",
                  fontSize: "12.5px", color: "var(--nuit-bone-soft, #c9c3b4)", lineHeight: 1.5,
                }}>
                  Apagar também as sessões <strong>de vez</strong> — não fica nenhum registo, nem no
                  financeiro. Só faz sentido para dados de teste, sem valor financeiro real.
                </span>
              </label>
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
                  backgroundColor: confirmado ? "var(--destructive)" : "rgba(176,96,80,0.12)",
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
        </div>,
        document.body
      )}
    </>
  )
}
