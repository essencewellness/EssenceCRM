import Link from "next/link"
import { notFound } from "next/navigation"
import { getContextoUtilizador, listarTerapeutas } from "@/lib/contexto-utilizador"
import {
  ArrowLeft, Phone, Mail, CalendarDays, Wallet,
  MessageSquare,
} from "lucide-react"
import { prisma } from "@/lib/prisma"
import { formatDate, formatCurrency, getInitials } from "@/lib/utils"
import { ClientePerfilTabs } from "@/components/clientes/ClientePerfilTabs"
import { ClienteTimeline } from "@/components/clientes/ClienteTimeline"
import { construirEventosTimeline } from "@/lib/timeline"
import { TarefasLista } from "@/components/tarefas/TarefasLista"
import { DeleteClienteButton } from "./DeleteClienteButton"
import { SessoesTab } from "./SessoesTab"
import { ObservacoesTimeline } from "@/components/observacoes-timeline"
import { EstadoEditor } from "./EstadoEditor"
import { TagsSection } from "./TagsSection"
import { TerapeutaEditor } from "./TerapeutaEditor"
import { InlineEditField } from "@/components/clientes/InlineEditField"
import { EdicaoPerfilProvider } from "@/components/clientes/EdicaoPerfilContext"
import { EdicaoPerfilToggle } from "@/components/clientes/EdicaoPerfilToggle"
import { atualizarCampoCliente } from "../actions"

interface ClientePageProps {
  params: Promise<{ id: string }>
}

// ── helpers ──────────────────────────────────────────────────────────────────

function MensagemEstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    pendente: { label: "Pendente", color: "#b9a07a", bg: "rgba(185,160,122,0.10)" },
    aprovada: { label: "Aprovada", color: "#a0a996", bg: "rgba(160,169,150,0.12)" },
    enviada: { label: "Enviada", color: "var(--nuit-bone)", bg: "rgba(22,26,38,0.06)" },
    rejeitada: { label: "Rejeitada", color: "#b06050", bg: "rgba(176,96,80,0.08)" },
  }
  const cfg = map[estado] ?? { label: estado, color: "var(--nuit-smoke)", bg: "rgba(157,157,154,0.10)" }
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 9px", borderRadius: "100px",
      fontSize: "10px", fontWeight: 600,
      fontFamily: "var(--font-sans, sans-serif)",
      color: cfg.color, backgroundColor: cfg.bg,
      border: `1px solid ${cfg.color}30`,
    }}>
      {cfg.label}
    </span>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
      <span style={{
        fontFamily: "var(--font-sans, sans-serif)",
        fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em",
        color: "var(--nuit-smoke)", textTransform: "uppercase",
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: "var(--font-body, sans-serif)",
        fontSize: "13px", color: "var(--nuit-bone)",
      }}>
        {value || "—"}
      </span>
    </div>
  )
}

// ── page ─────────────────────────────────────────────────────────────────────

export default async function ClientePage({ params }: ClientePageProps) {
  const { id } = await params
  const ctx = await getContextoUtilizador()

  const [cliente, todasEtiquetas, tarefasCliente, terapeutas] = await Promise.all([
    prisma.cliente.findUnique({
      where: { id },
      include: {
        etiquetas: { include: { etiqueta: true } },
        sessoes: { orderBy: { data: "desc" } },
        mensagens: { orderBy: { geradaEm: "desc" } },
        observacoes: { orderBy: { criadoEm: "desc" } },
        precos: { include: { servico: { select: { nome: true, precoBase: true } } }, orderBy: { criadoEm: "desc" } },
        packs: { include: { servico: { select: { nome: true } } }, orderBy: { criadoEm: "desc" } },
      },
    }),
    prisma.etiqueta.findMany({
      where: { tipo: { not: "automatica" } },
      orderBy: [{ tipo: "asc" }, { nome: "asc" }],
    }),
    prisma.tarefa.findMany({
      where: { clienteId: id },
      include: { atribuida: { select: { id: true, name: true } } },
      orderBy: { criadoEm: "desc" },
      take: 50,
    }),
    listarTerapeutas(),
  ])

  if (!cliente) notFound()

  const eventosTimeline = await construirEventosTimeline(cliente.id, 50)

  // Verificar scope para role terapeuta: só vê os SEUS clientes
  if (!ctx.isAdmin && cliente.terapeutaPrincipalId !== ctx.userId) {
    notFound()
  }

  const canalLabel: Record<string, string> = {
    whatsapp: "WhatsApp", email: "Email", telefone: "Telefone", instagram: "Instagram",
  }

  const fonteLabel: Record<string, string> = {
    calendly: "Calendly", instagram: "Instagram", recomendacao: "Recomendação",
    google: "Google", passagem: "Passagem", outro: "Outro",
  }

  function diasRelativos(data: Date | null): string {
    if (!data) return "—"
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const d = new Date(data)
    d.setHours(0, 0, 0, 0)
    const diff = Math.round((d.getTime() - hoje.getTime()) / 86400000)
    if (diff === 0) return "hoje"
    if (diff > 0) return `em ${diff} dia${diff === 1 ? "" : "s"}`
    return `há ${Math.abs(diff)} dia${Math.abs(diff) === 1 ? "" : "s"}`
  }

  const totalSessoesDisplay = cliente.sessoes.length
  const agora = new Date()
  const proximaSessao = [...cliente.sessoes]
    .filter(s => s.estado === "agendada" && new Date(s.data) >= agora)
    .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())[0] ?? null

  const statCards = [
    { label: "Total de Sessões", value: totalSessoesDisplay.toString(), Icon: CalendarDays, color: "#b9a07a" },
    { label: "Total Gasto", value: formatCurrency(Number(cliente.totalGasto)), Icon: Wallet, color: "#a0a996" },
    {
      label: proximaSessao ? "Próxima Sessão" : "Última Sessão",
      value: proximaSessao ? diasRelativos(proximaSessao.data) : diasRelativos(cliente.ultimaSessao),
      Icon: CalendarDays, color: "#b9a07a",
    },
    { label: "Canal Preferido", value: canalLabel[cliente.canalPreferido] ?? cliente.canalPreferido, Icon: MessageSquare, color: "#a0a996" },
  ]

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto" }}>

      {/* Back — slide da esquerda */}
      <div className="anim-fade-left" style={{ marginBottom: "20px" }}>
        <Link href="/clientes" style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          fontFamily: "var(--font-sans, sans-serif)",
          fontSize: "12px", color: "var(--nuit-smoke)", textDecoration: "none",
          transition: "color 150ms",
        }}
          className="hover:text-[#b9a07a]"
        >
          <ArrowLeft size={14} />
          Clientes
        </Link>
      </div>

      <EdicaoPerfilProvider>
      {/* Profile header — scale in */}
      <div className="anim-scale-in" style={{
        backgroundColor: "var(--nuit-overlay)", borderRadius: "12px",
        border: "1px solid rgba(212,184,134,0.16)", padding: "28px",
        marginBottom: "20px",
        boxShadow: "0 1px 3px rgba(22,26,38,0.05)",
        animationDelay: "0.1s",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "20px" }}>
          {/* Avatar */}
          <div style={{
            width: "72px", height: "72px", borderRadius: "50%", flexShrink: 0,
            backgroundColor: "rgba(185,160,122,0.10)",
            border: "2px solid rgba(185,160,122,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-heading, Georgia, serif)",
            fontSize: "24px", fontWeight: 400, color: "#b9a07a",
          }}>
            {getInitials(cliente.nome)}
          </div>

          {/* Name + meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px", flexWrap: "wrap" }}>
              <InlineEditField
                label="Nome"
                hideLabel
                value={cliente.nome}
                valueStyle={{
                  fontFamily: "var(--font-heading, Georgia, serif)",
                  fontSize: "26px", fontWeight: 400, color: "var(--nuit-bone)",
                }}
                onSave={atualizarCampoCliente.bind(null, cliente.id, "nome")}
              />
              <EstadoEditor clienteId={cliente.id} estadoAtual={cliente.estado} />
              <TerapeutaEditor
                clienteId={cliente.id}
                terapeutaAtualId={cliente.terapeutaPrincipalId}
                terapeutas={terapeutas.map((t) => ({ id: t.id, name: t.name }))}
                podeEditar={ctx.isAdmin}
              />
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
                <EdicaoPerfilToggle />
                <DeleteClienteButton
                  clienteId={cliente.id}
                  primeiroNome={cliente.nome.split(" ")[0]}
                  sessoesCount={cliente.sessoes.length}
                />
              </div>
            </div>

            {/* Etiquetas — geridas de forma interactiva */}
            <TagsSection
              clienteId={cliente.id}
              etiquetasCliente={cliente.etiquetas.map(e => ({
                id:                 e.etiqueta.id,
                nome:               e.etiqueta.nome,
                cor:                e.etiqueta.cor,
                tipo:               e.etiqueta.tipo,
                bloqueiaAutomacoes: e.etiqueta.bloqueiaAutomacoes,
              }))}
              todasEtiquetas={todasEtiquetas.map(e => ({
                id:                 e.id,
                nome:               e.nome,
                cor:                e.cor,
                tipo:               e.tipo,
                bloqueiaAutomacoes: e.bloqueiaAutomacoes,
              }))}
              ultimaSessao={cliente.ultimaSessao?.toISOString() ?? null}
            />

            {/* Contact */}
            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Phone size={13} color="var(--nuit-smoke)" />
                <InlineEditField
                  label="Telefone"
                  hideLabel
                  type="tel"
                  value={cliente.telefone}
                  placeholder="+351 911 150 025"
                  valueStyle={{ fontSize: "13px", color: "var(--nuit-bone-soft)" }}
                  onSave={atualizarCampoCliente.bind(null, cliente.id, "telefone")}
                />
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Mail size={13} color="var(--nuit-smoke)" />
                <InlineEditField
                  label="Email"
                  hideLabel
                  type="email"
                  value={cliente.email}
                  placeholder="Adicionar email"
                  valueStyle={{ fontSize: "13px", color: "var(--nuit-bone-soft)" }}
                  onSave={atualizarCampoCliente.bind(null, cliente.id, "email")}
                />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs — fade down */}
      <div className="anim-fade-down" style={{ animationDelay: "0.22s" }}>
      <ClientePerfilTabs
        tabs={[
          {
            value: "resumo",
            label: "Resumo",
            content: (
              <>
                {/* Stat cards — stagger scale in */}
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(4,1fr)",
                  gap: "12px", marginBottom: "16px",
                }}>
                  {statCards.map(({ label, value, Icon, color }, idx) => (
                    <div key={label} className="anim-scale-in card-hover" style={{
                      backgroundColor: "var(--nuit-overlay)", borderRadius: "10px",
                      border: "1px solid rgba(212,184,134,0.16)", padding: "16px",
                      boxShadow: "0 1px 3px rgba(22,26,38,0.04)",
                      animationDelay: `${0.28 + idx * 0.07}s`,
                    }}>
                      <div style={{
                        width: "32px", height: "32px", borderRadius: "8px",
                        backgroundColor: color + "14",
                        border: `1px solid ${color}28`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        marginBottom: "10px",
                      }}>
                        <Icon size={15} color={color} />
                      </div>
                      <p style={{
                        fontFamily: "var(--font-sans, sans-serif)",
                        fontSize: "9px", fontWeight: 700, letterSpacing: "0.16em",
                        color: "var(--nuit-smoke)", textTransform: "uppercase", marginBottom: "4px",
                      }}>
                        {label}
                      </p>
                      <p style={{
                        fontFamily: "var(--font-heading, Georgia, serif)",
                        fontSize: "18px", fontWeight: 400, color: "var(--nuit-bone)",
                      }}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Detail grid */}
                <div style={{
                  backgroundColor: "var(--nuit-overlay)", borderRadius: "10px",
                  border: "1px solid rgba(212,184,134,0.16)", padding: "24px",
                  boxShadow: "0 1px 3px rgba(22,26,38,0.04)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px" }}>
                    <div style={{
                      height: "1px", flex: 0, width: "16px",
                      backgroundColor: "rgba(185,160,122,0.4)",
                    }} />
                    <h2 style={{
                      fontFamily: "var(--font-sans, sans-serif)",
                      fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.18em",
                      color: "var(--nuit-smoke)", textTransform: "uppercase",
                    }}>
                      Informações Gerais
                    </h2>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "20px" }}>
                    <InlineEditField
                      label="Data de Nascimento"
                      type="date"
                      value={cliente.dataNascimento ? cliente.dataNascimento.toISOString().split("T")[0] : null}
                      onSave={atualizarCampoCliente.bind(null, cliente.id, "dataNascimento")}
                    />
                    <InlineEditField
                      label="Email"
                      type="email"
                      value={cliente.email}
                      onSave={atualizarCampoCliente.bind(null, cliente.id, "email")}
                    />
                    <InlineEditField
                      label="Telefone"
                      type="tel"
                      value={cliente.telefone}
                      placeholder="+351 911 150 025"
                      onSave={atualizarCampoCliente.bind(null, cliente.id, "telefone")}
                    />
                    <InlineEditField
                      label="Aceita Marketing"
                      type="toggle"
                      value={cliente.aceitaMarketing}
                      onSave={atualizarCampoCliente.bind(null, cliente.id, "aceitaMarketing")}
                    />
                    <InlineEditField
                      label="Tem WhatsApp"
                      type="toggle"
                      value={cliente.temWhatsapp}
                      onSave={atualizarCampoCliente.bind(null, cliente.id, "temWhatsapp")}
                    />
                    <InlineEditField
                      label="Melhor dia para contacto"
                      value={cliente.melhorDiaContacto}
                      onSave={atualizarCampoCliente.bind(null, cliente.id, "melhorDiaContacto")}
                    />
                    <InlineEditField
                      label="Como nos conheceu"
                      value={cliente.comoNosConheceu}
                      onSave={atualizarCampoCliente.bind(null, cliente.id, "comoNosConheceu")}
                    />
                    <InlineEditField
                      label="Fonte"
                      type="select"
                      value={cliente.fonte}
                      options={Object.entries(fonteLabel).map(([value, label]) => ({ value, label }))}
                      onSave={atualizarCampoCliente.bind(null, cliente.id, "fonte")}
                    />
                    <InfoRow label="Cliente desde" value={formatDate(cliente.criadoEm)} />
                  </div>
                </div>

                {/* Ficha Clínica — resumo acumulativo gerado por IA (N8N + Groq) */}
                <div style={{
                  backgroundColor: "var(--nuit-overlay)", borderRadius: "10px",
                  border: "1px solid rgba(212,184,134,0.16)", padding: "24px", marginTop: "12px",
                  boxShadow: "0 1px 3px rgba(22,26,38,0.04)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px" }}>
                    <div style={{ height: "1px", flex: 0, width: "16px", backgroundColor: "rgba(185,160,122,0.4)" }} />
                    <h2 style={{
                      fontFamily: "var(--font-sans, sans-serif)",
                      fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.18em",
                      color: "var(--nuit-smoke)", textTransform: "uppercase",
                    }}>
                      Ficha Clínica
                    </h2>
                    {cliente.consentimentoSaudeEm && (
                      <span style={{ marginLeft: "auto", fontFamily: "var(--font-body)", fontSize: "11px", color: "var(--nuit-smoke-deep)" }}>
                        Atualizada {formatDate(cliente.consentimentoSaudeEm)}
                      </span>
                    )}
                  </div>
                  {cliente.fichaClinica ? (
                    <p style={{
                      fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--nuit-bone-soft)",
                      lineHeight: 1.8, whiteSpace: "pre-wrap",
                    }}>
                      {cliente.fichaClinica}
                    </p>
                  ) : (
                    <p style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontStyle: "italic", fontSize: "13px", color: "var(--nuit-smoke-deep)" }}>
                      A ficha clínica é gerada automaticamente após a cliente preencher o formulário de onboarding.
                    </p>
                  )}
                </div>

                {/* Última/Próxima sessão */}
                {cliente.sessoes.length > 0 && (() => {
                  const s = proximaSessao ?? cliente.sessoes.find(s => s.estado === "realizada") ?? cliente.sessoes[0]
                  const isProxima = s.estado === "agendada" && new Date(s.data) >= agora
                  return (
                    <div style={{
                      backgroundColor: "var(--nuit-overlay)", borderRadius: "10px",
                      border: "1px solid rgba(212,184,134,0.16)", padding: "24px", marginTop: "12px",
                      boxShadow: "0 1px 3px rgba(22,26,38,0.04)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px" }}>
                        <div style={{ height: "1px", flex: 0, width: "16px", backgroundColor: "rgba(185,160,122,0.4)" }} />
                        <h2 style={{
                          fontFamily: "var(--font-sans, sans-serif)",
                          fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.18em",
                          color: "var(--nuit-smoke)", textTransform: "uppercase",
                        }}>
                          {isProxima ? "Próxima Sessão" : "Última Sessão"}
                        </h2>
                        <div style={{ marginLeft: "auto" }}>
                          {(() => {
                            const map: Record<string, { label: string; color: string; bg: string }> = {
                              realizada: { label: "Realizada", color: "#a0a996", bg: "rgba(160,169,150,0.12)" },
                              agendada:  { label: "Agendada",  color: "#b9a07a", bg: "rgba(185,160,122,0.10)" },
                              cancelada: { label: "Cancelada", color: "#b06050", bg: "rgba(176,96,80,0.08)" },
                              concluida: { label: "Concluída", color: "var(--nuit-smoke)", bg: "rgba(157,157,154,0.10)" },
                              falta:     { label: "Falta",     color: "#b06050", bg: "rgba(176,96,80,0.08)" },
                            }
                            const cfg = map[s.estado] ?? { label: s.estado, color: "var(--nuit-smoke)", bg: "rgba(157,157,154,0.10)" }
                            return (
                              <span style={{
                                padding: "3px 10px", borderRadius: "100px",
                                fontSize: "10px", fontWeight: 600,
                                fontFamily: "var(--font-sans, sans-serif)",
                                color: cfg.color, backgroundColor: cfg.bg,
                                border: `1px solid ${cfg.color}30`,
                              }}>
                                {cfg.label}
                              </span>
                            )
                          })()}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "baseline", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
                        <span style={{
                          fontFamily: "var(--font-heading, Georgia, serif)",
                          fontSize: "18px", fontWeight: 400, color: "var(--nuit-bone)",
                        }}>
                          {s.servico ?? "Sessão"}
                        </span>
                        <span style={{
                          fontFamily: "var(--font-body, sans-serif)",
                          fontSize: "13px", color: "var(--nuit-smoke)",
                        }}>
                          {formatDate(s.data)}
                          {s.hora ? ` · ${s.hora}` : ""}
                          {s.duracao ? ` · ${s.duracao} min` : ""}
                        </span>
                        {s.preco !== null && (
                          <span style={{
                            fontFamily: "var(--font-sans, sans-serif)",
                            fontSize: "13px", fontWeight: 600, color: "#b9a07a",
                            marginLeft: "auto",
                          }}>
                            {formatCurrency(Number(s.preco))}
                          </span>
                        )}
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "12px" }}>
                        {s.estadoEmocional && (
                          <div style={{ padding: "12px 14px", borderRadius: "8px", backgroundColor: "rgba(176,96,80,0.05)", border: "1px solid rgba(176,96,80,0.15)" }}>
                            <p style={{ fontFamily: "var(--font-sans)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.16em", color: "#b06050", textTransform: "uppercase", marginBottom: "4px" }}>Estado Emocional</p>
                            <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--nuit-bone)", lineHeight: 1.5 }}>{s.estadoEmocional}</p>
                          </div>
                        )}
                        {s.resumoSessao && (
                          <div style={{ padding: "12px 14px", borderRadius: "8px", backgroundColor: "rgba(160,169,150,0.05)", border: "1px solid rgba(160,169,150,0.2)", gridColumn: "1/-1" }}>
                            <p style={{ fontFamily: "var(--font-sans)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.16em", color: "#a0a996", textTransform: "uppercase", marginBottom: "4px" }}>Observações</p>
                            <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--nuit-bone-soft)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{s.resumoSessao}</p>
                          </div>
                        )}
                        {s.notasPosSessao && (
                          <div style={{ padding: "12px 14px", borderRadius: "8px", backgroundColor: "rgba(185,160,122,0.04)", border: "1px solid rgba(185,160,122,0.15)", gridColumn: "1/-1" }}>
                            <p style={{ fontFamily: "var(--font-sans)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.16em", color: "#b9a07a", textTransform: "uppercase", marginBottom: "4px" }}>Notas para a Próxima Sessão</p>
                            <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--nuit-bone-soft)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{s.notasPosSessao}</p>
                          </div>
                        )}
                        {!s.estadoEmocional && !s.resumoSessao && !s.notasPosSessao && (
                          <p style={{
                            fontFamily: "var(--font-heading, Georgia, serif)",
                            fontStyle: "italic", fontSize: "13px", color: "var(--nuit-smoke-deep)",
                            gridColumn: "1/-1",
                          }}>
                            Sessão ainda não realizada — notas clínicas disponíveis após a sessão
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </>
            ),
          },
          {
            value: "sessoes",
            label: "Sessões",
            badge: cliente.sessoes.length,
            content: (
              <SessoesTab clienteId={cliente.id} sessoes={cliente.sessoes.map((s) => ({ ...s, preco: s.preco === null ? null : Number(s.preco) }))} />
            ),
          },
          {
            value: "timeline",
            label: "Timeline",
            content: (
              <div style={{
                backgroundColor: "var(--nuit-overlay)", borderRadius: "12px",
                border: "1px solid rgba(212,184,134,0.16)", padding: "24px",
                boxShadow: "0 1px 3px rgba(22,26,38,0.05)",
              }}>
                <ClienteTimeline eventos={eventosTimeline} />
              </div>
            ),
          },
          {
            value: "mensagens",
            label: "Mensagens",
            badge: cliente.mensagens.length,
            content: cliente.mensagens.length === 0 ? (
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", padding: "52px",
                backgroundColor: "var(--nuit-overlay)", borderRadius: "10px",
                border: "1px solid rgba(212,184,134,0.16)",
              }}>
                <MessageSquare size={32} color="rgba(212,184,134,0.16)" style={{ marginBottom: "12px" }} />
                <p style={{
                  fontFamily: "var(--font-heading, Georgia, serif)",
                  fontStyle: "italic", fontSize: "14px", color: "var(--nuit-smoke)",
                }}>
                  Nenhuma mensagem gerada para este cliente
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {cliente.mensagens.map((msg) => (
                  <div key={msg.id} className="card-hover" style={{
                    backgroundColor: "var(--nuit-overlay)", borderRadius: "10px",
                    border: "1px solid rgba(212,184,134,0.16)", padding: "18px",
                    boxShadow: "0 1px 3px rgba(22,26,38,0.04)",
                  }}>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                      <MensagemEstadoBadge estado={msg.estado} />
                      <span style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "var(--nuit-smoke)", textTransform: "capitalize" }}>
                        {msg.canal}
                      </span>
                      {msg.motivoGeracao && (
                        <span style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "var(--nuit-smoke)" }}>
                          Motivo: <span style={{ color: "var(--nuit-bone-soft)" }}>{msg.motivoGeracao}</span>
                        </span>
                      )}
                      <span style={{ marginLeft: "auto", fontFamily: "var(--font-body)", fontSize: "11px", color: "var(--nuit-smoke-deep)" }}>
                        {formatDate(msg.geradaEm)}
                      </span>
                    </div>

                    <div style={{
                      padding: "14px", borderRadius: "8px",
                      backgroundColor: "rgba(237,231,227,0.5)",
                      border: "1px solid rgba(212,184,134,0.16)",
                      marginBottom: "8px",
                    }}>
                      <p style={{
                        fontFamily: "var(--font-sans)", fontSize: "9px", fontWeight: 700,
                        letterSpacing: "0.16em", color: "var(--nuit-smoke)", textTransform: "uppercase",
                        marginBottom: "8px",
                      }}>
                        Mensagem gerada
                      </p>
                      <p style={{
                        fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--nuit-bone-soft)",
                        lineHeight: 1.7, whiteSpace: "pre-wrap",
                      }}>
                        {msg.mensagemGerada}
                      </p>
                    </div>

                    {msg.mensagemFinal && msg.mensagemFinal !== msg.mensagemGerada && (
                      <div style={{
                        padding: "14px", borderRadius: "8px",
                        backgroundColor: "rgba(160,169,150,0.06)",
                        border: "1px solid rgba(160,169,150,0.3)",
                      }}>
                        <p style={{
                          fontFamily: "var(--font-sans)", fontSize: "9px", fontWeight: 700,
                          letterSpacing: "0.16em", color: "#a0a996", textTransform: "uppercase",
                          marginBottom: "8px",
                        }}>
                          Mensagem final (editada)
                        </p>
                        <p style={{
                          fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--nuit-bone-soft)",
                          lineHeight: 1.7, whiteSpace: "pre-wrap",
                        }}>
                          {msg.mensagemFinal}
                        </p>
                      </div>
                    )}

                    <div style={{
                      display: "flex", flexWrap: "wrap", gap: "16px",
                      marginTop: "12px",
                      fontFamily: "var(--font-body)", fontSize: "11px", color: "var(--nuit-smoke-deep)",
                    }}>
                      {msg.aprovadaEm && <span>Aprovada em {formatDate(msg.aprovadaEm)}</span>}
                      {msg.enviadaEm && <span>Enviada em {formatDate(msg.enviadaEm)}</span>}
                      {msg.converteu !== null && msg.converteu !== undefined && (
                        <span style={{ color: msg.converteu ? "#a0a996" : "#b06050" }}>
                          {msg.converteu ? "Converteu" : "Não converteu"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ),
          },
          {
            value: "tarefas",
            label: "Tarefas",
            badge: tarefasCliente.length,
            content: (
              <div style={{
                backgroundColor: "var(--nuit-overlay)", borderRadius: "12px",
                border: "1px solid rgba(212,184,134,0.16)", padding: "24px",
                boxShadow: "0 1px 3px rgba(22,26,38,0.05)",
              }}>
                <TarefasLista
                  tarefas={tarefasCliente.map(t => ({
                    id: t.id,
                    titulo: t.titulo,
                    descricao: t.descricao,
                    dataLimite: t.dataLimite?.toISOString() ?? null,
                    estado: t.estado,
                    prioridade: t.prioridade,
                    tipo: t.tipo,
                    atribuida: t.atribuida ? { id: t.atribuida.id, name: t.atribuida.name } : null,
                  }))}
                  clienteId={cliente.id}
                />
              </div>
            ),
          },
          {
            value: "packs",
            label: "Packs & Preços",
            content: (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={{ backgroundColor: "var(--nuit-overlay)", borderRadius: "10px", border: "1px solid rgba(212,184,134,0.16)", padding: "24px", boxShadow: "0 1px 3px rgba(22,26,38,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                    <div style={{ height: "1px", flex: 0, width: "16px", backgroundColor: "rgba(185,160,122,0.4)" }} />
                    <h2 style={{ fontFamily: "var(--font-sans)", fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.18em", color: "var(--nuit-smoke)", textTransform: "uppercase" }}>
                      Packs de Sessões
                    </h2>
                  </div>
                  {cliente.packs.length === 0 ? (
                    <p style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontStyle: "italic", fontSize: "13px", color: "var(--nuit-smoke-deep)" }}>
                      Sem packs activos para este cliente.
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {cliente.packs.map(p => {
                        const restantes = p.totalSessoes - p.sessoesUsadas
                        const pct = Math.round((p.sessoesUsadas / p.totalSessoes) * 100)
                        return (
                          <div key={p.id} style={{ padding: "14px 16px", borderRadius: "8px", border: "1px solid rgba(212,184,134,0.16)", opacity: p.ativo ? 1 : 0.5 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                              <span style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "15px", color: "var(--nuit-bone)", flex: 1 }}>{p.servico.nome}</span>
                              <span style={{
                                fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "100px",
                                background: p.ativo ? "rgba(74,124,89,0.12)" : "rgba(160,100,80,0.1)",
                                color: p.ativo ? "#4a7c59" : "#a06450",
                              }}>{p.ativo ? "Ativo" : "Terminado"}</span>
                              <span style={{ fontFamily: "var(--font-sans)", fontSize: "13px", fontWeight: 600, color: "#b9a07a" }}>€{Number(p.valorTotal).toFixed(2)}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div style={{ flex: 1, height: "6px", borderRadius: "3px", background: "rgba(212,184,134,0.1)", overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${pct}%`, background: p.ativo ? "#a0a996" : "#b9a07a", borderRadius: "3px", transition: "width 0.3s" }} />
                              </div>
                              <span style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--nuit-bone-soft)", whiteSpace: "nowrap" }}>
                                {p.sessoesUsadas}/{p.totalSessoes} sessões · {restantes} restantes
                              </span>
                            </div>
                            {p.descricao && <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--nuit-smoke)", marginTop: "6px" }}>{p.descricao}</p>}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div style={{ backgroundColor: "var(--nuit-overlay)", borderRadius: "10px", border: "1px solid rgba(212,184,134,0.16)", padding: "24px", boxShadow: "0 1px 3px rgba(22,26,38,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                    <div style={{ height: "1px", flex: 0, width: "16px", backgroundColor: "rgba(185,160,122,0.4)" }} />
                    <h2 style={{ fontFamily: "var(--font-sans)", fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.18em", color: "var(--nuit-smoke)", textTransform: "uppercase" }}>
                      Preços Personalizados
                    </h2>
                  </div>
                  {cliente.precos.length === 0 ? (
                    <p style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontStyle: "italic", fontSize: "13px", color: "var(--nuit-smoke-deep)" }}>
                      Sem preços personalizados — usa os preços base dos serviços.
                    </p>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid rgba(212,184,134,0.16)" }}>
                          {["Serviço", "Preço Base", "Preço Personalizado", "Motivo", "Validade"].map(h => (
                            <th key={h} style={{ textAlign: "left", padding: "6px 10px", fontSize: "10px", color: "var(--nuit-smoke)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {cliente.precos.map(p => (
                          <tr key={p.id} style={{ borderBottom: "1px solid rgba(212,184,134,0.1)" }}>
                            <td style={{ padding: "9px 10px", fontSize: "13px", color: "var(--nuit-bone)" }}>{p.servico.nome}</td>
                            <td style={{ padding: "9px 10px", fontSize: "12px", color: "var(--nuit-smoke)" }}>€{Number(p.servico.precoBase).toFixed(2)}</td>
                            <td style={{ padding: "9px 10px", fontSize: "13px", fontWeight: 600, color: "#b9a07a" }}>€{Number(p.valor).toFixed(2)}</td>
                            <td style={{ padding: "9px 10px", fontSize: "12px", color: "var(--nuit-bone-soft)" }}>{p.motivo ?? "—"}</td>
                            <td style={{ padding: "9px 10px", fontSize: "12px", color: "var(--nuit-smoke)" }}>{p.validade ? formatDate(p.validade) : "Sem limite"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ),
          },
          {
            value: "notas",
            label: "Notas",
            content: (
              <ObservacoesTimeline
                clienteId={cliente.id}
                inicial={cliente.observacoes.map(o => ({
                  id: o.id,
                  texto: o.texto,
                  autor: o.autor,
                  criadoEm: o.criadoEm.toISOString(),
                }))}
              />
            ),
          },
        ]}
      />
      </div>
      </EdicaoPerfilProvider>
    </div>
  )
}
