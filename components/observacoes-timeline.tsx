"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"

interface Observacao {
  id: string
  texto: string
  autor: string
  criadoEm: string
}

interface Props {
  clienteId: string
  inicial: Observacao[]
}

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]

function formatData(iso: string) {
  const d = new Date(iso)
  return {
    dia:  d.getDate().toString().padStart(2, "0"),
    mes:  MESES[d.getMonth()],
    ano:  d.getFullYear(),
    hora: `${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`,
  }
}

export function ObservacoesTimeline({ clienteId, inicial }: Props) {
  const [obs, setObs]         = useState<Observacao[]>(inicial)
  const [aberto, setAberto]   = useState(false)
  const [texto, setTexto]     = useState("")
  const [erro, setErro]       = useState("")
  const [isPending, start]    = useTransition()
  const textareaRef           = useRef<HTMLTextAreaElement>(null)
  const abortRef              = useRef<AbortController | null>(null)

  useEffect(() => {
    if (aberto) textareaRef.current?.focus()
  }, [aberto])

  useEffect(() => () => { abortRef.current?.abort() }, [])

  async function guardar() {
    if (!texto.trim()) { setErro("Escreve alguma coisa primeiro."); return }
    setErro("")
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    start(async () => {
      const res = await fetch(`/api/v1/clientes/${clienteId}/observacoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
        signal: ac.signal,
      })
      if (res.ok) {
        const nova = await res.json()
        setObs(prev => [nova, ...prev])
        setTexto("")
        setAberto(false)
      } else {
        setErro("Erro ao guardar. Tenta novamente.")
      }
    })
  }

  function cancelar() {
    setTexto("")
    setErro("")
    setAberto(false)
  }

  return (
    <div style={{ position: "relative" }}>

      {/* Botão nova observação */}
      {!aberto && (
        <button
          onClick={() => setAberto(true)}
          style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            padding: "9px 18px", borderRadius: "8px",
            backgroundColor: "transparent",
            border: "1px solid rgba(185,160,122,0.4)",
            color: "#b9a07a", cursor: "pointer",
            fontFamily: "var(--font-sans, sans-serif)",
            fontSize: "12px", fontWeight: 600, letterSpacing: "0.06em",
            marginBottom: "28px",
            transition: "all 150ms",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(185,160,122,0.06)"
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(185,160,122,0.7)"
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(185,160,122,0.4)"
          }}
        >
          <span style={{ fontSize: "16px", lineHeight: 1 }}>✦</span>
          Nova observação
        </button>
      )}

      {/* Formulário inline */}
      <AnimatePresence>
      {aberto && (
        <motion.div
          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
          animate={{ opacity: 1, height: "auto", marginBottom: "28px" }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{
            overflow: "hidden",
            backgroundColor: "var(--nuit-overlay)",
            border: "1px solid rgba(185,160,122,0.3)",
            borderLeft: "3px solid #b9a07a",
            borderRadius: "10px",
            padding: "20px",
            boxShadow: "var(--shadow-2)",
          }}>
          <p style={{
            fontFamily: "var(--font-sans, sans-serif)",
            fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em",
            color: "#b9a07a", textTransform: "uppercase", marginBottom: "12px",
          }}>
            Nova observação
          </p>
          <textarea
            ref={textareaRef}
            value={texto}
            onChange={e => { setTexto(e.target.value); setErro("") }}
            placeholder="Escreve aqui a tua observação sobre esta cliente…"
            rows={4}
            onKeyDown={e => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) guardar()
              if (e.key === "Escape") cancelar()
            }}
            style={{
              width: "100%", padding: "12px",
              borderRadius: "7px", border: "1px solid rgba(212,184,134,0.2)",
              backgroundColor: "var(--nuit-midnight)",
              fontFamily: "var(--font-body, sans-serif)", fontSize: "14px",
              color: "var(--nuit-bone)", lineHeight: 1.7,
              resize: "vertical", outline: "none", boxSizing: "border-box",
            }}
          />
          {erro && (
            <p style={{
              fontFamily: "var(--font-body)", fontSize: "12px",
              color: "#b06050", marginTop: "6px",
            }}>{erro}</p>
          )}
          <div style={{ display: "flex", gap: "10px", marginTop: "14px", alignItems: "center" }}>
            <button
              onClick={guardar}
              disabled={isPending}
              style={{
                padding: "8px 18px", borderRadius: "7px",
                backgroundColor: "#b9a07a", color: "#ffffff", border: "none",
                fontFamily: "var(--font-sans)", fontSize: "12px", fontWeight: 600,
                cursor: isPending ? "default" : "pointer",
                opacity: isPending ? 0.7 : 1,
                transition: "opacity 150ms",
              }}
            >
              {isPending ? "A guardar…" : "Guardar"}
            </button>
            <button
              onClick={cancelar}
              style={{
                padding: "8px 14px", borderRadius: "7px",
                backgroundColor: "transparent", color: "var(--nuit-smoke)",
                border: "1px solid rgba(212,184,134,0.2)",
                fontFamily: "var(--font-sans)", fontSize: "12px",
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <span style={{
              marginLeft: "auto",
              fontFamily: "var(--font-body)", fontSize: "11px", color: "var(--nuit-smoke-deep)",
            }}>
              ⌘↵ para guardar · Esc para cancelar
            </span>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Timeline */}
      {obs.length === 0 ? (
        <div style={{
          padding: "52px 0", textAlign: "center",
        }}>
          <div style={{
            width: "1px", height: "40px",
            backgroundColor: "rgba(185,160,122,0.2)",
            margin: "0 auto 20px",
          }} />
          <p style={{
            fontFamily: "var(--font-heading, Georgia, serif)",
            fontStyle: "italic", fontSize: "15px", color: "var(--nuit-smoke)",
          }}>
            Ainda nenhuma observação registada.
          </p>
          <p style={{
            fontFamily: "var(--font-body)", fontSize: "12px",
            color: "var(--nuit-smoke-deep)", marginTop: "6px",
          }}>
            A primeira nota ficará aqui, com data e hora.
          </p>
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          {/* Linha vertical */}
          <div style={{
            position: "absolute", left: "42px", top: "8px",
            bottom: "8px", width: "1px",
            backgroundColor: "rgba(185,160,122,0.18)",
          }} />

          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
            style={{ display: "flex", flexDirection: "column", gap: "0" }}
          >
            {obs.map((o, i) => {
              const d = formatData(o.criadoEm)
              return (
                <motion.div
                  key={o.id}
                  variants={{
                    hidden: { opacity: 0, x: -12 },
                    visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
                  }}
                  layout
                  style={{
                    display: "flex", gap: "24px", alignItems: "flex-start",
                    paddingBottom: i < obs.length - 1 ? "24px" : "0",
                  }}
                >
                  {/* Data */}
                  <div style={{
                    flexShrink: 0, width: "84px", textAlign: "center",
                    paddingTop: "14px",
                  }}>
                    <div style={{
                      fontFamily: "var(--font-heading, Georgia, serif)",
                      fontSize: "28px", fontWeight: 400, color: "var(--nuit-bone)",
                      lineHeight: 1,
                    }}>
                      {d.dia}
                    </div>
                    <div style={{
                      fontFamily: "var(--font-sans, sans-serif)",
                      fontSize: "9px", fontWeight: 700, letterSpacing: "0.14em",
                      color: "#b9a07a", textTransform: "uppercase", marginTop: "3px",
                    }}>
                      {d.mes} {d.ano}
                    </div>
                    <div style={{
                      fontFamily: "var(--font-body)", fontSize: "10px",
                      color: "var(--nuit-smoke-deep)", marginTop: "2px",
                    }}>
                      {d.hora}
                    </div>
                  </div>

                  {/* Ponto na linha */}
                  <div style={{
                    position: "relative", zIndex: 1, flexShrink: 0,
                    marginTop: "22px",
                  }}>
                    <div style={{
                      width: "7px", height: "7px", borderRadius: "50%",
                      backgroundColor: "#b9a07a",
                      boxShadow: "0 0 0 3px rgba(185,160,122,0.15)",
                    }} />
                  </div>

                  {/* Bloco de nota */}
                  <div style={{
                    flex: 1, backgroundColor: "var(--nuit-overlay)",
                    border: "1px solid rgba(212,184,134,0.14)",
                    borderLeft: "2px solid rgba(185,160,122,0.4)",
                    borderRadius: "10px", padding: "16px 18px",
                    boxShadow: "var(--shadow-1)",
                  }}>
                    <p style={{
                      fontFamily: "var(--font-body, sans-serif)",
                      fontSize: "14px", color: "var(--nuit-bone-soft)", lineHeight: 1.75,
                      whiteSpace: "pre-wrap", margin: 0,
                    }}>
                      {o.texto}
                    </p>
                    <div style={{
                      marginTop: "10px", paddingTop: "10px",
                      borderTop: "1px solid rgba(212,184,134,0.1)",
                      display: "flex", alignItems: "center", gap: "6px",
                    }}>
                      <div style={{
                        width: "18px", height: "18px", borderRadius: "50%",
                        backgroundColor: "rgba(185,160,122,0.12)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "var(--font-heading)", fontSize: "9px", color: "#b9a07a",
                      }}>
                        {o.autor[0].toUpperCase()}
                      </div>
                      <span style={{
                        fontFamily: "var(--font-sans)", fontSize: "10px",
                        color: "var(--nuit-smoke)", textTransform: "capitalize",
                      }}>
                        {o.autor}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      )}
    </div>
  )
}
