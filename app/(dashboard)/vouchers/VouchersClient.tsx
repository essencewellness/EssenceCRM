"use client"

import { useState, useTransition, useEffect, useMemo, useId, useRef } from "react"
import { Search, Plus, Pencil, X, Gift, CreditCard, AlertTriangle, CalendarCheck, Check, ChevronDown } from "lucide-react"
import { useToast } from "@/components/ui/toast-nuit"
import { NomeServico } from "@/components/NomeServico"
import { adicionarMeses } from "@/lib/utils"
import { criarVoucher, atualizarVoucher } from "./actions"

export interface ServicoCatalogo {
  nome: string
  precoBase: number
}

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

// Ordem = prioridade de atenção: o que precisa de acção fica sempre primeiro.
const ESTADOS = [
  { value: "ativo",     label: "Por marcar", plural: "Por marcar",  cor: "#d4b886", bg: "rgba(212,184,134,0.12)" },
  { value: "agendado",  label: "Agendado",   plural: "Agendados",   cor: "#8ea9c9", bg: "rgba(142,169,201,0.14)" },
  { value: "usado",     label: "Utilizado",  plural: "Utilizados",  cor: "#8bb08f", bg: "rgba(139,176,143,0.14)" },
  { value: "expirado",  label: "Expirado",   plural: "Expirados",   cor: "#9d9d9a", bg: "rgba(157,157,154,0.12)" },
  { value: "cancelado", label: "Cancelado",  plural: "Cancelados",  cor: "#c9756a", bg: "rgba(201,117,106,0.12)" },
]
const estadoInfo = (v: string) => ESTADOS.find(e => e.value === v) ?? ESTADOS[0]

const DIAS_ALERTA_EXPIRA = 15

function formatarData(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" })
}

const INDICATIVO_PADRAO = "+351 "

// Um campo que arranca com "+351 " fica com esse valor mesmo que ninguém
// escreva o número — sem isto gravávamos "+351" como telefone e criávamos
// uma lead sem contacto nenhum.
function telefoneOuVazio(valor: string): string | undefined {
  const digitos = valor.replace(/\D/g, "").replace(/^351/, "")
  return digitos.length > 0 ? valor.trim() : undefined
}

function diasAte(iso: string | null): number | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000)
}

// Ordena por código como uma folha de registo: primeiro a série (EW2025,
// EWD2026), depois o número — comparado como número, senão "-10" viria
// antes de "-2".
function compararCodigo(a: string, b: string) {
  const parte = (c: string) => {
    const m = c.match(/^(.*?)(\d+)\s*$/)
    return m ? { serie: m[1], num: parseInt(m[2], 10) } : { serie: c, num: 0 }
  }
  const pa = parte(a), pb = parte(b)
  return pa.serie === pb.serie ? pa.num - pb.num : pa.serie.localeCompare(pb.serie, "pt")
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

// Agrupa o catálogo pela ocasião que vem entre parênteses no nome
// ("(Dia da Mãe)"), separando ainda os de duas pessoas — é assim que a
// Bea pensa nos serviços quando emite um voucher.
function grupoDoServico(nome: string): string {
  const ocasiao = nome.match(/\(([^)]+)\)\s*$/)
  if (ocasiao) return ocasiao[1]
  if (/\ba d(ois|uas)\b/i.test(nome)) return "A dois"
  return "Catálogo base"
}

function SeletorExperiencia({ servicos, valor, onEscolher }: {
  servicos: ServicoCatalogo[]
  valor: string
  onEscolher: (nome: string) => void
}) {
  const [aberto, setAberto] = useState(false)
  const [filtro, setFiltro] = useState("")
  const [activo, setActivo] = useState(0)
  const idBase = useId()
  const listaId = `${idBase}-lista`
  const wrapRef = useRef<HTMLDivElement>(null)
  const listaRef = useRef<HTMLUListElement>(null)

  const encontrados = useMemo(() => {
    const q = filtro.trim().toLowerCase()
    return q ? servicos.filter(s => s.nome.toLowerCase().includes(q)) : servicos
  }, [servicos, filtro])

  // Uma lista plana para o teclado, e a mesma lista agrupada para os olhos.
  const grupos = useMemo(() => {
    const mapa = new Map<string, ServicoCatalogo[]>()
    for (const s of encontrados) {
      const g = grupoDoServico(s.nome)
      if (!mapa.has(g)) mapa.set(g, [])
      mapa.get(g)!.push(s)
    }
    return [...mapa.entries()]
  }, [encontrados])

  // Mantém a opção destacada à vista ao navegar com as setas.
  useEffect(() => {
    if (!aberto) return
    listaRef.current
      ?.querySelector(`[data-idx="${activo}"]`)
      ?.scrollIntoView({ block: "nearest" })
  }, [activo, aberto])

  function escolher(s: ServicoCatalogo) {
    onEscolher(s.nome)
    setFiltro("")
    setAberto(false)
  }

  function aoTeclado(e: React.KeyboardEvent) {
    if (!aberto && (e.key === "ArrowDown" || e.key === "Enter")) {
      setAberto(true)
      return
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActivo(i => Math.min(i + 1, encontrados.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActivo(i => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (encontrados[activo]) escolher(encontrados[activo])
    } else if (e.key === "Escape") {
      setAberto(false)
      setFiltro("")
    }
  }

  const seleccionado = servicos.find(s => s.nome === valor)

  return (
    <div
      ref={wrapRef}
      style={{ position: "relative" }}
      onBlur={e => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setAberto(false)
          setFiltro("")
        }
      }}
    >
      <div style={{ position: "relative" }}>
        <input
          id={idBase}
          role="combobox"
          aria-expanded={aberto}
          aria-controls={listaId}
          aria-autocomplete="list"
          aria-activedescendant={aberto && encontrados[activo] ? `${listaId}-${activo}` : undefined}
          autoComplete="off"
          value={aberto ? filtro : valor}
          placeholder={valor ? valor : "Escolher experiência…"}
          onFocus={() => setAberto(true)}
          onClick={() => setAberto(true)}
          onChange={e => {
            setFiltro(e.target.value)
            onEscolher(e.target.value)
            setActivo(0)
            setAberto(true)
          }}
          onKeyDown={aoTeclado}
          style={{ ...inputStyle, paddingRight: "62px" }}
        />
        <span style={{
          position: "absolute", right: "11px", top: "50%", transform: "translateY(-50%)",
          display: "flex", alignItems: "center", gap: "7px", pointerEvents: "none",
        }}>
          {seleccionado && !aberto && (
            <span style={{
              fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "15px",
              color: "var(--nuit-champagne)",
            }}>
              {seleccionado.precoBase}€
            </span>
          )}
          <ChevronDown
            size={15}
            aria-hidden="true"
            style={{
              color: "var(--nuit-bone-soft)", opacity: 0.6,
              transform: aberto ? "rotate(180deg)" : "none",
              transition: "transform var(--dur-fast) var(--ease-out)",
            }}
          />
        </span>
      </div>

      {aberto && (
        <ul
          ref={listaRef}
          id={listaId}
          role="listbox"
          aria-label="Experiências do catálogo"
          className="nuit-scrollbar"
          style={{
            position: "absolute", zIndex: 20, top: "calc(100% + 6px)", left: 0, right: 0,
            maxHeight: "290px", overflowY: "auto",
            backgroundColor: "var(--nuit-deep)",
            border: "1px solid rgba(212,184,134,0.28)",
            borderRadius: "10px", boxShadow: "var(--shadow-3)",
            padding: "6px", listStyle: "none",
          }}
        >
          {encontrados.length === 0 && (
            <li style={{
              padding: "16px 12px", textAlign: "center",
              fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--nuit-bone-soft)",
            }}>
              Sem correspondência — podes escrever à mão.
            </li>
          )}

          {grupos.map(([grupo, itens]) => (
            <li key={grupo} role="presentation">
              <div style={{
                padding: "9px 10px 5px",
                fontFamily: "var(--font-sans)", fontSize: "9.5px", fontWeight: 700,
                letterSpacing: "0.18em", textTransform: "uppercase",
                color: "var(--nuit-champagne-soft)", opacity: 0.8,
              }}>
                {grupo}
              </div>
              <ul role="presentation" style={{ listStyle: "none" }}>
                {itens.map(s => {
                  const idx = encontrados.indexOf(s)
                  const destacado = idx === activo
                  const escolhido = s.nome === valor
                  return (
                    <li
                      key={s.nome}
                      id={`${listaId}-${idx}`}
                      data-idx={idx}
                      role="option"
                      aria-selected={escolhido}
                      onMouseEnter={() => setActivo(idx)}
                      onMouseDown={e => { e.preventDefault(); escolher(s) }}
                      style={{
                        display: "flex", alignItems: "center", gap: "10px",
                        padding: "9px 10px", borderRadius: "7px", cursor: "pointer",
                        backgroundColor: destacado ? "rgba(212,184,134,0.11)" : "transparent",
                      }}
                    >
                      <span style={{
                        flex: 1, minWidth: 0,
                        fontFamily: "var(--font-body)", fontSize: "13.5px",
                        color: "var(--nuit-bone)",
                      }}>
                        <NomeServico nome={s.nome} />
                      </span>
                      <span style={{
                        fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "15px",
                        color: destacado ? "var(--nuit-champagne)" : "var(--nuit-bone-soft)",
                        flexShrink: 0,
                      }}>
                        {s.precoBase}€
                      </span>
                      <Check
                        size={14}
                        aria-hidden="true"
                        style={{ color: "var(--nuit-champagne)", opacity: escolhido ? 1 : 0, flexShrink: 0 }}
                      />
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
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
  const e = estadoInfo(v.estado)
  const dias = diasAte(v.validade)
  const aExpirar = (v.estado === "ativo" || v.estado === "agendado") && dias !== null && dias <= DIAS_ALERTA_EXPIRA
  const jaExpirou = aExpirar && dias !== null && dias < 0
  // Um voucher fechado (usado/expirado/cancelado) não compete por atenção com
  // os que ainda precisam de acção — fica dessaturado e carimbado.
  const fechado = v.estado === "usado" || v.estado === "expirado" || v.estado === "cancelado"

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
        borderLeft: `3px solid ${e.cor}${fechado ? "55" : ""}`,
        boxShadow: hover ? "var(--shadow-2)" : "var(--shadow-1)",
        transform: hover ? "translateY(-2px)" : "none",
        transition: "transform var(--dur-fast) var(--ease-out), border-color var(--dur-fast), box-shadow var(--dur-fast), opacity var(--dur-fast)",
        overflow: "hidden",
        opacity: fechado ? (hover ? 0.92 : 0.62) : 1,
        filter: fechado ? "saturate(0.55)" : "none",
      }}
    >
      {/* Carimbo — marca de cartão já "gasto", como num talão selado */}
      {fechado && (
        <span
          aria-hidden
          style={{
            position: "absolute", top: "58px", right: "-16px",
            transform: "rotate(-14deg)",
            padding: "5px 26px",
            border: `2px solid ${e.cor}`, borderRadius: "4px",
            color: e.cor, opacity: 0.34,
            fontFamily: "var(--font-sans, sans-serif)",
            fontSize: "11px", fontWeight: 800, letterSpacing: "0.24em",
            textTransform: "uppercase", whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          {e.label}
        </span>
      )}

      {/* Faixa superior — o "topo" do cartão-presente */}
      <div style={{
        padding: "18px 20px 15px",
        background: fechado
          ? "transparent"
          : `linear-gradient(135deg, ${e.cor}14 0%, ${e.cor}03 100%)`,
        borderBottom: "1px solid rgba(212,184,134,0.10)",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
      }}>
        <span style={{
          fontFamily: "var(--font-heading, Georgia, serif)",
          fontSize: "19px", letterSpacing: "0.055em",
          color: fechado ? "var(--nuit-bone-soft)" : "var(--nuit-champagne)",
          whiteSpace: "nowrap",
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

function Grelha({ itens, onEditar }: { itens: Voucher[]; onEditar: (v: Voucher) => void }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))",
      gap: "16px",
    }}>
      {itens.map((v, i) => (
        <div
          key={v.id}
          style={{
            animation: "vrise var(--dur-med) var(--ease-out) both",
            animationDelay: `${Math.min(i, 10) * 26}ms`,
          }}
        >
          <Cartao v={v} onEditar={() => onEditar(v)} />
        </div>
      ))}
    </div>
  )
}

// ── Formulário de edição ─────────────────────────────────────────────

function FormEditar({ v, servicos, onFechar }: { v: Voucher; servicos: ServicoCatalogo[]; onFechar: () => void }) {
  const [f, setF] = useState({
    codigo: v.codigo,
    estado: v.estado,
    tipo: v.tipo,
    compradorNome: v.compradorNome,
    compradorTelefone: v.compradorTelefone ?? INDICATIVO_PADRAO,
    servicoNome: v.servicoNome,
    valorPago: String(v.valorPago),
    beneficiarioNome: v.beneficiarioNome ?? "",
    beneficiarioTelefone: v.beneficiarioTelefone ?? INDICATIVO_PADRAO,
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
        compradorTelefone: telefoneOuVazio(f.compradorTelefone) ?? null,
        beneficiarioTelefone: telefoneOuVazio(f.beneficiarioTelefone) ?? null,
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

        {/* Na edição o preço não é tocado ao mudar de experiência — pode ter
            sido vendido a um valor acordado que não é o do catálogo. */}
        <CampoForm label="Experiência">
          <SeletorExperiencia
            servicos={servicos}
            valor={f.servicoNome}
            onEscolher={nome => setF(a => ({ ...a, servicoNome: nome }))}
          />
        </CampoForm>
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
  servicos: ServicoCatalogo[]
  onFechar: () => void
}) {
  // O valor preenche-se sozinho a partir do catálogo quando o serviço bate
  // certo, mas continua editável — há vouchers com desconto ou valor
  // combinado à parte (a folha real tem vários a 20€ e 30€).
  const [precoAuto, setPrecoAuto] = useState(false)
  const [f, setF] = useState({
    codigo: sugestaoCodigo,
    tipo: tipoInicial,
    compradorNome: "",
    compradorTelefone: INDICATIVO_PADRAO,
    servicoNome: "",
    valorPago: "",
    beneficiarioNome: "",
    dataCompra: new Date().toISOString().slice(0, 10),
    notas: "",
  })
  const [isPending, start] = useTransition()
  const { toast } = useToast()

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value })

  function escolherServico(nome: string) {
    const doCatalogo = servicos.find(s => s.nome.toLowerCase() === nome.trim().toLowerCase())
    if (doCatalogo) {
      setF(a => ({ ...a, servicoNome: nome, valorPago: String(doCatalogo.precoBase) }))
      setPrecoAuto(true)
    } else {
      setF(a => ({ ...a, servicoNome: nome }))
      setPrecoAuto(false)
    }
  }

  // A validade não se preenche — mostra-se, para a terapeuta confirmar a data
  // que o voucher vai ter antes de gravar.
  const validadeCalculada = useMemo(() => {
    if (!f.dataCompra) return null
    const d = new Date(f.dataCompra)
    if (Number.isNaN(d.getTime())) return null
    return adicionarMeses(d, 6).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" })
  }, [f.dataCompra])

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
        compradorTelefone: telefoneOuVazio(f.compradorTelefone),
        servicoNome: f.servicoNome.trim(),
        valorPago: Number(f.valorPago),
        beneficiarioNome: f.beneficiarioNome.trim() || undefined,
        dataCompra: f.dataCompra || undefined,
        notas: f.notas.trim() || undefined,
      })
      if (res.ok) { toast("Voucher criado.", "success"); onFechar() }
      else toast(res.erro, "error")
    })
  }

  return (
    <Painel
      titulo="Novo voucher"
      sub="A validade é calculada: 6 meses após a data de compra."
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

        <CampoForm label="Experiência" hint="Ao escolher do catálogo, o valor preenche-se sozinho">
          <SeletorExperiencia servicos={servicos} valor={f.servicoNome} onEscolher={escolherServico} />
        </CampoForm>

        <CampoForm
          label="Valor pago (€)"
          hint={precoAuto ? "Preço do catálogo — muda se este voucher foi vendido a outro valor." : undefined}
        >
          <input
            type="number"
            step="0.01"
            value={f.valorPago}
            onChange={e => { setF({ ...f, valorPago: e.target.value }); setPrecoAuto(false) }}
            placeholder="40"
            style={{
              ...inputStyle,
              ...(precoAuto ? { borderColor: "rgba(212,184,134,0.45)", color: "var(--nuit-champagne)" } : {}),
            }}
          />
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

        <CampoForm label="Data de compra">
          <input type="date" value={f.dataCompra} onChange={set("dataCompra")} style={inputStyle} />
        </CampoForm>

        {validadeCalculada && (
          <div style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "12px 15px", borderRadius: "9px",
            backgroundColor: "rgba(212,184,134,0.07)",
            border: "1px solid rgba(212,184,134,0.18)",
            marginTop: "-6px",
          }}>
            <CalendarCheck size={16} style={{ color: "var(--nuit-champagne)", flexShrink: 0 }} />
            <span style={{
              fontFamily: "var(--font-body)", fontSize: "13.5px", color: "var(--nuit-bone-soft)",
            }}>
              Válido até{" "}
              <strong style={{ color: "var(--nuit-champagne)", fontWeight: 600 }}>{validadeCalculada}</strong>
              {" "}· 6 meses após a compra
            </span>
          </div>
        )}

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

export function VouchersClient({ vouchers, servicos }: { vouchers: Voucher[]; servicos: ServicoCatalogo[] }) {
  const [tipo, setTipo] = useState<"digital" | "fisico">("digital")
  // Arranca em "Por marcar": são os únicos que pedem acção — alguém comprou
  // e ainda não marcou. Os já utilizados ficam a um clique de distância.
  const [estado, setEstado] = useState("ativo")
  const [busca, setBusca] = useState("")
  const [aCriar, setACriar] = useState(false)
  const [aEditar, setAEditar] = useState<Voucher | null>(null)

  const doTipo = useMemo(
    () => vouchers.filter(v => v.tipo === tipo).sort((a, b) => compararCodigo(a.codigo, b.codigo)),
    [vouchers, tipo]
  )

  const visiveis = useMemo(() => doTipo.filter(v => {
    if (busca.trim()) {
      const alvo = `${v.codigo} ${v.compradorNome} ${v.beneficiarioNome ?? ""} ${v.servicoNome}`.toLowerCase()
      if (!alvo.includes(busca.trim().toLowerCase())) return false
    }
    if (estado === "expira") {
      const d = diasAte(v.validade)
      return (v.estado === "ativo" || v.estado === "agendado") && d !== null && d <= DIAS_ALERTA_EXPIRA
    }
    if (estado !== "todos" && v.estado !== estado) return false
    return true
  }), [doTipo, estado, busca])

  // Em "Todos" os cartões vêm agrupados por estado (acção primeiro), para não
  // haver dúvida sobre o que já foi usado e o que ainda está em aberto.
  const grupos = useMemo(() => {
    if (estado !== "todos") return null
    return ESTADOS
      .map(e => ({ ...e, itens: visiveis.filter(v => v.estado === e.value) }))
      .filter(g => g.itens.length > 0)
  }, [estado, visiveis])

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

  // Acção primeiro; "Todos" fica no fim porque é a vista de arquivo.
  const conta = (v: string) => doTipo.filter(x => x.estado === v).length
  const filtros = [
    { v: "ativo",    label: "Por marcar", n: conta("ativo") },
    { v: "expira",   label: "A expirar",  n: contas.aExpirar },
    { v: "agendado", label: "Agendados",  n: conta("agendado") },
    { v: "usado",    label: "Utilizados", n: conta("usado") },
    { v: "todos",    label: "Todos",      n: doTipo.length },
  ]

  return (
    <div style={{ maxWidth: "1240px" }}>
      <style>{`
        @keyframes vfade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes vslide { from { transform: translateX(24px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
        @keyframes vrise { from { transform: translateY(8px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @media (prefers-reduced-motion: reduce) {
          [style*="animation"] { animation: none !important; }
        }
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
          {filtros.map(({ v, label, n }) => {
            const on = estado === v
            const alerta = v === "expira" && n > 0
            return (
              <button
                key={v}
                onClick={() => setEstado(v)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "7px",
                  padding: "9px 15px", borderRadius: "100px",
                  border: `1px solid ${on ? "rgba(212,184,134,0.45)" : alerta ? "rgba(201,117,106,0.35)" : "rgba(212,184,134,0.15)"}`,
                  backgroundColor: on ? "rgba(212,184,134,0.12)" : "transparent",
                  color: on ? "var(--nuit-champagne)" : alerta ? "#c9756a" : "var(--nuit-bone-soft)",
                  fontFamily: "var(--font-sans)", fontSize: "12.5px",
                  fontWeight: on || alerta ? 600 : 500,
                  cursor: "pointer", whiteSpace: "nowrap",
                  opacity: n === 0 && !on ? 0.45 : 1,
                  transition: "all var(--dur-fast) var(--ease-out)",
                }}
              >
                {label}
                <span style={{
                  fontSize: "11px", fontWeight: 600,
                  padding: "1px 6px", borderRadius: "100px",
                  backgroundColor: on ? "rgba(212,184,134,0.20)" : "rgba(212,184,134,0.08)",
                }}>{n}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Grelha de cartões — agrupada por estado em "Todos" */}
      {visiveis.length > 0 ? (
        grupos ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "34px" }}>
            {grupos.map(g => (
              <section key={g.value}>
                <div style={{
                  display: "flex", alignItems: "center", gap: "13px", marginBottom: "14px",
                }}>
                  <span style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: g.cor, flexShrink: 0 }} />
                  <h2 style={{
                    fontFamily: "var(--font-sans, sans-serif)",
                    fontSize: "11px", fontWeight: 700, letterSpacing: "0.2em",
                    textTransform: "uppercase", color: g.cor, whiteSpace: "nowrap",
                  }}>
                    {g.plural}
                  </h2>
                  <span style={{
                    fontFamily: "var(--font-sans)", fontSize: "11.5px",
                    color: "var(--nuit-bone-soft)", opacity: 0.7,
                  }}>
                    {g.itens.length}
                  </span>
                  <span style={{ flex: 1, height: "1px", backgroundColor: `${g.cor}22` }} />
                </div>
                <Grelha itens={g.itens} onEditar={setAEditar} />
              </section>
            ))}
          </div>
        ) : (
          <Grelha itens={visiveis} onEditar={setAEditar} />
        )
      ) : (
        <div style={{
          padding: "70px 24px", textAlign: "center",
          border: "1px dashed rgba(212,184,134,0.18)", borderRadius: "14px",
        }}>
          <p style={{
            fontFamily: "var(--font-heading, Georgia, serif)", fontStyle: "italic",
            fontSize: "17px", color: "var(--nuit-bone-soft)",
          }}>
            {estado === "ativo" && !busca
              ? "Nenhum voucher por marcar — está tudo tratado."
              : "Nenhum voucher com estes filtros."}
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
      {aEditar && <FormEditar v={aEditar} servicos={servicos} onFechar={() => setAEditar(null)} />}
    </div>
  )
}
