"use client"

import { useState, useTransition } from "react"
import { atualizarObservacoesSessao, atualizarCampoSessao, eliminarSessao } from "./actions"
import { InlineEditField } from "@/components/clientes/InlineEditField"

function safeUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  try {
    const { protocol } = new URL(url)
    if (protocol === "https:" || protocol === "http:") return url
  } catch {}
  return undefined
}
import { CalendarDays, CheckCircle2, Clock, XCircle, X, Star, Heart, MessageSquare, FileText, Trash2, AlertTriangle, MapPin, Sparkles } from "lucide-react"
import { formatDate, formatCurrency } from "@/lib/utils"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

type Sessao = {
  id: string
  data: Date | string
  hora: string | null
  duracao: number | null
  servico: string | null
  preco: number | null
  terapeuta: string
  estadoEmocional: string | null
  resumoSessao: string | null
  notasPosSessao: string | null
  linkDocumento: string | null
  estado: string
  aromaSessao: string | null
  dataRecomendadaRegresso: Date | string | null
  criadoEm: Date | string
  // Ficha preenchida pela cliente no onboarding desta sessão
  fichaEstadoEmocional: string | null
  fichaZonasTensao: string | null
  fichaFoco: string | null
  fichaCondicoesAlergias: string | null
  // Ficha clínica gerada por IA (Groq) para a terapeuta, 24h antes da sessão
  briefingJson: unknown
}

function SessaoEstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
    realizada:  { label: "Realizada",  color: "#a0a996", bg: "rgba(160,169,150,0.12)", Icon: CheckCircle2 },
    agendada:   { label: "Agendada",   color: "#b9a07a", bg: "rgba(185,160,122,0.10)", Icon: Clock },
    confirmada: { label: "Confirmada", color: "#8a9bb0", bg: "rgba(138,155,176,0.12)", Icon: CheckCircle2 },
    cancelada:  { label: "Cancelada",  color: "#b06050", bg: "rgba(176,96,80,0.08)",   Icon: XCircle },
    concluida:  { label: "Concluída",  color: "var(--nuit-smoke)", bg: "rgba(157,157,154,0.10)", Icon: CheckCircle2 },
    falta:      { label: "Falta",      color: "#b06050", bg: "rgba(176,96,80,0.08)",   Icon: XCircle },
  }
  const cfg = map[estado] ?? { label: estado, color: "var(--nuit-smoke)", bg: "rgba(157,157,154,0.10)", Icon: Clock }
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "5px",
      padding: "3px 9px", borderRadius: "100px",
      fontSize: "10px", fontWeight: 600,
      fontFamily: "var(--font-sans, sans-serif)",
      color: cfg.color, backgroundColor: cfg.bg,
      border: `1px solid ${cfg.color}30`,
    }}>
      <cfg.Icon size={10} />
      {cfg.label}
    </span>
  )
}

function DetailItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p style={{
        fontFamily: "var(--font-sans, sans-serif)",
        fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em",
        color: "var(--nuit-smoke)", textTransform: "uppercase", marginBottom: "4px",
      }}>
        {label}
      </p>
      <p style={{
        fontFamily: "var(--font-body, sans-serif)",
        fontSize: "13px", color: "var(--nuit-bone)",
      }}>
        {value ?? "—"}
      </p>
    </div>
  )
}

function DetailBlock({ title, icon: Icon, content, color }: {
  title: string
  icon: React.ElementType
  content: string
  color: string
}) {
  return (
    <div style={{
      borderRadius: "10px",
      border: "1px solid rgba(212,184,134,0.16)", padding: "16px",
      marginBottom: "12px",
      backgroundColor: color + "06",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
        <div style={{
          width: "26px", height: "26px", borderRadius: "7px",
          backgroundColor: color + "14",
          border: `1px solid ${color}28`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={13} color={color} />
        </div>
        <span style={{
          fontFamily: "var(--font-sans, sans-serif)",
          fontSize: "11px", fontWeight: 600, color: "var(--nuit-bone)",
          letterSpacing: "0.02em",
        }}>
          {title}
        </span>
      </div>
      <p style={{
        fontFamily: "var(--font-body, sans-serif)",
        fontSize: "13px", color: "var(--nuit-bone-soft)", lineHeight: 1.7,
        whiteSpace: "pre-wrap",
      }}>
        {content}
      </p>
    </div>
  )
}

// Mesmo visual do DetailBlock, mas editável — usado para resumo/notas
function EditableDetailBlock({ title, icon: Icon, value, color, placeholder, onSave }: {
  title: string
  icon: React.ElementType
  value: string | null
  color: string
  placeholder: string
  onSave: (v: string | number | boolean | null) => Promise<{ ok: true } | { ok: false; erro: string }>
}) {
  return (
    <div style={{
      borderRadius: "10px",
      border: "1px solid rgba(212,184,134,0.16)", padding: "16px",
      marginBottom: "12px",
      backgroundColor: color + "06",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
        <div style={{
          width: "26px", height: "26px", borderRadius: "7px",
          backgroundColor: color + "14",
          border: `1px solid ${color}28`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={13} color={color} />
        </div>
        <span style={{
          fontFamily: "var(--font-sans, sans-serif)",
          fontSize: "11px", fontWeight: 600, color: "var(--nuit-bone)",
          letterSpacing: "0.02em",
        }}>
          {title}
        </span>
      </div>
      <InlineEditField
        label={title}
        hideLabel
        type="textarea"
        value={value}
        placeholder={placeholder}
        valueStyle={{ fontSize: "13px", color: "var(--nuit-bone-soft)", lineHeight: 1.7 }}
        onSave={onSave}
      />
    </div>
  )
}

interface MapaCorporalItem {
  zona?: string
  motivo?: string
  abordagem?: string
  prioridade?: string
}

interface BriefingTerapeuta {
  tipo_cliente?: string
  contagem_visitas?: number
  alertas?: string | null
  resumo_cliente?: string | null
  objetivo_sessao?: string | null
  continuidade_sessao_anterior?: string | null
  mapa_corporal?: MapaCorporalItem[]
  recomendacoes?: string[]
  nota_proxima_visita?: string | null
}

function FichaTerapeutaSection({ briefingJson }: { briefingJson: unknown }) {
  if (!briefingJson || typeof briefingJson !== "object") return null
  const b = briefingJson as BriefingTerapeuta

  const temConteudo = Boolean(
    b.resumo_cliente || b.objetivo_sessao || b.continuidade_sessao_anterior || b.alertas
    || b.nota_proxima_visita || b.mapa_corporal?.length || b.recomendacoes?.length
  )
  if (!temConteudo) return null

  const rotulo = { fontFamily: "var(--font-sans, sans-serif)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", color: "var(--nuit-smoke)", textTransform: "uppercase" as const, marginBottom: "10px" }

  return (
    <div style={{
      borderRadius: "10px", border: "1px solid rgba(185,160,122,0.25)",
      padding: "18px", marginBottom: "20px",
      backgroundColor: "rgba(185,160,122,0.04)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        <Sparkles size={13} color="#b9a07a" />
        <p style={{ ...rotulo, marginBottom: 0, color: "#b9a07a" }}>Ficha da terapeuta (gerada por IA)</p>
        {b.tipo_cliente && (
          <span style={{ marginLeft: "auto", fontSize: "10px", fontWeight: 600, color: "var(--nuit-smoke)", fontFamily: "var(--font-sans)" }}>
            {b.tipo_cliente}{b.contagem_visitas ? ` · ${b.contagem_visitas}ª visita` : ""}
          </span>
        )}
      </div>

      {b.alertas && (
        <div style={{
          borderLeft: "2px solid #b06050", backgroundColor: "rgba(176,96,80,0.08)",
          color: "#b06050", padding: "12px 14px", fontSize: "13px", lineHeight: 1.6,
          marginBottom: "16px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px", fontFamily: "var(--font-sans)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            <AlertTriangle size={12} /> Alertas de segurança
          </div>
          {b.alertas}
        </div>
      )}

      {b.resumo_cliente && <div style={{ marginBottom: "14px" }}><DetailItem label="Resumo da cliente" value={b.resumo_cliente} /></div>}
      {b.objetivo_sessao && <div style={{ marginBottom: "14px" }}><DetailItem label="Objetivo da sessão" value={b.objetivo_sessao} /></div>}
      {b.continuidade_sessao_anterior && <div style={{ marginBottom: "14px" }}><DetailItem label="Continuidade com sessão anterior" value={b.continuidade_sessao_anterior} /></div>}

      {Array.isArray(b.mapa_corporal) && b.mapa_corporal.length > 0 && (
        <div style={{ marginBottom: "14px" }}>
          <p style={rotulo}>Mapa corporal de foco</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {b.mapa_corporal.map((z, i) => (
              <div key={i} style={{ backgroundColor: "var(--nuit-deep)", border: "1px solid rgba(212,184,134,0.14)", borderRadius: "8px", padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                  <MapPin size={11} color="#b9a07a" />
                  <span style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "13.5px", color: "var(--nuit-bone)" }}>{z.zona}</span>
                </div>
                {(z.prioridade || z.motivo) && (
                  <div style={{ fontSize: "11px", color: "var(--nuit-smoke)", marginBottom: "4px" }}>
                    {z.prioridade && <strong style={{ color: "#b9a07a" }}>{z.prioridade}</strong>}
                    {z.prioridade && z.motivo ? " · " : ""}
                    {z.motivo}
                  </div>
                )}
                {z.abordagem && <div style={{ fontSize: "12.5px", color: "var(--nuit-bone-soft)" }}>{z.abordagem}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {Array.isArray(b.recomendacoes) && b.recomendacoes.length > 0 && (
        <div style={{ marginBottom: "14px" }}>
          <p style={rotulo}>Recomendações</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {b.recomendacoes.map((r, i) => (
              <div key={i} style={{ display: "flex", gap: "8px", fontSize: "12.5px", color: "var(--nuit-bone-soft)", lineHeight: 1.6 }}>
                <span style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontStyle: "italic", color: "#b9a07a", flexShrink: 0 }}>{i + 1}.</span>
                <span>{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {b.nota_proxima_visita && (
        <div>
          <p style={rotulo}>Nota para próxima visita</p>
          <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "13px", color: "var(--nuit-bone-soft)", fontStyle: "italic", lineHeight: 1.6 }}>
            {b.nota_proxima_visita}
          </p>
        </div>
      )}
    </div>
  )
}

const ESTADOS_SESSAO = [
  { value: "agendada",   label: "Agendada",   cor: "#b9a07a" },
  { value: "confirmada", label: "Confirmada", cor: "#8a9bb0" },
  { value: "realizada",  label: "Realizada",  cor: "#a0a996" },
  { value: "cancelada",  label: "Cancelada",  cor: "#b06050" },
  { value: "falta",      label: "Falta",      cor: "#b06050" },
]

interface Props {
  sessoes: Sessao[]
  clienteId: string
}

export function SessoesTab({ sessoes, clienteId }: Props) {
  const [sessaoAberta, setSessaoAberta] = useState<Sessao | null>(null)
  const [isPending, startTransition] = useTransition()
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)

  function fecharDrawer() {
    setSessaoAberta(null)
    setConfirmarEliminar(false)
  }

  function apagarSessao() {
    if (!sessaoAberta) return
    const id = sessaoAberta.id
    startTransition(async () => {
      await eliminarSessao(id, clienteId)
      setSessaoAberta(null)
      setConfirmarEliminar(false)
    })
  }

  function mudarEstado(novoEstado: string) {
    if (!sessaoAberta || novoEstado === sessaoAberta.estado) return
    const atualizada = { ...sessaoAberta, estado: novoEstado }
    setSessaoAberta(atualizada)
    startTransition(async () => {
      await atualizarObservacoesSessao(sessaoAberta.id, clienteId, { estado: novoEstado as "agendada" | "confirmada" | "realizada" | "cancelada" | "falta" })
    })
  }

  if (sessoes.length === 0) {
    return (
      <div style={{
        backgroundColor: "var(--nuit-overlay)", borderRadius: "10px",
        border: "1px solid rgba(212,184,134,0.16)", overflow: "hidden",
        boxShadow: "0 1px 3px rgba(22,26,38,0.04)",
      }}>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "52px",
        }}>
          <CalendarDays size={32} color="rgba(212,184,134,0.16)" style={{ marginBottom: "12px" }} />
          <p style={{
            fontFamily: "var(--font-heading, Georgia, serif)",
            fontStyle: "italic", fontSize: "14px", color: "var(--nuit-smoke)",
          }}>
            Nenhuma sessão registada
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div style={{
        backgroundColor: "var(--nuit-overlay)", borderRadius: "10px",
        border: "1px solid rgba(212,184,134,0.16)", overflow: "hidden",
        boxShadow: "0 1px 3px rgba(22,26,38,0.04)",
      }}>
        <Table>
          <TableHeader>
            <TableRow style={{ borderColor: "rgba(212,184,134,0.16)", backgroundColor: "rgba(212,184,134,0.06)" }}>
              {["Data", "Hora", "Serviço", "Terapeuta", "Preço", "Estado"].map(h => (
                <TableHead key={h} style={{
                  fontFamily: "var(--font-sans, sans-serif)",
                  fontSize: "9px", fontWeight: 700, letterSpacing: "0.16em",
                  color: "var(--nuit-smoke)", textTransform: "uppercase",
                }}>
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessoes.map((sessao) => (
              <TableRow
                key={sessao.id}
                style={{ borderColor: "rgba(212,184,134,0.1)", cursor: "pointer" }}
                className="hover:bg-[rgba(212,184,134,0.06)]"
                tabIndex={0}
                role="button"
                onClick={() => setSessaoAberta(sessao)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    setSessaoAberta(sessao)
                  }
                }}
              >
                <TableCell style={{ fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: 700, color: "var(--nuit-bone)" }}>
                  {formatDate(sessao.data as Date)}
                </TableCell>
                <TableCell style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--nuit-bone-soft)" }}>
                  {sessao.hora ?? "—"}
                </TableCell>
                <TableCell style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--nuit-bone)" }}>
                  {sessao.servico ?? "—"}
                </TableCell>
                <TableCell style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--nuit-bone-soft)", textTransform: "capitalize" }}>
                  {sessao.terapeuta}
                </TableCell>
                <TableCell style={{ fontFamily: "var(--font-sans)", fontSize: "13px", fontWeight: 600, color: "#b9a07a", textAlign: "right" }}>
                  {formatCurrency(sessao.preco ?? 0)}
                </TableCell>
                <TableCell>
                  <SessaoEstadoBadge estado={sessao.estado} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Drawer de detalhe */}
      {sessaoAberta && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            backgroundColor: "rgba(22,26,38,0.4)",
            display: "flex", alignItems: "stretch", justifyContent: "flex-end",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) fecharDrawer() }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sessao-drawer-titulo"
            tabIndex={-1}
            onKeyDown={(e) => { if (e.key === "Escape") fecharDrawer() }}
            style={{
              backgroundColor: "var(--nuit-deep)",
              width: "100%", maxWidth: "500px",
              height: "100vh", overflowY: "auto",
              boxShadow: "-8px 0 40px rgba(22,26,38,0.12)",
              display: "flex", flexDirection: "column",
            }}
          >
            {/* Cabeçalho do drawer */}
            <div style={{
              padding: "28px 28px 20px",
              backgroundColor: "var(--nuit-overlay)",
              borderBottom: "1px solid rgba(212,184,134,0.16)",
              position: "sticky", top: 0, zIndex: 1,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <select
                      value={sessaoAberta.estado}
                      onChange={(e) => mudarEstado(e.target.value)}
                      disabled={isPending}
                      style={{
                        fontSize: "10px", fontFamily: "var(--font-sans, sans-serif)",
                        fontWeight: 600, letterSpacing: "0.08em",
                        padding: "3px 8px", borderRadius: "6px",
                        backgroundColor: "rgba(212,184,134,0.08)",
                        border: "1px solid rgba(212,184,134,0.22)",
                        color: "var(--nuit-bone)", cursor: "pointer",
                        opacity: isPending ? 0.5 : 1,
                      }}
                    >
                      {ESTADOS_SESSAO.map(e => (
                        <option
                          key={e.value} value={e.value}
                          style={{ backgroundColor: "var(--nuit-deep, #0E1119)", color: "var(--nuit-bone, #ECE6D6)" }}
                        >
                          {e.label}
                        </option>
                      ))}
                    </select>
                    {isPending && (
                      <span style={{ fontSize: "10px", color: "var(--nuit-smoke)", fontFamily: "var(--font-sans)" }}>
                        A guardar…
                      </span>
                    )}
                  </div>
                  <div id="sessao-drawer-titulo" style={{ marginBottom: "4px" }}>
                    <InlineEditField
                      label="Serviço"
                      hideLabel
                      value={sessaoAberta.servico}
                      placeholder="Sessão"
                      valueStyle={{
                        fontFamily: "var(--font-heading, Georgia, serif)",
                        fontSize: "22px", fontWeight: 400, color: "var(--nuit-bone)",
                      }}
                      onSave={(v) => atualizarCampoSessao(sessaoAberta.id, clienteId, "servico", v)}
                    />
                  </div>
                  <p style={{
                    fontFamily: "var(--font-body, sans-serif)",
                    fontSize: "13px", color: "var(--nuit-smoke)",
                  }}>
                    {formatDate(sessaoAberta.data as Date)}
                    {sessaoAberta.hora ? ` · ${sessaoAberta.hora}` : ""}
                    {sessaoAberta.duracao ? ` · ${sessaoAberta.duracao} min` : ""}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                  {!confirmarEliminar ? (
                    <button
                      onClick={() => setConfirmarEliminar(true)}
                      aria-label="Eliminar sessão"
                      title="Eliminar sessão"
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "#b06050", padding: "4px", opacity: 0.7,
                        transition: "opacity 0.15s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                      onMouseLeave={e => (e.currentTarget.style.opacity = "0.7")}
                    >
                      <Trash2 size={16} />
                    </button>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "11px", color: "#b06050", fontFamily: "var(--font-sans)", fontWeight: 600 }}>
                        Eliminar?
                      </span>
                      <button
                        onClick={apagarSessao}
                        disabled={isPending}
                        style={{
                          padding: "4px 10px", fontSize: "10px", fontWeight: 700,
                          fontFamily: "var(--font-sans)", letterSpacing: "0.08em",
                          background: "#b06050", color: "#fff", border: "none",
                          borderRadius: "4px", cursor: "pointer",
                          opacity: isPending ? 0.5 : 1,
                        }}
                      >
                        Sim
                      </button>
                      <button
                        onClick={() => setConfirmarEliminar(false)}
                        style={{
                          padding: "4px 10px", fontSize: "10px", fontWeight: 600,
                          fontFamily: "var(--font-sans)", letterSpacing: "0.08em",
                          background: "transparent", color: "var(--nuit-smoke)",
                          border: "1px solid rgba(212,184,134,0.22)", borderRadius: "4px",
                          cursor: "pointer",
                        }}
                      >
                        Não
                      </button>
                    </div>
                  )}
                  <button
                    onClick={fecharDrawer}
                    aria-label="Fechar detalhe da sessão"
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--nuit-smoke)", padding: "4px",
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Corpo */}
            <div style={{ padding: "24px 28px", flex: 1 }}>

              {/* Grelha de detalhes */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr",
                gap: "16px", marginBottom: "20px",
                backgroundColor: "var(--nuit-overlay)",
                borderRadius: "10px", border: "1px solid rgba(212,184,134,0.16)",
                padding: "18px",
              }}>
                <DetailItem label="Terapeuta" value={sessaoAberta.terapeuta} />
                <InlineEditField
                  label="Preço"
                  type="currency"
                  value={sessaoAberta.preco}
                  onSave={(v) => atualizarCampoSessao(sessaoAberta.id, clienteId, "preco", v)}
                />
                <InlineEditField
                  label="Data"
                  type="date"
                  value={new Date(sessaoAberta.data).toISOString().split("T")[0]}
                  onSave={(v) => atualizarCampoSessao(sessaoAberta.id, clienteId, "data", v)}
                />
                <InlineEditField
                  label="Hora"
                  type="time"
                  value={sessaoAberta.hora}
                  placeholder="Adicionar hora"
                  onSave={(v) => atualizarCampoSessao(sessaoAberta.id, clienteId, "hora", v)}
                />
                <InlineEditField
                  label="Duração (min)"
                  type="number"
                  value={sessaoAberta.duracao}
                  placeholder="Adicionar duração"
                  onSave={(v) => atualizarCampoSessao(sessaoAberta.id, clienteId, "duracao", v)}
                />
                <InlineEditField
                  label="Aroma"
                  value={sessaoAberta.aromaSessao}
                  placeholder="Adicionar aroma"
                  onSave={(v) => atualizarCampoSessao(sessaoAberta.id, clienteId, "aromaSessao", v)}
                />
                <InlineEditField
                  label="Regresso Recomendado"
                  type="date"
                  value={sessaoAberta.dataRecomendadaRegresso ? new Date(sessaoAberta.dataRecomendadaRegresso).toISOString().split("T")[0] : null}
                  placeholder="Adicionar data"
                  onSave={(v) => atualizarCampoSessao(sessaoAberta.id, clienteId, "dataRecomendadaRegresso", v)}
                />
              </div>

              {/* Ficha da terapeuta gerada por IA (Groq), mesma fonte da ficha-sessao.html */}
              <FichaTerapeutaSection briefingJson={sessaoAberta.briefingJson} />

              {/* Ficha da cliente (preenchida no onboarding) */}
              {(sessaoAberta.fichaEstadoEmocional || sessaoAberta.fichaZonasTensao || sessaoAberta.fichaFoco || sessaoAberta.fichaCondicoesAlergias) && (
                <div style={{
                  borderRadius: "10px", border: "1px solid rgba(185,160,122,0.25)",
                  padding: "16px", marginBottom: "20px",
                  backgroundColor: "rgba(185,160,122,0.04)",
                }}>
                  <p style={{
                    fontFamily: "var(--font-sans)", fontSize: "9px", fontWeight: 700,
                    letterSpacing: "0.18em", color: "#b9a07a", textTransform: "uppercase",
                    marginBottom: "14px",
                  }}>
                    Ficha preenchida pela cliente
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {sessaoAberta.fichaEstadoEmocional && <DetailItem label="Estado emocional / mente" value={sessaoAberta.fichaEstadoEmocional} />}
                    {sessaoAberta.fichaZonasTensao && <DetailItem label="Zonas de tensão" value={sessaoAberta.fichaZonasTensao} />}
                    {sessaoAberta.fichaCondicoesAlergias && <DetailItem label="Condições / alergias" value={sessaoAberta.fichaCondicoesAlergias} />}
                    {sessaoAberta.fichaFoco && <DetailItem label="Foco / objetivo da sessão" value={sessaoAberta.fichaFoco} />}
                  </div>
                </div>
              )}

              {/* Estado emocional (Bea) */}
              {sessaoAberta.estadoEmocional && (
                <DetailBlock
                  title="Estado Emocional"
                  icon={Heart}
                  content={sessaoAberta.estadoEmocional}
                  color="#b06050"
                />
              )}

              {/* Observações da terapeuta */}
              <EditableDetailBlock
                title="Observações da Terapeuta"
                icon={MessageSquare}
                value={sessaoAberta.resumoSessao}
                color="#a0a996"
                placeholder="Adicionar observações"
                onSave={(v) => atualizarCampoSessao(sessaoAberta.id, clienteId, "resumoSessao", v)}
              />

              {/* Notas para próxima sessão */}
              <EditableDetailBlock
                title="Notas para a Próxima Sessão"
                icon={Star}
                value={sessaoAberta.notasPosSessao}
                color="#b9a07a"
                placeholder="Adicionar notas"
                onSave={(v) => atualizarCampoSessao(sessaoAberta.id, clienteId, "notasPosSessao", v)}
              />

              {/* Link documento */}
              {safeUrl(sessaoAberta.linkDocumento) && (
                <div style={{ marginTop: "16px" }}>
                  <a
                    href={safeUrl(sessaoAberta.linkDocumento)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "6px",
                      padding: "9px 16px", borderRadius: "8px",
                      backgroundColor: "rgba(185,160,122,0.08)",
                      border: "1px solid rgba(185,160,122,0.25)",
                      fontSize: "12px", fontWeight: 600, color: "#b9a07a",
                      textDecoration: "none",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    <FileText size={13} />
                    Ver documento
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
