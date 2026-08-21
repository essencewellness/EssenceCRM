"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { UserRound } from "lucide-react"

interface Terapeuta {
  id: string
  name: string | null
}

/**
 * Filtro de admin visível em todas as abas: Todos / Beatriz / Cristina.
 * Mantém os restantes parâmetros de query e alterna apenas ?terapeuta=.
 */
export function FiltroTerapeuta({ terapeutas }: { terapeutas: Terapeuta[] }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const ativo = searchParams.get("terapeuta") ?? ""

  function href(terapeutaId: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (terapeutaId) params.set("terapeuta", terapeutaId)
    else params.delete("terapeuta")
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  const GOLD = "var(--nuit-champagne-soft)"
  const chip = (label: string, isActive: boolean, to: string, key: string) => (
    <Link
      key={key}
      href={to}
      style={{
        display: "inline-flex", alignItems: "center", gap: "6px",
        height: "30px", padding: "0 12px", borderRadius: "100px",
        fontSize: "11px", fontWeight: 600,
        fontFamily: "var(--font-sans, sans-serif)",
        color: isActive ? GOLD : "var(--nuit-bone-soft)",
        backgroundColor: isActive ? "rgba(185,160,122,0.10)" : "transparent",
        border: isActive ? "1px solid rgba(185,160,122,0.35)" : "1px solid rgba(122,126,138,0.22)",
        textDecoration: "none", transition: "all 150ms",
      }}
    >
      {label}
    </Link>
  )

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
      <span style={{
        display: "inline-flex", alignItems: "center", gap: "5px",
        fontFamily: "var(--font-sans, sans-serif)",
        fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em",
        color: "#9d9d9a", textTransform: "uppercase", marginRight: "2px",
      }}>
        <UserRound size={12} /> Terapeuta
      </span>
      {chip("Todos", ativo === "", href(null), "todos")}
      {terapeutas.map((t) =>
        chip(t.name ?? "—", ativo === t.id, href(t.id), t.id)
      )}
    </div>
  )
}
