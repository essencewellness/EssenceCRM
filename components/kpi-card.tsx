"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "motion/react"

function useCountUp(target: number, duration = 1100) {
  const [value, setValue] = useState(0)
  const startTime = useRef<number | null>(null)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    startTime.current = null
    const animate = (ts: number) => {
      if (!startTime.current) startTime.current = ts
      const progress = Math.min((ts - startTime.current) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(ease * target))
      if (progress < 1) frameRef.current = requestAnimationFrame(animate)
    }
    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [target, duration])

  return value
}

const COR_MAP = {
  gold:  { accent: "#b9a07a", icon: "rgba(185,160,122,0.55)" },
  green: { accent: "#7a9e7e", icon: "rgba(122,158,126,0.55)" },
  blue:  { accent: "#7a8eb5", icon: "rgba(122,142,181,0.55)" },
  red:   { accent: "#b06050", icon: "rgba(176,96,80,0.55)"  },
} satisfies Record<string, { accent: string; icon: string }>

interface KpiCardProps {
  titulo: string
  valor: number
  prefix?: string
  suffix?: string
  descricao?: string
  icon: React.ReactNode
  cor?: keyof typeof COR_MAP
  index?: number
}

export function KpiCardPremium({
  titulo, valor, prefix = "", suffix = "",
  descricao, icon, cor = "gold", index = 0,
}: KpiCardProps) {
  const count = useCountUp(valor)
  const cores = COR_MAP[cor]

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      style={{
        backgroundColor: "#fdfaf1",
        border: "1px solid rgba(212,184,134,0.20)",
        borderRadius: "2px",
        padding: "22px 24px 20px",
        position: "relative",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      {/* Hairline colorida no topo */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "1px",
        backgroundColor: cores.accent,
        opacity: 0.45,
      }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "14px" }}>
        <p style={{
          fontFamily: "var(--font-sans, sans-serif)",
          fontSize: "9px", fontWeight: 500, letterSpacing: "0.30em",
          color: "#b9a07a", textTransform: "uppercase",
        }}>
          {titulo}
        </p>
        <span style={{ color: cores.icon, display: "flex", marginTop: "1px" }}>
          {icon}
        </span>
      </div>

      {/* Valor principal */}
      <div style={{ display: "flex", alignItems: "baseline", gap: "3px", marginBottom: "8px" }}>
        {prefix && (
          <span style={{
            fontFamily: "var(--font-sans, sans-serif)",
            fontSize: "14px", fontWeight: 400, color: "#7a7e8a",
          }}>{prefix}</span>
        )}
        <span style={{
          fontFamily: "var(--font-heading, 'DM Serif Display', Georgia, serif)",
          fontSize: "34px", fontWeight: 400, color: "#161a26",
          lineHeight: 1, letterSpacing: "-0.02em",
        }}>
          {count.toLocaleString("pt-PT")}
        </span>
        {suffix && (
          <span style={{
            fontFamily: "var(--font-sans, sans-serif)",
            fontSize: "16px", fontWeight: 400, color: "#7a7e8a",
          }}>{suffix}</span>
        )}
      </div>

      {/* Descrição */}
      {descricao && (
        <p style={{
          fontFamily: "var(--font-sans, sans-serif)",
          fontSize: "11px", color: "rgba(122,126,138,0.70)",
          lineHeight: 1.4,
        }}>
          {descricao}
        </p>
      )}
    </motion.div>
  )
}
