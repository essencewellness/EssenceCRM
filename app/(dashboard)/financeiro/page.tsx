import { prisma } from "@/lib/prisma"
import { serializarDecimais } from "@/lib/serialize"

const GOLD = "#d4b886"
const CREAM = "#ece6d6"
const CARD_BG = "#1f2433"
const BORDER = "rgba(212,184,134,0.15)"

function mesAtual(): { inicio: Date; fim: Date; label: string } {
  const now = new Date()
  const inicio = new Date(now.getFullYear(), now.getMonth(), 1)
  const fim = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const label = inicio.toLocaleDateString("pt-PT", { month: "long", year: "numeric" })
  return { inicio, fim, label }
}

export default async function FinanceiroPage() {
  const { inicio, fim, label } = mesAtual()

  const sessoes = await prisma.sessao.findMany({
    where: { data: { gte: inicio, lt: fim }, apagadoEm: null },
    select: {
      id: true,
      estadoPagamento: true,
      valorPago: true,
      metodoPagamento: true,
      preco: true,
      data: true,
      servico: true,
      estado: true,
      cliente: { select: { id: true, nome: true, telefone: true } },
    },
    orderBy: { data: "desc" },
  })

  const dados = serializarDecimais(sessoes) as typeof sessoes

  let receitaTotal = 0
  const porMetodo: Record<string, number> = { dinheiro: 0, mbway: 0, transferencia: 0, voucher: 0 }
  const porEstado: Record<string, number> = { pendente: 0, pago: 0, parcial: 0, isento: 0 }

  for (const s of dados) {
    const ep = s.estadoPagamento as string
    porEstado[ep] = (porEstado[ep] ?? 0) + 1
    if (s.estadoPagamento === "pago" && s.valorPago) {
      const v = Number(s.valorPago)
      receitaTotal += v
      const m = s.metodoPagamento as string | null
      if (m && m in porMetodo) porMetodo[m]! += v
    }
  }

  const pendentes = dados.filter(
    (s) => s.estadoPagamento === "pendente" && s.estado === "realizada"
  )

  return (
    <div style={{ padding: "32px", maxWidth: "960px", margin: "0 auto" }} className="space-y-8">
      {/* Cabeçalho */}
      <div>
        <h1 style={{
          fontFamily: "var(--font-heading, 'DM Serif Display', Georgia, serif)",
          color: CREAM, fontSize: "26px", fontWeight: 400, letterSpacing: "0.02em",
        }}>
          Financeiro
        </h1>
        <p style={{
          fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
          color: `rgba(212,184,134,0.55)`, fontSize: "13px", marginTop: "4px",
          textTransform: "capitalize",
        }}>
          {label}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Receita cobrada" valor={`€${receitaTotal.toFixed(2)}`} tipo="destaque" />
        <KpiCard label="Sessões pagas" valor={String(porEstado["pago"] ?? 0)} tipo="normal" />
        <KpiCard label="Por cobrar" valor={String(porEstado["pendente"] ?? 0)} tipo={pendentes.length ? "aviso" : "normal"} />
        <KpiCard label="Isentas" valor={String(porEstado["isento"] ?? 0)} tipo="normal" />
      </div>

      {/* Por método de pagamento */}
      <section>
        <h2 style={{
          fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
          color: `rgba(212,184,134,0.55)`, fontSize: "10px",
          fontWeight: 700, letterSpacing: "0.22em",
          textTransform: "uppercase", marginBottom: "12px",
        }}>
          Por método de pagamento
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(porMetodo).map(([metodo, valor]) => (
            <div key={metodo} style={{
              backgroundColor: CARD_BG,
              border: `1px solid ${BORDER}`,
              borderRadius: "10px",
              padding: "16px",
            }}>
              <div style={{
                fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
                color: `rgba(237,231,227,0.45)`,
                fontSize: "11px", textTransform: "capitalize", marginBottom: "6px",
              }}>
                {metodo === "transferencia" ? "Transferência" : metodo.charAt(0).toUpperCase() + metodo.slice(1)}
              </div>
              <div style={{
                fontFamily: "var(--font-heading, Georgia, serif)",
                color: CREAM, fontSize: "20px", fontWeight: 400,
              }}>
                €{valor.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Sessões por cobrar */}
      {pendentes.length > 0 && (
        <section>
          <h2 style={{
            fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
            color: `rgba(212,184,134,0.55)`, fontSize: "10px",
            fontWeight: 700, letterSpacing: "0.22em",
            textTransform: "uppercase", marginBottom: "12px",
          }}>
            Por cobrar ({pendentes.length})
          </h2>
          <div style={{
            backgroundColor: CARD_BG,
            border: `1px solid rgba(212,184,134,0.22)`,
            borderRadius: "10px", overflow: "hidden",
          }}>
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Cliente", "Serviço", "Data", "Valor"].map((h, i) => (
                    <th key={h} style={{
                      padding: "12px 16px",
                      textAlign: i === 3 ? "right" : "left",
                      fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
                      fontSize: "10px", fontWeight: 700,
                      letterSpacing: "0.14em",
                      color: `rgba(212,184,134,0.45)`,
                      textTransform: "uppercase",
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendentes.map((s, i) => (
                  <tr key={s.id} style={{
                    borderBottom: i < pendentes.length - 1 ? `1px solid ${BORDER}` : "none",
                  }}>
                    <td style={{ padding: "12px 16px", fontFamily: "var(--font-sans, 'Manrope', sans-serif)", color: CREAM, fontSize: "13px", fontWeight: 500 }}>
                      {s.cliente.nome}
                    </td>
                    <td style={{ padding: "12px 16px", color: `rgba(237,231,227,0.55)`, fontSize: "13px" }}>
                      {s.servico ?? "—"}
                    </td>
                    <td style={{ padding: "12px 16px", color: `rgba(237,231,227,0.55)`, fontSize: "13px" }}>
                      {new Date(s.data).toLocaleDateString("pt-PT")}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: GOLD, fontSize: "13px", fontWeight: 600 }}>
                      {s.preco ? `€${Number(s.preco).toFixed(2)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Todas as sessões do mês */}
      <section>
        <h2 style={{
          fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
          color: `rgba(212,184,134,0.55)`, fontSize: "10px",
          fontWeight: 700, letterSpacing: "0.22em",
          textTransform: "uppercase", marginBottom: "12px",
        }}>
          Todas as sessões ({dados.length})
        </h2>
        <div style={{
          backgroundColor: CARD_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: "10px", overflow: "hidden",
        }}>
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["Cliente", "Serviço", "Data", "Pagamento", "Valor pago"].map((h, i) => (
                  <th key={h} style={{
                    padding: "12px 16px",
                    textAlign: i === 4 ? "right" : "left",
                    fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
                    fontSize: "10px", fontWeight: 700,
                    letterSpacing: "0.14em",
                    color: `rgba(212,184,134,0.45)`,
                    textTransform: "uppercase",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dados.map((s, i) => (
                <tr key={s.id} style={{
                  borderBottom: i < dados.length - 1 ? `1px solid ${BORDER}` : "none",
                }}>
                  <td style={{ padding: "12px 16px", fontFamily: "var(--font-sans, 'Manrope', sans-serif)", color: CREAM, fontSize: "13px", fontWeight: 500 }}>
                    {s.cliente.nome}
                  </td>
                  <td style={{ padding: "12px 16px", color: `rgba(237,231,227,0.55)`, fontSize: "13px" }}>
                    {s.servico ?? "—"}
                  </td>
                  <td style={{ padding: "12px 16px", color: `rgba(237,231,227,0.55)`, fontSize: "13px" }}>
                    {new Date(s.data).toLocaleDateString("pt-PT")}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <EstadoBadge estado={s.estadoPagamento as string} />
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right", color: `rgba(237,231,227,0.7)`, fontSize: "13px" }}>
                    {s.valorPago ? `€${Number(s.valorPago).toFixed(2)}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function KpiCard({
  label, valor, tipo,
}: {
  label: string
  valor: string
  tipo: "destaque" | "aviso" | "normal"
}) {
  const borderColor =
    tipo === "destaque" ? `rgba(212,184,134,0.35)` :
    tipo === "aviso"    ? `rgba(212,140,50,0.30)` :
    BORDER

  const valorColor =
    tipo === "destaque" ? GOLD :
    tipo === "aviso"    ? `#d48c45` :
    CREAM

  return (
    <div style={{
      backgroundColor: CARD_BG,
      border: `1px solid ${borderColor}`,
      borderRadius: "10px",
      padding: "18px 16px",
    }}>
      <div style={{
        fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
        color: `rgba(237,231,227,0.45)`, fontSize: "11px", marginBottom: "8px",
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: "var(--font-heading, Georgia, serif)",
        color: valorColor, fontSize: "24px", fontWeight: 400,
      }}>
        {valor}
      </div>
    </div>
  )
}

function EstadoBadge({ estado }: { estado: string }) {
  const estilos: Record<string, { bg: string; color: string }> = {
    pago:     { bg: "rgba(80,200,120,0.12)",  color: "#6fcf97" },
    pendente: { bg: "rgba(212,140,50,0.12)",  color: "#d48c45" },
    parcial:  { bg: "rgba(100,150,230,0.12)", color: "#7cb4f0" },
    isento:   { bg: "rgba(237,231,227,0.07)", color: "rgba(237,231,227,0.4)" },
  }
  const s = estilos[estado] ?? estilos["isento"]!
  return (
    <span style={{
      display: "inline-flex",
      padding: "2px 8px", borderRadius: "4px",
      backgroundColor: s.bg, color: s.color,
      fontSize: "11px", fontWeight: 600,
      fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
      letterSpacing: "0.04em",
    }}>
      {estado}
    </span>
  )
}
