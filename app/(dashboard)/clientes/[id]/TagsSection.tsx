"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { Plus, X, Tag, Zap, Search } from "lucide-react"
import { CORES_PALETA, TIPO_ETIQUETA_LABELS, calcularTagActividade } from "@/lib/etiquetas"
import { adicionarEtiqueta, removerEtiqueta, criarEtiqueta } from "../actions"

interface EtiquetaRow {
  id: string
  nome: string
  cor: string
  tipo: string
  bloqueiaAutomacoes: boolean
}

interface Props {
  clienteId: string
  etiquetasCliente: EtiquetaRow[]
  todasEtiquetas: EtiquetaRow[]
  ultimaSessao: string | null
}

const TIPOS_ORDEM = ["saude", "campanha", "preferencia", "automatica"]

export function TagsSection({ clienteId, etiquetasCliente, todasEtiquetas, ultimaSessao }: Props) {
  const [abertoDropdown, setAbertoDropdown] = useState(false)
  const [mostraFormCriar, setMostraFormCriar] = useState(false)
  const [pesquisa, setPesquisa] = useState("")
  const [isPending, startTransition] = useTransition()
  const [novoNome, setNovoNome] = useState("")
  const [novoCor, setNovoCor] = useState(CORES_PALETA[0])
  const [novoTipo, setNovoTipo] = useState<"saude" | "campanha" | "preferencia">("campanha")
  const [novoBloqueio, setNovoBloqueio] = useState(false)
  const [erro, setErro] = useState("")
  const dropdownRef = useRef<HTMLDivElement>(null)

  const tagActivity = calcularTagActividade(ultimaSessao)
  const idsAtribuidas = new Set(etiquetasCliente.map(e => e.id))
  const disponiveis = todasEtiquetas.filter(e => !idsAtribuidas.has(e.id) && e.tipo !== "automatica")
  const filtradas = pesquisa
    ? disponiveis.filter(e => e.nome.toLowerCase().includes(pesquisa.toLowerCase()))
    : disponiveis

  // Agrupar etiquetas do cliente por tipo
  const porTipo: Record<string, EtiquetaRow[]> = {}
  for (const tipo of TIPOS_ORDEM) porTipo[tipo] = []
  for (const tag of etiquetasCliente) {
    if (!porTipo[tag.tipo]) porTipo[tag.tipo] = []
    porTipo[tag.tipo].push(tag)
  }

  useEffect(() => {
    if (!abertoDropdown) return
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAbertoDropdown(false)
        setMostraFormCriar(false)
        setPesquisa("")
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [abertoDropdown])

  function handleAdicionar(etiquetaId: string) {
    setAbertoDropdown(false)
    setPesquisa("")
    startTransition(async () => {
      await adicionarEtiqueta(clienteId, etiquetaId)
    })
  }

  function handleRemover(etiquetaId: string) {
    startTransition(async () => {
      await removerEtiqueta(clienteId, etiquetaId)
    })
  }

  async function handleCriar() {
    if (!novoNome.trim()) return
    setErro("")
    startTransition(async () => {
      try {
        await criarEtiqueta({
          nome: novoNome,
          cor: novoCor,
          tipo: novoTipo,
          bloqueiaAutomacoes: novoBloqueio,
          atribuirClienteId: clienteId,
        })
        setNovoNome("")
        setNovoCor(CORES_PALETA[0])
        setNovoTipo("campanha")
        setNovoBloqueio(false)
        setMostraFormCriar(false)
        setAbertoDropdown(false)
      } catch (e: unknown) {
        if (e instanceof Error) setErro(e.message.replace("NOME_DUPLICADO: ", ""))
      }
    })
  }

  return (
    <div style={{ marginTop: "20px" }}>
      {/* Badge de actividade */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
        <Zap size={11} color={tagActivity.cor} />
        <span style={{
          fontSize: "11px", fontFamily: "var(--font-sans, sans-serif)",
          fontWeight: 600, color: tagActivity.cor, letterSpacing: "0.04em",
        }}>
          {tagActivity.label}
        </span>
      </div>

      {/* Tags agrupadas por tipo */}
      {TIPOS_ORDEM.map(tipo => {
        const tags = porTipo[tipo] ?? []
        if (tags.length === 0) return null
        return (
          <div key={tipo} style={{ marginBottom: "10px" }}>
            <p style={{
              fontSize: "8.5px", fontWeight: 700, letterSpacing: "0.18em",
              textTransform: "uppercase", color: "#9d9d9a",
              fontFamily: "var(--font-sans, sans-serif)", marginBottom: "6px",
            }}>
              {TIPO_ETIQUETA_LABELS[tipo]}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {tags.map(tag => (
                <span
                  key={tag.id}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "5px",
                    padding: "4px 8px 4px 10px", borderRadius: "100px",
                    fontSize: "11px", fontFamily: "var(--font-sans, sans-serif)",
                    fontWeight: 500,
                    color: tag.cor,
                    backgroundColor: `${tag.cor}15`,
                    border: `1px solid ${tag.cor}40`,
                  }}
                >
                  {tipo === "saude" && tag.bloqueiaAutomacoes && (
                    <span title="Bloqueia automações" style={{ fontSize: "8px", opacity: 0.7 }}>⚕</span>
                  )}
                  {tag.nome}
                  {tipo !== "automatica" && (
                    <button
                      onClick={() => handleRemover(tag.id)}
                      disabled={isPending}
                      style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        background: "none", border: "none", cursor: "pointer", padding: "0",
                        color: tag.cor, opacity: 0.5, lineHeight: 1,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                      onMouseLeave={e => (e.currentTarget.style.opacity = "0.5")}
                    >
                      <X size={11} />
                    </button>
                  )}
                  {tipo === "automatica" && (
                    <span style={{ fontSize: "9px", opacity: 0.5 }}><Tag size={9} /></span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )
      })}

      {/* Botão + dropdown de adicionar */}
      <div ref={dropdownRef} style={{ position: "relative", display: "inline-block", marginTop: "8px" }}>
        <button
          onClick={() => { setAbertoDropdown(o => !o); setMostraFormCriar(false); setErro("") }}
          disabled={isPending}
          style={{
            display: "inline-flex", alignItems: "center", gap: "5px",
            padding: "5px 10px", borderRadius: "100px",
            fontSize: "11px", fontFamily: "var(--font-sans, sans-serif)",
            fontWeight: 500, color: "#9d9d9a",
            backgroundColor: "transparent", border: "1px dashed #ddd6c4",
            cursor: "pointer", transition: "all 150ms",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#b9a07a"; e.currentTarget.style.color = "#b9a07a" }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#ddd6c4"; e.currentTarget.style.color = "#9d9d9a" }}
        >
          <Plus size={11} /> Adicionar etiqueta
        </button>

        {abertoDropdown && (
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0,
            backgroundColor: "#fff", border: "1px solid #ddd6c4",
            borderRadius: "6px", boxShadow: "0 6px 24px rgba(22,26,38,0.12)",
            zIndex: 50, width: "260px", overflow: "hidden",
          }}>
            {!mostraFormCriar ? (
              <>
                {/* Pesquisa */}
                <div style={{ padding: "10px 12px 6px", borderBottom: "1px solid #f0ebe0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#f8f4ef", borderRadius: "4px", padding: "6px 10px" }}>
                    <Search size={12} color="#9d9d9a" />
                    <input
                      autoFocus
                      value={pesquisa}
                      onChange={e => setPesquisa(e.target.value)}
                      placeholder="Pesquisar etiquetas…"
                      style={{
                        border: "none", background: "none", outline: "none",
                        fontSize: "12px", fontFamily: "var(--font-sans, sans-serif)",
                        color: "#161a26", width: "100%",
                      }}
                    />
                  </div>
                </div>

                {/* Lista de etiquetas disponíveis */}
                <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                  {filtradas.length === 0 && !pesquisa && (
                    <p style={{ padding: "12px", fontSize: "12px", color: "#9d9d9a", fontFamily: "var(--font-sans, sans-serif)", textAlign: "center" }}>
                      Todas as etiquetas já atribuídas
                    </p>
                  )}
                  {filtradas.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => handleAdicionar(tag.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: "8px",
                        width: "100%", padding: "8px 12px",
                        fontSize: "12px", fontFamily: "var(--font-sans, sans-serif)",
                        color: "#161a26", backgroundColor: "transparent",
                        border: "none", cursor: "pointer", textAlign: "left",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#f8f4ef")}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: tag.cor, flexShrink: 0 }} />
                      {tag.nome}
                      <span style={{ marginLeft: "auto", fontSize: "10px", color: "#9d9d9a" }}>
                        {TIPO_ETIQUETA_LABELS[tag.tipo]}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Criar nova */}
                <div style={{ borderTop: "1px solid #f0ebe0" }}>
                  <button
                    onClick={() => { setNovoNome(pesquisa); setMostraFormCriar(true) }}
                    style={{
                      display: "flex", alignItems: "center", gap: "8px",
                      width: "100%", padding: "10px 12px",
                      fontSize: "12px", fontFamily: "var(--font-sans, sans-serif)",
                      color: "#b9a07a", backgroundColor: "transparent",
                      border: "none", cursor: "pointer",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(185,160,122,0.06)")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <Plus size={12} />
                    {pesquisa ? `Criar "${pesquisa}"` : "Criar nova etiqueta"}
                  </button>
                </div>
              </>
            ) : (
              /* Formulário de criação */
              <div style={{ padding: "14px 14px" }}>
                <p style={{
                  fontSize: "10px", fontWeight: 700, letterSpacing: "0.16em",
                  textTransform: "uppercase", color: "#9d9d9a",
                  fontFamily: "var(--font-sans, sans-serif)", marginBottom: "12px",
                }}>
                  Nova Etiqueta
                </p>

                {/* Nome */}
                <input
                  autoFocus
                  value={novoNome}
                  onChange={e => setNovoNome(e.target.value)}
                  placeholder="Nome da etiqueta"
                  style={{
                    width: "100%", padding: "7px 10px", borderRadius: "4px",
                    border: "1px solid #ddd6c4", fontSize: "13px",
                    fontFamily: "var(--font-sans, sans-serif)", color: "#161a26",
                    outline: "none", boxSizing: "border-box", marginBottom: "10px",
                  }}
                />

                {/* Tipo */}
                <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                  {(["saude", "campanha", "preferencia"] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setNovoTipo(t)}
                      style={{
                        flex: 1, padding: "5px 0", borderRadius: "4px", fontSize: "10px",
                        fontFamily: "var(--font-sans, sans-serif)", fontWeight: 600,
                        letterSpacing: "0.08em", textTransform: "uppercase",
                        border: "1px solid", cursor: "pointer",
                        color: novoTipo === t ? "#b9a07a" : "#9d9d9a",
                        borderColor: novoTipo === t ? "rgba(185,160,122,0.5)" : "#ddd6c4",
                        backgroundColor: novoTipo === t ? "rgba(185,160,122,0.08)" : "transparent",
                      }}
                    >
                      {TIPO_ETIQUETA_LABELS[t].slice(0, 4)}
                    </button>
                  ))}
                </div>

                {/* Bloquear automações (só para saúde) */}
                {novoTipo === "saude" && (
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={novoBloqueio}
                      onChange={e => setNovoBloqueio(e.target.checked)}
                    />
                    <span style={{ fontSize: "11px", fontFamily: "var(--font-sans, sans-serif)", color: "#6d6d6d" }}>
                      Bloquear automações
                    </span>
                  </label>
                )}

                {/* Paleta de cores */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
                  {CORES_PALETA.map(cor => (
                    <button
                      key={cor}
                      onClick={() => setNovoCor(cor)}
                      style={{
                        width: "20px", height: "20px", borderRadius: "50%",
                        backgroundColor: cor, border: novoCor === cor ? `2px solid #161a26` : "2px solid transparent",
                        cursor: "pointer", padding: 0, outline: "none",
                      }}
                    />
                  ))}
                </div>

                {erro && <p style={{ fontSize: "11px", color: "#b06050", marginBottom: "8px", fontFamily: "var(--font-sans, sans-serif)" }}>{erro}</p>}

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => { setMostraFormCriar(false); setErro("") }}
                    style={{
                      flex: 1, padding: "7px", borderRadius: "4px", fontSize: "12px",
                      fontFamily: "var(--font-sans, sans-serif)", fontWeight: 500,
                      border: "1px solid #ddd6c4", color: "#9d9d9a", backgroundColor: "transparent", cursor: "pointer",
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCriar}
                    disabled={!novoNome.trim() || isPending}
                    style={{
                      flex: 1, padding: "7px", borderRadius: "4px", fontSize: "12px",
                      fontFamily: "var(--font-sans, sans-serif)", fontWeight: 600,
                      border: "none", color: "#fff", backgroundColor: "#b9a07a",
                      cursor: novoNome.trim() ? "pointer" : "not-allowed", opacity: novoNome.trim() ? 1 : 0.5,
                    }}
                  >
                    Criar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
