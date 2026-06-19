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
