"use client"

import { useRouter } from "next/navigation"

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]

const estilo: React.CSSProperties = {
  height: "32px", borderRadius: "8px", padding: "0 8px", cursor: "pointer",
  border: "1px solid var(--rule-soft)", color: "var(--nuit-champagne)", backgroundColor: "var(--nuit-overlay)",
  fontFamily: "var(--font-sans, 'Manrope', sans-serif)", fontSize: "calc(12px * var(--ui-font-scale))",
}

// Salta direto para qualquer mês/ano (ref = "YYYY-MM"), sem andar mês a mês nas setas.
export function SeletorMes({ mesRef: mesAtual }: { mesRef: string }) {
  const router = useRouter()
  const [ano, mes] = mesAtual.split("-").map(Number) as [number, number]
  const anoAtual = new Date().getFullYear()
  const anos = Array.from({ length: anoAtual + 1 - 2024 + 1 }, (_, i) => 2024 + i)
  if (!anos.includes(ano)) anos.push(ano)

  const ir = (a: number, m: number) => router.push(`/financeiro?mes=${a}-${String(m).padStart(2, "0")}`)

  return (
    <>
      <select aria-label="Mês" value={mes} onChange={(e) => ir(ano, Number(e.target.value))} style={estilo}>
        {MESES.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
      </select>
      <select aria-label="Ano" value={ano} onChange={(e) => ir(Number(e.target.value), mes)} style={estilo}>
        {anos.sort().map((a) => <option key={a} value={a}>{a}</option>)}
      </select>
    </>
  )
}
