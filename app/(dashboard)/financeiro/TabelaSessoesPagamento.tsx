"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { Check, Clock, Pencil, X } from "lucide-react"
import { atualizarPagamento } from "./actions"

const GOLD = "#d4b886"
const CREAM = "#ece6d6"
const CARD_BG = "#1f2433"
const FIELD_BG = "#0e1119"
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
  stripe: "Stripe",
  voucher: "Voucher",
}

const ESTADO_PAG_MAP: Record<string, { bg: string; color: string; border: string; label: string }> = {
  pago:     { bg: "rgba(111,207,151,0.12)", color: "#6fcf97", border: "rgba(111,207,151,0.35)", label: "Pago" },
  pendente: { bg: "rgba(212,140,50,0.12)",  color: "#d48c45", border: "rgba(212,140,50,0.35)",  label: "Pendente" },
  parcial:  { bg: "rgba(124,180,240,0.12)", color: "#7cb4f0", border: "rgba(124,180,240,0.35)", label: "Parcial" },
  isento:   { bg: "rgba(237,231,227,0.07)", color: "rgba(237,231,227,0.5)", border: "rgba(237,231,227,0.18)", label: "Isento" },
}

function PagamentoBadge({ estado }: { estado: string }) {
  const s = ESTADO_PAG_MAP[estado] ?? ESTADO_PAG_MAP["pendente"]!
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "4px 10px", borderRadius: "100px",
      backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}`,
      fontSize: "11.5px", fontWeight: 600,
      fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
      whiteSpace: "nowrap",
    }}>
      {s.label}
    </span>
  )
}

const fieldStyle = {
  backgroundColor: FIELD_BG,
  border: `1px solid rgba(212,184,134,0.22)`,
  borderRadius: "8px",
  color: CREAM,
  padding: "11px 12px",
  fontSize: "14px",
  fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
  outline: "none",
  width: "100%",
  boxSizing: "border-box" as const,
}

// Foco visível — o outline:none dos campos custom precisa disto para não
// desaparecer para quem navega por teclado (critério de acessibilidade).
const focoDourado = "0 0 0 3px rgba(212,184,134,0.25)"

const ESTADOS: { valor: "pendente" | "pago" | "parcial" | "isento"; label: string }[] = [
  { valor: "pendente", label: "Pendente" },
  { valor: "pago", label: "Pago" },
  { valor: "parcial", label: "Parcial" },
  { valor: "isento", label: "Isento" },
]

function SegmentedEstado({ valor, onChange }: { valor: string; onChange: (v: typeof ESTADOS[number]["valor"]) => void }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px",
    }}>
      {ESTADOS.map(e => {
        const ativo = valor === e.valor
        const cor = ESTADO_PAG_MAP[e.valor]!
        return (
          <button
            key={e.valor}
            type="button"
            onClick={() => onChange(e.valor)}
            style={{
              padding: "10px 6px", borderRadius: "8px", cursor: "pointer",
              fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
              fontSize: "12.5px", fontWeight: 600,
              backgroundColor: ativo ? cor.bg : "transparent",
              border: `1.5px solid ${ativo ? cor.border : BORDER}`,
              color: ativo ? cor.color : "rgba(237,231,227,0.55)",
              minHeight: "44px",
              transition: "background-color 150ms, border-color 150ms, color 150ms",
            }}
            onFocus={e2 => { e2.currentTarget.style.boxShadow = focoDourado }}
            onBlur={e2 => { e2.currentTarget.style.boxShadow = "none" }}
          >
            {e.label}
          </button>
        )
      })}
    </div>
  )
}

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      margin: "0 0 6px", fontSize: "10.5px", color: "rgba(212,184,134,0.55)",
      letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700,
      fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
    }}>
      {children}
    </p>
  )
}

// Painel de edição num modal centrado — a versão anterior era um popover
// "position: absolute" dentro da tabela, e ficava cortado pelo scroll do
// contentor (era literalmente impossível chegar ao botão Guardar nalgumas
// linhas). "position: fixed" escapa a qualquer overflow de antepassados.
function PagamentoModal({ sessao, onFechar }: { sessao: SessaoRow; onFechar: () => void }) {
  const precoRef = sessao.valorPago ?? sessao.preco ?? ""
  const [pending, startTransition] = useTransition()
  const [estado, setEstado] = useState(sessao.estadoPagamento)
  const [valor, setValor] = useState(precoRef ? Number(precoRef).toFixed(2) : "")
  const [metodo, setMetodo] = useState(sessao.metodoPagamento ?? "mbway_essence")
  const primeiroCampoRef = useRef<HTMLButtonElement>(null)

  const mostrarDetalhes = estado === "pago" || estado === "parcial"
  // voucher já foi pago pela compradora quando o comprou — não há valor a registar agora
  const mostrarValor = mostrarDetalhes && metodo !== "voucher"

  useEffect(() => {
    primeiroCampoRef.current?.focus()
    function aoTeclado(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar()
    }
    window.addEventListener("keydown", aoTeclado)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", aoTeclado)
      document.body.style.overflow = ""
    }
  }, [onFechar])

  function guardar() {
    startTransition(async () => {
      await atualizarPagamento(sessao.id, {
        estadoPagamento: estado as "pendente" | "pago" | "parcial" | "isento",
        valorPago: mostrarValor && valor ? Number(valor) : null,
        metodoPagamento: mostrarDetalhes
          ? (metodo as "dinheiro" | "mbway" | "mbway_essence" | "mbway_beatriz" | "transferencia" | "stripe" | "voucher")
          : null,
      })
      onFechar()
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Registar pagamento de ${sessao.cliente.nome}`}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "center",
        backgroundColor: "rgba(9,11,18,0.68)", backdropFilter: "blur(2px)",
        padding: "20px",
      }}
      onClick={onFechar}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: "400px",
          backgroundColor: "#1a2035",
          border: `1px solid rgba(212,184,134,0.28)`,
          borderRadius: "14px",
          padding: "24px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "18px" }}>
          <div>
            <h2 style={{
              margin: 0, fontSize: "16px", fontWeight: 600, color: CREAM,
              fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
            }}>
              {sessao.cliente.nome}
            </h2>
            <p style={{
              margin: "3px 0 0", fontSize: "12.5px", color: "rgba(237,231,227,0.45)",
              fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
            }}>
              {sessao.servico ?? "Sessão"} · {new Date(sessao.data).toLocaleDateString("pt-PT")}
            </p>
          </div>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "32px", height: "32px", borderRadius: "8px", flexShrink: 0,
              background: "transparent", border: "none", cursor: "pointer",
              color: "rgba(237,231,227,0.4)",
            }}
          >
            <X size={17} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <Rotulo>Estado do pagamento</Rotulo>
            <SegmentedEstado valor={estado} onChange={setEstado} />
          </div>

          {mostrarDetalhes && (
            <>
              {mostrarValor && (
                <div>
                  <Rotulo>Valor recebido</Rotulo>
                  <div style={{ position: "relative" }}>
                    <span style={{
                      position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)",
                      color: GOLD, fontSize: "14px", fontWeight: 600, pointerEvents: "none",
                    }}>
                      €
                    </span>
                    <input
                      type="number"
                      value={valor}
                      onChange={e => setValor(e.target.value)}
                      style={{ ...fieldStyle, paddingLeft: "26px", cursor: "text" }}
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      onFocus={e2 => { e2.currentTarget.style.boxShadow = focoDourado }}
                      onBlur={e2 => { e2.currentTarget.style.boxShadow = "none" }}
                    />
                  </div>
                </div>
              )}

              <div>
                <Rotulo>Método</Rotulo>
                <select
                  value={metodo}
                  onChange={e => setMetodo(e.target.value)}
                  style={{ ...fieldStyle, cursor: "pointer" }}
                  onFocus={e2 => { e2.currentTarget.style.boxShadow = focoDourado }}
                  onBlur={e2 => { e2.currentTarget.style.boxShadow = "none" }}
                >
                  <option value="mbway_essence">MBWay Essence</option>
                  <option value="mbway_beatriz">MBWay Beatriz</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="transferencia">Transferência</option>
                  <option value="stripe">Stripe</option>
                  <option value="voucher">Voucher</option>
                </select>
              </div>

              {!mostrarValor && (
                <p style={{
                  margin: 0, padding: "10px 12px", borderRadius: "8px",
                  backgroundColor: "rgba(212,184,134,0.06)",
                  fontSize: "12px", color: "rgba(237,231,227,0.5)", lineHeight: 1.5,
                  fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
                }}>
                  Voucher já pago pela compradora — sem valor a registar agora.
                </p>
              )}
            </>
          )}

          <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
            <button
              onClick={onFechar}
              style={{
                flex: 1, padding: "12px", borderRadius: "9px", fontSize: "13.5px",
                border: `1px solid ${BORDER}`, background: "transparent",
                color: "rgba(237,231,227,0.6)", cursor: "pointer", fontWeight: 600,
                fontFamily: "var(--font-sans, 'Manrope', sans-serif)", minHeight: "44px",
              }}
            >
              Cancelar
            </button>
            <button
              ref={primeiroCampoRef}
              onClick={guardar}
              disabled={pending}
              style={{
                flex: 1.4, padding: "12px", borderRadius: "9px", fontSize: "13.5px",
                border: "none", backgroundColor: GOLD, color: "#0e1119",
                cursor: pending ? "wait" : "pointer", fontWeight: 700,
                fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
                opacity: pending ? 0.7 : 1, minHeight: "44px",
              }}
            >
              {pending ? "A guardar…" : "Guardar pagamento"}
            </button>
          </div>
        </div>
      </div>
    </div>
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
  const [marcandoId, setMarcandoId] = useState<string | null>(null)
  const [pendingRapido, startRapido] = useTransition()

  // Atalho para o caso mais comum: marcar como pago no valor cheio, sem
  // abrir o modal — cobre a maioria das sessões pendentes num só clique.
  // O modal continua disponível para valores parciais ou método diferente.
  function marcarPagoRapido(s: SessaoRow) {
    setMarcandoId(s.id)
    startRapido(async () => {
      await atualizarPagamento(s.id, {
        estadoPagamento: "pago",
        valorPago: s.preco ? Number(s.preco) : null,
        metodoPagamento: "mbway_essence",
      })
      setMarcandoId(null)
    })
  }

  const editando = sessoes.find(s => s.id === editId)

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
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "620px" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
            {["Cliente", "Serviço", "Data", "Pagamento", "", "Valor"].map((h, i) => (
              <th key={h || `col-${i}`} style={{
                padding: "12px 16px",
                textAlign: i === 5 ? "right" : "left",
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
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  <PagamentoBadge estado={s.estadoPagamento} />
                  {s.repasseNecessario && !s.repasseFeito && (
                    <span title="A repassar à Cristina" style={{
                      display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px",
                      borderRadius: "100px", backgroundColor: "rgba(212,140,50,0.12)", color: "#d48c45",
                      fontSize: "10.5px", fontWeight: 600, fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
                    }}>
                      <Clock size={11} aria-hidden="true" />
                      Repassar
                    </span>
                  )}
                </div>
              </td>
              <td style={{ padding: "12px 8px" }}>
                {s.estadoPagamento === "pendente" ? (
                  <button
                    onClick={() => marcarPagoRapido(s)}
                    disabled={pendingRapido && marcandoId === s.id}
                    title="Marcar como pago (MBWay Essence, valor cheio)"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "6px",
                      padding: "8px 12px", borderRadius: "8px", minHeight: "36px",
                      backgroundColor: "rgba(111,207,151,0.10)",
                      border: "1px solid rgba(111,207,151,0.35)",
                      color: "#6fcf97", fontSize: "12px", fontWeight: 600,
                      cursor: pendingRapido && marcandoId === s.id ? "wait" : "pointer",
                      fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
                      whiteSpace: "nowrap",
                      opacity: pendingRapido && marcandoId === s.id ? 0.6 : 1,
                    }}
                  >
                    <Check size={13} aria-hidden="true" />
                    {pendingRapido && marcandoId === s.id ? "A marcar…" : "Marcar Pago"}
                  </button>
                ) : (
                  <button
                    onClick={() => setEditId(s.id)}
                    aria-label={`Editar pagamento de ${s.cliente.nome}`}
                    title="Editar pagamento"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "5px",
                      padding: "8px 10px", borderRadius: "8px", minHeight: "36px",
                      background: "transparent", border: `1px solid ${BORDER}`,
                      color: "rgba(212,184,134,0.75)", fontSize: "12px", fontWeight: 500,
                      cursor: "pointer", fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
                    }}
                  >
                    <Pencil size={12} aria-hidden="true" />
                    Editar
                  </button>
                )}
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

      {editando && (
        <PagamentoModal sessao={editando} onFechar={() => setEditId(null)} />
      )}
    </div>
  )
}
