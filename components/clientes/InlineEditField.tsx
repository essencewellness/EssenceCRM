"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { Pencil } from "lucide-react"
import { useToast } from "@/components/ui/toast-nuit"
import { formatDate, formatPhone, formatCurrency } from "@/lib/utils"
import { useEdicaoPerfilOpcional } from "./EdicaoPerfilContext"

type TipoCampo = "text" | "email" | "tel" | "date" | "time" | "number" | "currency" | "select" | "toggle" | "textarea"

interface Opcao {
  value: string
  label: string
}

type Valor = string | number | boolean | null

interface Props {
  label: string
  value: Valor
  type?: TipoCampo
  options?: Opcao[]
  placeholder?: string
  readOnly?: boolean
  hideLabel?: boolean
  valueStyle?: React.CSSProperties
  onSave: (novoValor: Valor) => Promise<{ ok: true } | { ok: false; erro: string }>
}

// Formatação de exibição derivada do `type` — nunca uma função passada por
// prop (um Server Component não consegue passar closures a um Client
// Component; só dados/strings atravessam essa fronteira).
function formatarExibicao(v: Valor, type: TipoCampo, options?: Opcao[]): string {
  if (v === null || v === undefined || v === "") return ""
  if (type === "tel") return formatPhone(String(v))
  if (type === "date") return formatDate(String(v))
  if (type === "currency") return formatCurrency(Number(v))
  if (type === "select") return options?.find(o => o.value === v)?.label ?? String(v)
  return String(v)
}

const rotuloStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans, sans-serif)",
  fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em",
  color: "var(--nuit-smoke)", textTransform: "uppercase",
}

const inputBaseStyle: React.CSSProperties = {
  fontFamily: "var(--font-body, sans-serif)", fontSize: "13px",
  color: "var(--nuit-bone)", backgroundColor: "var(--nuit-deep, #0E1119)",
  border: "1px solid #b9a07a", borderRadius: "5px",
  padding: "5px 8px", outline: "none", width: "100%",
}

// Edição inline — duas formas de controlar quando fica editável:
// 1. Dentro de <EdicaoPerfilProvider> (perfil do cliente): um único botão
//    "Editar" liga o modo de edição para TODOS os campos ao mesmo tempo.
//    Fora desse modo, mostra só texto simples — sem lápis, sem clique.
// 2. Sem provider (ex: drawer de sessões): mantém o comportamento antigo,
//    clicar em cada campo individualmente abre-o para edição.
export function InlineEditField({
  label, value, type = "text", options, placeholder, readOnly, hideLabel, valueStyle, onSave,
}: Props) {
  const ctxEdicaoPerfil = useEdicaoPerfilOpcional()
  const controlado = ctxEdicaoPerfil !== null
  const [editandoInterno, setEditandoInterno] = useState(false)
  const editando = controlado ? ctxEdicaoPerfil.editing : editandoInterno

  const [valorLocal, setValorLocal] = useState<Valor>(value)
  const [rascunho, setRascunho] = useState(value == null ? "" : String(value))
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement & HTMLSelectElement>(null)
  const { toast } = useToast()

  // Ao entrar em edição, repor o rascunho a partir do valor atual — ajustado
  // durante o render (comparando com o render anterior via estado, nunca
  // via ref: refs não podem ser lidas/escritas durante o render), não num
  // efeito, já que não há nenhum sistema externo a sincronizar aqui.
  const [editandoAnterior, setEditandoAnterior] = useState(editando)
  if (editando !== editandoAnterior) {
    setEditandoAnterior(editando)
    if (editando) setRascunho(valorLocal == null ? "" : String(valorLocal))
  }

  // Focar o input só faz sentido no modo antigo (um único campo abre de cada
  // vez); no modo controlado vários campos abrem ao mesmo tempo — focar
  // qualquer um deles seria arbitrário.
  useEffect(() => {
    if (editando && !controlado) inputRef.current?.focus()
  }, [editando, controlado])

  // Modo controlado: ao ligar o modo de edição para todos os campos de uma
  // vez (botão "Editar" do perfil), sem isto o foco fica onde estava — a
  // terapeuta tinha de dar Tab por todo o conteúdo até ao primeiro campo
  // editável. O primeiro InlineEditField a montar/renderizar em modo
  // editável reclama o foco inicial (via consumirFocoInicial, que só
  // devolve `true` uma vez por sessão de edição).
  useEffect(() => {
    if (editando && controlado && ctxEdicaoPerfil?.consumirFocoInicial()) {
      inputRef.current?.focus()
    }
  }, [editando, controlado, ctxEdicaoPerfil])

  function abrir() {
    if (readOnly || isPending || controlado) return
    setRascunho(valorLocal == null ? "" : String(valorLocal))
    setEditandoInterno(true)
  }

  function cancelar() {
    setRascunho(valorLocal == null ? "" : String(valorLocal))
    if (!controlado) setEditandoInterno(false)
  }

  function converterRascunho(): Valor {
    if (rascunho.trim() === "") return null
    if (type === "number" || type === "currency") {
      const n = Number(rascunho)
      return Number.isNaN(n) ? null : n
    }
    return rascunho
  }

  function persistir(novoValor: Valor) {
    const anterior = valorLocal
    if (novoValor === anterior) return
    setValorLocal(novoValor)
    startTransition(async () => {
      const res = await onSave(novoValor)
      if (!res.ok) {
        setValorLocal(anterior)
        setRascunho(anterior == null ? "" : String(anterior))
        toast(res.erro, "error")
      }
    })
  }

  function gravar() {
    if (!controlado) setEditandoInterno(false)
    persistir(converterRascunho())
  }

  function gravarToggle() {
    if (readOnly || isPending || (controlado && !editando)) return
    persistir(!valorLocal)
  }

  const textoExibido = formatarExibicao(valorLocal, type, options)

  if (type === "toggle") {
    if (controlado && !editando) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
          {!hideLabel && <span style={rotuloStyle}>{label}</span>}
          <span style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "13px", color: "var(--nuit-bone-soft)", ...valueStyle }}>
            {valorLocal ? "Sim" : "Não"}
          </span>
        </div>
      )
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
        {!hideLabel && <span style={rotuloStyle}>{label}</span>}
        <button
          type="button"
          onClick={gravarToggle}
          disabled={readOnly || isPending}
          style={{
            display: "inline-flex", alignItems: "center", gap: "7px",
            background: "none", border: "none", padding: 0,
            cursor: readOnly ? "default" : "pointer",
            fontFamily: "var(--font-body, sans-serif)", fontSize: "13px",
            color: valorLocal ? "var(--nuit-bone)" : "var(--nuit-smoke)",
            opacity: isPending ? 0.6 : 1,
          }}
        >
          <span style={{
            width: "28px", height: "16px", borderRadius: "100px",
            backgroundColor: valorLocal ? "rgba(160,169,150,0.35)" : "rgba(157,157,154,0.15)",
            border: `1px solid ${valorLocal ? "#a0a996" : "rgba(212,184,134,0.22)"}`,
            position: "relative", transition: "background-color 0.15s", flexShrink: 0,
          }}>
            <span style={{
              position: "absolute", top: "1px", left: valorLocal ? "13px" : "1px",
              width: "12px", height: "12px", borderRadius: "50%",
              backgroundColor: valorLocal ? "#a0a996" : "var(--nuit-smoke)",
              transition: "left 0.15s",
            }} />
          </span>
          {valorLocal ? "Sim" : "Não"}
        </button>
      </div>
    )
  }

  if (editando && type === "select") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
        {!hideLabel && <span style={rotuloStyle}>{label}</span>}
        <select
          ref={inputRef}
          value={rascunho}
          onChange={(e) => { setRascunho(e.target.value); if (controlado) persistir(e.target.value) }}
          onBlur={() => { if (!controlado) gravar() }}
          onKeyDown={(e) => { if (e.key === "Escape") cancelar() }}
          style={{ ...inputBaseStyle, ...valueStyle, cursor: "pointer" }}
        >
          {options?.map(o => (
            <option key={o.value} value={o.value} style={{ backgroundColor: "var(--nuit-deep, #0E1119)", color: "var(--nuit-bone, #ECE6D6)" }}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    )
  }

  if (editando && type === "textarea") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
        {!hideLabel && <span style={rotuloStyle}>{label}</span>}
        <textarea
          ref={inputRef}
          value={rascunho}
          placeholder={placeholder}
          onChange={(e) => setRascunho(e.target.value)}
          onBlur={gravar}
          onKeyDown={(e) => {
            if (e.key === "Escape") cancelar()
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); gravar() }
          }}
          rows={3}
          style={{ ...inputBaseStyle, ...valueStyle, resize: "vertical", lineHeight: 1.6 }}
        />
      </div>
    )
  }

  if (editando) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
        {!hideLabel && <span style={rotuloStyle}>{label}</span>}
        <input
          ref={inputRef}
          type={type === "currency" ? "number" : type}
          step={type === "currency" ? "0.01" : undefined}
          value={rascunho}
          placeholder={placeholder}
          onChange={(e) => setRascunho(e.target.value)}
          onBlur={gravar}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); gravar() }
            if (e.key === "Escape") cancelar()
          }}
          style={{ ...inputBaseStyle, ...valueStyle }}
        />
      </div>
    )
  }

  // Fechado, modo controlado (perfil do cliente): texto simples, sem
  // lápis nem clique — só o botão global "Editar" abre a edição.
  if (controlado) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
        {!hideLabel && <span style={rotuloStyle}>{label}</span>}
        <span style={{
          fontFamily: "var(--font-body, sans-serif)", fontSize: "13px",
          color: textoExibido ? "var(--nuit-bone)" : "var(--nuit-smoke-deep)",
          fontStyle: textoExibido ? "normal" : "italic",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          ...valueStyle,
        }}>
          {textoExibido || "—"}
        </span>
      </div>
    )
  }

  // Fechado, modo antigo (sem provider): clicar abre a edição deste campo.
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
      {!hideLabel && <span style={rotuloStyle}>{label}</span>}
      <button
        type="button"
        onClick={abrir}
        disabled={readOnly}
        aria-label={hideLabel ? label : undefined}
        style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          background: "none", border: "none", padding: "2px 5px", margin: "-2px -5px",
          borderRadius: "4px", cursor: readOnly ? "default" : "pointer",
          textAlign: "left", width: "fit-content", maxWidth: "100%",
          fontFamily: "var(--font-body, sans-serif)", fontSize: "13px",
          color: textoExibido ? "var(--nuit-bone)" : "var(--nuit-smoke-deep)",
          fontStyle: textoExibido ? "normal" : "italic",
          transition: "background-color 0.15s",
          opacity: isPending ? 0.6 : 1,
          ...valueStyle,
        }}
        onMouseEnter={e => { if (!readOnly) e.currentTarget.style.backgroundColor = "rgba(212,184,134,0.06)" }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent" }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {textoExibido || placeholder || "Adicionar"}
        </span>
        {!readOnly && <Pencil size={valueStyle?.fontSize ? 12 : 10} style={{ opacity: 0.35, flexShrink: 0 }} />}
      </button>
    </div>
  )
}
