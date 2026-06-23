"use client"

import { motion } from "motion/react"

interface AnimatedSectionProps {
  children: React.ReactNode
  delay?: number
  style?: React.CSSProperties
  className?: string
}

export function AnimatedSection({ children, delay = 0.3, style, className }: AnimatedSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      style={style}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ── Stagger orquestrado ───────────────────────────────────────────────────────
// Usar: <StaggerList> + <StaggerItem> dentro — cada item entra com delay escalonado.

const EASE_OUT = [0.22, 1, 0.36, 1] as [number, number, number, number]

const STAGGER_CONTAINER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055 } },
}

const STAGGER_ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.42, ease: EASE_OUT } },
}

interface StaggerListProps {
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
}

export function StaggerList({ children, style, className }: StaggerListProps) {
  return (
    <motion.div
      variants={STAGGER_CONTAINER}
      initial="hidden"
      animate="show"
      style={style}
      className={className}
    >
      {children}
    </motion.div>
  )
}

interface StaggerItemProps {
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
  as?: "div" | "li" | "tr"
}

export function StaggerItem({ children, style, className, as = "div" }: StaggerItemProps) {
  const Tag = motion[as]
  return (
    <Tag variants={STAGGER_ITEM_VARIANTS} style={style} className={className}>
      {children}
    </Tag>
  )
}

// ── Line reveal (para hairlines que se desenham ao scroll) ───────────────────
export function LineReveal({ style, className }: { style?: React.CSSProperties; className?: string }) {
  return (
    <motion.div
      initial={{ scaleX: 0, originX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, amount: 0.8 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      style={{ height: "1px", backgroundColor: "var(--rule-soft)", ...style }}
      className={className}
    />
  )
}
