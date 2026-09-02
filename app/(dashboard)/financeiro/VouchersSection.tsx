"use client"

import { useState, useTransition } from "react"
import { atualizarEstadoVoucher } from "./actions"

const GOLD = "var(--nuit-champagne)"
const CREAM = "var(--nuit-bone)"
const CARD_BG = "var(--nuit-overlay)"
const BORDER = "var(--rule-soft)"

export type VoucherRow = {
  id: string
  codigo: string
  tipo: "digital" | "fisico"
  estado: "ativo" | "usado" | "expirado" | "cancelado"
  compradorNome: string
  compradorTelefone: string | null
  compradorEmail: string | null
  servicoNome: string
  valorPago: string
  beneficiarioNome: string | null
  beneficiarioTelefone: string | null
  dataCompra: string
  validade: string | null
  dataUso: string | null
  notas: string | null
}

export type ServicoOpcao = {
  id: string
  nome: string
  precoBase: string
}

// ── Badges ────────────────────────────────────────────────────

const ESTADO_V: Record<string, { bg: string; color: string; label: string }> = {
  ativo:     { bg: "rgba(80,200,120,0.12)",   color: "#6fcf97", label: "Ativo" },
  usado:     { bg: "rgba(100,150,230,0.12)",  color: "#7cb4f0", label: "Usado" },
  expirado:  { bg: "rgba(212,140,50,0.12)",   color: "#d48c45", label: "Expirado" },
  cancelado: { bg: "rgba(237,231,227,0.07)",  color: "var(--muted-foreground)", label: "Cancelado" },
}

function EstadoBadge({ estado }: { estado: string }) {
  const s = ESTADO_V[estado] ?? ESTADO_V["ativo"]!
  return (
    <span style={{
      display: "inline-flex", padding: "3px 8px", borderRadius: "4px",
      backgroundColor: s.bg, color: s.color, fontSize: "11px", fontWeight: 600,
      fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
    }}>
      {s.label}
    </span>
  )
}

function TipoBadge({ tipo }: { tipo: "digital" | "fisico" }) {
  const isDigital = tipo === "digital"
  return (
    <span style={{
      display: "inline-flex", padding: "2px 7px", borderRadius: "4px",
      backgroundColor: isDigital ? "rgba(212,184,134,0.1)" : "rgba(180,150,220,0.1)",
      color: isDigital ? GOLD : "#c0a0e0",
      fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em",
      textTransform: "uppercase" as const,
      fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
    }}>
      {isDigital ? "Digital" : "Físico"}
    </span>
  )
}

// ── Secção principal ──────────────────────────────────────────

const FILTROS = ["todos", "ativo", "usado", "expirado", "cancelado"] as const
type Filtro = (typeof FILTROS)[number]

export function VouchersSection({
  vouchers: inicial,
}: {
  vouchers: VoucherRow[]
}) {
  const [vouchers, setVouchers] = useState(inicial)
  const [filtro, setFiltro] = useState<Filtro>("todos")
  const [pending, startTransition] = useTransition()
  const [acaoId, setAcaoId] = useState<string | null>(null)

  const visiveis = filtro === "todos" ? vouchers : vouchers.filter(v => v.estado === filtro)

  // KPIs
  const totalAtivos = vouchers.filter(v => v.estado === "ativo").length
  const totalUsados = vouchers.filter(v => v.estado === "usado").length
  const valorTotal = vouchers.reduce((s, v) => s + Number(v.valorPago), 0)

  function cancelarVoucher(v: VoucherRow) {
    setAcaoId(v.id)
    startTransition(async () => {
      await atualizarEstadoVoucher(v.id, "cancelado")
      setVouchers(prev => prev.map(x => x.id === v.id ? { ...x, estado: "cancelado" as const } : x))
      setAcaoId(null)
    })
  }

  const btnAcaoStyle = (cor: string) => ({
    padding: "3px 10px", borderRadius: "5px", fontSize: "11px", fontWeight: 600,
    border: `1px solid ${cor}22`, backgroundColor: `${cor}11`, color: cor,
    cursor: "pointer", fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
  } as const)

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={{
          fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
          color: "rgba(212,184,134,0.55)", fontSize: "10px", fontWeight: 700,
          letterSpacing: "0.22em", textTransform: "uppercase",
        }}>
          Gift Cards / Vouchers
        </h2>
        <a
          href="/vouchers"
          style={{
            fontSize: "12px", color: GOLD, textDecoration: "none",
            fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
          }}
        >
          Criar / gerir na aba Vouchers →
        </a>
      </div>

      {/* Mini KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
        {[
          { label: "Ativos", valor: String(totalAtivos), cor: "#6fcf97" },
          { label: "Usados", valor: String(totalUsados), cor: "#7cb4f0" },
          { label: "Valor total", valor: `€${valorTotal.toFixed(2)}`, cor: GOLD },
        ].map(({ label, valor, cor }) => (
          <div key={label} style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "14px 16px" }}>
            <div style={{ fontFamily: "var(--font-sans, 'Manrope', sans-serif)", color: "var(--muted-foreground)", fontSize: "10px", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {label}
            </div>
            <div style={{ fontFamily: "var(--font-heading, Georgia, serif)", color: cor, fontSize: "22px", fontWeight: 400 }}>
              {valor}
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "14px", flexWrap: "wrap" }}>
        {FILTROS.map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            style={{
              padding: "4px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: 600,
              border: `1px solid ${filtro === f ? "rgba(212,184,134,0.35)" : BORDER}`,
              backgroundColor: filtro === f ? "rgba(212,184,134,0.1)" : "transparent",
              color: filtro === f ? GOLD : "var(--muted-foreground)",
              cursor: "pointer", textTransform: "capitalize",
              fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
            }}
          >
            {f === "todos" ? "Todos" : ESTADO_V[f]?.label ?? f}
            {f === "todos" ? ` (${vouchers.length})` : ` (${vouchers.filter(v => v.estado === f).length})`}
          </button>
        ))}
      </div>

      {/* Tabela */}
      {visiveis.length === 0 ? (
        <div style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "32px", textAlign: "center" }}>
          <p style={{ fontFamily: "var(--font-sans, 'Manrope', sans-serif)", color: "var(--muted-foreground)", fontSize: "13px" }}>
            {vouchers.length === 0 ? "Ainda não há vouchers. Cria um na aba Vouchers." : "Nenhum voucher nesta categoria."}
          </p>
        </div>
      ) : (
        <div style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: "10px", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "700px" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["Código", "Tipo", "Comprador", "Serviço", "Para", "Valor", "Data", "Validade", "Estado", ""].map((h, i) => (
                  <th key={i} style={{
                    padding: "11px 14px",
                    textAlign: i >= 5 && i <= 7 ? "right" : "left",
                    fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
                    fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em",
                    color: "rgba(212,184,134,0.4)", textTransform: "uppercase", whiteSpace: "nowrap",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visiveis.map((v, i) => (
                <tr
                  key={v.id}
                  style={{
                    borderBottom: i < visiveis.length - 1 ? `1px solid ${BORDER}` : "none",
                    opacity: acaoId === v.id ? 0.5 : 1,
                    transition: "opacity 0.15s",
                  }}
                >
                  <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                    <span style={{ fontFamily: "monospace", color: GOLD, fontSize: "12px", fontWeight: 700, letterSpacing: "0.06em" }}>
                      {v.codigo}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <TipoBadge tipo={v.tipo} />
                  </td>
                  <td style={{ padding: "12px 14px", color: CREAM, fontSize: "13px", whiteSpace: "nowrap" }}>
                    {v.compradorNome}
                    {v.compradorTelefone && (
                      <div style={{ color: "var(--muted-foreground)", fontSize: "11px", marginTop: "1px" }}>{v.compradorTelefone}</div>
                    )}
                  </td>
                  <td style={{ padding: "12px 14px", color: "var(--muted-foreground)", fontSize: "12px", whiteSpace: "nowrap" }}>
                    {v.servicoNome}
                  </td>
                  <td style={{ padding: "12px 14px", color: "var(--muted-foreground)", fontSize: "12px", whiteSpace: "nowrap" }}>
                    {v.beneficiarioNome ?? (
                      <span style={{ color: "var(--muted-foreground)", fontStyle: "italic" }}>próprio</span>
                    )}
                    {v.beneficiarioTelefone && (
                      <div style={{ color: "var(--muted-foreground)", fontSize: "11px" }}>{v.beneficiarioTelefone}</div>
                    )}
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right", color: GOLD, fontSize: "13px", whiteSpace: "nowrap", fontFamily: "var(--font-heading, Georgia, serif)" }}>
                    €{Number(v.valorPago).toFixed(2)}
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right", color: "var(--muted-foreground)", fontSize: "12px", whiteSpace: "nowrap" }}>
                    {new Date(v.dataCompra).toLocaleDateString("pt-PT")}
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right", color: "var(--muted-foreground)", fontSize: "12px", whiteSpace: "nowrap" }}>
                    {v.validade ? new Date(v.validade).toLocaleDateString("pt-PT") : "—"}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <EstadoBadge estado={v.estado} />
                    {v.dataUso && (
                      <div style={{ color: "var(--muted-foreground)", fontSize: "10px", marginTop: "2px" }}>
                        {new Date(v.dataUso).toLocaleDateString("pt-PT")}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    {v.estado === "ativo" && (
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          onClick={() => cancelarVoucher(v)}
                          disabled={pending}
                          style={btnAcaoStyle("#d48c45")}
                          title="Cancelar voucher"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
