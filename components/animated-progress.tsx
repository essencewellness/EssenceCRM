"use client"

import { useEffect, useState } from "react"
import { motion } from "motion/react"

interface AnimatedProgressProps {
  value: number        // 0-100
  color?: string
  delay?: number       // seconds
  height?: number
}

export function AnimatedProgress({
  value,
  color = "var(--nuit-champagne-soft)",
  delay = 0,
  height = 4,
}: AnimatedProgressProps) {
  const [triggered, setTriggered] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setTriggered(true), delay * 1000)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div style={{
      height, width: "100%", borderRadius: height / 2,
      backgroundColor: "#e6e0d2", overflow: "hidden",
      position: "relative",
    }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: triggered ? `${value}%` : 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        style={{
          height: "100%", borderRadius: height / 2,
          backgroundColor: color,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Shimmer sweep */}
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: triggered ? "200%" : "-100%" }}
          transition={{ duration: 1.2, delay: 0.4, ease: "easeInOut" }}
          style={{
            position: "absolute", top: 0, bottom: 0,
            width: "40%",
            background: "linear-gradient(to right, transparent, rgba(255,255,255,0.3), transparent)",
            pointerEvents: "none",
          }}
        />
      </motion.div>
    </div>
  )
}
