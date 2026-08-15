"use client"

import { useState, useTransition, useEffect, useMemo } from "react"
import { Search, Plus, Pencil, X, Gift, CreditCard, AlertTriangle } from "lucide-react"
import { useToast } from "@/components/ui/toast-nuit"
import { NomeServico } from "@/components/NomeServico"
import { criarVoucher, atualizarVoucher } from "./actions"

export interface Voucher {
  id: string
  codigo: string
  tipo: string
  estado: string
  compradorNome: string
  compradorTelefone: string | null
  compradorEmail: string | null
  servicoNome: string
  valorPago: number
  beneficiarioNome: string | null
  beneficiarioTelefone: string | null
  validade: string | null
  dataUso: string | null
  notas: string | null
}

const ESTADOS = [
  { value: "ativo",     label: "Por marcar", cor: "#d4b886", bg: "rgba(212,184,134,0.12)" },
  { value: "agendado",  label: "Agendado",   cor: "#8ea9c9", bg: "rgba(142,169,201,0.14)" },
  { value: "usado",     label: "Utilizado",  cor: "#8bb08f", bg: "rgba(139,176,143,0.14)" },
  { value: "expirado",  label: "Expirado",   cor: "#9d9d9a", bg: "rgba(157,157,154,0.12)" },
  { value: "cancelado", label: "Cancelado",  cor: "#c9756a", bg: "rgba(201,117,106,0.12)" },
]
const estadoInfo = (v: string) => ESTADOS.find(e => e.value === v) ?? ESTADOS[0]

const DIAS_ALERTA_EXPIRA = 15

function formatarData(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function diasAte(iso: string | null): number | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000)
}

// ── Átomos ───────────────────────────────────────────────────────────

const rotulo: React.CSSProperties = {
  fontFamily: "var(--font-sans, sans-serif)",
  fontSize: "10px", fontWeight: 700, letterSpacing: "0.16em",
  textTransform: "uppercase", color: "var(--nuit-bone-soft)",
  opacity: 0.75,
}

function Chip({ estado }: { estado: string }) {
  const e = estadoInfo(estado)
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "6px",
      padding: "5px 11px", borderRadius: "100px",
      backgroundColor: e.bg, border: `1px solid ${e.cor}44`,
      fontFamily: "var(--font-sans, sans-serif)",
      fontSize: "11px", fontWeight: 600, letterSpacing: "0.04em",
      color: e.cor, whiteSpace: "nowrap",
    }}>
      <span style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: e.cor }} />
      {e.label}
    </span>
  )
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px", minWidth: 0 }}>
      <span style={rotulo}>{label}</span>
      <span style={{
        fontFamily: "var(--font-body, sans-serif)", fontSize: "14px",
        color: "var(--nuit-bone)", lineHeight: 1.45,
        overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {children}
      </span>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 13px",
  borderRadius: "8px", border: "1px solid rgba(212,184,134,0.22)",
  backgroundColor: "var(--nuit-deep)", color: "var(--nuit-bone)",
  fontFamily: "var(--font-body, sans-serif)", fontSize: "14.5px",
  outline: "none", transition: "border-color var(--dur-fast) var(--ease-out)",
}

function CampoForm({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
      <span style={rotulo}>{label}</span>
      {children}
      {hint && (
        <span style={{
          fontFamily: "var(--font-body)", fontSize: "12px",
          color: "var(--nuit-bone-soft)", opacity: 0.7,
        }}>{hint}</span>
      )}
    </label>
  )
}

function Botao({ variante = "primario", children, ...props }: {
  variante?: "primario" | "fantasma"
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const primario = variante === "primario"
  return (
    <button
      {...props}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px",
        padding: "11px 22px", borderRadius: "8px",
        backgroundColor: primario ? "var(--nuit-champagne)" : "transparent",
        color: primario ? "var(--nuit-midnight)" : "var(--nuit-bone-soft)",
        border: primario ? "1px solid var(--nuit-champagne)" : "1px solid rgba(212,184,134,0.28)",
        fontFamily: "var(--font-sans, sans-serif)",
        fontSize: "13px", fontWeight: 600, letterSpacing: "0.03em",
        cursor: props.disabled ? "default" : "pointer",
        opacity: props.disabled ? 0.55 : 1,
        transition: "all var(--dur-fast) var(--ease-out)",
        ...props.style,
      }}
    >
      {children}
    </button>
  )
}

// ── Painel lateral (criar / editar) ──────────────────────────────────

function Painel({ titulo, sub, onFechar, children }: {
  titulo: string; sub?: string; onFechar: () => void; children: React.ReactNode
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onFechar() }
    window.addEventListener("keydown", esc)
    document.body.style.overflow = "hidden"
    return () => { window.removeEventListener("keydown", esc); document.body.style.overflow = "" }
  }, [onFechar])

  return (
    <div
      onClick={onFechar}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        backgroundColor: "rgba(10,12,18,0.72)",
        backdropFilter: "blur(3px)",
        display: "flex", justifyContent: "flex-end",
        animation: "vfade var(--dur-fast) var(--ease-out)",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "min(480px, 100%)", height: "100%",
          backgroundColor: "var(--nuit-midnight)",
          borderLeft: "1px solid rgba(212,184,134,0.18)",
          boxShadow: "var(--shadow-3)",
          display: "flex", flexDirection: "column",
          animation: "vslide var(--dur-med) var(--ease-out)",
        }}
      >
        <div style={{
          padding: "24px 28px 20px",
          borderBottom: "1px solid rgba(212,184,134,0.12)",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px",
        }}>
          <div>
            <h2 style={{
              fontFamily: "var(--font-heading, Georgia, serif)",
              fontSize: "21px", color: "var(--nuit-bone)", lineHeight: 1.2,
            }}>{titulo}</h2>
            {sub && (
              <p style={{
                fontFamily: "var(--font-body)", fontSize: "13px",
                color: "var(--nuit-bone-soft)", marginTop: "5px",
              }}>{sub}</p>
            )}
          </div>
          <button onClick={onFechar} aria-label="Fechar" style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--nuit-bone-soft)", padding: "4px", lineHeight: 0,
          }}>
            <X size={20} />
          </button>
        </div>
        <div className="nuit-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "24px 28px 32px" }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ── Cartão ───────────────────────────────────────────────────────────

function Cartao({ v, onEditar }: { v: Voucher; onEditar: () => void }) {
  const [hover, setHover] = useState(false)
  const dias = diasAte(v.validade)
  const aExpirar = (v.estado === "ativo" || v.estado === "agendado") && dias !== null && dias <= DIAS_ALERTA_EXPIRA
  const jaExpirou = aExpirar && dias !== null && dias < 0
  const atenuado = v.estado === "usado" || v.estado === "expirado" || v.estado === "cancelado"

  return (
    <article
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        display: "flex", flexDirection: "column",
        backgroundColor: "var(--nuit-overlay)",
        borderRadius: "14px",
        border: `1px solid ${hover ? "rgba(212,184,134,0.34)" : "rgba(212,184,134,0.14)"}`,
        boxShadow: hover ? "var(--shadow-2)" : "var(--shadow-1)",
        transform: hover ? "translateY(-2px)" : "none",
        transition: "transform var(--dur-fast) var(--ease-out), border-color var(--dur-fast), box-shadow var(--dur-fast)",
        overflow: "hidden",
        opacity: atenuado ? 0.72 : 1,
      }}
    >
      {/* Faixa superior — o "topo" do cartão-presente */}
      <div style={{
        padding: "18px 20px 15px",
        background: "linear-gradient(135deg, rgba(212,184,134,0.07) 0%, rgba(212,184,134,0.015) 100%)",
        borderBottom: "1px solid rgba(212,184,134,0.10)",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
      }}>
        <span style={{
          fontFamily: "var(--font-heading, Georgia, serif)",
          fontSize: "19px", letterSpacing: "0.055em",
          color: "var(--nuit-champagne)", whiteSpace: "nowrap",
        }}>
          {v.codigo}
        </span>
        <Chip estado={v.estado} />
      </div>

      <div style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: "16px", flex: 1 }}>
        {/* Serviço + valor */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "14px" }}>
          <div style={{ minWidth: 0 }}>
            <span style={rotulo}>Experiência</span>
            <p style={{
              fontFamily: "var(--font-body, sans-serif)", fontSize: "15px",
              color: "var(--nuit-bone)", lineHeight: 1.4, marginTop: "5px",
            }}>
              <NomeServico nome={v.servicoNome} />
            </p>
          </div>
          <span style={{
            fontFamily: "var(--font-heading, Georgia, serif)",
            fontSize: "25px", color: "var(--nuit-bone)", lineHeight: 1, whiteSpace: "nowrap",
          }}>
            {v.valorPago.toFixed(0)}<span style={{ fontSize: "15px", color: "var(--nuit-champagne-soft)", marginLeft: "2px" }}>€</span>
          </span>
        </div>

        <hr className="nuit-hairline-soft" style={{ margin: 0 }} />

        {/* De → Para */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          <Campo label="De">{v.compradorNome}</Campo>
          <Campo label="Para">{v.beneficiarioNome || <span style={{ color: "var(--nuit-bone-soft)", opacity: 0.5 }}>—</span>}</Campo>
        </div>

        {/* Rodapé: validade + editar */}
        <div style={{
          marginTop: "auto", paddingTop: "14px",
          borderTop: "1px solid rgba(212,184,134,0.09)",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
        }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            fontFamily: "var(--font-body)", fontSize: "12.5px",
            color: aExpirar ? "#c9756a" : "var(--nuit-bone-soft)",
            fontWeight: aExpirar ? 600 : 400,
          }}>
            {aExpirar && <AlertTriangle size={13} />}
            {v.estado === "usado" && v.dataUso
              ? `Usado a ${formatarData(v.dataUso)}`
              : v.validade
                ? jaExpirou
                  ? `Expirou a ${formatarData(v.validade)}`
                  : aExpirar
                    ? `Expira em ${dias} ${dias === 1 ? "dia" : "dias"}`
                    : `Válido até ${formatarData(v.validade)}`
                : "Sem validade definida"}
          </span>

          <button
            onClick={onEditar}
            aria-label={`Editar voucher ${v.codigo}`}
            style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "6px 12px", borderRadius: "7px",
              backgroundColor: hover ? "rgba(212,184,134,0.10)" : "transparent",
              border: "1px solid rgba(212,184,134,0.22)",
              color: "var(--nuit-champagne-soft)",
              fontFamily: "var(--font-sans)", fontSize: "12px", fontWeight: 600,
              cursor: "pointer", transition: "background-color var(--dur-fast)",
              flexShrink: 0,
            }}
          >
            <Pencil size={12} /> Editar
          </button>
        </div>
      </div>
    </article>
  )
}

// ── Formulário de edição ─────────────────────────────────────────────

function FormEditar({ v, onFechar }: { v: Voucher; onFechar: () => void }) {
  const [f, setF] = useState({
    codigo: v.codigo,
    estado: v.estado,
    tipo: v.tipo,
    compradorNome: v.compradorNome,
    compradorTelefone: v.compradorTelefone ?? "",
    servicoNome: v.servicoNome,
    valorPago: String(v.valorPago),
    beneficiarioNome: v.beneficiarioNome ?? "",
    beneficiarioTelefone: v.beneficiarioTelefone ?? "",
    validade: v.validade ? v.validade.slice(0, 10) : "",
    dataUso: v.dataUso ? v.dataUso.slice(0, 10) : "",
    notas: v.notas ?? "",
  })
  const [isPending, start] = useTransition()
  const { toast } = useToast()

  function guardar() {
    start(async () => {
      const res = await atualizarVoucher(v.id, {
        ...f,
        valorPago: Number(f.valorPago),
        validade: f.validade || null,
        dataUso: f.dataUso || null,
      })
      if (res.ok) { toast("Voucher atualizado.", "success"); onFechar() }
      else toast(res.erro, "error")
    })
  }

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value })

  return (
    <Painel titulo="Editar voucher" sub={v.codigo} onFechar={onFechar}>
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          <CampoForm label="Código"><input value={f.codigo} onChange={set("codigo")} style={inputStyle} /></CampoForm>
          <CampoForm label="Estado">
            <select value={f.estado} onChange={set("estado")} style={{ ...inputStyle, cursor: "pointer" }}>
              {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </CampoForm>
        </div>

        <CampoForm label="Tipo">
          <select value={f.tipo} onChange={set("tipo")} style={{ ...inputStyle, cursor: "pointer" }}>
            <option value="digital">Digital</option>
            <option value="fisico">Físico</option>
          </select>
        </CampoForm>

        <CampoForm label="Experiência"><input value={f.servicoNome} onChange={set("servicoNome")} style={inputStyle} /></CampoForm>
        <CampoForm label="Valor pago (€)"><input type="number" step="0.01" value={f.valorPago} onChange={set("valorPago")} style={inputStyle} /></CampoForm>

        <hr className="nuit-hairline-soft" style={{ margin: "2px 0" }} />

        <CampoForm label="Comprador/a"><input value={f.compradorNome} onChange={set("compradorNome")} style={inputStyle} /></CampoForm>
        <CampoForm label="Telefone do comprador" hint="Com indicativo, ex: +351 912 345 678">
          <input value={f.compradorTelefone} onChange={set("compradorTelefone")} style={inputStyle} />
        </CampoForm>
        <CampoForm label="Beneficiário/a" hint="Para quem é o voucher">
          <input value={f.beneficiarioNome} onChange={set("beneficiarioNome")} style={inputStyle} />
        </CampoForm>
        <CampoForm label="Telefone do beneficiário">
          <input value={f.beneficiarioTelefone} onChange={set("beneficiarioTelefone")} style={inputStyle} />
        </CampoForm>

        <hr className="nuit-hairline-soft" style={{ margin: "2px 0" }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          <CampoForm label="Válido até"><input type="date" value={f.validade} onChange={set("validade")} style={inputStyle} /></CampoForm>
          <CampoForm label="Data de uso"><input type="date" value={f.dataUso} onChange={set("dataUso")} style={inputStyle} /></CampoForm>
        </div>

        <CampoForm label="Notas">
          <textarea value={f.notas} onChange={set("notas")} rows={3} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
        </CampoForm>

        <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
          <Botao onClick={guardar} disabled={isPending} style={{ flex: 1 }}>
            {isPending ? "A guardar…" : "Guardar alterações"}
          </Botao>
          <Botao variante="fantasma" onClick={onFechar}>Cancelar</Botao>
        </div>
      </div>
    </Painel>
  )
}

// ── Formulário de criação ────────────────────────────────────────────

function FormCriar({ tipoInicial, sugestaoCodigo, servicos, onFechar }: {
  tipoInicial: string
  sugestaoCodigo: string
  servicos: string[]
  onFechar: () => void
}) {
  const [f, setF] = useState({
    codigo: sugestaoCodigo,
    tipo: tipoInicial,
    compradorNome: "",
    compradorTelefone: "",
    servicoNome: "",
    valorPago: "",
    beneficiarioNome: "",
    validade: "",
    notas: "",
  })
  const [isPending, start] = useTransition()
  const { toast } = useToast()

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value })

  function guardar() {
    if (!f.codigo.trim() || !f.compradorNome.trim() || !f.servicoNome.trim() || !f.valorPago) {
      toast("Preenche o código, comprador, experiência e valor.", "error")
      return
    }
    start(async () => {
      const res = await criarVoucher({
        codigo: f.codigo.trim(),
        tipo: f.tipo,
        compradorNome: f.compradorNome.trim(),
        compradorTelefone: f.compradorTelefone.trim() || undefined,
        servicoNome: f.servicoNome.trim(),
        valorPago: Number(f.valorPago),
        beneficiarioNome: f.beneficiarioNome.trim() || undefined,
        validade: f.validade || undefined,
        notas: f.notas.trim() || undefined,
      })
      if (res.ok) { toast("Voucher criado.", "success"); onFechar() }
      else toast(res.erro, "error")
    })
  }

  return (
    <Painel
      titulo="Novo voucher"
      sub="A validade fica a 6 meses se deixares em branco."
      onFechar={onFechar}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          <CampoForm label="Código">
            <input autoFocus value={f.codigo} onChange={set("codigo")} placeholder="EWD2026-28" style={inputStyle} />
          </CampoForm>
          <CampoForm label="Tipo">
            <select value={f.tipo} onChange={set("tipo")} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="digital">Digital</option>
              <option value="fisico">Físico</option>
            </select>
          </CampoForm>
        </div>

        <CampoForm label="Experiência" hint="Escolhe do catálogo ou escreve à mão">
          <input
            list="servicos-catalogo"
            value={f.servicoNome}
            onChange={set("servicoNome")}
            placeholder="Essência Plena"
            style={inputStyle}
          />
          <datalist id="servicos-catalogo">
            {servicos.map(s => <option key={s} value={s} />)}
          </datalist>
        </CampoForm>

        <CampoForm label="Valor pago (€)">
          <input type="number" step="0.01" value={f.valorPago} onChange={set("valorPago")} placeholder="40" style={inputStyle} />
        </CampoForm>

        <hr className="nuit-hairline-soft" style={{ margin: "2px 0" }} />

        <CampoForm label="Comprador/a">
          <input value={f.compradorNome} onChange={set("compradorNome")} placeholder="Quem pagou o voucher" style={inputStyle} />
        </CampoForm>
        <CampoForm label="Telefone do comprador" hint="Se preencheres, o comprador entra automaticamente em Leads.">
          <input value={f.compradorTelefone} onChange={set("compradorTelefone")} placeholder="+351 912 345 678" style={inputStyle} />
        </CampoForm>
        <CampoForm label="Beneficiário/a" hint="Opcional — para quem é o presente">
          <input value={f.beneficiarioNome} onChange={set("beneficiarioNome")} placeholder="Nome de quem vai receber" style={inputStyle} />
        </CampoForm>

        <CampoForm label="Válido até" hint="Deixa vazio para 6 meses a contar de hoje">
          <input type="date" value={f.validade} onChange={set("validade")} style={inputStyle} />
        </CampoForm>

        <CampoForm label="Notas">
          <textarea value={f.notas} onChange={set("notas")} rows={2} placeholder="Ex: comprou via WhatsApp" style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
        </CampoForm>

        <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
          <Botao onClick={guardar} disabled={isPending} style={{ flex: 1 }}>
            {isPending ? "A criar…" : "Criar voucher"}
          </Botao>
          <Botao variante="fantasma" onClick={onFechar}>Cancelar</Botao>
        </div>
      </div>
    </Painel>
  )
}

// ── Página ───────────────────────────────────────────────────────────

export function VouchersClient({ vouchers, servicos }: { vouchers: Voucher[]; servicos: string[] }) {
  const [tipo, setTipo] = useState<"digital" | "fisico">("digital")
  const [estado, setEstado] = useState("todos")
  const [busca, setBusca] = useState("")
  const [aCriar, setACriar] = useState(false)
  const [aEditar, setAEditar] = useState<Voucher | null>(null)

  const doTipo = useMemo(() => vouchers.filter(v => v.tipo === tipo), [vouchers, tipo])

  const visiveis = useMemo(() => doTipo.filter(v => {
    if (estado === "expira") {
      const d = diasAte(v.validade)
      return (v.estado === "ativo" || v.estado === "agendado") && d !== null && d <= DIAS_ALERTA_EXPIRA
    }
    if (estado !== "todos" && v.estado !== estado) return false
    if (busca.trim()) {
      const alvo = `${v.codigo} ${v.compradorNome} ${v.beneficiarioNome ?? ""} ${v.servicoNome}`.toLowerCase()
      if (!alvo.includes(busca.trim().toLowerCase())) return false
    }
    return true
  }), [doTipo, estado, busca])

  const contas = useMemo(() => ({
    porMarcar: doTipo.filter(v => v.estado === "ativo").length,
    aExpirar: doTipo.filter(v => {
      const d = diasAte(v.validade)
      return (v.estado === "ativo" || v.estado === "agendado") && d !== null && d <= DIAS_ALERTA_EXPIRA
    }).length,
    valor: doTipo.filter(v => v.estado === "ativo").reduce((s, v) => s + v.valorPago, 0),
  }), [doTipo])

  // Sugere o próximo código da série do tipo escolhido (EWD2026-28, EW2025-25…)
  const sugestaoCodigo = useMemo(() => {
    const prefixo = tipo === "digital" ? "EWD2026-" : "EW2025-"
    const nums = vouchers
      .filter(v => v.codigo.startsWith(prefixo))
      .map(v => parseInt(v.codigo.slice(prefixo.length), 10))
      .filter(n => !Number.isNaN(n))
    const proximo = nums.length ? Math.max(...nums) + 1 : 1
    return `${prefixo}${String(proximo).padStart(2, "0")}`
  }, [vouchers, tipo])

  const filtros = [
    { v: "todos", label: "Todos" },
    { v: "ativo", label: "Por marcar" },
    { v: "agendado", label: "Agendados" },
    { v: "usado", label: "Utilizados" },
    { v: "expira", label: `A expirar${contas.aExpirar ? ` (${contas.aExpirar})` : ""}` },
  ]

  return (
    <div style={{ maxWidth: "1240px" }}>
      <style>{`
        @keyframes vfade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes vslide { from { transform: translateX(24px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
        @keyframes vrise { from { transform: translateY(8px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>

      {/* Cabeçalho */}
      <div style={{
        display: "flex", alignItems: "flex-end", justifyContent: "space-between",
        gap: "20px", flexWrap: "wrap", marginBottom: "26px",
      }}>
        <div>
          <h1 style={{
            fontFamily: "var(--font-heading, Georgia, serif)",
            fontSize: "27px", color: "var(--nuit-bone)", lineHeight: 1.15,
          }}>
            Vouchers
          </h1>
          <p style={{
            fontFamily: "var(--font-body)", fontSize: "14px",
            color: "var(--nuit-bone-soft)", marginTop: "7px",
          }}>
            {contas.porMarcar} por marcar · {contas.valor.toFixed(0)} € em aberto
            {contas.aExpirar > 0 && (
              <span style={{ color: "#c9756a", fontWeight: 600 }}> · {contas.aExpirar} a expirar</span>
            )}
          </p>
        </div>
        <Botao onClick={() => setACriar(true)}>
          <Plus size={16} /> Novo voucher
        </Botao>
      </div>

      {/* Separadores Digital / Físico */}
      <div style={{
        display: "inline-flex", padding: "4px", borderRadius: "11px",
        backgroundColor: "var(--nuit-deep)", border: "1px solid rgba(212,184,134,0.14)",
        marginBottom: "18px",
      }}>
        {([
          { v: "digital", label: "Digitais", Icon: Gift },
          { v: "fisico", label: "Físicos", Icon: CreditCard },
        ] as const).map(({ v, label, Icon }) => {
          const on = tipo === v
          const n = vouchers.filter(x => x.tipo === v).length
          return (
            <button
              key={v}
              onClick={() => { setTipo(v); setEstado("todos") }}
              style={{
                display: "inline-flex", alignItems: "center", gap: "9px",
                padding: "10px 20px", borderRadius: "8px", border: "none",
                backgroundColor: on ? "rgba(212,184,134,0.13)" : "transparent",
                color: on ? "var(--nuit-champagne)" : "var(--nuit-bone-soft)",
                fontFamily: "var(--font-sans)", fontSize: "13.5px",
                fontWeight: on ? 600 : 500, cursor: "pointer",
                transition: "all var(--dur-fast) var(--ease-out)",
              }}
            >
              <Icon size={15} />
              {label}
              <span style={{
                fontSize: "11px", padding: "2px 7px", borderRadius: "100px",
                backgroundColor: on ? "rgba(212,184,134,0.18)" : "rgba(212,184,134,0.08)",
                color: on ? "var(--nuit-champagne)" : "var(--nuit-bone-soft)",
              }}>{n}</span>
            </button>
          )
        })}
      </div>

      {/* Pesquisa + filtros */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", marginBottom: "22px" }}>
        <div style={{ position: "relative", flex: "1 1 280px", maxWidth: "380px" }}>
          <Search size={15} style={{
            position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)",
            color: "var(--nuit-bone-soft)", opacity: 0.6, pointerEvents: "none",
          }} />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Procurar código, nome ou experiência…"
            style={{ ...inputStyle, paddingLeft: "38px" }}
          />
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {filtros.map(({ v, label }) => {
            const on = estado === v
            const alerta = v === "expira" && contas.aExpirar > 0
            return (
              <button
                key={v}
                onClick={() => setEstado(v)}
                style={{
                  padding: "9px 15px", borderRadius: "100px",
                  border: `1px solid ${on ? "rgba(212,184,134,0.45)" : "rgba(212,184,134,0.15)"}`,
                  backgroundColor: on ? "rgba(212,184,134,0.12)" : "transparent",
                  color: on ? "var(--nuit-champagne)" : alerta ? "#c9756a" : "var(--nuit-bone-soft)",
                  fontFamily: "var(--font-sans)", fontSize: "12.5px",
                  fontWeight: on || alerta ? 600 : 500,
                  cursor: "pointer", whiteSpace: "nowrap",
                  transition: "all var(--dur-fast) var(--ease-out)",
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Grelha de cartões */}
      {visiveis.length > 0 ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))",
          gap: "16px",
        }}>
          {visiveis.map((v, i) => (
            <div key={v.id} style={{ animation: "vrise var(--dur-med) var(--ease-out) both", animationDelay: `${Math.min(i, 12) * 28}ms` }}>
              <Cartao v={v} onEditar={() => setAEditar(v)} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          padding: "70px 24px", textAlign: "center",
          border: "1px dashed rgba(212,184,134,0.18)", borderRadius: "14px",
        }}>
          <p style={{
            fontFamily: "var(--font-heading, Georgia, serif)", fontStyle: "italic",
            fontSize: "17px", color: "var(--nuit-bone-soft)",
          }}>
            {busca || estado !== "todos" ? "Nenhum voucher com estes filtros." : "Ainda não há vouchers aqui."}
          </p>
        </div>
      )}

      {aCriar && (
        <FormCriar
          tipoInicial={tipo}
          sugestaoCodigo={sugestaoCodigo}
          servicos={servicos}
          onFechar={() => setACriar(false)}
        />
      )}
      {aEditar && <FormEditar v={aEditar} onFechar={() => setAEditar(null)} />}
    </div>
  )
}
