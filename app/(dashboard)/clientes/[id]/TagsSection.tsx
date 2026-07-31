"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Plus, X, Tag, Zap, Search } from "lucide-react"
import { CORES_PALETA, TIPO_ETIQUETA_LABELS, calcularTagActividade } from "@/lib/etiquetas"
import { adicionarEtiqueta, removerEtiqueta, criarEtiqueta } from "../actions"
import { useToast } from "@/components/ui/toast-nuit"

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
  const { toast } = useToast()

  const tagActivity = calcularTagActividade(ultimaSessao)
  const idsAtribuidas = new Set(etiquetasCliente.map(e => e.id))
  const disponiveis = todasEtiquetas.filter(e => !idsAtribuidas.has(e.id) && e.tipo !== "automatica")
  const filtradas = pesquisa
    ? disponiveis.filter(e => e.nome.toLowerCase().includes(pesquisa.toLowerCase()))
    : disponiveis

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
      toast("Etiqueta adicionada.", "success")
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
        toast("Etiqueta criada e adicionada.", "success")
      } catch (e: unknown) {
        if (e instanceof Error) setErro(e.message.replace("NOME_DUPLICADO: ", ""))
      }
    })
  }

  return (
    <div style={{ marginTop: "20px" }}>
      {/* Badge de actividade */}
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35 }}
        style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}
      >
        <Zap size={11} color={tagActivity.cor} />
        <span style={{
          fontSize: "11px", fontFamily: "var(--font-sans, sans-serif)",
          fontWeight: 600, color: tagActivity.cor, letterSpacing: "0.04em",
        }}>
          {tagActivity.label}
        </span>
      </motion.div>

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
              <AnimatePresence mode="popLayout">
                {tags.map(tag => (
                  <motion.span
                    key={tag.id}
                    layout
                    initial={{ opacity: 0, scale: 0.65, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.65, y: -4, transition: { duration: 0.18 } }}
                    transition={{ type: "spring", stiffness: 420, damping: 24 }}
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
                      <motion.button
                        onClick={() => handleRemover(tag.id)}
                        disabled={isPending}
                        whileHover={{ scale: 1.3, rotate: 90 }}
                        whileTap={{ scale: 0.85 }}
                        transition={{ type: "spring", stiffness: 500, damping: 18 }}
                        style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          background: "none", border: "none", cursor: "pointer", padding: "0",
                          color: tag.cor, opacity: 0.5, lineHeight: 1,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                        onMouseLeave={e => (e.currentTarget.style.opacity = "0.5")}
                      >
                        <X size={11} />
                      </motion.button>
                    )}
                    {tipo === "automatica" && (
                      <span style={{ fontSize: "9px", opacity: 0.5 }}><Tag size={9} /></span>
                    )}
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )
      })}

      {/* Botão + dropdown */}
      <div ref={dropdownRef} style={{ position: "relative", display: "inline-block", marginTop: "8px" }}>
        <motion.button
          onClick={() => { setAbertoDropdown(o => !o); setMostraFormCriar(false); setErro("") }}
          disabled={isPending}
          whileHover={{ borderColor: "#b9a07a", color: "#b9a07a", scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 22 }}
          style={{
            display: "inline-flex", alignItems: "center", gap: "5px",
            padding: "5px 10px", borderRadius: "100px",
            fontSize: "11px", fontFamily: "var(--font-sans, sans-serif)",
            fontWeight: 500, color: "var(--nuit-bone-soft)",
            backgroundColor: "transparent", border: "1px dashed rgba(212,184,134,0.28)",
            cursor: "pointer",
          }}
        >
          <motion.span
            animate={{ rotate: abertoDropdown ? 45 : 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            style={{ display: "inline-flex" }}
          >
            <Plus size={11} />
          </motion.span>
          Adicionar etiqueta
        </motion.button>

        <AnimatePresence>
          {abertoDropdown && (
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: -6, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 420, damping: 26 }}
              style={{
                position: "absolute", top: "calc(100% + 6px)", left: 0,
                backgroundColor: "var(--nuit-deep)", border: "1px solid rgba(212,184,134,0.22)",
                borderRadius: "6px", boxShadow: "0 8px 28px rgba(14,17,25,0.45)",
                zIndex: 50, width: "260px", overflow: "hidden",
                transformOrigin: "top left",
              }}
            >
              <AnimatePresence mode="wait" initial={false}>
                {!mostraFormCriar ? (
                  <motion.div
                    key="lista"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    {/* Pesquisa */}
                    <div style={{ padding: "10px 12px 6px", borderBottom: "1px solid rgba(212,184,134,0.12)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "var(--nuit-midnight)", borderRadius: "4px", padding: "6px 10px" }}>
                        <Search size={12} color="var(--nuit-smoke)" />
                        <input
                          autoFocus
                          value={pesquisa}
                          onChange={e => setPesquisa(e.target.value)}
                          placeholder="Pesquisar etiquetas…"
                          style={{
                            border: "none", background: "none", outline: "none",
                            fontSize: "12px", fontFamily: "var(--font-sans, sans-serif)",
                            color: "var(--nuit-bone)", width: "100%",
                          }}
                        />
                      </div>
                    </div>

                    {/* Lista */}
                    <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                      {filtradas.length === 0 && !pesquisa && (
                        <p style={{ padding: "12px", fontSize: "12px", color: "var(--nuit-bone-soft)", fontFamily: "var(--font-sans, sans-serif)", textAlign: "center" }}>
                          Todas as etiquetas já atribuídas
                        </p>
                      )}
                      {filtradas.map((tag, i) => (
                        <motion.button
                          key={tag.id}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03, duration: 0.2 }}
                          onClick={() => handleAdicionar(tag.id)}
                          whileHover={{ backgroundColor: "rgba(212,184,134,0.08)", x: 2 }}
                          style={{
                            display: "flex", alignItems: "center", gap: "8px",
                            width: "100%", padding: "8px 12px",
                            fontSize: "12px", fontFamily: "var(--font-sans, sans-serif)",
                            color: "var(--nuit-bone)", backgroundColor: "transparent",
                            border: "none", cursor: "pointer", textAlign: "left",
                          }}
                        >
                          <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: tag.cor, flexShrink: 0 }} />
                          {tag.nome}
                          <span style={{ marginLeft: "auto", fontSize: "10px", color: "var(--nuit-bone-soft)" }}>
                            {TIPO_ETIQUETA_LABELS[tag.tipo]}
                          </span>
                        </motion.button>
                      ))}
                    </div>

                    {/* Criar nova */}
                    <div style={{ borderTop: "1px solid rgba(212,184,134,0.12)" }}>
                      <motion.button
                        onClick={() => { setNovoNome(pesquisa); setMostraFormCriar(true) }}
                        whileHover={{ backgroundColor: "rgba(185,160,122,0.08)", x: 2 }}
                        style={{
                          display: "flex", alignItems: "center", gap: "8px",
                          width: "100%", padding: "10px 12px",
                          fontSize: "12px", fontFamily: "var(--font-sans, sans-serif)",
                          color: "#b9a07a", backgroundColor: "transparent",
                          border: "none", cursor: "pointer",
                        }}
                      >
                        <Plus size={12} />
                        {pesquisa ? `Criar "${pesquisa}"` : "Criar nova etiqueta"}
                      </motion.button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.18 }}
                    style={{ padding: "14px 14px" }}
                  >
                    <p style={{
                      fontSize: "10px", fontWeight: 700, letterSpacing: "0.16em",
                      textTransform: "uppercase", color: "#9d9d9a",
                      fontFamily: "var(--font-sans, sans-serif)", marginBottom: "12px",
                    }}>
                      Nova Etiqueta
                    </p>

                    <input
                      autoFocus
                      value={novoNome}
                      onChange={e => setNovoNome(e.target.value)}
                      placeholder="Nome da etiqueta"
                      style={{
                        width: "100%", padding: "7px 10px", borderRadius: "4px",
                        border: "1px solid rgba(212,184,134,0.22)", fontSize: "13px",
                        fontFamily: "var(--font-sans, sans-serif)", color: "var(--nuit-bone)",
                        backgroundColor: "var(--nuit-midnight)",
                        outline: "none", boxSizing: "border-box", marginBottom: "10px",
                      }}
                    />

                    <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                      {(["saude", "campanha", "preferencia"] as const).map(t => (
                        <motion.button
                          key={t}
                          onClick={() => setNovoTipo(t)}
                          whileTap={{ scale: 0.95 }}
                          style={{
                            flex: 1, padding: "5px 0", borderRadius: "4px", fontSize: "10px",
                            fontFamily: "var(--font-sans, sans-serif)", fontWeight: 600,
                            letterSpacing: "0.08em", textTransform: "uppercase",
                            border: "1px solid", cursor: "pointer",
                            color: novoTipo === t ? "#b9a07a" : "var(--nuit-bone-soft)",
                            borderColor: novoTipo === t ? "rgba(185,160,122,0.5)" : "rgba(212,184,134,0.18)",
                            backgroundColor: novoTipo === t ? "rgba(185,160,122,0.08)" : "transparent",
                            transition: "all 150ms",
                          }}
                        >
                          {TIPO_ETIQUETA_LABELS[t].slice(0, 4)}
                        </motion.button>
                      ))}
                    </div>

                    {novoTipo === "saude" && (
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={novoBloqueio}
                          onChange={e => setNovoBloqueio(e.target.checked)}
                        />
                        <span style={{ fontSize: "11px", fontFamily: "var(--font-sans, sans-serif)", color: "var(--nuit-bone-soft)" }}>
                          Bloquear automações
                        </span>
                      </label>
                    )}

                    {/* Paleta de cores */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
                      {CORES_PALETA.map(cor => (
                        <motion.button
                          key={cor}
                          onClick={() => setNovoCor(cor)}
                          whileHover={{ scale: 1.2 }}
                          whileTap={{ scale: 0.9 }}
                          transition={{ type: "spring", stiffness: 500, damping: 20 }}
                          style={{
                            width: "20px", height: "20px", borderRadius: "50%",
                            backgroundColor: cor,
                            border: novoCor === cor ? `2px solid var(--nuit-bone)` : "2px solid transparent",
                            cursor: "pointer", padding: 0, outline: "none",
                            boxShadow: novoCor === cor ? `0 0 0 1px ${cor}` : "none",
                          }}
                        />
                      ))}
                    </div>

                    <AnimatePresence>
                      {erro && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          style={{ fontSize: "11px", color: "#b06050", marginBottom: "8px", fontFamily: "var(--font-sans, sans-serif)" }}
                        >
                          {erro}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <motion.button
                        onClick={() => { setMostraFormCriar(false); setErro("") }}
                        whileHover={{ opacity: 0.8 }}
                        whileTap={{ scale: 0.97 }}
                        style={{
                          flex: 1, padding: "7px", borderRadius: "4px", fontSize: "12px",
                          fontFamily: "var(--font-sans, sans-serif)", fontWeight: 500,
                          border: "1px solid rgba(212,184,134,0.22)", color: "var(--nuit-bone-soft)", backgroundColor: "transparent", cursor: "pointer",
                        }}
                      >
                        Cancelar
                      </motion.button>
                      <motion.button
                        onClick={handleCriar}
                        disabled={!novoNome.trim() || isPending}
                        whileHover={novoNome.trim() ? { scale: 1.02, y: -1 } : {}}
                        whileTap={novoNome.trim() ? { scale: 0.97 } : {}}
                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                        style={{
                          flex: 1, padding: "7px", borderRadius: "4px", fontSize: "12px",
                          fontFamily: "var(--font-sans, sans-serif)", fontWeight: 600,
                          border: "none", color: "#fff", backgroundColor: "#b9a07a",
                          cursor: novoNome.trim() ? "pointer" : "not-allowed",
                          opacity: novoNome.trim() ? 1 : 0.5,
                          boxShadow: novoNome.trim() ? "0 4px 12px rgba(185,160,122,0.30)" : "none",
                        }}
                      >
                        Criar
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
