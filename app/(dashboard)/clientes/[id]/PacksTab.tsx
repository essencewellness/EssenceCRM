"use client"

// Aba "Packs & Preços" — antes era só leitura (bloco estático em page.tsx).
// Ganha aqui a possibilidade de criar packs (com os preços reais dos packs
// do site, ver 02_WEBSITE/site/packs-massagens e packs-drenagem) e registar
// pagamentos, incluindo o caso do Pack 10 pago em 2x (metade na 1.ª sessão,
// metade na 5.ª — regra do site).
import { useEffect, useRef, useState, useTransition } from "react"
import { CreditCard, Plus, X } from "lucide-react"
import { NomeServico } from "@/components/NomeServico"
import { criarPack, registarPagamentoPack } from "./actions"
import { formatDate } from "@/lib/utils"

const GOLD = "var(--nuit-champagne)"
const CREAM = "var(--nuit-bone)"
const CARD_BG = "var(--nuit-overlay)"
const BORDER = "var(--rule-soft)"

const METODO_LABEL: Record<string, string> = {
  dinheiro: "Dinheiro",
  mbway_essence: "MBWay Essence",
  mbway_beatriz: "MBWay Beatriz",
  transferencia: "Transferência",
  stripe: "Stripe",
}

export interface ServicoOpcao { id: string; nome: string }
export interface TerapeutaOpcao { id: string; nome: string }
export interface PagamentoPack { id: string; valor: number; metodoPagamento: string | null; notas: string | null; criadoEm: string }
export interface PackDoCliente {
  id: string
  servico: { nome: string }
  totalSessoes: number
  sessoesUsadas: number
  valorTotal: number
  valorPago: number
  estadoPagamento: string
  descricao: string | null
  ativo: boolean
  terapeuta: { name: string | null } | null
  pagamentos: PagamentoPack[]
}
export interface PrecoPersonalizado {
  id: string
  motivo: string | null
  validade: string | null
  valor: number
  servico: { nome: string; precoBase: number }
}

// Presets tirados dos preços reais publicados em
// site/packs-massagens/index.html e site/packs-drenagem/index.html — nunca
// inventar valores aqui, só copiar o que já está no site.
const PRESETS = [
  { label: "Pack 5 · Massagens", categoria: "massagens", totalSessoes: 5, valorTotal: 200, servicoNome: "Essência Plena",
    descricao: "Válido para Essência Plena, Puro Aroma ou Cera Quente (60 min), à escolha em cada sessão." },
  { label: "Pack 10 · Massagens", categoria: "massagens", totalSessoes: 10, valorTotal: 350, servicoNome: "Essência Plena",
    descricao: "Válido para Essência Plena, Puro Aroma ou Cera Quente (60 min), à escolha em cada sessão. Pode ser pago em 2x." },
  { label: "Pack 5 · Drenagem", categoria: "drenagem", totalSessoes: 5, valorTotal: 275, servicoNome: "Drenagem Linfática",
    descricao: "Drenagem linfática manual de corpo inteiro, 60 min." },
  { label: "Pack 10 · Drenagem", categoria: "drenagem", totalSessoes: 10, valorTotal: 500, servicoNome: "Drenagem Linfática",
    descricao: "Drenagem linfática manual de corpo inteiro, 60 min. Pode ser pago em 2x." },
] as const

function EstadoPagamentoBadge({ estado }: { estado: string }) {
  const cfg = {
    pago:     { label: "Pago",     color: "#6fcf97", bg: "rgba(111,207,151,0.12)" },
    parcial:  { label: "Parcial",  color: "#d48c45", bg: "rgba(212,140,50,0.12)"  },
    pendente: { label: "Pendente", color: "var(--muted-foreground)", bg: "rgba(157,157,154,0.10)" },
  }[estado] ?? { label: estado, color: "var(--muted-foreground)", bg: "rgba(157,157,154,0.10)" }
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: "100px",
      fontSize: "10px", fontWeight: 700, color: cfg.color, backgroundColor: cfg.bg,
      fontFamily: "var(--font-sans, sans-serif)",
    }}>
      {cfg.label}
    </span>
  )
}

// ── Modal: registar pagamento (serve para pagamento integral e para cada
// parcela de um pagamento em 2x — é só "quanto entrou agora") ───────────
function PagamentoModal({ pack, clienteId, valorSugerido, notaSugerida, onFechar }: {
  pack: PackDoCliente
  clienteId: string
  valorSugerido: number
  notaSugerida?: string
  onFechar: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [valor, setValor] = useState(valorSugerido.toFixed(2))
  const [metodo, setMetodo] = useState("mbway_essence")
  const [notas, setNotas] = useState(notaSugerida ?? "")
  const [erro, setErro] = useState("")
  const primeiroCampoRef = useRef<HTMLInputElement>(null)
  const focoAnteriorRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    focoAnteriorRef.current = document.activeElement as HTMLElement
    primeiroCampoRef.current?.focus()
    function aoTeclado(e: KeyboardEvent) { if (e.key === "Escape") onFechar() }
    window.addEventListener("keydown", aoTeclado)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", aoTeclado)
      document.body.style.overflow = ""
      focoAnteriorRef.current?.focus()
    }
  }, [onFechar])

  function submeter() {
    setErro("")
    const v = Number(valor)
    if (!v || v <= 0) { setErro("Indica um valor válido."); return }
    startTransition(async () => {
      const res = await registarPagamentoPack(pack.id, clienteId, { valor: v, metodoPagamento: metodo, notas: notas.trim() || undefined })
      if (!res.ok) { setErro(res.erro); return }
      onFechar()
    })
  }

  return (
    <div
      role="dialog" aria-modal="true" aria-label={`Registar pagamento do pack de ${pack.servico.nome}`}
      style={{
        position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center",
        backgroundColor: "rgba(9,11,18,0.68)", backdropFilter: "blur(2px)", padding: "20px",
      }}
      onClick={onFechar}
    >
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: "380px", backgroundColor: "var(--nuit-deep)",
        border: "1px solid rgba(212,184,134,0.28)", borderRadius: "14px", padding: "22px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <h2 style={{ fontFamily: "var(--font-heading, Georgia, serif)", color: CREAM, fontSize: "17px", fontWeight: 400 }}>
            Registar pagamento
          </h2>
          <button onClick={onFechar} aria-label="Fechar" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "16px" }}>
          <NomeServico nome={pack.servico.nome} /> · falta €{(pack.valorTotal - pack.valorPago).toFixed(2)} de €{pack.valorTotal.toFixed(2)}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <label style={{ display: "block", fontSize: "10.5px", color: "rgba(212,184,134,0.55)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "5px" }}>Valor (€)</label>
            <input ref={primeiroCampoRef} type="number" step="0.01" min="0.01" value={valor} onChange={e => setValor(e.target.value)}
              style={{ width: "100%", backgroundColor: "var(--nuit-deep)", border: "1px solid rgba(212,184,134,0.22)", borderRadius: "7px", color: CREAM, padding: "9px 10px", fontSize: "14px", fontFamily: "var(--font-sans, sans-serif)", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "10.5px", color: "rgba(212,184,134,0.55)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "5px" }}>Método</label>
            <select value={metodo} onChange={e => setMetodo(e.target.value)}
              style={{ width: "100%", backgroundColor: "var(--nuit-deep)", border: "1px solid rgba(212,184,134,0.22)", borderRadius: "7px", color: CREAM, padding: "9px 10px", fontSize: "13px", fontFamily: "var(--font-sans, sans-serif)", outline: "none", boxSizing: "border-box" }}>
              {Object.entries(METODO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "10.5px", color: "rgba(212,184,134,0.55)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "5px" }}>Nota (opcional)</label>
            <input type="text" value={notas} onChange={e => setNotas(e.target.value)} placeholder="ex: 1ª parcela"
              style={{ width: "100%", backgroundColor: "var(--nuit-deep)", border: "1px solid rgba(212,184,134,0.22)", borderRadius: "7px", color: CREAM, padding: "9px 10px", fontSize: "13px", fontFamily: "var(--font-sans, sans-serif)", outline: "none", boxSizing: "border-box" }} />
          </div>

          {erro && <p style={{ color: "var(--destructive)", fontSize: "12px" }}>{erro}</p>}

          <button onClick={submeter} disabled={pending} className={pending ? undefined : "btn-lift"}
            style={{
              marginTop: "6px", padding: "11px", borderRadius: "8px", border: "none",
              backgroundColor: GOLD, color: "var(--primary-foreground)", fontWeight: 700, fontSize: "13px",
              cursor: pending ? "wait" : "pointer", opacity: pending ? 0.7 : 1, minHeight: "44px",
              fontFamily: "var(--font-sans, sans-serif)",
            }}>
            {pending ? "A guardar…" : "Guardar pagamento"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: criar pack ──────────────────────────────────────────────────
function CriarPackModal({ clienteId, servicos, terapeutas, onFechar, onCriado }: {
  clienteId: string
  servicos: ServicoOpcao[]
  terapeutas: TerapeutaOpcao[]
  onFechar: () => void
  onCriado: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [presetAtivo, setPresetAtivo] = useState<number | null>(null)
  const [servicoId, setServicoId] = useState(servicos[0]?.id ?? "")
  const [totalSessoes, setTotalSessoes] = useState("5")
  const [valorTotal, setValorTotal] = useState("")
  const [descricao, setDescricao] = useState("")
  const [terapeutaId, setTerapeutaId] = useState("")
  const [erro, setErro] = useState("")
  const focoAnteriorRef = useRef<HTMLElement | null>(null)
  const primeiroCampoRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    focoAnteriorRef.current = document.activeElement as HTMLElement
    primeiroCampoRef.current?.focus()
    function aoTeclado(e: KeyboardEvent) { if (e.key === "Escape") onFechar() }
    window.addEventListener("keydown", aoTeclado)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", aoTeclado)
      document.body.style.overflow = ""
      focoAnteriorRef.current?.focus()
    }
  }, [onFechar])

  function aplicarPreset(i: number) {
    const p = PRESETS[i]
    setPresetAtivo(i)
    setTotalSessoes(String(p.totalSessoes))
    setValorTotal(String(p.valorTotal))
    setDescricao(p.descricao)
    const servico = servicos.find(s => s.nome === p.servicoNome)
    if (servico) setServicoId(servico.id)
  }

  function submeter() {
    setErro("")
    const sessoesN = Number(totalSessoes)
    const valorN = Number(valorTotal)
    if (!servicoId) { setErro("Escolhe um serviço."); return }
    if (!sessoesN || sessoesN < 1) { setErro("Indica o número de sessões."); return }
    if (!valorN || valorN <= 0) { setErro("Indica o valor total."); return }

    startTransition(async () => {
      const res = await criarPack(clienteId, {
        servicoId, totalSessoes: sessoesN, valorTotal: valorN,
        descricao: descricao.trim() || undefined, terapeutaId: terapeutaId || undefined,
      })
      if (!res.ok) { setErro(res.erro); return }
      onCriado()
    })
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", backgroundColor: "var(--nuit-deep)", border: "1px solid rgba(212,184,134,0.22)",
    borderRadius: "7px", color: CREAM, padding: "9px 10px", fontSize: "13px",
    fontFamily: "var(--font-sans, sans-serif)", outline: "none", boxSizing: "border-box",
  }
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "10.5px", color: "rgba(212,184,134,0.55)", letterSpacing: "0.1em",
    textTransform: "uppercase", marginBottom: "5px",
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Criar pack" style={{
      position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center",
      backgroundColor: "rgba(9,11,18,0.68)", backdropFilter: "blur(2px)", padding: "20px",
    }} onClick={onFechar}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: "460px", maxHeight: "calc(100vh - 64px)", overflowY: "auto",
        backgroundColor: "var(--nuit-deep)", border: "1px solid rgba(212,184,134,0.28)",
        borderRadius: "14px", padding: "24px", boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
          <h2 style={{ fontFamily: "var(--font-heading, Georgia, serif)", color: CREAM, fontSize: "18px", fontWeight: 400 }}>Novo Pack</h2>
          <button onClick={onFechar} aria-label="Fechar" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={labelStyle}>Preços do site (opcional — preenche tudo)</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              {PRESETS.map((p, i) => (
                <button key={p.label} type="button" ref={i === 0 ? primeiroCampoRef : undefined} onClick={() => aplicarPreset(i)}
                  style={{
                    padding: "9px 8px", borderRadius: "7px", fontSize: "11.5px", fontWeight: 600, cursor: "pointer",
                    fontFamily: "var(--font-sans, sans-serif)", textAlign: "left",
                    border: presetAtivo === i ? "1px solid rgba(212,184,134,0.5)" : "1px solid rgba(212,184,134,0.14)",
                    backgroundColor: presetAtivo === i ? "rgba(212,184,134,0.12)" : "transparent",
                    color: presetAtivo === i ? GOLD : CREAM,
                  }}>
                  {p.label}
                  <div style={{ fontSize: "10px", fontWeight: 400, color: "var(--muted-foreground)", marginTop: "2px" }}>
                    €{p.valorTotal} · €{(p.valorTotal / p.totalSessoes).toFixed(0)}/sessão
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Serviço</label>
              <select value={servicoId} onChange={e => setServicoId(e.target.value)} style={inputStyle}>
                {servicos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={labelStyle}>Total de sessões</label>
                <input type="number" min="1" max="100" value={totalSessoes} onChange={e => setTotalSessoes(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Valor total (€)</label>
                <input type="number" step="0.01" min="0.01" value={valorTotal} onChange={e => setValorTotal(e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Terapeuta</label>
              <select value={terapeutaId} onChange={e => setTerapeutaId(e.target.value)} style={inputStyle}>
                <option value="">Beatriz Leão (por omissão)</option>
                {terapeutas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Descrição (opcional)</label>
              <input type="text" value={descricao} onChange={e => setDescricao(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {Number(totalSessoes) === 10 && (
            <p style={{ fontSize: "11.5px", color: "var(--muted-foreground)", lineHeight: 1.5 }}>
              Packs de 10 sessões podem ser pagos em 2x — depois de criado, regista a 1ª parcela agora e a 2ª mais tarde (na 5ª sessão), diretamente no cartão do pack.
            </p>
          )}

          {erro && <p style={{ color: "var(--destructive)", fontSize: "12px" }}>{erro}</p>}

          <button onClick={submeter} disabled={pending} className={pending ? undefined : "btn-lift"}
            style={{
              padding: "12px", borderRadius: "9px", border: "none", backgroundColor: GOLD,
              color: "var(--primary-foreground)", fontWeight: 700, fontSize: "13.5px",
              cursor: pending ? "wait" : "pointer", opacity: pending ? 0.7 : 1, minHeight: "44px",
              fontFamily: "var(--font-sans, sans-serif)",
            }}>
            {pending ? "A criar…" : "Criar Pack"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Cartão de um pack ────────────────────────────────────────────────
function PackCard({ pack, clienteId, index }: { pack: PackDoCliente; clienteId: string; index: number }) {
  const [modalAberto, setModalAberto] = useState<{ valor: number; nota?: string } | null>(null)
  const restantes = pack.totalSessoes - pack.sessoesUsadas
  const pct = Math.round((pack.sessoesUsadas / pack.totalSessoes) * 100)
  const falta = pack.valorTotal - pack.valorPago
  const metade = pack.valorTotal / 2
  // "2x" só faz sentido oferecer o atalho enquanto ainda não há nada pago
  // (1ª parcela) ou já foi paga só a 1ª metade (2ª parcela) — noutro caso
  // (pago, ou pago um valor que não bate certo com metade) mostra-se só o
  // botão genérico de registar pagamento.
  const sugestao2x =
    pack.totalSessoes === 10 && pack.estadoPagamento !== "pago"
      ? pack.valorPago < 0.01
        ? { valor: metade, nota: "1ª parcela" }
        : Math.abs(pack.valorPago - metade) < 0.01
          ? { valor: metade, nota: "2ª parcela" }
          : null
      : null

  return (
    <>
      <div className="card-hover" style={{
        padding: "14px 16px", borderRadius: "8px", border: "1px solid rgba(212,184,134,0.16)", opacity: pack.ativo ? 1 : 0.5,
        animation: "riseOnly var(--dur-med) var(--ease-out) both", animationDelay: `${Math.min(index, 10) * 26}ms`,
      }}>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "8px" }}>
          <span style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "15px", color: CREAM, flex: 1 }}>
            <NomeServico nome={pack.servico.nome} />
          </span>
          <span style={{
            fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "100px",
            background: pack.ativo ? "rgba(74,124,89,0.12)" : "rgba(160,100,80,0.1)",
            color: pack.ativo ? "#4a7c59" : "#a06450",
          }}>{pack.ativo ? "Ativo" : "Terminado"}</span>
          <EstadoPagamentoBadge estado={pack.estadoPagamento} />
          <span style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "13px", fontWeight: 600, color: GOLD }}>
            €{pack.valorTotal.toFixed(2)}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
          <div style={{ flex: 1, height: "6px", borderRadius: "3px", background: "rgba(212,184,134,0.1)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: pack.ativo ? "var(--nuit-sage)" : GOLD, borderRadius: "3px", transition: "width 0.3s" }} />
          </div>
          <span style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px", color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>
            {pack.sessoesUsadas}/{pack.totalSessoes} sessões · {restantes} restantes
          </span>
        </div>

        <div style={{ fontSize: "11.5px", color: "var(--muted-foreground)", marginBottom: "10px" }}>
          {pack.terapeuta?.name ?? "Beatriz Leão"}
          {pack.descricao && <> · {pack.descricao}</>}
        </div>

        {pack.estadoPagamento !== "pago" && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "11.5px", color: "var(--destructive)" }}>Falta €{falta.toFixed(2)}</span>
            {sugestao2x ? (
              <button onClick={() => setModalAberto({ valor: sugestao2x.valor, nota: sugestao2x.nota })} className="btn-lift"
                style={{ fontSize: "11px", fontWeight: 700, padding: "5px 11px", borderRadius: "100px", border: "none", backgroundColor: GOLD, color: "var(--primary-foreground)", cursor: "pointer", fontFamily: "var(--font-sans, sans-serif)" }}>
                Registar {sugestao2x.nota} (€{sugestao2x.valor.toFixed(2)})
              </button>
            ) : (
              <button onClick={() => setModalAberto({ valor: falta })} className="btn-lift"
                style={{ fontSize: "11px", fontWeight: 700, padding: "5px 11px", borderRadius: "100px", border: "none", backgroundColor: GOLD, color: "var(--primary-foreground)", cursor: "pointer", fontFamily: "var(--font-sans, sans-serif)" }}>
                Registar pagamento
              </button>
            )}
            {pack.pagamentos.length > 0 && (
              <span style={{ fontSize: "10.5px", color: "var(--muted-foreground)" }}>
                {pack.pagamentos.length === 1 ? "1 pagamento já registado" : `${pack.pagamentos.length} pagamentos já registados`}
              </span>
            )}
          </div>
        )}
        {pack.estadoPagamento === "pago" && pack.pagamentos.length > 0 && (
          <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
            <CreditCard size={11} style={{ verticalAlign: "-1px", marginRight: "4px" }} />
            Pago{pack.pagamentos.length > 1 ? ` em ${pack.pagamentos.length}x` : ""} · última em {formatDate(pack.pagamentos[pack.pagamentos.length - 1]!.criadoEm)}
          </p>
        )}
      </div>

      {modalAberto && (
        <PagamentoModal pack={pack} clienteId={clienteId} valorSugerido={modalAberto.valor} notaSugerida={modalAberto.nota} onFechar={() => setModalAberto(null)} />
      )}
    </>
  )
}

// ── Aba completa ─────────────────────────────────────────────────────
export function PacksTab({ clienteId, packs, precos, servicos, terapeutas }: {
  clienteId: string
  packs: PackDoCliente[]
  precos: PrecoPersonalizado[]
  servicos: ServicoOpcao[]
  terapeutas: TerapeutaOpcao[]
}) {
  const [criarAberto, setCriarAberto] = useState(false)

  return (
    <div className="anim-fade-up" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ backgroundColor: CARD_BG, borderRadius: "10px", border: "1px solid rgba(212,184,134,0.16)", padding: "24px", boxShadow: "0 1px 3px rgba(22,26,38,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ height: "1px", flex: 0, width: "16px", backgroundColor: "rgba(185,160,122,0.4)" }} />
            <h2 style={{ fontFamily: "var(--font-sans)", fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.18em", color: "var(--nuit-bone-soft)", textTransform: "uppercase" }}>
              Packs de Sessões
            </h2>
          </div>
          <button onClick={() => setCriarAberto(true)} className="btn-lift" style={{
            display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "6px",
            fontFamily: "var(--font-sans, sans-serif)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.02em",
            cursor: "pointer", border: "1px solid rgba(212,184,134,0.3)", backgroundColor: "transparent", color: GOLD,
          }}>
            <Plus size={13} /> Criar Pack
          </button>
        </div>

        {packs.length === 0 ? (
          <p style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontStyle: "italic", fontSize: "13px", color: "var(--nuit-bone-soft)" }}>
            Sem packs activos para este cliente.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {packs.map((p, i) => <PackCard key={p.id} pack={p} clienteId={clienteId} index={i} />)}
          </div>
        )}
      </div>

      <div style={{ backgroundColor: CARD_BG, borderRadius: "10px", border: "1px solid rgba(212,184,134,0.16)", padding: "24px", boxShadow: "0 1px 3px rgba(22,26,38,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <div style={{ height: "1px", flex: 0, width: "16px", backgroundColor: "rgba(185,160,122,0.4)" }} />
          <h2 style={{ fontFamily: "var(--font-sans)", fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.18em", color: "var(--nuit-bone-soft)", textTransform: "uppercase" }}>
            Preços Personalizados
          </h2>
        </div>
        {precos.length === 0 ? (
          <p style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontStyle: "italic", fontSize: "13px", color: "var(--nuit-bone-soft)" }}>
            Sem preços personalizados — usa os preços base dos serviços.
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(212,184,134,0.16)" }}>
                {["Serviço", "Preço Base", "Preço Personalizado", "Motivo", "Validade"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "6px 10px", fontSize: "10px", color: "var(--nuit-bone-soft)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {precos.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: "1px solid rgba(212,184,134,0.1)", animation: "fadeUp var(--dur-fast) var(--ease-out) both", animationDelay: `${Math.min(i, 10) * 26}ms` }}>
                  <td style={{ padding: "9px 10px", fontSize: "13px", color: "var(--nuit-bone)" }}><NomeServico nome={p.servico.nome} /></td>
                  <td style={{ padding: "9px 10px", fontSize: "12px", color: "var(--nuit-bone-soft)" }}>€{p.servico.precoBase.toFixed(2)}</td>
                  <td style={{ padding: "9px 10px", fontSize: "13px", fontWeight: 600, color: GOLD }}>€{p.valor.toFixed(2)}</td>
                  <td style={{ padding: "9px 10px", fontSize: "12px", color: "var(--nuit-bone-soft)" }}>{p.motivo ?? "—"}</td>
                  <td style={{ padding: "9px 10px", fontSize: "12px", color: "var(--nuit-bone-soft)" }}>{p.validade ? formatDate(p.validade) : "Sem limite"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {criarAberto && (
        <CriarPackModal
          clienteId={clienteId}
          servicos={servicos}
          terapeutas={terapeutas}
          onFechar={() => setCriarAberto(false)}
          onCriado={() => setCriarAberto(false)}
        />
      )}
    </div>
  )
}
