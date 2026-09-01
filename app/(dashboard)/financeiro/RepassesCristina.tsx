"use client"

import { useTransition } from "react"
import { marcarRepasseFeito } from "./actions"
import { useToast } from "@/components/ui/toast-nuit"
import { valorDevido, type RepasseRow } from "@/lib/repasses"

const GOLD = "var(--nuit-champagne)"
const CREAM = "var(--nuit-bone)"
const CARD_BG = "var(--nuit-overlay)"
const BORDER = "rgba(212,184,134,0.15)"

const METODO_LABEL: Record<string, string> = {
  mbway_essence: "MBWay Essence",
  mbway_beatriz: "MBWay Beatriz",
}

export type { RepasseRow }

function LinhaRepasse({ repasse }: { repasse: RepasseRow }) {
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "11px 16px", borderBottom: `1px solid ${BORDER}`, gap: "12px",
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-sans, 'Manrope', sans-serif)", fontSize: "13px", color: CREAM }}>
          {repasse.cliente.nome} <span style={{ color: "var(--muted-foreground)" }}>· {repasse.servico ?? "—"}</span>
        </div>
        <div style={{ fontFamily: "var(--font-sans, 'Manrope', sans-serif)", fontSize: "11px", color: "var(--muted-foreground)", marginTop: "2px" }}>
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
          className={pending ? undefined : "btn-lift"}
          onClick={() => startTransition(async () => {
            await marcarRepasseFeito(repasse.id)
            toast(`Repasse a ${repasse.cliente.nome} marcado como feito`, "success")
          })}
          style={{
            padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: 700,
            border: "none", backgroundColor: GOLD, color: "var(--primary-foreground)",
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
        color: "var(--muted-foreground)", marginBottom: "12px", lineHeight: 1.6,
      }}>
Estas sessões e vouchers foram pagos por MBWay — que cai sempre na conta da Bea. Marca &ldquo;Repassado&rdquo; só depois de entregares o dinheiro à Cristina em mão.
      </p>
      <div style={{ backgroundColor: CARD_BG, border: "1px solid rgba(212,140,50,0.25)", borderRadius: "10px", overflow: "hidden" }}>
        {repasses.map(r => <LinhaRepasse key={r.id} repasse={r} />)}
      </div>
    </section>
  )
}
