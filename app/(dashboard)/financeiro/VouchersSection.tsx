"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { criarVoucher, atualizarEstadoVoucher } from "./actions"

const GOLD = "var(--nuit-champagne)"
const CREAM = "var(--nuit-bone)"
const CARD_BG = "var(--nuit-overlay)"
const BORDER = "var(--rule-soft)"
const BG = "var(--nuit-deep)"

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

// ── Form de criação de voucher ────────────────────────────────

const hoje = () => new Date().toISOString().slice(0, 10)
const daqui1Ano = () => {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

const inputStyle = {
  backgroundColor: BG,
  border: `1px solid rgba(212,184,134,0.18)`,
  borderRadius: "7px",
  color: CREAM,
  padding: "8px 10px",
  fontSize: "13px",
  fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
  outline: "none",
  width: "100%",
} as const

const labelStyle = {
  fontSize: "11px",
  color: "rgba(212,184,134,0.5)",
  fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  display: "block",
  marginBottom: "5px",
}

function Grupo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

function CriarVoucherModal({
  servicos,
  onFechar,
  onCriado,
}: {
  servicos: ServicoOpcao[]
  onFechar: () => void
  onCriado: (codigo: string) => void
}) {
  const [pending, startTransition] = useTransition()
  const [tipo, setTipo] = useState<"digital" | "fisico">("digital")
  const [codigoManual, setCodigoManual] = useState("")
  const [compradorNome, setCompradorNome] = useState("")
  const [compradorTelefone, setCompradorTelefone] = useState("")
  const [compradorEmail, setCompradorEmail] = useState("")
  const [servicoNome, setServicoNome] = useState(servicos[0]?.nome ?? "")
  const [servicoCustom, setServicoCustom] = useState("")
  const [valorPago, setValorPago] = useState("")
  const [beneficiarioNome, setBeneficiarioNome] = useState("")
  const [beneficiarioTelefone, setBeneficiarioTelefone] = useState("")
  const [dataCompra, setDataCompra] = useState(hoje())
  const [validade, setValidade] = useState(daqui1Ano())
  const [notas, setNotas] = useState("")
  const [erro, setErro] = useState("")

  const servicoFinal = servicoNome === "__outro__" ? servicoCustom : servicoNome
  const focoAnteriorRef = useRef<HTMLElement | null>(null)
  const primeiroCampoRef = useRef<HTMLInputElement>(null)

  // Escape fecha, foco entra no primeiro campo e volta para quem abriu o
  // modal ao fechar — mesmo padrão do modal de pagamento (auditoria a11y,
  // skill frontend-a11y, 2026-08-21).
  useEffect(() => {
    focoAnteriorRef.current = document.activeElement as HTMLElement
    primeiroCampoRef.current?.focus()
    function aoTeclado(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar()
    }
    window.addEventListener("keydown", aoTeclado)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", aoTeclado)
      document.body.style.overflow = ""
      focoAnteriorRef.current?.focus()
    }
  }, [onFechar])

  // Pré-preenche o valor quando se seleciona um serviço do catálogo
  function onServicoChange(nome: string) {
    setServicoNome(nome)
    if (nome !== "__outro__") {
      const serv = servicos.find(s => s.nome === nome)
      if (serv) setValorPago(Number(serv.precoBase).toFixed(2))
    }
  }

  function submeter() {
    setErro("")
    if (!compradorNome.trim()) { setErro("O nome do comprador é obrigatório."); return }
    if (!servicoFinal.trim()) { setErro("Indica o serviço."); return }
    if (!valorPago || Number(valorPago) <= 0) { setErro("Indica o valor pago."); return }

    startTransition(async () => {
      try {
        const { codigo } = await criarVoucher({
          tipo,
          codigo: codigoManual.trim() || undefined,
          compradorNome: compradorNome.trim(),
          compradorTelefone: compradorTelefone.trim() || undefined,
          compradorEmail: compradorEmail.trim() || undefined,
          servicoNome: servicoFinal.trim(),
          valorPago: Number(valorPago),
          beneficiarioNome: beneficiarioNome.trim() || undefined,
          beneficiarioTelefone: beneficiarioTelefone.trim() || undefined,
          dataCompra,
          validade: validade || undefined,
          notas: notas.trim() || undefined,
        })
        onCriado(codigo)
      } catch {
        setErro("Erro ao criar o voucher. Tenta novamente.")
      }
    })
  }

  const toggleStyle = (ativo: boolean) => ({
    flex: 1,
    padding: "8px 0",
    borderRadius: "7px",
    border: ativo ? `1px solid rgba(212,184,134,0.4)` : `1px solid rgba(212,184,134,0.1)`,
    backgroundColor: ativo ? "rgba(212,184,134,0.12)" : "transparent",
    color: ativo ? GOLD : "var(--muted-foreground)",
    fontSize: "12px", fontWeight: 700, cursor: "pointer",
    fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
    transition: "all 0.15s",
  } as const)

  return (
    <>
      {/* backdrop */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 99, backgroundColor: "rgba(5,8,16,0.8)", backdropFilter: "blur(4px)" }}
        onClick={onFechar}
      />
      {/* modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Novo Voucher"
        style={{
        position: "fixed", zIndex: 100,
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: "min(540px, calc(100vw - 32px))",
        maxHeight: "calc(100vh - 64px)",
        overflowY: "auto",
        backgroundColor: "var(--nuit-deep)",
        border: `1px solid rgba(212,184,134,0.2)`,
        borderRadius: "14px",
        padding: "28px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
          <div>
            <h2 style={{
              fontFamily: "var(--font-heading, 'DM Serif Display', Georgia, serif)",
              color: CREAM, fontSize: "20px", fontWeight: 400,
            }}>
              Novo Voucher
            </h2>
            <p style={{ fontFamily: "var(--font-sans, 'Manrope', sans-serif)", color: "rgba(212,184,134,0.4)", fontSize: "12px", marginTop: "3px" }}>
              O código é gerado automaticamente
            </p>
          </div>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--muted-foreground)", fontSize: "20px", lineHeight: 1,
              padding: "2px 6px",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Tipo toggle */}
          <Grupo label="Tipo de voucher">
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setTipo("digital")} style={toggleStyle(tipo === "digital")}>
                Digital (EWD{new Date(dataCompra).getFullYear()}-XXXX)
              </button>
              <button onClick={() => setTipo("fisico")} style={toggleStyle(tipo === "fisico")}>
                Físico (EW{new Date(dataCompra).getFullYear()}-XXXX)
              </button>
            </div>
          </Grupo>

          {/* Comprador */}
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: "14px" }}>
            <p style={{ ...labelStyle, color: "rgba(212,184,134,0.6)", marginBottom: "12px" }}>Comprador</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <Grupo label="Nome *">
                  <input ref={primeiroCampoRef} value={compradorNome} onChange={e => setCompradorNome(e.target.value)} style={inputStyle} placeholder="Nome completo" />
                </Grupo>
              </div>
              <Grupo label="Telefone">
                <input value={compradorTelefone} onChange={e => setCompradorTelefone(e.target.value)} style={inputStyle} placeholder="+351 9XX XXX XXX" />
              </Grupo>
              <Grupo label="Email">
                <input value={compradorEmail} onChange={e => setCompradorEmail(e.target.value)} style={inputStyle} placeholder="email@exemplo.com" type="email" />
              </Grupo>
            </div>
          </div>

          {/* Serviço e valor */}
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: "14px" }}>
            <p style={{ ...labelStyle, color: "rgba(212,184,134,0.6)", marginBottom: "12px" }}>Serviço & Valor</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <Grupo label="Serviço *">
                  <select
                    value={servicoNome}
                    onChange={e => onServicoChange(e.target.value)}
                    style={{ ...inputStyle, cursor: "pointer" }}
                  >
                    {servicos.map(s => (
                      <option key={s.id} value={s.nome}>{s.nome} — €{Number(s.precoBase).toFixed(0)}</option>
                    ))}
                    <option value="__outro__">Outro (escrever manualmente)</option>
                  </select>
                </Grupo>
              </div>
              {servicoNome === "__outro__" && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <Grupo label="Nome do serviço">
                    <input value={servicoCustom} onChange={e => setServicoCustom(e.target.value)} style={inputStyle} placeholder="Ex: Pack 3 sessões" />
                  </Grupo>
                </div>
              )}
              <Grupo label="Valor pago (€) *">
                <input value={valorPago} onChange={e => setValorPago(e.target.value)} style={inputStyle} type="number" step="0.01" min="0" placeholder="0.00" />
              </Grupo>
            </div>
          </div>

          {/* Para (beneficiário) */}
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: "14px" }}>
            <p style={{ ...labelStyle, color: "rgba(212,184,134,0.6)", marginBottom: "12px" }}>Para (beneficiário)</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <Grupo label="Nome">
                <input value={beneficiarioNome} onChange={e => setBeneficiarioNome(e.target.value)} style={inputStyle} placeholder="Deixa em branco se for para o próprio comprador" />
              </Grupo>
              <Grupo label="Telefone">
                <input value={beneficiarioTelefone} onChange={e => setBeneficiarioTelefone(e.target.value)} style={inputStyle} placeholder="+351 9XX XXX XXX" />
              </Grupo>
            </div>
          </div>

          {/* Datas + Nº voucher */}
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: "14px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <Grupo label="Data de compra *">
                <input value={dataCompra} onChange={e => setDataCompra(e.target.value)} style={inputStyle} type="date" />
              </Grupo>
              <Grupo label="Validade">
                <input value={validade} onChange={e => setValidade(e.target.value)} style={inputStyle} type="date" />
              </Grupo>
              <div style={{ gridColumn: "1 / -1" }}>
                <Grupo label="Nº do Voucher">
                  <input
                    value={codigoManual}
                    onChange={e => setCodigoManual(e.target.value.toUpperCase())}
                    style={{ ...inputStyle, fontFamily: "monospace", letterSpacing: "0.08em" }}
                    placeholder={tipo === "digital"
                      ? `EWD${new Date(dataCompra).getFullYear()}-XXXX (auto-gerado se deixares vazio)`
                      : `EW${new Date(dataCompra).getFullYear()}-XXXX (auto-gerado se deixares vazio)`}
                  />
                </Grupo>
              </div>
            </div>
          </div>

          {/* Notas */}
          <Grupo label="Notas">
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              style={{ ...inputStyle, resize: "vertical", minHeight: "60px" }}
              placeholder="Observações opcionais…"
            />
          </Grupo>

          {/* Erro */}
          {erro && (
            <p style={{ color: "#d48c45", fontSize: "12px", fontFamily: "var(--font-sans, 'Manrope', sans-serif)" }}>
              {erro}
            </p>
          )}

          {/* Botões */}
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", borderTop: `1px solid ${BORDER}`, paddingTop: "16px" }}>
            <button
              onClick={onFechar}
              style={{
                padding: "9px 18px", borderRadius: "8px", fontSize: "13px",
                border: `1px solid ${BORDER}`, background: "transparent",
                color: "var(--muted-foreground)", cursor: "pointer",
                fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
              }}
            >
              Cancelar
            </button>
            <button
              onClick={submeter}
              disabled={pending}
              style={{
                padding: "9px 22px", borderRadius: "8px", fontSize: "13px",
                border: "none", backgroundColor: GOLD, color: "var(--primary-foreground)",
                cursor: pending ? "wait" : "pointer", fontWeight: 700,
                fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
                opacity: pending ? 0.7 : 1,
              }}
            >
              {pending ? "A criar…" : "Criar Voucher"}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Confirmação após criação ──────────────────────────────────

function SuccessModal({ codigo, onFechar }: { codigo: string; onFechar: () => void }) {
  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 99, backgroundColor: "rgba(5,8,16,0.8)" }} onClick={onFechar} />
      <div style={{
        position: "fixed", zIndex: 100,
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        backgroundColor: "var(--nuit-deep)",
        border: `1px solid rgba(80,200,120,0.25)`,
        borderRadius: "14px",
        padding: "32px",
        textAlign: "center",
        boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
        minWidth: "280px",
      }}>
        <div style={{ fontSize: "32px", marginBottom: "12px" }}>✓</div>
        <h3 style={{
          fontFamily: "var(--font-heading, 'DM Serif Display', Georgia, serif)",
          color: CREAM, fontSize: "18px", fontWeight: 400, marginBottom: "8px",
        }}>
          Voucher criado!
        </h3>
        <p style={{ fontFamily: "var(--font-sans, 'Manrope', sans-serif)", color: "var(--muted-foreground)", fontSize: "13px", marginBottom: "16px" }}>
          Código gerado:
        </p>
        <div style={{
          backgroundColor: BG, borderRadius: "8px",
          padding: "12px 20px", marginBottom: "20px",
          border: `1px solid rgba(212,184,134,0.2)`,
        }}>
          <span style={{
            fontFamily: "monospace", fontSize: "20px",
            color: GOLD, letterSpacing: "0.12em", fontWeight: 700,
          }}>
            {codigo}
          </span>
        </div>
        <button
          onClick={onFechar}
          style={{
            padding: "9px 24px", borderRadius: "8px", fontSize: "13px",
            border: "none", backgroundColor: GOLD, color: "var(--primary-foreground)",
            cursor: "pointer", fontWeight: 700,
            fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
          }}
        >
          Fechar
        </button>
      </div>
    </>
  )
}

// ── Secção principal ──────────────────────────────────────────

const FILTROS = ["todos", "ativo", "usado", "expirado", "cancelado"] as const
type Filtro = (typeof FILTROS)[number]

export function VouchersSection({
  vouchers: inicial,
  servicos,
}: {
  vouchers: VoucherRow[]
  servicos: ServicoOpcao[]
}) {
  const [vouchers, setVouchers] = useState(inicial)
  const [mostrarCriar, setMostrarCriar] = useState(false)
  const [codigoCriado, setCodigoCriado] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<Filtro>("todos")
  const [pending, startTransition] = useTransition()
  const [acaoId, setAcaoId] = useState<string | null>(null)

  const visiveis = filtro === "todos" ? vouchers : vouchers.filter(v => v.estado === filtro)

  // KPIs
  const totalAtivos = vouchers.filter(v => v.estado === "ativo").length
  const totalUsados = vouchers.filter(v => v.estado === "usado").length
  const valorTotal = vouchers.reduce((s, v) => s + Number(v.valorPago), 0)

  function onCriado(codigo: string) {
    setMostrarCriar(false)
    setCodigoCriado(codigo)
  }

  function marcarUsado(v: VoucherRow) {
    setAcaoId(v.id)
    startTransition(async () => {
      await atualizarEstadoVoucher(v.id, "usado")
      setVouchers(prev => prev.map(x => x.id === v.id ? { ...x, estado: "usado" as const, dataUso: new Date().toISOString() } : x))
      setAcaoId(null)
    })
  }

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
      {/* Cabeçalho + botão criar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={{
          fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
          color: "rgba(212,184,134,0.55)", fontSize: "10px", fontWeight: 700,
          letterSpacing: "0.22em", textTransform: "uppercase",
        }}>
          Gift Cards / Vouchers
        </h2>
        <button
          onClick={() => setMostrarCriar(true)}
          style={{
            padding: "7px 16px", borderRadius: "8px", fontSize: "12px",
            border: `1px solid rgba(212,184,134,0.3)`,
            backgroundColor: "rgba(212,184,134,0.08)",
            color: GOLD, cursor: "pointer", fontWeight: 600,
            fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
          }}
        >
          + Criar Voucher
        </button>
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
            {vouchers.length === 0 ? "Ainda não há vouchers. Clica em «+ Criar Voucher» para adicionar." : "Nenhum voucher nesta categoria."}
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
                          onClick={() => marcarUsado(v)}
                          disabled={pending}
                          style={btnAcaoStyle("#6fcf97")}
                          title="Marcar como usado"
                        >
                          Usado
                        </button>
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

      {/* Modais */}
      {mostrarCriar && (
        <CriarVoucherModal
          servicos={servicos}
          onFechar={() => setMostrarCriar(false)}
          onCriado={onCriado}
        />
      )}
      {codigoCriado && (
        <SuccessModal codigo={codigoCriado} onFechar={() => setCodigoCriado(null)} />
      )}
    </div>
  )
}
