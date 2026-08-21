import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const GOLD = "var(--nuit-champagne)"
const CREAM = "var(--nuit-bone)"
const CARD_BG = "var(--nuit-overlay)"
const BORDER = "rgba(212,184,134,0.15)"

export default async function TemplatesPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const templates = await prisma.templateMensagem.findMany({
    orderBy: [{ tipo: "asc" }, { nome: "asc" }],
  })

  const porTipo = templates.reduce<Record<string, typeof templates>>(
    (acc, t) => {
      ;(acc[t.tipo] ??= []).push(t)
      return acc
    },
    {}
  )

  return (
    <div style={{ padding: "32px", maxWidth: "960px", margin: "0 auto" }} className="space-y-8">
      {/* Cabeçalho */}
      <div>
        <h1 style={{
          fontFamily: "var(--font-heading, 'DM Serif Display', Georgia, serif)",
          color: CREAM, fontSize: "26px", fontWeight: 400, letterSpacing: "0.02em",
        }}>
          Templates de Mensagem
        </h1>
        <p style={{
          fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
          color: `rgba(212,184,134,0.55)`, fontSize: "13px", marginTop: "4px",
        }}>
          {templates.length} template{templates.length !== 1 ? "s" : ""} configurados
        </p>
      </div>

      {templates.length === 0 && (
        <div style={{
          backgroundColor: CARD_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: "12px",
          padding: "40px",
          textAlign: "center",
        }}>
          <p style={{
            fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
            color: `var(--muted-foreground)`, fontSize: "13px",
          }}>
            Nenhum template criado. Use a API para criar templates.
          </p>
        </div>
      )}

      {Object.entries(porTipo).map(([tipo, lista]) => (
        <section key={tipo}>
          <h2 style={{
            fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
            color: `rgba(212,184,134,0.55)`, fontSize: "10px",
            fontWeight: 700, letterSpacing: "0.22em",
            textTransform: "uppercase", marginBottom: "12px",
          }}>
            {tipo}
          </h2>
          <div className="grid gap-3">
            {lista.map((t) => (
              <div
                key={t.id}
                style={{
                  backgroundColor: CARD_BG,
                  border: `1px solid ${BORDER}`,
                  borderRadius: "10px",
                  padding: "20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <span style={{
                    fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
                    fontWeight: 600, fontSize: "14px", color: CREAM,
                  }}>
                    {t.nome}
                  </span>
                  <span style={{
                    display: "inline-flex",
                    padding: "2px 8px", borderRadius: "4px",
                    backgroundColor: t.ativo ? "rgba(80,200,120,0.12)" : "rgba(237,231,227,0.06)",
                    color: t.ativo ? "#6fcf97" : "var(--muted-foreground)",
                    fontSize: "11px", fontWeight: 600,
                    fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
                    letterSpacing: "0.04em",
                  }}>
                    {t.ativo ? "ativo" : "inativo"}
                  </span>
                </div>
                <p style={{
                  fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
                  fontSize: "13px", color: `var(--muted-foreground)`,
                  whiteSpace: "pre-wrap", lineHeight: 1.6,
                }}>
                  {t.texto}
                </p>
                {t.variaveis.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "12px" }}>
                    {t.variaveis.map((v) => (
                      <span
                        key={v}
                        style={{
                          fontFamily: "monospace",
                          fontSize: "11px",
                          backgroundColor: "rgba(212,184,134,0.08)",
                          color: GOLD,
                          padding: "2px 8px",
                          borderRadius: "4px",
                          border: `1px solid rgba(212,184,134,0.18)`,
                        }}
                      >
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
