"use client"

import { useState, useTransition } from "react"
import { atualizarPagamento } from "./actions"

const GOLD = "#d4b886"
const CREAM = "#ece6d6"
const CARD_BG = "#1f2433"
const BORDER = "rgba(212,184,134,0.15)"

export type SessaoRow = {
  id: string
  data: string
  servico: string | null
  preco: string | null
  estado: string
  estadoPagamento: string
  valorPago: string | null
  metodoPagamento: string | null
  repasseNecessario: boolean
  repasseFeito: boolean
  cliente: { id: string; nome: string }
}

const METODO_LABEL: Record<string, string> = {
  dinheiro: "Dinheiro",
  mbway: "MBWay",
  mbway_essence: "MBWay Essence",
  mbway_beatriz: "MBWay Beatriz",
  transferencia: "Transferência",
  voucher: "Voucher",
}

const ESTADO_PAG_MAP: Record<string, { bg: string; color: string; label: string }> = {
  pago:     { bg: "rgba(80,200,120,0.12)",  color: "#6fcf97", label: "Pago" },
  pendente: { bg: "rgba(212,140,50,0.12)",  color: "#d48c45", label: "Pendente" },
  parcial:  { bg: "rgba(100,150,230,0.12)", color: "#7cb4f0", label: "Parcial" },
  isento:   { bg: "rgba(237,231,227,0.07)", color: "rgba(237,231,227,0.4)", label: "Isento" },
}

function PagamentoBadge({ estado }: { estado: string }) {
  const s = ESTADO_PAG_MAP[estado] ?? ESTADO_PAG_MAP["pendente"]!
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 8px", borderRadius: "4px",
      backgroundColor: s.bg, color: s.color,
      fontSize: "11px", fontWeight: 600,
      fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
    }}>
      {s.label}
    </span>
  )
}

const selStyle = {
  backgroundColor: "#0e1119",
  border: `1px solid rgba(212,184,134,0.2)`,
  borderRadius: "6px",
  color: CREAM,
  padding: "5px 8px",
  fontSize: "12px",
  fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
  outline: "none",
  cursor: "pointer",
} as const

function PagamentoEditor({ sessao, onFechar }: { sessao: SessaoRow; onFechar: () => void }) {
  const precoRef = sessao.valorPago ?? sessao.preco ?? ""
  const [pending, startTransition] = useTransition()
  const [estado, setEstado] = useState(sessao.estadoPagamento)
  const [valor, setValor] = useState(precoRef ? Number(precoRef).toFixed(2) : "")
  const [metodo, setMetodo] = useState(sessao.metodoPagamento ?? "mbway_essence")

  const mostrarDetalhes = estado === "pago" || estado === "parcial"
  // voucher já foi pago pela compradora quando o comprou — não há valor a registar agora
  const mostrarValor = mostrarDetalhes && metodo !== "voucher"

  function guardar() {
    startTransition(async () => {
      await atualizarPagamento(sessao.id, {
        estadoPagamento: estado as "pendente" | "pago" | "parcial" | "isento",
        valorPago: mostrarValor && valor ? Number(valor) : null,
        metodoPagamento: mostrarDetalhes
          ? (metodo as "dinheiro" | "mbway" | "mbway_essence" | "mbway_beatriz" | "transferencia" | "voucher")
          : null,
      })
      onFechar()
    })
  }

  return (
    <>
      {/* backdrop fecha ao clicar fora */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 49 }}
        onClick={onFechar}
      />
      <div style={{
        position: "absolute", zIndex: 50,
        top: "calc(100% + 6px)", left: 0,
        backgroundColor: "#1a2035",
        border: `1px solid rgba(212,184,134,0.28)`,
        borderRadius: "10px",
        padding: "14px 16px",
        minWidth: "272px",
        boxShadow: "0 12px 32px rgba(0,0,0,0.55)",
      }}>
        <p style={{
          fontSize: "10px", color: "rgba(212,184,134,0.45)",
          letterSpacing: "0.14em", textTransform: "uppercase",
          marginBottom: "12px",
          fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
        }}>
          Editar pagamento
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {/* Estado */}
          <select value={estado} onChange={e => setEstado(e.target.value)} style={{ ...selStyle, width: "100%" }}>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="parcial">Parcial</option>
            <option value="isento">Isento</option>
          </select>

          {/* Valor + método (só se pago/parcial) */}
          {mostrarDetalhes && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                {mostrarValor && (
                  <div style={{ display: "flex", alignItems: "center", flex: 1, gap: "4px" }}>
                    <span style={{ color: GOLD, fontSize: "13px" }}>€</span>
                    <input
                      type="number"
                      value={valor}
                      onChange={e => setValor(e.target.value)}
                      style={{ ...selStyle, flex: 1, cursor: "text" }}
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                    />
                  </div>
                )}
                <select value={metodo} onChange={e => setMetodo(e.target.value)} style={{ ...selStyle, flex: 1 }}>
                  <option value="mbway_essence">MBWay Essence</option>
                  <option value="mbway_beatriz">MBWay Beatriz</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="transferencia">Transferência</option>
                  <option value="voucher">Voucher</option>
                </select>
              </div>
              {!mostrarValor && (
                <p style={{ margin: 0, fontSize: "11px", color: "rgba(237,231,227,0.4)", fontFamily: "var(--font-sans, 'Manrope', sans-serif)" }}>
                  Voucher já pago pela compradora — sem valor a registar agora.
                </p>
              )}
            </div>
          )}

          {/* Botões */}
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "4px" }}>
            <button
              onClick={onFechar}
              style={{
                padding: "5px 12px", borderRadius: "6px", fontSize: "12px",
                border: `1px solid ${BORDER}`, background: "transparent",
                color: "rgba(237,231,227,0.5)", cursor: "pointer",
                fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
              }}
            >
              Cancelar
            </button>
            <button
              onClick={guardar}
              disabled={pending}
              style={{
                padding: "5px 16px", borderRadius: "6px", fontSize: "12px",
                border: "none", backgroundColor: GOLD, color: "#0e1119",
                cursor: pending ? "wait" : "pointer", fontWeight: 700,
                fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
                opacity: pending ? 0.7 : 1,
              }}
            >
              {pending ? "…" : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export function TabelaSessoesPagamento({
  sessoes,
  mesLabel,
}: {
  sessoes: SessaoRow[]
  mesLabel: string
}) {
  const [editId, setEditId] = useState<string | null>(null)

  if (sessoes.length === 0) {
    return (
      <div style={{
        backgroundColor: CARD_BG, border: `1px solid ${BORDER}`,
        borderRadius: "10px", padding: "32px", textAlign: "center",
      }}>
        <p style={{
          fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
          color: "rgba(237,231,227,0.3)", fontSize: "13px",
        }}>
          Sem sessões em {mesLabel}.
        </p>
      </div>
    )
  }

  return (
    <div style={{
      backgroundColor: CARD_BG, border: `1px solid ${BORDER}`,
      borderRadius: "10px", overflowX: "auto",
    }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "560px" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
            {["Cliente", "Serviço", "Data", "Pagamento", "Valor"].map((h, i) => (
              <th key={h} style={{
                padding: "12px 16px",
                textAlign: i === 4 ? "right" : "left",
                fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
                fontSize: "10px", fontWeight: 700,
                letterSpacing: "0.14em", color: "rgba(212,184,134,0.45)",
                textTransform: "uppercase", whiteSpace: "nowrap",
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sessoes.map((s, i) => (
            <tr key={s.id} style={{ borderBottom: i < sessoes.length - 1 ? `1px solid ${BORDER}` : "none" }}>
              <td style={{ padding: "12px 16px", color: CREAM, fontSize: "13px", fontWeight: 500, whiteSpace: "nowrap" }}>
                {s.cliente.nome}
              </td>
              <td style={{ padding: "12px 16px", color: "rgba(237,231,227,0.55)", fontSize: "13px" }}>
                {s.servico ?? "—"}
              </td>
              <td style={{ padding: "12px 16px", color: "rgba(237,231,227,0.55)", fontSize: "13px", whiteSpace: "nowrap" }}>
                {new Date(s.data).toLocaleDateString("pt-PT")}
              </td>
              <td style={{ padding: "12px 16px" }}>
                <div style={{ position: "relative", display: "inline-block" }}>
                  <button
                    onClick={() => setEditId(editId === s.id ? null : s.id)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      padding: 0, display: "flex", alignItems: "center", gap: "5px",
                    }}
                    title="Clica para editar pagamento"
                  >
                    <PagamentoBadge estado={s.estadoPagamento} />
                    {s.repasseNecessario && !s.repasseFeito && (
                      <span title="A repassar à Cristina" style={{
                        display: "inline-flex", alignItems: "center", padding: "3px 6px",
                        borderRadius: "4px", backgroundColor: "rgba(212,140,50,0.12)", color: "#d48c45",
                        fontSize: "10px", fontWeight: 600, fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
                      }}>
                        ⏳ Repassar
                      </span>
                    )}
                    <span style={{ color: "rgba(212,184,134,0.35)", fontSize: "10px", lineHeight: 1 }}>✎</span>
                  </button>
                  {editId === s.id && (
                    <PagamentoEditor sessao={s} onFechar={() => setEditId(null)} />
                  )}
                </div>
              </td>
              <td style={{ padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                <div style={{ color: "rgba(237,231,227,0.7)", fontSize: "13px" }}>
                  {s.valorPago
                    ? `€${Number(s.valorPago).toFixed(2)}`
                    : s.preco
                    ? `€${Number(s.preco).toFixed(2)}`
                    : "—"}
                </div>
                {s.metodoPagamento && (
                  <div style={{ color: "rgba(237,231,227,0.35)", fontSize: "10.5px", marginTop: "2px" }}>
                    {METODO_LABEL[s.metodoPagamento] ?? s.metodoPagamento}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
