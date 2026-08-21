"use client"

import { motion } from "motion/react"
import { AnimatedProgress } from "@/components/animated-progress"

const ESTADO_ESTILO: Record<string, { bg: string; color: string; border: string }> = {
  ativa:     { bg: "rgba(80,200,120,0.12)",  color: "#6fcf97", border: "rgba(80,200,120,0.30)" },
  cancelada: { bg: "rgba(220,60,60,0.12)",   color: "#e07070", border: "rgba(220,60,60,0.30)" },
  concluida: { bg: "rgba(212,184,134,0.08)", color: "var(--nuit-champagne-soft)", border: "rgba(212,184,134,0.25)" },
}

interface CampanhaDTO {
  id: string
  nome: string
  estado: string
  segmento: { tipo: string; valor?: string }
  templateNome: string
  totalMensagens: number
  totalEnviado: number
  totalFalhado: number
  criadaEm: string
}

interface Props {
  campanhas: CampanhaDTO[]
}

export function CampanhasClient({ campanhas }: Props) {
  if (campanhas.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          backgroundColor: "var(--nuit-overlay)",
          border: "1px dashed rgba(212,184,134,0.22)",
          borderRadius: "6px",
          padding: "52px",
          textAlign: "center",
          margin: "0 32px 32px",
        }}
      >
        <p style={{
          fontFamily: "var(--font-sans, sans-serif)",
          color: "var(--nuit-bone-soft)", fontSize: "13px",
        }}>
          Nenhuma campanha criada ainda.
        </p>
      </motion.div>
    )
  }

  return (
    <div style={{ padding: "0 32px 32px", display: "flex", flexDirection: "column", gap: "12px" }}>
      {campanhas.map((c, idx) => {
        const totalProcessado = c.totalEnviado + c.totalFalhado
        const progressoPct =
          c.totalMensagens > 0
            ? Math.round((totalProcessado / c.totalMensagens) * 100)
            : 0
        const estadoEstilo = ESTADO_ESTILO[c.estado] ?? ESTADO_ESTILO["concluida"]!

        return (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, delay: idx * 0.07, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{
              borderColor: "rgba(212,184,134,0.35)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
              y: -1,
            }}
            style={{
              backgroundColor: "var(--nuit-overlay)",
              border: "1px solid rgba(212,184,134,0.16)",
              borderRadius: "6px",
              padding: "20px",
              transition: "border-color 200ms, box-shadow 200ms",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "12px" }}>
              <div>
                <p style={{
                  fontFamily: "var(--font-sans, sans-serif)",
                  fontWeight: 600, fontSize: "14px", color: "var(--nuit-bone)", marginBottom: "4px",
                }}>
                  {c.nome}
                </p>
                <p style={{
                  fontFamily: "var(--font-sans, sans-serif)",
                  fontSize: "12px", color: "var(--nuit-bone-soft)",
                }}>
                  {c.templateNome} · {c.segmento.tipo}
                  {c.segmento.valor ? ` (${c.segmento.valor})` : ""}
                </p>
              </div>

              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.07 + 0.2, type: "spring", stiffness: 400, damping: 22 }}
                style={{
                  display: "inline-flex", flexShrink: 0,
                  padding: "3px 10px", borderRadius: "100px",
                  backgroundColor: estadoEstilo.bg,
                  color: estadoEstilo.color,
                  border: `1px solid ${estadoEstilo.border}`,
                  fontSize: "10px", fontWeight: 600,
                  fontFamily: "var(--font-sans, sans-serif)",
                  letterSpacing: "0.12em", textTransform: "uppercase",
                }}
              >
                {c.estado}
              </motion.span>
            </div>

            {/* Stats */}
            <div style={{
              display: "flex", alignItems: "center", gap: "20px",
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: "12px", color: "var(--nuit-bone-soft)",
              marginBottom: c.totalMensagens > 0 ? "12px" : "0",
            }}>
              <span>Total: <strong style={{ color: "var(--nuit-bone)" }}>{c.totalMensagens}</strong></span>
              <span style={{ color: "#6fcf97" }}>Enviadas: <strong>{c.totalEnviado}</strong></span>
              <span style={{ color: "#e07070" }}>Falhadas: <strong>{c.totalFalhado}</strong></span>
              <span style={{ marginLeft: "auto" }}>{c.criadaEm}</span>
            </div>

            {/* Barra de progresso animada */}
            {c.totalMensagens > 0 && (
              <AnimatedProgress value={progressoPct} />
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
