"use client"

import { Pencil, Check } from "lucide-react"
import { useEdicaoPerfil } from "./EdicaoPerfilContext"

export function EdicaoPerfilToggle() {
  const { editing, setEditing } = useEdicaoPerfil()

  return (
    <button
      type="button"
      onClick={() => setEditing(!editing)}
      style={{
        display: "inline-flex", alignItems: "center", gap: "6px",
        padding: "7px 14px", borderRadius: "6px",
        fontFamily: "var(--font-sans, sans-serif)",
        fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em",
        cursor: "pointer", transition: "all 0.15s",
        ...(editing
          ? { backgroundColor: "rgba(160,169,150,0.15)", border: "1px solid var(--nuit-sage)", color: "var(--nuit-sage)" }
          : { backgroundColor: "transparent", border: "1px solid rgba(212,184,134,0.22)", color: "var(--nuit-bone-soft)" }),
      }}
    >
      {editing ? <Check size={13} /> : <Pencil size={13} />}
      {editing ? "Concluir edição" : "Editar"}
    </button>
  )
}
