import { UserRound } from "lucide-react"

interface Props {
  terapeutaNome: string | null
}

// Etiqueta só de leitura — "terapeuta principal" deixou de ser um campo
// fixo editável (decisão do Nuno, 2026-09-16): é calculada ao vivo a partir
// de quem tem mais sessões realizadas com esta cliente específica (ver
// lib/terapeuta-padrao.ts, mapaTerapeutasPrincipais). Sem selector — nada
// para "escolher" manualmente.
export function TerapeutaEditor({ terapeutaNome }: Props) {
  const GOLD = "var(--nuit-champagne-soft)"
  return (
    <span
      title="Terapeuta com mais sessões realizadas com esta cliente"
      style={{
        display: "inline-flex", alignItems: "center", gap: "6px",
        padding: "5px 12px", borderRadius: "100px",
        fontSize: "11px", fontWeight: 600,
        fontFamily: "var(--font-sans, sans-serif)",
        color: GOLD, backgroundColor: "rgba(185,160,122,0.10)",
        border: "1px solid rgba(185,160,122,0.28)",
      }}
    >
      <UserRound size={12} />
      {terapeutaNome ?? "Sem terapeuta"}
    </span>
  )
}
