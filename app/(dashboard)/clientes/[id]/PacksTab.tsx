"use client"

// Aba "Packs & Preços" — antes era só leitura (bloco estático em page.tsx).
// Ganha aqui a possibilidade de criar packs (com os preços reais dos packs
// do site, ver 02_WEBSITE/site/packs-massagens e packs-drenagem) e registar
// pagamentos, incluindo o caso do Pack 10 pago em 2x (metade na 1.ª sessão,
// metade na 5.ª — regra do site).
import { useEffect, useRef, useState, useTransition } from "react"
import { createPortal } from "react-dom"
import { Calendar, CreditCard, Plus, X } from "lucide-react"
import { NomeServico } from "@/components/NomeServico"
import { criarPack, registarPagamentoPack } from "./actions"
import { formatDate } from "@/lib/utils"
import { useToast } from "@/components/ui/toast-nuit"

// Link real do Calendly por duração de Drenagem — dados do Nuno, 2026-08-22.
// Massagens ainda não tem evento Calendly próprio criado; fica null até
// existir (o botão fica desativado com uma nota em vez de partir).
const CALENDLY_URL: Record<string, string | null> = {
  "Drenagem Linfática 60 min":  "https://calendly.com/geral-essencewellnesspt/drenagem-corpo-inteiro-60min",
  "Drenagem Linfática 90 min":  "https://calendly.com/geral-essencewellnesspt/drenagem-corpo-inteiro-premium-90min",
}

// utm_content carrega o packId até ao webhook do Calendly (ver
// app/api/v1/webhooks/calendly/route.ts) — assim a sessão que vier desta
// marcação já entra ligada ao pack certo, sem adivinhar por nome.
function linkCalendlyDoPack(pack: { id: string; servico: { nome: string } | null }, clienteNome: string, clienteEmail: string | null): string | null {
  const base = pack.servico ? CALENDLY_URL[pack.servico.nome] : null
  if (!base) return null
  const params = new URLSearchParams({ utm_content: pack.id, name: clienteNome })
  if (clienteEmail) params.set("email", clienteEmail)
  return `${base}?${params.toString()}`
}

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
  // null = pack de massagens — a cliente escolhe o ritual (Essência Plena,
  // Puro Aroma ou Cera Quente) em cada marcação, não é fixo no pack.
  servico: { nome: string } | null
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

// Catálogo fixo — preços tirados diretamente de
// site/packs-massagens/index.html e site/packs-drenagem/index.html (o
// último tem toggle 60/90 min em JS, ver data-per60/data-per90/data-total60/
// data-total90 no HTML). Nunca inventar valores aqui, só copiar o que já
// está no site — e nunca deixar editar à mão (pedido do Nuno, 2026-08-22).
const PRESETS = [
  {
    label: "Pack 5 · Massagens", totalSessoes: 5, valorTotal: 200, permite2x: false,
    servicoNome: null as string | null,
    descricao: "Essência Plena, Puro Aroma ou Cera Quente (60 min) — a cliente escolhe em cada sessão.",
  },
  {
    label: "Pack 10 · Massagens", totalSessoes: 10, valorTotal: 350, permite2x: true,
    servicoNome: null as string | null,
    descricao: "Essência Plena, Puro Aroma ou Cera Quente (60 min) — a cliente escolhe em cada sessão.",
  },
  {
    label: "Pack 5 · Drenagem 60 min", totalSessoes: 5, valorTotal: 275, permite2x: false,
    servicoNome: "Drenagem Linfática 60 min",
    descricao: "Drenagem linfática manual, sessão de 60 min.",
  },
  {
    label: "Pack 5 · Drenagem 90 min", totalSessoes: 5, valorTotal: 400, permite2x: false,
    servicoNome: "Drenagem Linfática 90 min",
    descricao: "Drenagem linfática manual, versão aprofundada de 90 min.",
  },
  {
    label: "Pack 10 · Drenagem 60 min", totalSessoes: 10, valorTotal: 500, permite2x: true,
    servicoNome: "Drenagem Linfática 60 min",
    descricao: "Drenagem linfática manual, sessão de 60 min.",
  },
  {
    label: "Pack 10 · Drenagem 90 min", totalSessoes: 10, valorTotal: 750, permite2x: true,
    servicoNome: "Drenagem Linfática 90 min",
    descricao: "Drenagem linfática manual, versão aprofundada de 90 min.",
  },
] as const

// Pack de massagens não tem servico (ver PackDoCliente.servico) — mostra-se
// o rótulo genérico do catálogo em vez de rebentar em pack.servico.nome.
function nomePack(pack: Pick<PackDoCliente, "servico">): string {
  return pack.servico?.nome ?? "Pack de Massagens"
}

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

  if (typeof document === "undefined") return null

  return createPortal(
    <div
      role="dialog" aria-modal="true" aria-label={`Registar pagamento do pack de ${nomePack(pack)}`}
      style={{
        position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center",
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
          <NomeServico nome={nomePack(pack)} /> · falta €{(pack.valorTotal - pack.valorPago).toFixed(2)} de €{pack.valorTotal.toFixed(2)}
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
    </div>,
    document.body
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
  const [terapeutaId, setTerapeutaId] = useState("")
  // Só perguntado quando o preset ativo permite 2x (packs de 10 — pedido do
  // Nuno, 2026-08-22). "null" = ainda por escolher, bloqueia o submeter.
  const [pagamento, setPagamento] = useState<"integral" | "2x" | null>(null)
  const [metodo, setMetodo] = useState("mbway_essence")
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

  const preset = presetAtivo !== null ? PRESETS[presetAtivo] : null

  function escolherPreset(i: number) {
    setPresetAtivo(i)
    setPagamento(null)
    setErro("")
  }

  function submeter() {
    setErro("")
    if (!preset) { setErro("Escolhe um pack."); return }
    if (!terapeutaId) { setErro("Escolhe a terapeuta."); return }
    if (preset.permite2x && !pagamento) { setErro("Escolhe como vai ser pago."); return }

    startTransition(async () => {
      const servico = preset.servicoNome ? servicos.find(s => s.nome === preset.servicoNome) : null
      const res = await criarPack(clienteId, {
        servicoId: servico?.id ?? null,
        totalSessoes: preset.totalSessoes,
        valorTotal: preset.valorTotal,
        descricao: preset.descricao,
        terapeutaId,
      })
      if (!res.ok) { setErro(res.erro); return }

      // "pergunta como vai pagar" — a resposta já regista o pagamento (ou a
      // 1ª parcela) no mesmo passo, em vez de obrigar a abrir outro modal
      // logo a seguir a criar o pack.
      if (pagamento) {
        const valor = pagamento === "integral" ? preset.valorTotal : Math.round((preset.valorTotal / 2) * 100) / 100
        const notas = pagamento === "2x" ? "1ª parcela" : undefined
        const resPag = await registarPagamentoPack(res.packId, clienteId, { valor, metodoPagamento: metodo, notas })
        if (!resPag.ok) { setErro(`Pack criado, mas o pagamento falhou: ${resPag.erro}`); return }
      }
      onCriado()
    })
  }

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "10.5px", color: "rgba(212,184,134,0.55)", letterSpacing: "0.1em",
    textTransform: "uppercase", marginBottom: "5px",
  }
  const opcaoStyle = (ativa: boolean): React.CSSProperties => ({
    flex: 1, padding: "10px 8px", borderRadius: "7px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
    fontFamily: "var(--font-sans, sans-serif)", textAlign: "center",
    border: ativa ? "1px solid rgba(212,184,134,0.5)" : "1px solid rgba(212,184,134,0.14)",
    backgroundColor: ativa ? "rgba(212,184,134,0.12)" : "transparent",
    color: ativa ? GOLD : CREAM,
  })

  if (typeof document === "undefined") return null

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Criar pack" style={{
      position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center",
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
            <label style={labelStyle}>Pack — preços fixos do site</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              {PRESETS.map((p, i) => (
                <button key={p.label} type="button" ref={i === 0 ? primeiroCampoRef : undefined} onClick={() => escolherPreset(i)}
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

          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: "14px" }}>
            <label style={labelStyle}>Terapeuta</label>
            <select value={terapeutaId} onChange={e => setTerapeutaId(e.target.value)} style={{
              width: "100%", backgroundColor: "var(--nuit-deep)", border: "1px solid rgba(212,184,134,0.22)",
              borderRadius: "7px", color: CREAM, padding: "9px 10px", fontSize: "13px",
              fontFamily: "var(--font-sans, sans-serif)", outline: "none", boxSizing: "border-box",
            }}>
              <option value="">Escolhe a terapeuta</option>
              {terapeutas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>

          {preset?.permite2x && (
            <div>
              <label style={labelStyle}>Como vai pagar?</label>
              <div style={{ display: "flex", gap: "6px", marginBottom: pagamento === "2x" ? "10px" : 0 }}>
                <button type="button" onClick={() => setPagamento("integral")} style={opcaoStyle(pagamento === "integral")}>
                  Integral · €{preset.valorTotal}
                </button>
                <button type="button" onClick={() => setPagamento("2x")} style={opcaoStyle(pagamento === "2x")}>
                  2x · €{(preset.valorTotal / 2).toFixed(0)} + €{(preset.valorTotal / 2).toFixed(0)}
                </button>
              </div>
              {pagamento === "2x" && (
                <p style={{ fontSize: "11px", color: "var(--muted-foreground)", lineHeight: 1.5 }}>
                  Regista-se a 1ª parcela agora (€{(preset.valorTotal / 2).toFixed(2)}); a 2ª fica pendente para a 5ª sessão, no cartão do pack.
                </p>
              )}
            </div>
          )}

          {pagamento && (
            <div>
              <label style={labelStyle}>Método de pagamento{pagamento === "2x" ? " (1ª parcela)" : ""}</label>
              <select value={metodo} onChange={e => setMetodo(e.target.value)} style={{
                width: "100%", backgroundColor: "var(--nuit-deep)", border: "1px solid rgba(212,184,134,0.22)",
                borderRadius: "7px", color: CREAM, padding: "9px 10px", fontSize: "13px",
                fontFamily: "var(--font-sans, sans-serif)", outline: "none", boxSizing: "border-box",
              }}>
                {Object.entries(METODO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
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
    </div>,
    document.body
  )
}

// ── Cartão de um pack ────────────────────────────────────────────────
function PackCard({ pack, clienteId, clienteNome, clienteEmail, index }: {
  pack: PackDoCliente; clienteId: string; clienteNome: string; clienteEmail: string | null; index: number
}) {
  const [modalAberto, setModalAberto] = useState<{ valor: number; nota?: string } | null>(null)
  const { toast } = useToast()
  const restantes = pack.totalSessoes - pack.sessoesUsadas
  const pct = Math.round((pack.sessoesUsadas / pack.totalSessoes) * 100)
  const falta = pack.valorTotal - pack.valorPago
  const metade = pack.valorTotal / 2
  const linkCalendly = linkCalendlyDoPack(pack, clienteNome, clienteEmail)

  async function copiarLinkCalendly() {
    if (!linkCalendly) return
    await navigator.clipboard.writeText(linkCalendly)
    toast("Link do Calendly copiado — já leva o pack ligado.", "success")
  }
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
            <NomeServico nome={nomePack(pack)} />
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
          <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginBottom: pack.ativo && restantes > 0 ? "10px" : 0 }}>
            <CreditCard size={11} style={{ verticalAlign: "-1px", marginRight: "4px" }} />
            Pago{pack.pagamentos.length > 1 ? ` em ${pack.pagamentos.length}x` : ""} · última em {formatDate(pack.pagamentos[pack.pagamentos.length - 1]!.criadoEm)}
          </p>
        )}

        {/* Link Calendly com o pack já ligado (?utm_content=packId) — a
            marcação que vier daqui já chega ao webhook a saber a que pack
            pertence, sem depender de nomes. */}
        {pack.ativo && restantes > 0 && (
          linkCalendly ? (
            <button onClick={copiarLinkCalendly} className="btn-lift" style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              fontSize: "11px", fontWeight: 700, padding: "6px 12px", borderRadius: "100px",
              border: "1px solid rgba(212,184,134,0.3)", backgroundColor: "transparent", color: GOLD,
              cursor: "pointer", fontFamily: "var(--font-sans, sans-serif)",
            }}>
              <Calendar size={12} /> Copiar link Calendly
            </button>
          ) : (
            <span style={{ fontSize: "10.5px", color: "var(--muted-foreground)", fontStyle: "italic" }}>
              Link Calendly de massagens ainda por configurar
            </span>
          )
        )}
      </div>

      {modalAberto && (
        <PagamentoModal pack={pack} clienteId={clienteId} valorSugerido={modalAberto.valor} notaSugerida={modalAberto.nota} onFechar={() => setModalAberto(null)} />
      )}
    </>
  )
}

// ── Aba completa ─────────────────────────────────────────────────────
export function PacksTab({ clienteId, clienteNome, clienteEmail, packs, precos, servicos, terapeutas }: {
  clienteId: string
  clienteNome: string
  clienteEmail: string | null
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
            {packs.map((p, i) => (
              <PackCard key={p.id} pack={p} clienteId={clienteId} clienteNome={clienteNome} clienteEmail={clienteEmail} index={i} />
            ))}
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
