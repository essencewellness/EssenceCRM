import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { serializarDecimais } from "@/lib/serialize"

const GOLD = "#d4b886"
const CREAM = "#ece6d6"
const CARD_BG = "#1f2433"
const BORDER = "rgba(212,184,134,0.15)"

function fmtMes(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function parseMes(mes?: string) {
  const now = new Date()
  const ref = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : fmtMes(now)
  const [ano, m] = ref.split("-").map(Number)
  const inicio = new Date(ano!, m! - 1, 1)
  const fim = new Date(ano!, m!, 1)
  const label = inicio.toLocaleDateString("pt-PT", { month: "long", year: "numeric" })
  return {
    ref, inicio, fim, label,
    prevMes: fmtMes(new Date(ano!, m! - 2, 1)),
    nextMes: fmtMes(new Date(ano!, m!, 1)),
    ehMesAtual: ref === fmtMes(now),
  }
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  const { mes } = await searchParams
  const { inicio, fim, label, prevMes, nextMes, ehMesAtual } = parseMes(mes)

  const [sessoes, receitaAllTime, topReceitaRaw] = await Promise.all([
    prisma.sessao.findMany({
      where: { data: { gte: inicio, lt: fim }, apagadoEm: null },
      select: {
        id: true, estadoPagamento: true, valorPago: true, metodoPagamento: true,
        preco: true, data: true, servico: true, estado: true,
        cliente: { select: { id: true, nome: true, telefone: true } },
      },
      orderBy: { data: "desc" },
    }),
    // Receita de sempre (todas as sessões pagas)
    prisma.sessao.aggregate({
      where: { estadoPagamento: "pago", apagadoEm: null },
      _sum: { valorPago: true },
      _count: true,
    }),
    // Top clientes por receita cobrada (Σ valorPago das pagas)
    prisma.sessao.groupBy({
      by: ["clienteId"],
      where: { estadoPagamento: "pago", apagadoEm: null },
      _sum: { valorPago: true },
      orderBy: { _sum: { valorPago: "desc" } },
      take: 8,
    }),
  ])

  const dados = serializarDecimais(sessoes) as typeof sessoes

  // Nomes dos clientes do top
  const topIds = topReceitaRaw.map((t) => t.clienteId)
  const nomesTop = topIds.length
    ? await prisma.cliente.findMany({ where: { id: { in: topIds } }, select: { id: true, nome: true } })
    : []
  const nomePorId = new Map(nomesTop.map((c) => [c.id, c.nome]))
  const topReceita = topReceitaRaw.map((t) => ({
    clienteId: t.clienteId,
    nome: nomePorId.get(t.clienteId) ?? "—",
    receita: Number(t._sum.valorPago ?? 0),
  }))

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

  const pendentes = dados.filter((s) => s.estadoPagamento === "pendente" && s.estado === "realizada")
  const receitaSempre = Number(receitaAllTime._sum.valorPago ?? 0)

  return (
    <div style={{ padding: "32px", maxWidth: "1040px", margin: "0 auto" }} className="space-y-8">
      {/* Cabeçalho + navegador de mês */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{
            fontFamily: "var(--font-heading, 'DM Serif Display', Georgia, serif)",
            color: CREAM, fontSize: "26px", fontWeight: 400, letterSpacing: "0.02em",
          }}>
            Financeiro
          </h1>
          <p style={{
            fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
            color: `rgba(212,184,134,0.55)`, fontSize: "13px", marginTop: "4px", textTransform: "capitalize",
          }}>
            {label}{ehMesAtual ? " · mês atual" : ""}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <MesLink href={`/financeiro?mes=${prevMes}`} aria-label="Mês anterior"><ChevronLeft size={16} /></MesLink>
          {!ehMesAtual && (
            <Link href="/financeiro" style={{
              fontFamily: "var(--font-sans, 'Manrope', sans-serif)", fontSize: "12px",
              color: GOLD, textDecoration: "none", padding: "0 8px",
            }}>
              Hoje
            </Link>
          )}
          <MesLink href={`/financeiro?mes=${nextMes}`} aria-label="Mês seguinte"><ChevronRight size={16} /></MesLink>
        </div>
      </div>

      {/* KPI cards do mês */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Receita do mês" valor={`€${receitaTotal.toFixed(2)}`} tipo="destaque" />
        <KpiCard label="Sessões pagas" valor={String(porEstado["pago"] ?? 0)} tipo="normal" />
        <KpiCard label="Por cobrar" valor={String(porEstado["pendente"] ?? 0)} tipo={pendentes.length ? "aviso" : "normal"} />
        <KpiCard label="Receita total (sempre)" valor={`€${receitaSempre.toFixed(2)}`} tipo="ouro" />
      </div>

      {/* Por método + Top clientes por receita */}
      <div className="grid md:grid-cols-2 gap-8">
        <section>
          <SectionTitle>Por método de pagamento</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(porMetodo).map(([metodo, valor]) => (
              <div key={metodo} style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "16px" }}>
                <div style={{ fontFamily: "var(--font-sans, 'Manrope', sans-serif)", color: `rgba(237,231,227,0.45)`, fontSize: "11px", textTransform: "capitalize", marginBottom: "6px" }}>
                  {metodo === "transferencia" ? "Transferência" : metodo.charAt(0).toUpperCase() + metodo.slice(1)}
                </div>
                <div style={{ fontFamily: "var(--font-heading, Georgia, serif)", color: CREAM, fontSize: "20px", fontWeight: 400 }}>
                  €{valor.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionTitle>Top clientes por receita (sempre)</SectionTitle>
          <div style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: "10px", overflow: "hidden" }}>
            {topReceita.length === 0 && (
              <p style={{ padding: "20px", fontFamily: "var(--font-sans, 'Manrope', sans-serif)", color: "rgba(237,231,227,0.3)", fontSize: "13px" }}>
                Ainda sem receita registada.
              </p>
            )}
            {topReceita.map((c, i) => (
              <Link key={c.clienteId} href={`/clientes/${c.clienteId}`} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "11px 16px", textDecoration: "none",
                borderBottom: i < topReceita.length - 1 ? `1px solid ${BORDER}` : "none",
              }}>
                <span style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                  <span style={{ fontFamily: "var(--font-sans, 'Manrope', sans-serif)", fontSize: "11px", color: i < 3 ? GOLD : "rgba(237,231,227,0.35)", width: "16px", fontWeight: 700 }}>
                    {i + 1}
                  </span>
                  <span style={{ fontFamily: "var(--font-sans, 'Manrope', sans-serif)", fontSize: "13px", color: CREAM, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.nome}
                  </span>
                </span>
                <span style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "14px", color: GOLD, flexShrink: 0 }}>
                  €{c.receita.toFixed(2)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Sessões por cobrar (do mês) */}
      {pendentes.length > 0 && (
        <section>
          <SectionTitle>Por cobrar — {label} ({pendentes.length})</SectionTitle>
          <TabelaSessoes
            colunas={["Cliente", "Serviço", "Data", "Valor"]}
            linhas={pendentes.map((s) => [
              s.cliente.nome, s.servico ?? "—",
              new Date(s.data).toLocaleDateString("pt-PT"),
              s.preco ? `€${Number(s.preco).toFixed(2)}` : "—",
            ])}
            alinharUltima
            destaque
          />
        </section>
      )}

      {/* Todas as sessões do mês */}
      <section>
        <SectionTitle>Sessões de {label} ({dados.length})</SectionTitle>
        {dados.length === 0 ? (
          <div style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "32px", textAlign: "center" }}>
            <p style={{ fontFamily: "var(--font-sans, 'Manrope', sans-serif)", color: "rgba(237,231,227,0.3)", fontSize: "13px" }}>
              Sem sessões neste mês.
            </p>
          </div>
        ) : (
          <div style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: "10px", overflow: "hidden" }}>
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Cliente", "Serviço", "Data", "Pagamento", "Valor pago"].map((h, i) => (
                    <th key={h} style={{
                      padding: "12px 16px", textAlign: i === 4 ? "right" : "left",
                      fontFamily: "var(--font-sans, 'Manrope', sans-serif)", fontSize: "10px", fontWeight: 700,
                      letterSpacing: "0.14em", color: `rgba(212,184,134,0.45)`, textTransform: "uppercase",
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dados.map((s, i) => (
                  <tr key={s.id} style={{ borderBottom: i < dados.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                    <td style={{ padding: "12px 16px", fontFamily: "var(--font-sans, 'Manrope', sans-serif)", color: CREAM, fontSize: "13px", fontWeight: 500 }}>{s.cliente.nome}</td>
                    <td style={{ padding: "12px 16px", color: `rgba(237,231,227,0.55)`, fontSize: "13px" }}>{s.servico ?? "—"}</td>
                    <td style={{ padding: "12px 16px", color: `rgba(237,231,227,0.55)`, fontSize: "13px" }}>{new Date(s.data).toLocaleDateString("pt-PT")}</td>
                    <td style={{ padding: "12px 16px" }}><EstadoBadge estado={s.estadoPagamento as string} /></td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: `rgba(237,231,227,0.7)`, fontSize: "13px" }}>{s.valorPago ? `€${Number(s.valorPago).toFixed(2)}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function MesLink({ href, children, ...rest }: { href: string; children: React.ReactNode; "aria-label"?: string }) {
  return (
    <Link href={href} {...rest} style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      width: "32px", height: "32px", borderRadius: "8px",
      border: `1px solid ${BORDER}`, color: GOLD, backgroundColor: CARD_BG,
      textDecoration: "none",
    }}>
      {children}
    </Link>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: "var(--font-sans, 'Manrope', sans-serif)", color: `rgba(212,184,134,0.55)`,
      fontSize: "10px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: "12px",
    }}>
      {children}
    </h2>
  )
}

function TabelaSessoes({
  colunas, linhas, alinharUltima = false, destaque = false,
}: {
  colunas: string[]
  linhas: string[][]
  alinharUltima?: boolean
  destaque?: boolean
}) {
  return (
    <div style={{ backgroundColor: CARD_BG, border: `1px solid ${destaque ? "rgba(212,184,134,0.22)" : BORDER}`, borderRadius: "10px", overflow: "hidden" }}>
      <table className="w-full" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
            {colunas.map((h, i) => (
              <th key={h} style={{
                padding: "12px 16px", textAlign: alinharUltima && i === colunas.length - 1 ? "right" : "left",
                fontFamily: "var(--font-sans, 'Manrope', sans-serif)", fontSize: "10px", fontWeight: 700,
                letterSpacing: "0.14em", color: `rgba(212,184,134,0.45)`, textTransform: "uppercase",
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha, ri) => (
            <tr key={ri} style={{ borderBottom: ri < linhas.length - 1 ? `1px solid ${BORDER}` : "none" }}>
              {linha.map((cel, ci) => (
                <td key={ci} style={{
                  padding: "12px 16px",
                  textAlign: alinharUltima && ci === linha.length - 1 ? "right" : "left",
                  fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
                  fontSize: "13px",
                  fontWeight: ci === 0 ? 500 : 400,
                  color: ci === 0 ? CREAM : alinharUltima && ci === linha.length - 1 ? GOLD : "rgba(237,231,227,0.55)",
                }}>
                  {cel}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function KpiCard({
  label, valor, tipo,
}: {
  label: string
  valor: string
  tipo: "destaque" | "aviso" | "normal" | "ouro"
}) {
  const borderColor =
    tipo === "destaque" ? `rgba(212,184,134,0.35)` :
    tipo === "ouro" ? `rgba(212,184,134,0.28)` :
    tipo === "aviso" ? `rgba(212,140,50,0.30)` :
    BORDER
  const valorColor =
    tipo === "destaque" || tipo === "ouro" ? GOLD :
    tipo === "aviso" ? `#d48c45` :
    CREAM

  return (
    <div style={{ backgroundColor: CARD_BG, border: `1px solid ${borderColor}`, borderRadius: "10px", padding: "18px 16px" }}>
      <div style={{ fontFamily: "var(--font-sans, 'Manrope', sans-serif)", color: `rgba(237,231,227,0.45)`, fontSize: "11px", marginBottom: "8px" }}>
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-heading, Georgia, serif)", color: valorColor, fontSize: "24px", fontWeight: 400 }}>
        {valor}
      </div>
    </div>
  )
}

function EstadoBadge({ estado }: { estado: string }) {
  const estilos: Record<string, { bg: string; color: string }> = {
    pago: { bg: "rgba(80,200,120,0.12)", color: "#6fcf97" },
    pendente: { bg: "rgba(212,140,50,0.12)", color: "#d48c45" },
    parcial: { bg: "rgba(100,150,230,0.12)", color: "#7cb4f0" },
    isento: { bg: "rgba(237,231,227,0.07)", color: "rgba(237,231,227,0.4)" },
  }
  const s = estilos[estado] ?? estilos["isento"]!
  return (
    <span style={{
      display: "inline-flex", padding: "2px 8px", borderRadius: "4px",
      backgroundColor: s.bg, color: s.color, fontSize: "11px", fontWeight: 600,
      fontFamily: "var(--font-sans, 'Manrope', sans-serif)", letterSpacing: "0.04em",
    }}>
      {estado}
    </span>
  )
}
