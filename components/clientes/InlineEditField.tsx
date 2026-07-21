"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { Pencil } from "lucide-react"
import { useToast } from "@/components/ui/toast-nuit"

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
  formatDisplay?: (value: Valor) => string
  onSave: (novoValor: Valor) => Promise<{ ok: true } | { ok: false; erro: string }>
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

// Edição inline campo-a-campo — clicar para editar, Enter/blur grava, Esc cancela.
// Uma única primitiva para todo o CRM em vez de um editor dedicado por campo
// (mesmo padrão otimista/rollback do EstadoEditor, generalizado).
export function InlineEditField({
  label, value, type = "text", options, placeholder, readOnly, hideLabel, valueStyle, formatDisplay, onSave,
}: Props) {
  const [editando, setEditando] = useState(false)
  const [valorLocal, setValorLocal] = useState<Valor>(value)
  const [rascunho, setRascunho] = useState(value == null ? "" : String(value))
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement & HTMLSelectElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (editando) inputRef.current?.focus()
  }, [editando])

  function abrir() {
    if (readOnly || isPending) return
    setRascunho(valorLocal == null ? "" : String(valorLocal))
    setEditando(true)
  }

  function cancelar() {
    setRascunho(valorLocal == null ? "" : String(valorLocal))
    setEditando(false)
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
    setEditando(false)
    persistir(converterRascunho())
  }

  function gravarToggle() {
    if (readOnly || isPending) return
    persistir(!valorLocal)
  }

  const textoExibido = formatDisplay
    ? formatDisplay(valorLocal)
    : (valorLocal === null || valorLocal === undefined || valorLocal === "" ? "" : String(valorLocal))

  if (type === "toggle") {
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
          onChange={(e) => setRascunho(e.target.value)}
          onBlur={gravar}
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
