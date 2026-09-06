"use client"

import { useState, useTransition } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { criarCampanhaFromFiltro } from "@/app/(dashboard)/clientes/actions"

interface TemplateOpcao { id: string; nome: string; texto: string }

interface Props {
  clienteIds: string[]
  templates: TemplateOpcao[]
  onClose: () => void
  onSuccess: () => void
}

/**
 * Mesma criação de campanha de FiltrosClientes.tsx, mas a partir de uma
 * seleção manual de contactos (checkboxes na tabela) em vez de filtros —
 * usa o mesmo server action (criarCampanhaFromFiltro), só passa clienteIds
 * em vez de etiquetaIds/estados/inatividade.
 */
export function CampanhaSelecaoModal({ clienteIds, templates, onClose, onSuccess }: Props) {
  const [nome, setNome] = useState("")
  const [modoMensagem, setModoMensagem] = useState<"template" | "texto">("texto")
  const [templateId, setTemplateId] = useState("")
  const [mensagemTexto, setMensagemTexto] = useState("")
  const [canal, setCanal] = useState<"whatsapp" | "email">("whatsapp")
  const [erro, setErro] = useState<string | null>(null)
  const [resultado, setResultado] = useState<{ totalCriadas: number; totalExcluidas: number } | null>(null)
  const [isPending, startTransition] = useTransition()

  const mensagemValida = modoMensagem === "template" ? !!templateId : mensagemTexto.trim().length > 0

  function handleCriar() {
    if (!nome.trim() || !mensagemValida) return
    setErro(null)
    startTransition(async () => {
      try {
        const r = await criarCampanhaFromFiltro({
          nome,
          clienteIds,
          etiquetaIds: [],
          canal,
          ...(modoMensagem === "template" ? { templateId } : { mensagemTexto }),
        })
        setResultado({ totalCriadas: r.totalCriadas, totalExcluidas: r.totalExcluidas })
      } catch (e) {
        setErro((e as Error).message)
      }
    })
  }

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 60, backgroundColor: "rgba(22,26,38,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
      onClick={(e) => { if (e.target === e.currentTarget && !resultado) onClose() }}
    >
      <div style={{ backgroundColor: "var(--nuit-overlay)", borderRadius: "8px", padding: "28px", width: "100%", maxWidth: "440px", boxShadow: "0 16px 48px rgba(14,17,25,0.50)", border: "1px solid rgba(212,184,134,0.16)" }}>
        {resultado ? (
          <>
            <h3 style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "20px", color: "var(--nuit-bone)", marginBottom: "12px" }}>
              Campanha criada!
            </h3>
            <p style={{ fontSize: "14px", color: "var(--nuit-bone-soft)", fontFamily: "var(--font-body, sans-serif)", marginBottom: "8px" }}>
              <strong style={{ color: "var(--nuit-bone)" }}>{resultado.totalCriadas}</strong> mensagens criadas e aguardam aprovação em /mensagens.
            </p>
            {resultado.totalExcluidas > 0 && (
              <p style={{ fontSize: "12px", color: "var(--destructive)", fontFamily: "var(--font-sans, sans-serif)" }}>
                ⚕ {resultado.totalExcluidas} cliente{resultado.totalExcluidas > 1 ? "s excluídas" : " excluída"} (restrição de saúde)
              </p>
            )}
            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button
                onClick={onSuccess}
                style={{ flex: 1, padding: "9px", borderRadius: "4px", fontSize: "13px", fontFamily: "var(--font-sans, sans-serif)", border: "1px solid rgba(212,184,134,0.20)", color: "var(--nuit-bone-soft)", cursor: "pointer", backgroundColor: "transparent" }}
              >
                Fechar
              </button>
              <a
                href="/mensagens"
                style={{ flex: 1, padding: "9px", borderRadius: "4px", fontSize: "13px", fontFamily: "var(--font-sans, sans-serif)", fontWeight: 600, border: "none", color: "#fff", backgroundColor: "var(--nuit-champagne-soft)", cursor: "pointer", textAlign: "center", textDecoration: "none" }}
              >
                Ver mensagens
              </a>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
              <h3 style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "20px", color: "var(--nuit-bone)" }}>
                Nova campanha — {clienteIds.length} selecionado{clienteIds.length === 1 ? "" : "s"}
              </h3>
              <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9d9d9a" }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#9d9d9a", fontFamily: "var(--font-sans, sans-serif)", display: "block", marginBottom: "6px" }}>
                Nome da campanha
              </label>
              <input
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Ex.: Convite Drenagem — clientes escolhidas"
                style={{ width: "100%", padding: "9px 12px", borderRadius: "4px", border: "1px solid rgba(212,184,134,0.22)", fontSize: "15px", fontFamily: "var(--font-sans, sans-serif)", color: "var(--nuit-bone)", backgroundColor: "var(--nuit-midnight)", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#9d9d9a", fontFamily: "var(--font-sans, sans-serif)", display: "block", marginBottom: "6px" }}>
                Canal
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                {(["whatsapp", "email"] as const).map(opcao => (
                  <button
                    key={opcao}
                    type="button"
                    onClick={() => setCanal(opcao)}
                    style={{
                      flex: 1, padding: "8px", borderRadius: "4px", cursor: "pointer",
                      fontSize: "12px", fontWeight: 600, fontFamily: "var(--font-sans, sans-serif)", textTransform: "capitalize",
                      color: canal === opcao ? "#fff" : "var(--nuit-bone-soft)",
                      backgroundColor: canal === opcao ? "var(--nuit-champagne-soft)" : "transparent",
                      border: `1px solid ${canal === opcao ? "var(--nuit-champagne-soft)" : "rgba(212,184,134,0.22)"}`,
                    }}
                  >
                    {opcao}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#9d9d9a", fontFamily: "var(--font-sans, sans-serif)", display: "block", marginBottom: "6px" }}>
                Mensagem
              </label>
              <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                {([
                  { value: "texto" as const, label: "Escrever agora" },
                  { value: "template" as const, label: "Usar template" },
                ]).map(opcao => (
                  <button
                    key={opcao.value}
                    type="button"
                    onClick={() => setModoMensagem(opcao.value)}
                    style={{
                      flex: 1, padding: "7px", borderRadius: "4px", cursor: "pointer",
                      fontSize: "11.5px", fontWeight: 600, fontFamily: "var(--font-sans, sans-serif)",
                      color: modoMensagem === opcao.value ? "var(--nuit-champagne-soft)" : "var(--nuit-bone-soft)",
                      backgroundColor: modoMensagem === opcao.value ? "rgba(185,160,122,0.10)" : "transparent",
                      border: `1px solid ${modoMensagem === opcao.value ? "rgba(185,160,122,0.40)" : "rgba(212,184,134,0.20)"}`,
                    }}
                  >
                    {opcao.label}
                  </button>
                ))}
              </div>

              {modoMensagem === "template" ? (
                <select
                  value={templateId}
                  onChange={e => setTemplateId(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "4px", border: "1px solid rgba(212,184,134,0.22)", fontSize: "15px", fontFamily: "var(--font-sans, sans-serif)", color: "var(--nuit-bone)", outline: "none", backgroundColor: "var(--nuit-midnight)" }}
                >
                  <option value="">Seleccionar template…</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              ) : (
                <>
                  <textarea
                    value={mensagemTexto}
                    onChange={e => setMensagemTexto(e.target.value)}
                    placeholder="Escreve a mensagem — usa {{nome}} para o primeiro nome da cliente"
                    rows={4}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "4px", border: "1px solid rgba(212,184,134,0.22)", fontSize: "14px", fontFamily: "var(--font-sans, sans-serif)", color: "var(--nuit-bone)", backgroundColor: "var(--nuit-midnight)", outline: "none", boxSizing: "border-box", resize: "vertical" }}
                  />
                  <p style={{ fontSize: "11px", color: "var(--nuit-bone-soft)", fontFamily: "var(--font-sans, sans-serif)", marginTop: "6px" }}>
                    Usa <code>{"{{nome}}"}</code> onde quiseres o primeiro nome de cada cliente.
                  </p>
                </>
              )}
            </div>

            <p style={{ fontSize: "12px", color: "var(--nuit-bone-soft)", fontFamily: "var(--font-sans, sans-serif)", margin: "8px 0 16px" }}>
              As mensagens ficam <strong>pendentes</strong> em /mensagens até seres tu a aprová-las — nada sai sozinho.
            </p>

            {erro && (
              <p style={{ fontSize: "12.5px", color: "var(--destructive)", fontFamily: "var(--font-sans, sans-serif)", marginBottom: "12px" }}>{erro}</p>
            )}

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={onClose}
                style={{ flex: 1, padding: "9px", borderRadius: "4px", fontSize: "13px", fontFamily: "var(--font-sans, sans-serif)", border: "1px solid rgba(212,184,134,0.20)", color: "var(--nuit-bone-soft)", cursor: "pointer", backgroundColor: "transparent" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCriar}
                disabled={!nome.trim() || !mensagemValida || isPending}
                style={{ flex: 1, padding: "9px", borderRadius: "4px", fontSize: "13px", fontFamily: "var(--font-sans, sans-serif)", fontWeight: 600, border: "none", color: "#fff", backgroundColor: "var(--nuit-champagne-soft)", cursor: nome.trim() && mensagemValida ? "pointer" : "not-allowed", opacity: nome.trim() && mensagemValida ? 1 : 0.5 }}
              >
                {isPending ? "A criar…" : "Criar campanha"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}
