"use client"

import { useState } from "react"

function safeUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  try {
    const { protocol } = new URL(url)
    if (protocol === "https:" || protocol === "http:") return url
  } catch {}
  return undefined
}
import { CalendarDays, CheckCircle2, Clock, XCircle, X, Star, Heart, MessageSquare, FileText } from "lucide-react"
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
  dataRecomendadaRegresso: Date | string | null
  criadoEm: Date | string
}

function SessaoEstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
    realizada: { label: "Realizada", color: "#a0a996", bg: "rgba(160,169,150,0.12)", Icon: CheckCircle2 },
    agendada:  { label: "Agendada",  color: "#b9a07a", bg: "rgba(185,160,122,0.10)", Icon: Clock },
    cancelada: { label: "Cancelada", color: "#b06050", bg: "rgba(176,96,80,0.08)",   Icon: XCircle },
    concluida: { label: "Concluída", color: "var(--nuit-smoke)", bg: "rgba(157,157,154,0.10)", Icon: CheckCircle2 },
    falta:     { label: "Falta",     color: "#b06050", bg: "rgba(176,96,80,0.08)",   Icon: XCircle },
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

interface Props {
  sessoes: Sessao[]
}

export function SessoesTab({ sessoes }: Props) {
  const [sessaoAberta, setSessaoAberta] = useState<Sessao | null>(null)

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
                  {formatCurrency(sessao.preco)}
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
          onClick={(e) => { if (e.target === e.currentTarget) setSessaoAberta(null) }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sessao-drawer-titulo"
            tabIndex={-1}
            onKeyDown={(e) => { if (e.key === "Escape") setSessaoAberta(null) }}
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
                  <div style={{ marginBottom: "8px" }}>
                    <SessaoEstadoBadge estado={sessaoAberta.estado} />
                  </div>
                  <h2 id="sessao-drawer-titulo" style={{
                    fontFamily: "var(--font-heading, Georgia, serif)",
                    fontSize: "22px", fontWeight: 400, color: "var(--nuit-bone)",
                    marginBottom: "4px",
                  }}>
                    {sessaoAberta.servico ?? "Sessão"}
                  </h2>
                  <p style={{
                    fontFamily: "var(--font-body, sans-serif)",
                    fontSize: "13px", color: "var(--nuit-smoke)",
                  }}>
                    {formatDate(sessaoAberta.data as Date)}
                    {sessaoAberta.hora ? ` · ${sessaoAberta.hora}` : ""}
                    {sessaoAberta.duracao ? ` · ${sessaoAberta.duracao} min` : ""}
                  </p>
                </div>
                <button
                  onClick={() => setSessaoAberta(null)}
                  aria-label="Fechar detalhe da sessão"
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--nuit-smoke)", padding: "4px", flexShrink: 0,
                  }}
                >
                  <X size={18} />
                </button>
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
                <DetailItem label="Preço" value={formatCurrency(sessaoAberta.preco)} />
                {sessaoAberta.dataRecomendadaRegresso && (
                  <DetailItem
                    label="Regresso Recomendado"
                    value={formatDate(sessaoAberta.dataRecomendadaRegresso as Date)}
                  />
                )}
              </div>

              {/* Estado emocional */}
              {sessaoAberta.estadoEmocional && (
                <DetailBlock
                  title="Estado Emocional"
                  icon={Heart}
                  content={sessaoAberta.estadoEmocional}
                  color="#b06050"
                />
              )}

              {/* Observações da terapeuta */}
              {sessaoAberta.resumoSessao && (
                <DetailBlock
                  title="Observações da Terapeuta"
                  icon={MessageSquare}
                  content={sessaoAberta.resumoSessao}
                  color="#a0a996"
                />
              )}

              {/* Notas para próxima sessão */}
              {sessaoAberta.notasPosSessao && (
                <DetailBlock
                  title="Notas para a Próxima Sessão"
                  icon={Star}
                  content={sessaoAberta.notasPosSessao}
                  color="#b9a07a"
                />
              )}

              {/* Sem notas */}
              {!sessaoAberta.estadoEmocional && !sessaoAberta.resumoSessao && !sessaoAberta.notasPosSessao && (
                <div style={{
                  textAlign: "center", padding: "32px",
                  backgroundColor: "var(--nuit-overlay)", borderRadius: "10px",
                  border: "1px solid rgba(212,184,134,0.16)",
                }}>
                  <p style={{
                    fontFamily: "var(--font-heading, Georgia, serif)",
                    fontStyle: "italic", fontSize: "13px", color: "var(--nuit-smoke-deep)",
                  }}>
                    Sem notas clínicas registadas para esta sessão
                  </p>
                </div>
              )}

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
