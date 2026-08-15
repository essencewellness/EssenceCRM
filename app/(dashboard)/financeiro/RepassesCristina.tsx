"use client"

import { useTransition } from "react"
import { marcarRepasseFeito } from "./actions"

const GOLD = "#d4b886"
const CREAM = "#ece6d6"
const CARD_BG = "#1f2433"
const BORDER = "rgba(212,184,134,0.15)"

const METODO_LABEL: Record<string, string> = {
  mbway_essence: "MBWay Essence",
  mbway_beatriz: "MBWay Beatriz",
}

export type RepasseRow = {
  id: string
  data: string
  servico: string | null
  valorPago: string | null
  // Quanto desta sessão é da Cristina. Null = o valorPago todo (sessão só
  // dela); numa massagem a dois é metade, porque a outra metade é da Bea.
  valorRepasse: string | null
  metodoPagamento: string | null
  cliente: { id: string; nome: string }
}

/** O que a Bea deve mesmo à Cristina por esta sessão. */
export function valorDevido(r: RepasseRow): number {
  if (r.valorRepasse !== null) return Number(r.valorRepasse)
  return r.valorPago ? Number(r.valorPago) : 0
}

function LinhaRepasse({ repasse }: { repasse: RepasseRow }) {
  const [pending, startTransition] = useTransition()

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "11px 16px", borderBottom: `1px solid ${BORDER}`, gap: "12px",
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-sans, 'Manrope', sans-serif)", fontSize: "13px", color: CREAM }}>
          {repasse.cliente.nome} <span style={{ color: "rgba(237,231,227,0.4)" }}>· {repasse.servico ?? "—"}</span>
        </div>
        <div style={{ fontFamily: "var(--font-sans, 'Manrope', sans-serif)", fontSize: "11px", color: "rgba(237,231,227,0.4)", marginTop: "2px" }}>
          {new Date(repasse.data).toLocaleDateString("pt-PT")}
          {repasse.metodoPagamento ? ` · ${METODO_LABEL[repasse.metodoPagamento] ?? repasse.metodoPagamento}` : ""}
          {repasse.valorRepasse !== null && repasse.valorPago
            ? ` · metade de €${Number(repasse.valorPago).toFixed(2)}`
            : ""}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
        <span style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "15px", color: "#d48c45" }}>
          {`€${valorDevido(repasse).toFixed(2)}`}
        </span>
        <button
          disabled={pending}
          onClick={() => startTransition(() => marcarRepasseFeito(repasse.id))}
          style={{
            padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: 700,
            border: "none", backgroundColor: GOLD, color: "#0e1119",
            cursor: pending ? "wait" : "pointer", opacity: pending ? 0.7 : 1,
            fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
          }}
        >
          {pending ? "…" : "Repassado ✓"}
        </button>
      </div>
    </div>
  )
}

export function RepassesCristina({ repasses, total }: { repasses: RepasseRow[]; total: number }) {
  if (repasses.length === 0) return null

  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <h2 style={{
          fontFamily: "var(--font-sans, 'Manrope', sans-serif)", color: "rgba(212,184,134,0.55)",
          fontSize: "10px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase",
        }}>
          A repassar à Cristina
        </h2>
        <span style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "16px", color: "#d48c45" }}>
          €{total.toFixed(2)}
        </span>
      </div>
      <p style={{
        fontFamily: "var(--font-sans, 'Manrope', sans-serif)", fontSize: "12px",
        color: "rgba(237,231,227,0.4)", marginBottom: "12px", lineHeight: 1.6,
      }}>
        Estas sessões foram pagas por MBWay — que cai sempre na conta da Bea. Marca &ldquo;Repassado&rdquo; só depois de entregares o dinheiro à Cristina em mão.
      </p>
      <div style={{ backgroundColor: CARD_BG, border: "1px solid rgba(212,140,50,0.25)", borderRadius: "10px", overflow: "hidden" }}>
        {repasses.map(r => <LinhaRepasse key={r.id} repasse={r} />)}
      </div>
    </section>
  )
}
