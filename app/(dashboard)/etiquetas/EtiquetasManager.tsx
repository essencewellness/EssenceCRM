"use client"

import { useState, useTransition } from "react"
import { Edit2, Trash2, Check, X } from "lucide-react"
import { CORES_PALETA, TIPO_ETIQUETA_LABELS } from "@/lib/etiquetas"
import { atualizarEtiqueta, apagarEtiqueta } from "./actions"
import { criarEtiqueta } from "../clientes/actions"
import { ConfirmModal } from "@/components/ui/ConfirmModal"

interface Etiqueta {
  id: string
  nome: string
  cor: string
  tipo: string
  bloqueiaAutomacoes: boolean
  _count: { clientes: number }
}

interface Props {
  etiquetas: Etiqueta[]
}

const TIPOS_ORDEM = ["saude", "campanha", "preferencia", "automatica"]

export function EtiquetasManager({ etiquetas }: Props) {
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState("")
  const [editCor, setEditCor] = useState("")
  const [editBloqueio, setEditBloqueio] = useState(false)
  const [erro, setErro] = useState("")
  const [isPending, startTransition] = useTransition()
  const [confirmApagar, setConfirmApagar] = useState<{ id: string; nome: string; totalClientes: number } | null>(null)

  // Nova etiqueta
  const [mostraCriar, setMostraCriar] = useState(false)
  const [novoNome, setNovoNome] = useState("")
  const [novoCor, setNovoCor] = useState(CORES_PALETA[0])
  const [novoTipo, setNovoTipo] = useState<"saude" | "campanha" | "preferencia">("campanha")
  const [novoBloqueio, setNovoBloqueio] = useState(false)
  const [erroNovo, setErroNovo] = useState("")

  const porTipo: Record<string, Etiqueta[]> = {}
  for (const tipo of TIPOS_ORDEM) porTipo[tipo] = []
  for (const tag of etiquetas) {
    if (!porTipo[tag.tipo]) porTipo[tag.tipo] = []
    porTipo[tag.tipo].push(tag)
  }

  function iniciarEdicao(tag: Etiqueta) {
    setEditandoId(tag.id)
    setEditNome(tag.nome)
    setEditCor(tag.cor)
    setEditBloqueio(tag.bloqueiaAutomacoes)
    setErro("")
  }

  function cancelarEdicao() {
    setEditandoId(null)
    setErro("")
  }

  function handleAtualizar(id: string) {
    startTransition(async () => {
      try {
        await atualizarEtiqueta(id, { nome: editNome, cor: editCor, bloqueiaAutomacoes: editBloqueio })
        setEditandoId(null)
      } catch (e: unknown) {
        if (e instanceof Error) setErro(e.message.replace("NOME_DUPLICADO: ", ""))
      }
    })
  }

  function handleApagar(id: string, nome: string, totalClientes: number) {
    if (totalClientes === 0) {
      startTransition(async () => { await apagarEtiqueta(id) })
    } else {
      setConfirmApagar({ id, nome, totalClientes })
    }
  }

  function confirmarApagar() {
    if (!confirmApagar) return
    startTransition(async () => {
      await apagarEtiqueta(confirmApagar.id)
      setConfirmApagar(null)
    })
  }

  async function handleCriar() {
    if (!novoNome.trim()) return
    setErroNovo("")
    startTransition(async () => {
      try {
        await criarEtiqueta({ nome: novoNome, cor: novoCor, tipo: novoTipo, bloqueiaAutomacoes: novoBloqueio })
        setNovoNome("")
        setNovoCor(CORES_PALETA[0])
        setNovoTipo("campanha")
        setNovoBloqueio(false)
        setMostraCriar(false)
      } catch (e: unknown) {
        if (e instanceof Error) setErroNovo(e.message.replace("NOME_DUPLICADO: ", ""))
      }
    })
  }

  return (
    <div>
      {/* Botão criar nova etiqueta */}
      <div style={{ marginBottom: "24px" }}>
        {!mostraCriar ? (
          <button
            onClick={() => setMostraCriar(true)}
            style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "9px 18px", borderRadius: "4px", cursor: "pointer",
              fontSize: "12px", fontFamily: "var(--font-sans, sans-serif)", fontWeight: 600,
              letterSpacing: "0.08em", textTransform: "uppercase",
              color: "#fff", backgroundColor: "#b9a07a", border: "none",
            }}
          >
            + Nova Etiqueta
          </button>
        ) : (
          <div style={{
            padding: "20px", backgroundColor: "var(--nuit-overlay)", border: "1px solid rgba(212,184,134,0.18)",
            borderRadius: "6px", maxWidth: "400px",
          }}>
            <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--nuit-smoke)", fontFamily: "var(--font-sans, sans-serif)", marginBottom: "14px" }}>
              Nova Etiqueta
            </p>

            <input
              autoFocus
              value={novoNome}
              onChange={e => setNovoNome(e.target.value)}
              placeholder="Nome da etiqueta"
              style={{ width: "100%", padding: "8px 12px", borderRadius: "4px", border: "1px solid rgba(212,184,134,0.22)", fontSize: "13px", fontFamily: "var(--font-sans, sans-serif)", color: "var(--nuit-bone)", backgroundColor: "var(--nuit-midnight)", outline: "none", boxSizing: "border-box", marginBottom: "12px" }}
            />

            <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
              {(["saude", "campanha", "preferencia"] as const).map(t => (
                <button key={t} onClick={() => setNovoTipo(t)} style={{
                  flex: 1, padding: "6px 0", borderRadius: "4px", fontSize: "10px",
                  fontFamily: "var(--font-sans, sans-serif)", fontWeight: 600,
                  letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer",
                  color: novoTipo === t ? "#b9a07a" : "var(--nuit-smoke)",
                  border: `1px solid ${novoTipo === t ? "rgba(185,160,122,0.5)" : "rgba(212,184,134,0.18)"}`,
                  backgroundColor: novoTipo === t ? "rgba(185,160,122,0.08)" : "transparent",
                }}>
                  {TIPO_ETIQUETA_LABELS[t].slice(0, 4)}
                </button>
              ))}
            </div>

            {novoTipo === "saude" && (
              <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", cursor: "pointer" }}>
                <input type="checkbox" checked={novoBloqueio} onChange={e => setNovoBloqueio(e.target.checked)} />
                <span style={{ fontSize: "12px", fontFamily: "var(--font-sans, sans-serif)", color: "var(--nuit-smoke)" }}>Bloquear automações</span>
              </label>
            )}

            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
              {CORES_PALETA.map(cor => (
                <button key={cor} onClick={() => setNovoCor(cor)} style={{
                  width: "22px", height: "22px", borderRadius: "50%",
                  backgroundColor: cor, border: novoCor === cor ? "2px solid var(--nuit-bone)" : "2px solid transparent",
                  cursor: "pointer", padding: 0,
                }} />
              ))}
            </div>

            {erroNovo && <p style={{ fontSize: "11px", color: "#b06050", marginBottom: "10px", fontFamily: "var(--font-sans, sans-serif)" }}>{erroNovo}</p>}

            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => { setMostraCriar(false); setErroNovo("") }} style={{ flex: 1, padding: "8px", borderRadius: "4px", fontSize: "12px", fontFamily: "var(--font-sans, sans-serif)", border: "1px solid rgba(212,184,134,0.20)", color: "var(--nuit-smoke)", backgroundColor: "transparent", cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={handleCriar} disabled={!novoNome.trim() || isPending} style={{ flex: 1, padding: "8px", borderRadius: "4px", fontSize: "12px", fontFamily: "var(--font-sans, sans-serif)", fontWeight: 600, border: "none", color: "#fff", backgroundColor: "#b9a07a", cursor: novoNome.trim() ? "pointer" : "not-allowed", opacity: novoNome.trim() ? 1 : 0.5 }}>
                {isPending ? "A criar…" : "Criar"}
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!confirmApagar}
        onOpenChange={(open) => { if (!open) setConfirmApagar(null) }}
        title={`Eliminar etiqueta "${confirmApagar?.nome}"`}
        description={`Esta etiqueta está aplicada a ${confirmApagar?.totalClientes} cliente${confirmApagar?.totalClientes !== 1 ? "s" : ""}. Ao eliminar, será removida de todos eles. Tens a certeza?`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={confirmarApagar}
        loading={isPending}
      />

      {/* Lista de etiquetas agrupadas por tipo */}
      {TIPOS_ORDEM.map(tipo => {
        const tags = porTipo[tipo] ?? []
        if (tags.length === 0) return null
        const isAutomatica = tipo === "automatica"

        return (
          <div key={tipo} style={{ marginBottom: "28px" }}>
            <p style={{
              fontSize: "9px", fontWeight: 700, letterSpacing: "0.24em", textTransform: "uppercase",
              color: "var(--nuit-smoke)", fontFamily: "var(--font-sans, sans-serif)", marginBottom: "10px",
              borderBottom: "1px solid rgba(212,184,134,0.12)", paddingBottom: "8px",
            }}>
              {TIPO_ETIQUETA_LABELS[tipo]}
              <span style={{ marginLeft: "8px", fontWeight: 400, letterSpacing: "0", fontSize: "10px", color: "#b5b5b2" }}>
                ({tags.length})
              </span>
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {tags.map(tag => {
                const isEditing = editandoId === tag.id

                return (
                  <div key={tag.id} style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "10px 14px", backgroundColor: "var(--nuit-overlay)",
                    border: "1px solid rgba(212,184,134,0.14)", borderRadius: "4px",
                  }}>
                    {isEditing ? (
                      <>
                        <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: editCor, flexShrink: 0 }} />
                        <input
                          value={editNome}
                          onChange={e => setEditNome(e.target.value)}
                          style={{ flex: 1, padding: "4px 8px", borderRadius: "4px", border: "1px solid rgba(212,184,134,0.22)", fontSize: "13px", fontFamily: "var(--font-sans, sans-serif)", color: "var(--nuit-bone)", backgroundColor: "var(--nuit-midnight)", outline: "none" }}
                          onKeyDown={e => { if (e.key === "Enter") handleAtualizar(tag.id); if (e.key === "Escape") cancelarEdicao() }}
                          autoFocus
                        />
                        {tag.tipo === "saude" && (
                          <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "var(--nuit-smoke)", fontFamily: "var(--font-sans, sans-serif)", cursor: "pointer", flexShrink: 0 }}>
                            <input type="checkbox" checked={editBloqueio} onChange={e => setEditBloqueio(e.target.checked)} />
                            Bloquear
                          </label>
                        )}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                          {CORES_PALETA.map(cor => (
                            <button key={cor} onClick={() => setEditCor(cor)} style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: cor, border: editCor === cor ? "2px solid var(--nuit-bone)" : "2px solid transparent", cursor: "pointer", padding: 0 }} />
                          ))}
                        </div>
                        {erro && <span style={{ fontSize: "11px", color: "#b06050", fontFamily: "var(--font-sans, sans-serif)" }}>{erro}</span>}
                        <button onClick={() => handleAtualizar(tag.id)} disabled={isPending} style={{ background: "none", border: "none", cursor: "pointer", color: "#7a9e7e", padding: "2px" }}><Check size={14} /></button>
                        <button onClick={cancelarEdicao} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--nuit-smoke)", padding: "2px" }}><X size={14} /></button>
                      </>
                    ) : (
                      <>
                        <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: tag.cor, flexShrink: 0 }} />
                        <span style={{
                          fontSize: "13px", fontFamily: "var(--font-sans, sans-serif)", fontWeight: 500,
                          color: tag.cor, flex: 1,
                        }}>
                          {tag.bloqueiaAutomacoes && <span title="Bloqueia automações" style={{ marginRight: "4px", fontSize: "10px" }}>⚕</span>}
                          {tag.nome}
                        </span>
                        <span style={{ fontSize: "10px", color: "#b5b5b2", fontFamily: "var(--font-sans, sans-serif)" }}>
                          {tag._count.clientes} cliente{tag._count.clientes !== 1 ? "s" : ""}
                        </span>
                        {!isAutomatica && (
                          <>
                            <button onClick={() => iniciarEdicao(tag)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--nuit-smoke)", padding: "4px" }}
                              onMouseEnter={e => (e.currentTarget.style.color = "#b9a07a")}
                              onMouseLeave={e => (e.currentTarget.style.color = "var(--nuit-smoke)")}
                            ><Edit2 size={13} /></button>
                            <button onClick={() => handleApagar(tag.id, tag.nome, tag._count.clientes)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--nuit-smoke)", padding: "4px" }}
                              onMouseEnter={e => (e.currentTarget.style.color = "#b06050")}
                              onMouseLeave={e => (e.currentTarget.style.color = "var(--nuit-smoke)")}
                            ><Trash2 size={13} /></button>
                          </>
                        )}
                        {isAutomatica && (
                          <span style={{ fontSize: "9px", color: "#b5b5b2", fontFamily: "var(--font-sans, sans-serif)", letterSpacing: "0.1em" }}>AUTO</span>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
