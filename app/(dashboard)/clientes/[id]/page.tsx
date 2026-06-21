import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft, Phone, Mail, CalendarDays, Wallet,
  MessageSquare,
} from "lucide-react"
import { prisma } from "@/lib/prisma"
import { formatDate, formatCurrency, formatPhone, getInitials } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DeleteClienteButton } from "./DeleteClienteButton"
import { SessoesTab } from "./SessoesTab"
import { ObservacoesTimeline } from "@/components/observacoes-timeline"
import { AnimatedSection } from "@/components/stagger"
import { EstadoEditor } from "./EstadoEditor"
import { TagsSection } from "./TagsSection"

interface ClientePageProps {
  params: Promise<{ id: string }>
}

// ── helpers ──────────────────────────────────────────────────────────────────

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, { label: string; color: string; bg: string; border: string }> = {
    lead:            { label: "Lead",         color: "#b9a07a", bg: "rgba(185,160,122,0.10)", border: "rgba(185,160,122,0.28)" },
    novo:            { label: "Nova",         color: "#a0a996", bg: "rgba(160,169,150,0.12)", border: "rgba(160,169,150,0.28)" },
    ativa_recente:   { label: "Ativa",        color: "#a0a996", bg: "rgba(160,169,150,0.12)", border: "rgba(160,169,150,0.28)" },
    ativa_frequente: { label: "Frequente",    color: "#7a9e7e", bg: "rgba(122,158,126,0.10)", border: "rgba(122,158,126,0.28)" },
    vip_embaixadora: { label: "VIP ✦",        color: "#b9a07a", bg: "rgba(185,160,122,0.13)", border: "rgba(185,160,122,0.35)" },
    vip_em_risco:    { label: "Em Risco",     color: "#d4956b", bg: "rgba(212,149,107,0.10)", border: "rgba(212,149,107,0.28)" },
    reativacao:      { label: "Reativação",   color: "#b06050", bg: "rgba(176,96,80,0.08)",  border: "rgba(176,96,80,0.22)" },
    perdida:         { label: "Perdida",      color: "#9d9d9a", bg: "rgba(157,157,154,0.10)", border: "rgba(157,157,154,0.22)" },
    blacklist:       { label: "Blacklist",    color: "#b06050", bg: "rgba(176,96,80,0.12)",  border: "rgba(176,96,80,0.30)" },
  }
  const cfg = map[estado] ?? { label: estado, color: "#9d9d9a", bg: "rgba(157,157,154,0.10)", border: "rgba(157,157,154,0.22)" }
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "4px 12px", borderRadius: "100px",
      fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em",
      fontFamily: "var(--font-sans, sans-serif)",
      color: cfg.color, backgroundColor: cfg.bg, border: `1px solid ${cfg.border}`,
    }}>
      {cfg.label}
    </span>
  )
}

function MensagemEstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    pendente: { label: "Pendente", color: "#b9a07a", bg: "rgba(185,160,122,0.10)" },
    aprovada: { label: "Aprovada", color: "#a0a996", bg: "rgba(160,169,150,0.12)" },
    enviada: { label: "Enviada", color: "#161a26", bg: "rgba(22,26,38,0.06)" },
    rejeitada: { label: "Rejeitada", color: "#b06050", bg: "rgba(176,96,80,0.08)" },
  }
  const cfg = map[estado] ?? { label: estado, color: "#9d9d9a", bg: "rgba(157,157,154,0.10)" }
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
        color: "#9d9d9a", textTransform: "uppercase",
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: "var(--font-body, sans-serif)",
        fontSize: "13px", color: "#161a26",
      }}>
        {value || "—"}
      </span>
    </div>
  )
}

// ── page ─────────────────────────────────────────────────────────────────────

export default async function ClientePage({ params }: ClientePageProps) {
  const { id } = await params

  const [cliente, todasEtiquetas] = await Promise.all([
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
  ])

  if (!cliente) notFound()

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

  const statCards = [
    { label: "Total de Sessões", value: cliente.totalSessoes.toString(), Icon: CalendarDays, color: "#b9a07a" },
    { label: "Total Gasto", value: formatCurrency(Number(cliente.totalGasto)), Icon: Wallet, color: "#a0a996" },
    { label: "Última Sessão", value: diasRelativos(cliente.ultimaSessao), Icon: CalendarDays, color: "#b9a07a" },
    { label: "Canal Preferido", value: canalLabel[cliente.canalPreferido] ?? cliente.canalPreferido, Icon: MessageSquare, color: "#a0a996" },
  ]

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto" }}>

      {/* Back — slide da esquerda */}
      <div className="anim-fade-left" style={{ marginBottom: "20px" }}>
        <Link href="/clientes" style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          fontFamily: "var(--font-sans, sans-serif)",
          fontSize: "12px", color: "#9d9d9a", textDecoration: "none",
          transition: "color 150ms",
        }}
          className="hover:text-[#b9a07a]"
        >
          <ArrowLeft size={14} />
          Clientes
        </Link>
      </div>

      {/* Profile header — scale in */}
      <div className="anim-scale-in" style={{
        backgroundColor: "#ffffff", borderRadius: "12px",
        border: "1px solid #ddd6c4", padding: "28px",
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
              <h1 style={{
                fontFamily: "var(--font-heading, Georgia, serif)",
                fontSize: "26px", fontWeight: 400, color: "#161a26",
              }}>
                {cliente.nome}
              </h1>
              <EstadoEditor clienteId={cliente.id} estadoAtual={cliente.estado} />
              <div style={{ marginLeft: "auto" }}>
                <DeleteClienteButton
                  clienteId={cliente.id}
                  primeiroNome={cliente.nome.split(" ")[0]}
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
              {cliente.telefone && (
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Phone size={13} color="#9d9d9a" />
                  <span style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "13px", color: "#6d6d6d" }}>
                    {formatPhone(cliente.telefone)}
                  </span>
                </span>
              )}
              {cliente.email && (
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Mail size={13} color="#9d9d9a" />
                  <span style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "13px", color: "#6d6d6d" }}>
                    {cliente.email}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs — fade down */}
      <div className="anim-fade-down" style={{ animationDelay: "0.22s" }}>
      <Tabs defaultValue="resumo">
        <TabsList
          variant="line"
          className="mb-5 w-full border-b rounded-none bg-transparent p-0 h-auto justify-start gap-0"
          style={{ borderColor: "#ddd6c4" }}
        >
          {[
            { value: "resumo", label: "Resumo" },
            { value: "sessoes", label: `Sessões (${cliente.sessoes.length})` },
            { value: "packs", label: `Packs & Preços` },
            { value: "notas", label: "Notas" },
            { value: "mensagens", label: `Mensagens IA (${cliente.mensagens.length})` },
          ].map(({ value, label }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="rounded-none px-4 py-2.5 text-sm border-b-2 border-transparent data-active:border-[#b9a07a] data-active:text-[#b9a07a] text-[#9d9d9a] hover:text-[#6d6d6d]"
              style={{ fontFamily: "var(--font-sans, sans-serif)", fontWeight: 500 }}
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── RESUMO ── */}
        <TabsContent value="resumo">
          {/* Stat cards — stagger scale in */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4,1fr)",
            gap: "12px", marginBottom: "16px",
          }}>
            {statCards.map(({ label, value, Icon, color }, idx) => (
              <div key={label} className="anim-scale-in card-hover" style={{
                backgroundColor: "#ffffff", borderRadius: "10px",
                border: "1px solid #ddd6c4", padding: "16px",
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
                  color: "#9d9d9a", textTransform: "uppercase", marginBottom: "4px",
                }}>
                  {label}
                </p>
                <p style={{
                  fontFamily: "var(--font-heading, Georgia, serif)",
                  fontSize: "18px", fontWeight: 400, color: "#161a26",
                }}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Detail grid */}
          <div style={{
            backgroundColor: "#ffffff", borderRadius: "10px",
            border: "1px solid #ddd6c4", padding: "24px",
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
                color: "#9d9d9a", textTransform: "uppercase",
              }}>
                Informações Gerais
              </h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "20px" }}>
              <InfoRow label="Data de Nascimento" value={formatDate(cliente.dataNascimento)} />
              <InfoRow label="Email" value={cliente.email} />
              <InfoRow label="Telefone" value={formatPhone(cliente.telefone)} />
              <InfoRow label="Aceita Marketing" value={cliente.aceitaMarketing ? "Sim" : "Não"} />
              <InfoRow label="Tem WhatsApp" value={cliente.temWhatsapp ? "Sim" : "Não"} />
              <InfoRow label="Melhor dia para contacto" value={cliente.melhorDiaContacto} />
              <InfoRow label="Como nos conheceu" value={cliente.comoNosConheceu} />
              <InfoRow label="Fonte" value={fonteLabel[cliente.fonte] ?? cliente.fonte} />
              <InfoRow label="Cliente desde" value={formatDate(cliente.criadoEm)} />
            </div>
          </div>

          {/* Última sessão */}
          {cliente.sessoes.length > 0 && (() => {
            const s = cliente.sessoes[0]
            return (
              <div style={{
                backgroundColor: "#ffffff", borderRadius: "10px",
                border: "1px solid #ddd6c4", padding: "24px", marginTop: "12px",
                boxShadow: "0 1px 3px rgba(22,26,38,0.04)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px" }}>
                  <div style={{ height: "1px", flex: 0, width: "16px", backgroundColor: "rgba(185,160,122,0.4)" }} />
                  <h2 style={{
                    fontFamily: "var(--font-sans, sans-serif)",
                    fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.18em",
                    color: "#9d9d9a", textTransform: "uppercase",
                  }}>
                    Última Sessão
                  </h2>
                  <div style={{ marginLeft: "auto" }}>
                    {(() => {
                      const map: Record<string, { label: string; color: string; bg: string }> = {
                        realizada: { label: "Realizada", color: "#a0a996", bg: "rgba(160,169,150,0.12)" },
                        agendada:  { label: "Agendada",  color: "#b9a07a", bg: "rgba(185,160,122,0.10)" },
                        cancelada: { label: "Cancelada", color: "#b06050", bg: "rgba(176,96,80,0.08)" },
                        concluida: { label: "Concluída", color: "#9d9d9a", bg: "rgba(157,157,154,0.10)" },
                        falta:     { label: "Falta",     color: "#b06050", bg: "rgba(176,96,80,0.08)" },
                      }
                      const cfg = map[s.estado] ?? { label: s.estado, color: "#9d9d9a", bg: "rgba(157,157,154,0.10)" }
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

                {/* Linha principal: serviço + data */}
                <div style={{ display: "flex", alignItems: "baseline", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
                  <span style={{
                    fontFamily: "var(--font-heading, Georgia, serif)",
                    fontSize: "18px", fontWeight: 400, color: "#161a26",
                  }}>
                    {s.servico ?? "Sessão"}
                  </span>
                  <span style={{
                    fontFamily: "var(--font-body, sans-serif)",
                    fontSize: "13px", color: "#9d9d9a",
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

                {/* Detalhes clínicos */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "12px" }}>
                  {s.estadoEmocional && (
                    <div style={{ padding: "12px 14px", borderRadius: "8px", backgroundColor: "rgba(176,96,80,0.05)", border: "1px solid rgba(176,96,80,0.15)" }}>
                      <p style={{ fontFamily: "var(--font-sans)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.16em", color: "#b06050", textTransform: "uppercase", marginBottom: "4px" }}>Estado Emocional</p>
                      <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "#161a26", lineHeight: 1.5 }}>{s.estadoEmocional}</p>
                    </div>
                  )}
                  {s.resumoSessao && (
                    <div style={{ padding: "12px 14px", borderRadius: "8px", backgroundColor: "rgba(160,169,150,0.05)", border: "1px solid rgba(160,169,150,0.2)", gridColumn: "1/-1" }}>
                      <p style={{ fontFamily: "var(--font-sans)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.16em", color: "#a0a996", textTransform: "uppercase", marginBottom: "4px" }}>Observações</p>
                      <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "#6d6d6d", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{s.resumoSessao}</p>
                    </div>
                  )}
                  {s.notasPosSessao && (
                    <div style={{ padding: "12px 14px", borderRadius: "8px", backgroundColor: "rgba(185,160,122,0.04)", border: "1px solid rgba(185,160,122,0.15)", gridColumn: "1/-1" }}>
                      <p style={{ fontFamily: "var(--font-sans)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.16em", color: "#b9a07a", textTransform: "uppercase", marginBottom: "4px" }}>Notas para a Próxima Sessão</p>
                      <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "#6d6d6d", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{s.notasPosSessao}</p>
                    </div>
                  )}
                  {!s.estadoEmocional && !s.resumoSessao && !s.notasPosSessao && (
                    <p style={{
                      fontFamily: "var(--font-heading, Georgia, serif)",
                      fontStyle: "italic", fontSize: "13px", color: "#b5b5b2",
                      gridColumn: "1/-1",
                    }}>
                      Sessão agendada — sem notas clínicas ainda
                    </p>
                  )}
                </div>
              </div>
            )
          })()}
        </TabsContent>

        {/* ── SESSÕES ── */}
        <TabsContent value="sessoes">
          <SessoesTab sessoes={cliente.sessoes.map((s) => ({ ...s, preco: s.preco === null ? null : Number(s.preco) }))} />
        </TabsContent>

        {/* ── PACKS & PREÇOS ── */}
        <TabsContent value="packs">
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* Packs */}
            <div style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #ddd6c4", padding: "24px", boxShadow: "0 1px 3px rgba(22,26,38,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                <div style={{ height: "1px", flex: 0, width: "16px", backgroundColor: "rgba(185,160,122,0.4)" }} />
                <h2 style={{ fontFamily: "var(--font-sans)", fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.18em", color: "#9d9d9a", textTransform: "uppercase" }}>
                  Packs de Sessões
                </h2>
              </div>
              {cliente.packs.length === 0 ? (
                <p style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontStyle: "italic", fontSize: "13px", color: "#b5b5b2" }}>
                  Sem packs activos para este cliente.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {cliente.packs.map(p => {
                    const restantes = p.totalSessoes - p.sessoesUsadas
                    const pct = Math.round((p.sessoesUsadas / p.totalSessoes) * 100)
                    return (
                      <div key={p.id} style={{ padding: "14px 16px", borderRadius: "8px", border: "1px solid #ddd6c4", opacity: p.ativo ? 1 : 0.5 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                          <span style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "15px", color: "#161a26", flex: 1 }}>{p.servico.nome}</span>
                          <span style={{
                            fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "100px",
                            background: p.ativo ? "rgba(74,124,89,0.12)" : "rgba(160,100,80,0.1)",
                            color: p.ativo ? "#4a7c59" : "#a06450",
                          }}>{p.ativo ? "Ativo" : "Terminado"}</span>
                          <span style={{ fontFamily: "var(--font-sans)", fontSize: "13px", fontWeight: 600, color: "#b9a07a" }}>€{Number(p.valorTotal).toFixed(2)}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ flex: 1, height: "6px", borderRadius: "3px", background: "#f0ebe2", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: p.ativo ? "#a0a996" : "#b9a07a", borderRadius: "3px", transition: "width 0.3s" }} />
                          </div>
                          <span style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "#6d6d6d", whiteSpace: "nowrap" }}>
                            {p.sessoesUsadas}/{p.totalSessoes} sessões · {restantes} restantes
                          </span>
                        </div>
                        {p.descricao && <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "#9d9d9a", marginTop: "6px" }}>{p.descricao}</p>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Preços Personalizados */}
            <div style={{ backgroundColor: "#ffffff", borderRadius: "10px", border: "1px solid #ddd6c4", padding: "24px", boxShadow: "0 1px 3px rgba(22,26,38,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                <div style={{ height: "1px", flex: 0, width: "16px", backgroundColor: "rgba(185,160,122,0.4)" }} />
                <h2 style={{ fontFamily: "var(--font-sans)", fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.18em", color: "#9d9d9a", textTransform: "uppercase" }}>
                  Preços Personalizados
                </h2>
              </div>
              {cliente.precos.length === 0 ? (
                <p style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontStyle: "italic", fontSize: "13px", color: "#b5b5b2" }}>
                  Sem preços personalizados — usa os preços base dos serviços.
                </p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #ddd6c4" }}>
                      {["Serviço", "Preço Base", "Preço Personalizado", "Motivo", "Validade"].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "6px 10px", fontSize: "10px", color: "#9d9d9a", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cliente.precos.map(p => (
                      <tr key={p.id} style={{ borderBottom: "1px solid #f0ebe2" }}>
                        <td style={{ padding: "9px 10px", fontSize: "13px", color: "#161a26" }}>{p.servico.nome}</td>
                        <td style={{ padding: "9px 10px", fontSize: "12px", color: "#9d9d9a" }}>€{Number(p.servico.precoBase).toFixed(2)}</td>
                        <td style={{ padding: "9px 10px", fontSize: "13px", fontWeight: 600, color: "#b9a07a" }}>€{Number(p.valor).toFixed(2)}</td>
                        <td style={{ padding: "9px 10px", fontSize: "12px", color: "#6d6d6d" }}>{p.motivo ?? "—"}</td>
                        <td style={{ padding: "9px 10px", fontSize: "12px", color: "#9d9d9a" }}>{p.validade ? formatDate(p.validade) : "Sem limite"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

          </div>
        </TabsContent>

        {/* ── NOTAS ── */}
        <TabsContent value="notas">
          <ObservacoesTimeline
            clienteId={cliente.id}
            inicial={cliente.observacoes.map(o => ({
              id: o.id,
              texto: o.texto,
              autor: o.autor,
              criadoEm: o.criadoEm.toISOString(),
            }))}
          />
        </TabsContent>

        {/* ── MENSAGENS IA ── */}
        <TabsContent value="mensagens">
          {cliente.mensagens.length === 0 ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", padding: "52px",
              backgroundColor: "#ffffff", borderRadius: "10px",
              border: "1px solid #ddd6c4",
            }}>
              <MessageSquare size={32} color="#ddd6c4" style={{ marginBottom: "12px" }} />
              <p style={{
                fontFamily: "var(--font-heading, Georgia, serif)",
                fontStyle: "italic", fontSize: "14px", color: "#9d9d9a",
              }}>
                Nenhuma mensagem gerada para este cliente
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {cliente.mensagens.map((msg) => (
                <div key={msg.id} className="card-hover" style={{
                  backgroundColor: "#ffffff", borderRadius: "10px",
                  border: "1px solid #ddd6c4", padding: "18px",
                  boxShadow: "0 1px 3px rgba(22,26,38,0.04)",
                }}>
                  {/* Top row */}
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                    <MensagemEstadoBadge estado={msg.estado} />
                    <span style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "#9d9d9a", textTransform: "capitalize" }}>
                      {msg.canal}
                    </span>
                    {msg.motivoGeracao && (
                      <span style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "#9d9d9a" }}>
                        Motivo: <span style={{ color: "#6d6d6d" }}>{msg.motivoGeracao}</span>
                      </span>
                    )}
                    <span style={{ marginLeft: "auto", fontFamily: "var(--font-body)", fontSize: "11px", color: "#b5b5b2" }}>
                      {formatDate(msg.geradaEm)}
                    </span>
                  </div>

                  {/* Mensagem gerada */}
                  <div style={{
                    padding: "14px", borderRadius: "8px",
                    backgroundColor: "rgba(237,231,227,0.5)",
                    border: "1px solid #ddd6c4",
                    marginBottom: "8px",
                  }}>
                    <p style={{
                      fontFamily: "var(--font-sans)", fontSize: "9px", fontWeight: 700,
                      letterSpacing: "0.16em", color: "#9d9d9a", textTransform: "uppercase",
                      marginBottom: "8px",
                    }}>
                      Mensagem gerada
                    </p>
                    <p style={{
                      fontFamily: "var(--font-body)", fontSize: "13px", color: "#6d6d6d",
                      lineHeight: 1.7, whiteSpace: "pre-wrap",
                    }}>
                      {msg.mensagemGerada}
                    </p>
                  </div>

                  {/* Mensagem final, se existir */}
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
                        fontFamily: "var(--font-body)", fontSize: "13px", color: "#6d6d6d",
                        lineHeight: 1.7, whiteSpace: "pre-wrap",
                      }}>
                        {msg.mensagemFinal}
                      </p>
                    </div>
                  )}

                  {/* Timestamps */}
                  <div style={{
                    display: "flex", flexWrap: "wrap", gap: "16px",
                    marginTop: "12px",
                    fontFamily: "var(--font-body)", fontSize: "11px", color: "#b5b5b2",
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
          )}
        </TabsContent>
      </Tabs>
      </div>
    </div>
  )
}
