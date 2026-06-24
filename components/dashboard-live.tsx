"use client"

import { motion } from "motion/react"
import Link from "next/link"
import { CheckSquare, AlertTriangle } from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface SessaoRow {
  id: string
  hora: string | null
  clienteId: string
  clienteNome: string
  clienteIniciais: string
  servico: string | null
  terapeuta: string
  estado: string
}

interface MensagemRow {
  id: string
  clienteNome: string
  clienteIniciais: string
  canal: string | null
  preview: string
}

interface DiaRow {
  chave: string
  diaSemana: string
  dataCurta: string
  sessoes: SessaoRow[]
}

// ─── Badge de estado ──────────────────────────────────────────────────────────

const ESTADOS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  agendada:  { label: "Agendada",  color: "#b9a07a", bg: "rgba(185,160,122,0.10)", border: "rgba(185,160,122,0.25)" },
  confirmada:{ label: "Confirmada",color: "#a0a996", bg: "rgba(160,169,150,0.12)", border: "rgba(160,169,150,0.28)" },
  cancelada: { label: "Cancelada", color: "#b06050", bg: "rgba(176,96,80,0.08)",   border: "rgba(176,96,80,0.20)"  },
  concluida: { label: "Concluída", color: "#9499a6", bg: "rgba(122,126,138,0.10)", border: "rgba(122,126,138,0.22)"},
}

function BadgeEstado({ estado }: { estado: string }) {
  const cfg = ESTADOS[estado.toLowerCase()] ?? ESTADOS.concluida
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 8px",
      fontSize: "9px", fontWeight: 500, letterSpacing: "0.28em", textTransform: "uppercase",
      fontFamily: "var(--font-sans, sans-serif)",
      color: cfg.color, backgroundColor: cfg.bg, border: `1px solid ${cfg.border}`,
    }}>
      {cfg.label}
    </span>
  )
}

// ─── Card base NUIT ───────────────────────────────────────────────────────────

const cardStyle = {
  backgroundColor: "var(--nuit-overlay)",
  border: "1px solid rgba(212,184,134,0.16)",
  borderRadius: "2px",
  overflow: "hidden",
}

const cardHeaderStyle = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "18px 20px 14px",
  borderBottom: "1px solid rgba(212,184,134,0.10)",
}

// ─── Header animado ───────────────────────────────────────────────────────────

export function DashboardHeader({
  saudacao,
  totalHoje,
}: {
  saudacao: string
  totalHoje: number
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      style={{ marginBottom: "32px" }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <motion.p
            initial={{ opacity: 0, letterSpacing: "0.4em" }}
            animate={{ opacity: 1, letterSpacing: "0.22em" }}
            transition={{ duration: 0.8, delay: 0.1 }}
            style={{
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: "9px", fontWeight: 700,
              color: "var(--nuit-champagne-soft)", textTransform: "uppercase", marginBottom: "8px",
            }}
          >
            Essence Wellness · CRM
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "var(--font-heading, Georgia, serif)",
              fontSize: "28px", fontWeight: 400, color: "var(--nuit-bone)",
              lineHeight: 1.15, fontStyle: "italic",
            }}
          >
            {saudacao}, Bea. Aqui está o teu dia.
          </motion.h1>
        </div>

        {totalHoje > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4, type: "spring", stiffness: 260, damping: 20 }}
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "5px 12px",
              backgroundColor: "rgba(160,169,150,0.08)",
              border: "1px solid rgba(160,169,150,0.20)",
            }}
          >
            <span style={{ position: "relative", display: "flex", width: "8px", height: "8px" }}>
              <span style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                backgroundColor: "#a0a996",
                animation: "ping 1.5s cubic-bezier(0,0,0.2,1) infinite",
                opacity: 0.6,
              }} />
              <span style={{
                position: "relative", width: "8px", height: "8px",
                borderRadius: "50%", backgroundColor: "#a0a996",
                display: "inline-block",
              }} />
            </span>
            <span style={{
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: "12px", fontWeight: 600, color: "#a0a996",
            }}>
              {totalHoje} sessão{totalHoje !== 1 ? "ões" : ""} hoje
            </span>
          </motion.div>
        )}
      </div>

      <motion.div
        initial={{ scaleX: 0, originX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          marginTop: "24px", height: "1px",
          background: "linear-gradient(to right, transparent, rgba(212,184,134,0.35), transparent)",
        }}
      />

      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </motion.header>
  )
}

// ─── Sessões de Hoje animadas ─────────────────────────────────────────────────

export function SessoesHojeCard({ sessoes }: { sessoes: SessaoRow[] }) {
  if (sessoes.length === 0) return null

  return (
    <motion.section
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
      style={{ marginBottom: "28px" }}
    >
      <div style={{ ...cardStyle, borderLeft: "2px solid var(--nuit-champagne-soft)" }}>
        <div style={cardHeaderStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "28px", height: "28px",
              backgroundColor: "rgba(185,160,122,0.08)",
              border: "1px solid rgba(185,160,122,0.20)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b9a07a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <h2 style={{
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.18em",
              color: "var(--nuit-smoke)", textTransform: "uppercase",
            }}>
              Sessões de Hoje
            </h2>
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              minWidth: "18px", height: "18px",
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: "9px", fontWeight: 600,
              backgroundColor: "rgba(185,160,122,0.14)", color: "var(--nuit-champagne)",
            }}>
              {sessoes.length}
            </span>
          </div>
          <span style={{
            fontFamily: "var(--font-sans, sans-serif)",
            fontSize: "12px", color: "var(--nuit-smoke-deep)",
          }}>
            {sessoes.filter(s => s.estado === "confirmada").length} confirmada(s)
          </span>
        </div>

        <div>
          {sessoes.map((sessao, i) => (
            <motion.div
              key={sessao.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.65 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
            >
              <SessaoHojeRow sessao={sessao} isLast={i === sessoes.length - 1} />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  )
}

function SessaoHojeRow({ sessao, isLast }: { sessao: SessaoRow; isLast: boolean }) {
  return (
    <>
      <motion.div
        whileHover={{ backgroundColor: "rgba(212,184,134,0.06)", x: 2 }}
        transition={{ duration: 0.15 }}
        style={{
          display: "flex", alignItems: "center", gap: "16px",
          padding: "14px 20px", cursor: "default",
        }}
      >
        <div style={{ flexShrink: 0, width: "48px", textAlign: "center" }}>
          <span style={{
            fontFamily: "var(--font-heading, Georgia, serif)",
            fontSize: "18px", fontWeight: 400, color: "var(--nuit-champagne)", letterSpacing: "0.01em",
          }}>
            {sessao.hora ? sessao.hora.slice(0, 5) : "—"}
          </span>
        </div>

        <div style={{
          flexShrink: 0, width: "40px", height: "40px", borderRadius: "50%",
          backgroundColor: "rgba(185,160,122,0.10)",
          border: "1.5px solid rgba(185,160,122,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--font-sans, sans-serif)",
          fontSize: "13px", fontWeight: 700, color: "var(--nuit-champagne)",
        }}>
          {sessao.clienteIniciais}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <Link
            href={`/clientes/${sessao.clienteId}`}
            style={{
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: "14px", fontWeight: 600, color: "var(--nuit-bone)",
              textDecoration: "none", display: "block",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
            className="hover:text-[#d4b886] transition-colors"
          >
            {sessao.clienteNome}
          </Link>
          <p style={{
            fontFamily: "var(--font-sans, sans-serif)",
            fontSize: "12px", color: "var(--nuit-smoke)", marginTop: "2px",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {sessao.servico ?? "Sessão"}
          </p>
        </div>

        <span style={{
          flexShrink: 0,
          display: "inline-flex", alignItems: "center",
          padding: "3px 8px",
          fontFamily: "var(--font-sans, sans-serif)",
          fontSize: "9px", fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase",
          backgroundColor: "rgba(160,169,150,0.08)",
          border: "1px solid rgba(160,169,150,0.20)", color: "#a0a996",
        }}>
          {sessao.terapeuta}
        </span>

        <BadgeEstado estado={sessao.estado} />
      </motion.div>

      {!isLast && (
        <div style={{
          height: "1px", marginLeft: "84px", marginRight: "20px",
          background: "linear-gradient(to right, rgba(212,184,134,0.12), rgba(212,184,134,0.06), transparent)",
        }} />
      )}
    </>
  )
}

// ─── Mensagens a enviar ───────────────────────────────────────────────────────

export function MensagensCard({ mensagens }: { mensagens: MensagemRow[] }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
      style={{ marginBottom: "28px" }}
    >
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "28px", height: "28px",
              backgroundColor: "rgba(160,169,150,0.10)",
              border: "1px solid rgba(160,169,150,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a0a996" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
              </svg>
            </div>
            <h2 style={{
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.18em",
              color: "var(--nuit-smoke)", textTransform: "uppercase",
            }}>
              Para Enviar Hoje
            </h2>
            {mensagens.length > 0 && (
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                minWidth: "18px", height: "18px",
                fontFamily: "var(--font-sans, sans-serif)",
                fontSize: "9px", fontWeight: 600,
                backgroundColor: "rgba(160,169,150,0.12)", color: "#a0a996",
              }}>
                {mensagens.length}
              </span>
            )}
          </div>
          {mensagens.length > 0 && (
            <Link
              href="/mensagens"
              style={{
                fontFamily: "var(--font-sans, sans-serif)",
                fontSize: "11px", fontWeight: 600,
                color: "var(--nuit-champagne-soft)", textDecoration: "none",
              }}
            >
              Ver todas →
            </Link>
          )}
        </div>

        {mensagens.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            style={{
              padding: "32px 24px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
            }}
          >
            <p style={{
              fontFamily: "var(--font-heading, Georgia, serif)",
              fontStyle: "italic", fontSize: "14px", color: "var(--nuit-smoke)",
            }}>
              Sem mensagens aprovadas por enviar.
            </p>
          </motion.div>
        ) : (
          <div>
            {mensagens.map((msg, i) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, delay: 0.8 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
              >
                <MensagemRow mensagem={msg} />
                {i < mensagens.length - 1 && (
                  <div style={{
                    height: "1px", marginLeft: "66px", marginRight: "20px",
                    backgroundColor: "rgba(212,184,134,0.08)",
                  }} />
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.section>
  )
}

function MensagemRow({ mensagem }: { mensagem: MensagemRow }) {
  const isWhatsApp = mensagem.canal?.toLowerCase().includes("whatsapp") ?? false
  return (
    <motion.div
      whileHover={{ backgroundColor: "rgba(212,184,134,0.05)" }}
      transition={{ duration: 0.15 }}
      style={{
        display: "flex", alignItems: "center", gap: "12px",
        padding: "10px 20px",
      }}
    >
      <div style={{
        flexShrink: 0, width: "34px", height: "34px", borderRadius: "50%",
        backgroundColor: "rgba(160,169,150,0.10)",
        border: "1px solid rgba(160,169,150,0.22)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-sans, sans-serif)",
        fontSize: "11px", fontWeight: 700, color: "#a0a996",
      }}>
        {mensagem.clienteIniciais}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <p style={{
            fontFamily: "var(--font-sans, sans-serif)",
            fontSize: "13px", fontWeight: 600, color: "var(--nuit-bone)",
          }}>
            {mensagem.clienteNome}
          </p>
          <span style={{
            fontFamily: "var(--font-sans, sans-serif)",
            fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em",
            color: "var(--nuit-champagne)", textTransform: "uppercase",
          }}>
            · Flora
          </span>
        </div>
        <p style={{
          fontFamily: "var(--font-sans, sans-serif)",
          fontSize: "12px", color: "var(--nuit-smoke)", marginTop: "2px",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {mensagem.preview}
        </p>
      </div>

      <span style={{
        flexShrink: 0,
        display: "inline-flex", alignItems: "center", gap: "4px",
        padding: "3px 8px",
        fontFamily: "var(--font-sans, sans-serif)",
        fontSize: "9px", fontWeight: 500, letterSpacing: "0.20em", textTransform: "uppercase",
        backgroundColor: "rgba(185,160,122,0.08)",
        border: "1px solid rgba(185,160,122,0.22)",
        color: "var(--nuit-champagne)",
      }}>
        {isWhatsApp ? "WhatsApp" : mensagem.canal ?? "Email"}
      </span>

      <Link
        href="/mensagens"
        style={{
          flexShrink: 0,
          display: "inline-flex", alignItems: "center",
          padding: "5px 12px",
          fontFamily: "var(--font-sans, sans-serif)",
          fontSize: "9px", fontWeight: 500, letterSpacing: "0.22em", textTransform: "uppercase",
          backgroundColor: "rgba(185,160,122,0.08)",
          border: "1px solid rgba(185,160,122,0.20)",
          color: "var(--nuit-champagne)", textDecoration: "none",
          transition: "background-color 150ms",
        }}
        className="hover:bg-[rgba(185,160,122,0.16)]"
      >
        Ver
      </Link>
    </motion.div>
  )
}

// ─── Próximos 7 dias ──────────────────────────────────────────────────────────

export function ProximosDiasCard({
  dias, totalSessoes, isHero,
}: {
  dias: DiaRow[]
  totalSessoes: number
  isHero: boolean
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.85, ease: [0.22, 1, 0.36, 1] }}
    >
      <div style={{
        ...cardStyle,
        ...(isHero ? { borderLeft: "2px solid var(--nuit-champagne)" } : {}),
      }}>
        <div style={cardHeaderStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "28px", height: "28px",
              backgroundColor: "rgba(185,160,122,0.08)",
              border: "1px solid rgba(185,160,122,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b9a07a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
            </div>
            <h2 style={{
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.18em",
              color: "var(--nuit-smoke)", textTransform: "uppercase",
            }}>
              {isHero ? "Próximas Sessões" : "Próximos 7 Dias"}
            </h2>
            {totalSessoes > 0 && (
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                minWidth: "18px", height: "18px",
                fontFamily: "var(--font-sans, sans-serif)",
                fontSize: "9px", fontWeight: 600,
                backgroundColor: "rgba(185,160,122,0.12)", color: "var(--nuit-champagne)",
              }}>
                {totalSessoes}
              </span>
            )}
          </div>
          {totalSessoes > 0 && (
            <span style={{
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: "12px", color: "var(--nuit-smoke-deep)",
            }}>
              {totalSessoes} sessão{totalSessoes !== 1 ? "ões" : ""} agendada{totalSessoes !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div style={{ padding: "8px 0 12px" }}>
          {dias.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center" }}>
              <p style={{
                fontFamily: "var(--font-heading, Georgia, serif)",
                fontStyle: "italic", fontSize: "14px", color: "var(--nuit-smoke)",
              }}>
                Sem sessões nos próximos 7 dias.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {dias.map((dia, diaIdx) => (
                <motion.div
                  key={dia.chave}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.95 + diaIdx * 0.08, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "12px 12px 6px",
                  }}>
                    <div style={{
                      height: "1px", flex: 1,
                      background: "linear-gradient(to right, transparent, rgba(212,184,134,0.15))",
                    }} />
                    <span style={{
                      fontFamily: "var(--font-sans, sans-serif)",
                      fontSize: "9.5px", fontWeight: 700,
                      letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--nuit-smoke)",
                    }}>
                      {dia.diaSemana}
                    </span>
                    <span style={{
                      fontFamily: "var(--font-sans, sans-serif)",
                      fontSize: "10px", color: "var(--nuit-smoke-deep)",
                    }}>
                      {dia.dataCurta}
                    </span>
                    <span style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      minWidth: "16px", height: "16px",
                      fontSize: "9px", fontWeight: 600,
                      backgroundColor: "rgba(212,184,134,0.10)", color: "var(--nuit-smoke)",
                      fontFamily: "var(--font-sans, sans-serif)",
                    }}>
                      {dia.sessoes.length}
                    </span>
                    <div style={{
                      height: "1px", flex: 1,
                      background: "linear-gradient(to left, transparent, rgba(212,184,134,0.15))",
                    }} />
                  </div>

                  <div>
                    {dia.sessoes.map((s) => (
                      <motion.div
                        key={s.id}
                        whileHover={{ backgroundColor: "rgba(212,184,134,0.06)", x: 2 }}
                        transition={{ duration: 0.15 }}
                        style={{
                          display: "flex", alignItems: "center", gap: "12px",
                          padding: "7px 12px",
                        }}
                      >
                        <span style={{
                          width: "44px", flexShrink: 0,
                          fontFamily: "var(--font-sans, sans-serif)",
                          fontSize: "11px", fontWeight: 600,
                          color: "var(--nuit-champagne)", letterSpacing: "0.03em",
                        }}>
                          {s.hora ?? "—"}
                        </span>
                        <span style={{
                          flex: 1, minWidth: 0,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          fontFamily: "var(--font-sans, sans-serif)",
                          fontSize: "13px", color: "var(--nuit-bone)",
                        }}>
                          {s.clienteNome}
                        </span>
                        <span style={{
                          flexShrink: 0,
                          fontFamily: "var(--font-sans, sans-serif)",
                          fontSize: "11px", color: "var(--nuit-smoke)",
                        }}>
                          {s.terapeuta}
                        </span>
                        <BadgeEstado estado={s.estado} />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.section>
  )
}

// ─── Widget de Tarefas ────────────────────────────────────────────────────────

export interface TarefaRow {
  id: string
  titulo: string
  cliente: { nome: string } | null
}

export function TarefasWidget({
  tarefasHoje,
  tarefasVencidas,
}: {
  tarefasHoje: TarefaRow[]
  tarefasVencidas: TarefaRow[]
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
      style={{
        backgroundColor: "var(--nuit-overlay)",
        border: "1px solid rgba(212,184,134,0.16)",
        borderRadius: "2px",
        padding: "20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <h3 style={{
          display: "flex", alignItems: "center", gap: "8px",
          fontFamily: "var(--font-sans, sans-serif)",
          fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.18em",
          color: "var(--nuit-smoke)", textTransform: "uppercase",
        }}>
          <CheckSquare size={13} style={{ color: "var(--nuit-champagne-soft)" }} />
          As minhas tarefas
        </h3>
        <Link href="/tarefas" style={{
          fontFamily: "var(--font-sans, sans-serif)",
          fontSize: "11px", fontWeight: 500,
          color: "var(--nuit-champagne-soft)", textDecoration: "none",
        }}>
          Ver todas →
        </Link>
      </div>

      {tarefasVencidas.length > 0 && (
        <div style={{ marginBottom: "12px" }}>
          <p style={{
            fontFamily: "var(--font-sans, sans-serif)",
            fontSize: "9px", fontWeight: 600,
            color: "#b06050", textTransform: "uppercase", letterSpacing: "0.20em", marginBottom: "8px",
          }}>
            Vencidas ({tarefasVencidas.length})
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {tarefasVencidas.map((t) => (
              <motion.div key={t.id} whileHover={{ x: 3 }} transition={{ duration: 0.15 }}>
                <Link href="/tarefas" style={{ display: "flex", alignItems: "flex-start", gap: "8px", textDecoration: "none" }}>
                  <span style={{ fontSize: "10px", marginTop: "2px", color: "#b06050", flexShrink: 0 }}>●</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontFamily: "var(--font-sans, sans-serif)",
                      fontSize: "13px", color: "var(--nuit-bone-soft)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{t.titulo}</p>
                    {t.cliente && (
                      <p style={{
                        fontFamily: "var(--font-sans, sans-serif)",
                        fontSize: "11px", color: "var(--nuit-smoke)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{t.cliente.nome}</p>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {tarefasHoje.length > 0 && (
        <div>
          <p style={{
            fontFamily: "var(--font-sans, sans-serif)",
            fontSize: "9px", fontWeight: 600,
            color: "#b9a07a", textTransform: "uppercase", letterSpacing: "0.20em", marginBottom: "8px",
          }}>
            Hoje ({tarefasHoje.length})
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {tarefasHoje.map((t) => (
              <motion.div key={t.id} whileHover={{ x: 3 }} transition={{ duration: 0.15 }}>
                <Link href="/tarefas" style={{ display: "flex", alignItems: "flex-start", gap: "8px", textDecoration: "none" }}>
                  <span style={{ fontSize: "10px", marginTop: "2px", color: "var(--nuit-champagne-soft)", flexShrink: 0 }}>●</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontFamily: "var(--font-sans, sans-serif)",
                      fontSize: "13px", color: "var(--nuit-bone-soft)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{t.titulo}</p>
                    {t.cliente && (
                      <p style={{
                        fontFamily: "var(--font-sans, sans-serif)",
                        fontSize: "11px", color: "var(--nuit-smoke)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{t.cliente.nome}</p>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {tarefasHoje.length === 0 && tarefasVencidas.length === 0 && (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "32px 0",
        }}>
          <CheckSquare size={28} style={{ color: "var(--nuit-smoke-deep)", marginBottom: "8px" }} />
          <p style={{
            fontFamily: "var(--font-heading, serif)", fontStyle: "italic",
            fontSize: "14px", color: "var(--nuit-smoke)",
          }}>Nenhuma tarefa para hoje</p>
          <Link href="/tarefas" style={{
            fontFamily: "var(--font-sans, sans-serif)",
            fontSize: "11px", color: "var(--nuit-champagne-soft)",
            marginTop: "6px", textDecoration: "none",
          }}>
            Ver todas as tarefas
          </Link>
        </div>
      )}
    </motion.div>
  )
}

// ─── Widget de Alertas ────────────────────────────────────────────────────────

export interface AlertaRow {
  id: string
  avaliacaoNota: number | null
  cliente: { nome: string }
}

export interface InativaRow {
  id: string
  nome: string
}

export function AlertasWidget({
  clientesEmRisco,
  alertas,
  inativas,
}: {
  clientesEmRisco: number
  alertas: AlertaRow[]
  inativas: InativaRow[]
}) {
  const semAlertas = clientesEmRisco === 0 && alertas.length === 0 && inativas.length === 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.75, ease: [0.22, 1, 0.36, 1] }}
      style={{
        backgroundColor: "var(--nuit-overlay)",
        border: "1px solid rgba(212,184,134,0.16)",
        borderRadius: "2px",
        padding: "20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        <AlertTriangle size={13} style={{ color: "#b06050" }} />
        <h3 style={{
          fontFamily: "var(--font-sans, sans-serif)",
          fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.18em",
          color: "var(--nuit-smoke)", textTransform: "uppercase",
        }}>Alertas</h3>
      </div>

      {clientesEmRisco > 0 && (
        <motion.div whileHover={{ x: 2 }} transition={{ duration: 0.15 }}>
          <Link href="/clientes?estado=vip_em_risco" style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 0",
            borderBottom: "1px solid rgba(212,184,134,0.08)",
            textDecoration: "none",
          }}>
            <div>
              <p style={{
                fontFamily: "var(--font-sans, sans-serif)",
                fontSize: "13px", fontWeight: 500, color: "var(--nuit-bone-soft)",
              }}>Clientes em risco</p>
              <p style={{
                fontFamily: "var(--font-sans, sans-serif)",
                fontSize: "11px", color: "var(--nuit-smoke)",
              }}>VIP em risco + reativação</p>
            </div>
            <span style={{
              fontFamily: "var(--font-heading, serif)",
              fontSize: "20px", fontWeight: 400, color: "#b06050",
            }}>{clientesEmRisco}</span>
          </Link>
        </motion.div>
      )}

      {alertas.length > 0 && (
        <div style={{ padding: "10px 0", borderBottom: "1px solid rgba(212,184,134,0.08)" }}>
          <p style={{
            fontFamily: "var(--font-sans, sans-serif)",
            fontSize: "11px", fontWeight: 600, color: "#b06050",
            marginBottom: "6px",
          }}>Avaliações baixas</p>
          {alertas.slice(0, 3).map((s) => (
            <p key={s.id} style={{
              display: "flex", justifyContent: "space-between",
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: "12px", color: "var(--nuit-smoke)",
              padding: "2px 0",
            }}>
              <span>{s.cliente.nome}</span>
              <span style={{ color: "#b06050" }}>{"★".repeat(s.avaliacaoNota ?? 0)} ({s.avaliacaoNota}/5)</span>
            </p>
          ))}
        </div>
      )}

      {inativas.length > 0 && (
        <div style={{ padding: "10px 0" }}>
          <p style={{
            fontFamily: "var(--font-sans, sans-serif)",
            fontSize: "11px", fontWeight: 600, color: "var(--nuit-bone-soft)",
            marginBottom: "6px",
          }}>Inativas +90 dias</p>
          {inativas.slice(0, 3).map((c) => (
            <motion.div key={c.id} whileHover={{ x: 2 }} transition={{ duration: 0.15 }}>
              <Link href={`/clientes/${c.id}`} style={{
                display: "flex", justifyContent: "space-between",
                padding: "3px 0", textDecoration: "none",
                fontFamily: "var(--font-sans, sans-serif)",
                fontSize: "12px", color: "var(--nuit-smoke)",
              }}>
                <span>{c.nome}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {semAlertas && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 0" }}>
          <p style={{
            fontFamily: "var(--font-heading, serif)", fontStyle: "italic",
            fontSize: "14px", color: "var(--nuit-smoke)",
          }}>Nenhum alerta activo</p>
        </div>
      )}
    </motion.div>
  )
}

// ─── Widget de Clientes a Reativar ────────────────────────────────────────────

export interface ClienteReativarRow {
  id: string
  nome: string
  diasInativa: number | null
}

export function ClientesReativarWidget({ clientes }: { clientes: ClienteReativarRow[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.85, ease: [0.22, 1, 0.36, 1] }}
      style={{
        backgroundColor: "var(--nuit-overlay)",
        border: "1px solid rgba(212,184,134,0.16)",
        borderRadius: "2px",
        padding: "20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <h3 style={{
          fontFamily: "var(--font-sans, sans-serif)",
          fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.18em",
          color: "var(--nuit-smoke)", textTransform: "uppercase",
        }}>Clientes a reativar</h3>
        <Link href="/clientes?estado=reativacao" style={{
          fontFamily: "var(--font-sans, sans-serif)",
          fontSize: "11px", fontWeight: 500,
          color: "var(--nuit-champagne-soft)", textDecoration: "none",
        }}>Ver todas →</Link>
      </div>

      {clientes.length === 0 ? (
        <p style={{
          fontFamily: "var(--font-heading, serif)", fontStyle: "italic",
          fontSize: "14px", color: "var(--nuit-smoke)",
          textAlign: "center", padding: "24px 0",
        }}>Nenhuma cliente inativa</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {clientes.map((c) => (
            <motion.div key={c.id} whileHover={{ x: 2 }} transition={{ duration: 0.15 }}>
              <Link href={`/clientes/${c.id}`} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "9px 0",
                borderBottom: "1px solid rgba(212,184,134,0.08)",
                textDecoration: "none",
              }}>
                <p style={{
                  fontFamily: "var(--font-sans, sans-serif)",
                  fontSize: "13px", color: "var(--nuit-bone-soft)",
                }}>{c.nome}</p>
                {c.diasInativa !== null && (
                  <span style={{
                    fontFamily: "var(--font-sans, sans-serif)",
                    fontSize: "11px", fontWeight: 600, color: "#b9a07a",
                  }}>{c.diasInativa}d</span>
                )}
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
