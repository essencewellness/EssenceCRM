"use client"
import { useEffect, useState } from "react"
import Link from "next/link"

interface Estagio {
  key: string
  label: string
  href: string
  count: number
}

interface FunilChartProps {
  estagios: Estagio[]
  terapeuta?: string
}

// Conta a subir do zero até ao valor real ao montar — só efeito, nunca
// atrasa o número real (que já vem correto no primeiro render para quem
// tem JS desligado ou prefers-reduced-motion).
function useCountUp(alvo: number, duracaoMs = 900) {
  // Estado inicial já é o valor final (correto sem JS/antes do efeito
  // correr) — o efeito só reinicia a 0 e anima quando não há preferência
  // por movimento reduzido. Todo o setState corre dentro de callbacks do
  // requestAnimationFrame, nunca síncrono no corpo do efeito.
  const [valor, setValor] = useState(alvo)
  useEffect(() => {
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduzido) return
    let raf = requestAnimationFrame(() => {
      setValor(0)
      const inicio = performance.now()
      const tick = (agora: number) => {
        const t = Math.min(1, (agora - inicio) / duracaoMs)
        const suavizado = 1 - Math.pow(1 - t, 3)
        setValor(Math.round(suavizado * alvo))
        if (t < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(raf)
  }, [alvo, duracaoMs])
  return valor
}

function NumeroContagem({ valor }: { valor: number }) {
  const contado = useCountUp(valor)
  return <>{contado}</>
}

export function FunilChart({ estagios, terapeuta }: FunilChartProps) {
  const primeiraContagem = estagios[0]?.count || 1
  const proporcoes = estagios.map((e) => Math.max(0.14, e.count / primeiraContagem))

  const boxW = 260
  const boxH = 260
  const bandaH = boxH / estagios.length
  const meiaLarguraMax = boxW / 2 - 10
  const cx = boxW / 2

  return (
    <div style={{ display: "flex", gap: "32px", flexWrap: "wrap", alignItems: "center" }}>
      <svg
        width={boxW}
        height={boxH}
        viewBox={`0 0 ${boxW} ${boxH}`}
        className="anim-scale-in"
        style={{ flexShrink: 0 }}
        role="img"
        aria-label="Funil de crescimento: largura de cada faixa representa o número de clientes em cada estágio"
      >
        {estagios.map((estagio, i) => {
          const topoP = proporcoes[i]
          const baseP = i < estagios.length - 1 ? proporcoes[i + 1] : proporcoes[i]
          const yTopo = i * bandaH
          const yBase = (i + 1) * bandaH
          const topoMeia = topoP * meiaLarguraMax
          const baseMeia = baseP * meiaLarguraMax
          // Uma única tinta (champagne) em opacidade decrescente — o
          // funil lê-se pela forma e pelo degradê de intensidade, nunca
          // por uma cor diferente a cada faixa.
          const opacidade = 0.92 - i * (0.6 / Math.max(1, estagios.length - 1))
          const pontos = `${cx - topoMeia},${yTopo} ${cx + topoMeia},${yTopo} ${cx + baseMeia},${yBase} ${cx - baseMeia},${yBase}`
          return (
            <polygon
              key={estagio.key}
              points={pontos}
              fill="var(--nuit-champagne)"
              fillOpacity={opacidade}
              stroke="var(--nuit-midnight)"
              strokeWidth={2}
            />
          )
        })}
      </svg>

      <div style={{ flex: "1 1 260px", display: "flex", flexDirection: "column", minWidth: "240px" }}>
        {estagios.map((estagio, i) => {
          const proximo = i < estagios.length - 1 ? estagios[i + 1].count : null
          const pctConversao = proximo !== null ? (estagio.count > 0 ? Math.round((proximo / estagio.count) * 100) : null) : null
          return (
            <Link
              key={estagio.key}
              href={terapeuta ? `${estagio.href}&terapeuta=${terapeuta}` : estagio.href}
              className="anim-fade-right card-hover"
              style={{
                animationDelay: `${i * 70}ms`,
                textDecoration: "none",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
                padding: "12px 4px",
                borderBottom: i < estagios.length - 1 ? "1px solid rgba(212,184,134,0.10)" : "none",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{
                  fontFamily: "var(--font-sans, sans-serif)", fontSize: "9px", fontWeight: 700,
                  letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--nuit-bone-soft)",
                }}>
                  {estagio.label}
                </span>
                <span style={{
                  fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "26px",
                  fontWeight: 400, color: "var(--nuit-bone)", lineHeight: 1.1,
                }}>
                  <NumeroContagem valor={estagio.count} />
                </span>
              </div>
              {pctConversao !== null && (
                <span style={{
                  fontFamily: "var(--font-sans, sans-serif)", fontSize: "11px", fontWeight: 700,
                  padding: "4px 9px", borderRadius: "100px", whiteSpace: "nowrap",
                  color: pctConversao < 50 ? "var(--destructive)" : "var(--nuit-champagne-soft)",
                  backgroundColor: pctConversao < 50 ? "rgba(176,96,80,0.12)" : "rgba(212,184,134,0.10)",
                }}>
                  {pctConversao}% →
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
