"use client"
import type { LucideIcon } from "lucide-react"
import Link from "next/link"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick?: () => void
    href?: string
  }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 16px", textAlign: "center" }}>
      <div style={{ width: "52px", height: "52px", borderRadius: "50%", backgroundColor: "rgba(185,160,122,0.08)", border: "1px solid rgba(185,160,122,0.20)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
        <Icon style={{ width: "26px", height: "26px", color: "var(--nuit-champagne-soft)" }} />
      </div>
      <h3 style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "15px", fontWeight: 400, color: "var(--nuit-bone)", marginBottom: "6px" }}>{title}</h3>
      <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "13px", color: "var(--nuit-bone-soft)", maxWidth: "280px" }}>{description}</p>
      {action && (
        <div style={{ marginTop: "16px" }}>
          {action.href ? (
            <Link
              href={action.href}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", fontFamily: "var(--font-sans, sans-serif)", fontWeight: 600, color: "var(--nuit-champagne-soft)", textDecoration: "none" }}
            >
              {action.label}
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", fontFamily: "var(--font-sans, sans-serif)", fontWeight: 600, color: "var(--nuit-champagne-soft)", background: "none", border: "none", cursor: "pointer" }}
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
