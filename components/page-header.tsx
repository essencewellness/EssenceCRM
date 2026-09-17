"use client"

import { motion } from "motion/react"

interface PageHeaderProps {
  icon?: React.ReactNode
  titulo: string
  subtitulo?: string
  badge?: React.ReactNode
}

export function PageHeader({ titulo, subtitulo, badge }: PageHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      style={{ marginBottom: "28px", position: "relative" }}
    >
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "18px", marginBottom: "14px" }}>
        <div>
          {subtitulo && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, delay: 0.08 }}
              style={{
                fontFamily: "var(--font-sans, sans-serif)",
                fontSize: "calc(9px * var(--ui-font-scale))", fontWeight: 500,
                letterSpacing: "0.32em", textTransform: "uppercase",
                color: "var(--nuit-champagne-soft)", marginBottom: "7px",
              }}
            >
              {subtitulo}
            </motion.p>
          )}
          <motion.h1
            className="crm-page-title"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.42, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          >
            {titulo}
          </motion.h1>
        </div>
        {badge && (
          <motion.div
            initial={{ opacity: 0, scale: 0.90 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.38, delay: 0.20, ease: [0.22, 1, 0.36, 1] }}
          >
            {badge}
          </motion.div>
        )}
      </div>

      <motion.hr
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.65, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
        aria-hidden="true"
        style={{
          border: 0,
          height: "1px",
          transformOrigin: "left",
          margin: 0,
          background: "linear-gradient(90deg, var(--rule), rgba(185,160,122,0.10), transparent)",
        }}
      />
    </motion.header>
  )
}
