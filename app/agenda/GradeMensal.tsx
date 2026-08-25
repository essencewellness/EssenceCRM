"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import type { SessaoGrade } from "./GradeHoraria"

const ESTADO_BORDA: Record<string, string> = {
  agendada: "var(--nuit-champagne-soft)",
  confirmada: "#8a9bb0",
  aguarda_terapeuta: "var(--nuit-champagne-soft)",
  realizada: "var(--nuit-sage)",
  cancelada: "var(--destructive)",
  falta: "var(--destructive)",
}

const DIAS_SEMANA = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"]
const EASE_OUT = [0.22, 1, 0.36, 1] as [number, number, number, number]

const CONTAINER_VARIANTS = {
  hidden: {},
  show: { transition: { staggerChildren: 0.014 } },
}
const CELULA_VARIANTS = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE_OUT } },
}

function Chip({ s, compacto = false }: { s: SessaoGrade; compacto?: boolean }) {
  return (
    <a
      href={`/clientes/${s.clienteId}`}
      target="_blank"
      rel="noopener noreferrer"
      title={`${s.hora ?? ""} · ${s.clienteNome} · ${s.servico ?? ""}`}
      className="agenda-chip"
      style={{
        display: "block", fontSize: compacto ? "10px" : "9px", fontFamily: "var(--font-sans)",
        color: "var(--nuit-bone-soft)", textDecoration: "none",
        borderLeft: `2px solid ${ESTADO_BORDA[s.estado] ?? "var(--nuit-bone-soft)"}`,
        padding: compacto ? "3px 6px" : "1px 4px 1px 6px",
        borderRadius: "3px",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        transition: "background-color 160ms var(--ease-out, ease), color 160ms var(--ease-out, ease)",
      }}
    >
      <strong style={{ fontWeight: 700, color: "var(--nuit-bone)" }}>{s.hora}</strong> {s.clienteNome}
    </a>
  )
}

export function GradeMensal({ mesRef, dias }: {
  mesRef: Date
  dias: { data: Date; sessoes: SessaoGrade[] }[]
}) {
  const [diaAberto, setDiaAberto] = useState<string | null>(null)
  const mesAtual = mesRef.getMonth()
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const semanas: typeof dias[] = []
  for (let i = 0; i < dias.length; i += 7) semanas.push(dias.slice(i, i + 7))

  return (
    <div style={{ position: "relative" }}>
      <motion.div
        key={mesRef.toISOString().slice(0, 7)}
        variants={CONTAINER_VARIANTS}
        initial="hidden"
        animate="show"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "1px",
          backgroundColor: "var(--rule-soft)",
          border: "1px solid var(--rule-soft)",
          borderRadius: "10px",
          overflow: "hidden",
          boxShadow: "var(--shadow-1, 0 1px 2px rgba(0,0,0,0.2))",
        }}
      >
        {DIAS_SEMANA.map((d, i) => (
          <div key={d} style={{
            textAlign: "center", padding: "9px 0",
            fontFamily: "var(--font-sans)", fontSize: "9px", fontWeight: 700,
            letterSpacing: "0.14em", color: "var(--nuit-bone-soft)",
            backgroundColor: "var(--nuit-overlay)",
            opacity: i >= 5 ? 0.65 : 1,
          }}>
            {d}
          </div>
        ))}

        {semanas.flatMap((semana) =>
          semana.map(({ data, sessoes }, colIndex) => {
            const foraDoMes = data.getMonth() !== mesAtual
            const ehHoje = data.getTime() === hoje.getTime()
            const fimDeSemana = colIndex >= 5
            const chave = data.toISOString().slice(0, 10)
            const visiveis = sessoes.slice(0, 3)
            const resto = sessoes.length - visiveis.length
            const aberto = diaAberto === chave

            return (
              <motion.div
                key={chave}
                variants={CELULA_VARIANTS}
                onClick={() => resto > 0 && setDiaAberto(aberto ? null : chave)}
                className="agenda-celula"
                style={{
                  position: "relative",
                  minHeight: "98px", padding: "7px 6px",
                  backgroundColor: ehHoje
                    ? "rgba(212,184,134,0.09)"
                    : fimDeSemana
                      ? "rgba(255,255,255,0.012)"
                      : "var(--nuit-midnight)",
                  opacity: foraDoMes ? 0.32 : 1,
                  cursor: resto > 0 ? "pointer" : "default",
                  transition: "background-color 200ms var(--ease-out, ease)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: "22px", height: "22px", borderRadius: "50%",
                    fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "12.5px",
                    color: ehHoje ? "var(--nuit-midnight)" : "var(--nuit-bone)",
                    backgroundColor: ehHoje ? "var(--nuit-champagne)" : "transparent",
                    boxShadow: ehHoje ? "0 0 0 3px rgba(212,184,134,0.18)" : "none",
                  }}>
                    {data.getDate()}
                  </span>
                  {sessoes.length > 0 && (
                    <span style={{
                      fontFamily: "var(--font-sans)", fontSize: "8px", fontWeight: 700,
                      color: "var(--nuit-champagne-soft)", opacity: 0.75,
                    }}>
                      {sessoes.length}
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  {visiveis.map(s => <Chip key={s.id} s={s} />)}
                  {resto > 0 && (
                    <span style={{
                      fontSize: "8.5px", fontFamily: "var(--font-sans)", fontWeight: 600,
                      color: "var(--nuit-champagne-soft)", paddingLeft: "6px",
                      textDecoration: "underline", textUnderlineOffset: "2px",
                    }}>
                      +{resto} mais
                    </span>
                  )}
                </div>

                <AnimatePresence>
                  {aberto && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.94, y: 4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96, y: 2 }}
                      transition={{ duration: 0.16, ease: EASE_OUT }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: "absolute", top: "calc(100% + 6px)",
                        left: fimDeSemana ? "auto" : 0,
                        right: fimDeSemana ? 0 : "auto",
                        zIndex: 20, minWidth: "200px", maxWidth: "240px",
                        backgroundColor: "var(--nuit-overlay)",
                        border: "1px solid rgba(212,184,134,0.28)",
                        borderRadius: "8px", padding: "10px",
                        boxShadow: "var(--shadow-hero, 0 16px 40px rgba(0,0,0,0.45))",
                        display: "flex", flexDirection: "column", gap: "4px",
                      }}
                    >
                      <p style={{
                        fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "13px",
                        color: "var(--nuit-bone)", marginBottom: "2px",
                        fontStyle: "italic",
                      }}>
                        {data.toLocaleDateString("pt-PT", { day: "numeric", month: "long" })}
                      </p>
                      {sessoes.map(s => <Chip key={s.id} s={s} compacto />)}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })
        )}
      </motion.div>

      {diaAberto && (
        <div
          onClick={() => setDiaAberto(null)}
          style={{ position: "fixed", inset: 0, zIndex: 10 }}
        />
      )}

      <style>{`
        .agenda-celula:hover { background-color: rgba(212,184,134,0.045) !important; }
        .agenda-chip:hover { background-color: rgba(212,184,134,0.12); color: var(--nuit-bone) !important; }
        @media (prefers-reduced-motion: reduce) {
          .agenda-celula, .agenda-chip { transition: none !important; }
        }
      `}</style>
    </div>
  )
}
