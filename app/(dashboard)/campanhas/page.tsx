import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const GOLD = "#d4b886"
const CREAM = "#ece6d6"
const CARD_BG = "#1f2433"
const BORDER = "rgba(212,184,134,0.15)"

const ESTADO_ESTILO: Record<string, { bg: string; color: string }> = {
  ativa:     { bg: "rgba(80,200,120,0.12)",  color: "#6fcf97" },
  cancelada: { bg: "rgba(220,60,60,0.12)",   color: "#e07070" },
  concluida: { bg: "rgba(237,231,227,0.07)", color: "rgba(237,231,227,0.4)" },
}

export default async function CampanhasPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const campanhas = await prisma.campanha.findMany({
    include: {
      template: { select: { nome: true, tipo: true } },
      _count: { select: { mensagens: true } },
    },
    orderBy: { criadaEm: "desc" },
    take: 50,
  })

  return (
    <div style={{ padding: "32px", maxWidth: "960px", margin: "0 auto" }} className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 style={{
          fontFamily: "var(--font-heading, 'DM Serif Display', Georgia, serif)",
          color: CREAM, fontSize: "26px", fontWeight: 400, letterSpacing: "0.02em",
        }}>
          Campanhas
        </h1>
        <p style={{
          fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
          color: `rgba(212,184,134,0.55)`, fontSize: "13px", marginTop: "4px",
        }}>
          {campanhas.length} campanha{campanhas.length !== 1 ? "s" : ""}
        </p>
      </div>

      {campanhas.length === 0 && (
        <div style={{
          backgroundColor: CARD_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: "12px",
          padding: "40px",
          textAlign: "center",
        }}>
          <p style={{
            fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
            color: `rgba(237,231,227,0.3)`, fontSize: "13px",
          }}>
            Nenhuma campanha criada ainda.
          </p>
        </div>
      )}

      <div className="grid gap-4">
        {campanhas.map((c) => {
          const seg = c.segmento as { tipo: string; valor?: string }
          const totalProcessado = c.totalEnviado + c.totalFalhado
          const progressoPct =
            c._count.mensagens > 0
              ? Math.round((totalProcessado / c._count.mensagens) * 100)
              : 0
          const estadoEstilo = ESTADO_ESTILO[c.estado] ?? ESTADO_ESTILO["concluida"]!

          return (
            <div
              key={c.id}
              style={{
                backgroundColor: CARD_BG,
                border: `1px solid ${BORDER}`,
                borderRadius: "10px",
                padding: "20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "12px" }}>
                <div>
                  <p style={{
                    fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
                    fontWeight: 600, fontSize: "14px", color: CREAM, marginBottom: "4px",
                  }}>
                    {c.nome}
                  </p>
                  <p style={{
                    fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
                    fontSize: "12px", color: `rgba(237,231,227,0.45)`,
                  }}>
                    Template: {c.template.nome} · Segmento: {seg.tipo}
                    {seg.valor ? ` (${seg.valor})` : ""}
                  </p>
                </div>
                <span style={{
                  display: "inline-flex", flexShrink: 0,
                  padding: "2px 10px", borderRadius: "4px",
                  backgroundColor: estadoEstilo.bg, color: estadoEstilo.color,
                  fontSize: "11px", fontWeight: 600,
                  fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
                  letterSpacing: "0.04em",
                }}>
                  {c.estado}
                </span>
              </div>

              <div style={{
                display: "flex", alignItems: "center", gap: "24px",
                fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
                fontSize: "12px", color: `rgba(237,231,227,0.5)`,
                marginBottom: c._count.mensagens > 0 ? "12px" : "0",
              }}>
                <span>Total: {c._count.mensagens}</span>
                <span style={{ color: "#6fcf97" }}>Enviadas: {c.totalEnviado}</span>
                <span style={{ color: "#e07070" }}>Falhadas: {c.totalFalhado}</span>
                <span style={{ marginLeft: "auto" }}>
                  {new Date(c.criadaEm).toLocaleDateString("pt-PT")}
                </span>
              </div>

              {c._count.mensagens > 0 && (
                <div style={{
                  width: "100%",
                  backgroundColor: "rgba(237,231,227,0.07)",
                  borderRadius: "999px",
                  height: "4px",
                  overflow: "hidden",
                }}>
                  <div
                    style={{
                      backgroundColor: GOLD,
                      height: "100%",
                      borderRadius: "999px",
                      width: `${progressoPct}%`,
                      opacity: 0.7,
                    }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
