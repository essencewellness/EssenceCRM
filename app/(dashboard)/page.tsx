import { prisma } from "@/lib/prisma"
import { KpiCardPremium } from "@/components/kpi-card"
import { DashboardHeader, SessoesHojeCard, MensagensCard, ProximosDiasCard } from "@/components/dashboard-live"
import { getFiltrosTerapeuta } from "@/lib/contexto-utilizador"
import { FiltroTerapeutaSlot } from "@/components/filtro-terapeuta-slot"
import Link from "next/link"
import { CheckSquare, AlertTriangle, Calendar } from "lucide-react"
import type { Prisma } from "@prisma/client"

export const revalidate = 30

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildDateRange() {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const amanha = new Date(hoje)
  amanha.setDate(amanha.getDate() + 1)
  const semanaFim = new Date(hoje)
  semanaFim.setDate(semanaFim.getDate() + 7)
  return { hoje, amanha, semanaFim }
}

function getSaudacao(): string {
  const hora = new Date().getHours()
  if (hora < 12) return "Bom dia"
  if (hora < 19) return "Boa tarde"
  return "Boa noite"
}

function getIniciais(nome: string): string {
  const partes = nome.trim().split(" ")
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

function formatarDiaSemana(data: Date): string {
  return new Intl.DateTimeFormat("pt-PT", { weekday: "long" }).format(data)
}

function formatarDataCurta(data: Date): string {
  return new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "short" }).format(data)
}

interface DashboardPageProps {
  searchParams: Promise<{ terapeuta?: string }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { terapeuta: terapeutaFiltroId } = await searchParams
  const { filtroSessao: filtroSessaoBase, filtroCliente: filtroClienteBase } = await getFiltrosTerapeuta(terapeutaFiltroId)
  const filtroSessao = filtroSessaoBase as Prisma.SessaoWhereInput
  const filtroCliente = filtroClienteBase as Prisma.ClienteWhereInput

  const { hoje, amanha, semanaFim } = buildDateRange()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
  const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const ha30 = new Date(hoje); ha30.setDate(hoje.getDate() - 30)
  const ha60 = new Date(hoje); ha60.setDate(hoje.getDate() - 60)
  const ha90 = new Date(hoje); ha90.setDate(hoje.getDate() - 90)

  const [
    sessõesHoje, sessõesSemana, mensagensParaEnviar,
    totalClientesActivos, totalMensagensPendentes,
    ativosEsteMes, ativosMesAnterior, totalClientes, clientesEmRisco,
    inativas30a60, inativas61a90, inativasMais90,
    alertasSatisfacao, tarefasHoje, tarefasVencidas, receitaMes,
  ] = await Promise.all([
    prisma.sessao.findMany({
      where: { data: { gte: hoje, lt: amanha }, ...filtroSessao },
      include: { cliente: true },
      orderBy: { hora: "asc" },
    }),
    prisma.sessao.findMany({
      where: { data: { gte: amanha, lt: semanaFim }, ...filtroSessao },
      include: { cliente: true },
      orderBy: [{ data: "asc" }, { hora: "asc" }],
    }),
    prisma.mensagemIA.findMany({
      where: { estado: "aprovada", enviadaEm: null },
      include: { cliente: { select: { nome: true, telefone: true } } },
      orderBy: { aprovadaEm: "asc" },
    }),
    prisma.cliente.count({
      where: { estado: { in: ["ativa_recente", "ativa_frequente", "vip_embaixadora"] }, ...filtroCliente },
    }),
    prisma.mensagemIA.count({ where: { estado: "pendente" } }),
    prisma.cliente.count({ where: { ultimaSessao: { gte: inicioMes }, apagadoEm: null, ...filtroCliente } }),
    prisma.cliente.count({ where: { ultimaSessao: { gte: inicioMesAnterior, lt: fimMesAnterior }, apagadoEm: null, ...filtroCliente } }),
    prisma.cliente.count({ where: { apagadoEm: null, ...filtroCliente } }),
    prisma.cliente.count({ where: { estado: { in: ["vip_em_risco", "reativacao"] }, apagadoEm: null, ...filtroCliente } }),
    prisma.cliente.findMany({
      where: { ultimaSessao: { gte: ha60, lt: ha30 }, estado: { notIn: ["blacklist", "perdida"] }, apagadoEm: null, ...filtroCliente },
      select: { id: true, nome: true, telefone: true, ultimaSessao: true },
      take: 5, orderBy: { ultimaSessao: "asc" },
    }),
    prisma.cliente.findMany({
      where: { ultimaSessao: { gte: ha90, lt: ha60 }, estado: { notIn: ["blacklist", "perdida"] }, apagadoEm: null, ...filtroCliente },
      select: { id: true, nome: true, telefone: true, ultimaSessao: true },
      take: 5, orderBy: { ultimaSessao: "asc" },
    }),
    prisma.cliente.findMany({
      where: { ultimaSessao: { lt: ha90 }, estado: { notIn: ["blacklist", "perdida"] }, apagadoEm: null, ...filtroCliente },
      select: { id: true, nome: true, telefone: true, ultimaSessao: true },
      take: 5, orderBy: { ultimaSessao: "asc" },
    }),
    prisma.sessao.findMany({
      where: { avaliacaoNota: { lte: 2, not: null }, apagadoEm: null, ...filtroSessao },
      select: { id: true, data: true, avaliacaoNota: true, cliente: { select: { nome: true } } },
      orderBy: { avaliacaoRespondidaEm: "desc" },
      take: 5,
    }),
    // Tarefas com prazo hoje (graceful — tabela pode não existir no Neon ainda)
    prisma.tarefa.findMany({
      where: {
        estado: { in: ["pendente", "em_progresso"] },
        dataLimite: { gte: hoje, lt: amanha },
      },
      include: { cliente: { select: { id: true, nome: true } } },
      orderBy: { prioridade: "desc" },
      take: 5,
    }).catch(() => []),
    // Tarefas vencidas (graceful)
    prisma.tarefa.findMany({
      where: {
        estado: { in: ["pendente", "em_progresso"] },
        dataLimite: { lt: hoje },
      },
      include: { cliente: { select: { id: true, nome: true } } },
      orderBy: { dataLimite: "asc" },
      take: 5,
    }).catch(() => []),
    // Receita do mês
    prisma.sessao.aggregate({
      where: { data: { gte: inicioMes }, estado: "realizada", ...filtroSessao },
      _sum: { preco: true },
    }),
  ])

  const pctEsteMes = totalClientes > 0 ? Math.round((ativosEsteMes / totalClientes) * 100) : 0
  const pctMesAnterior = totalClientes > 0 ? Math.round((ativosMesAnterior / totalClientes) * 100) : 0
  const tendencia = pctEsteMes - pctMesAnterior

  const receitaMesTotal = Number(receitaMes._sum.preco ?? 0)
  const saudacao = getSaudacao()

  const sessoesHojeRows = sessõesHoje.map(s => ({
    id: s.id, hora: s.hora, clienteId: s.clienteId,
    clienteNome: s.cliente.nome, clienteIniciais: getIniciais(s.cliente.nome),
    servico: s.servico, terapeuta: s.terapeuta, estado: s.estado,
  }))

  const mensagensRows = mensagensParaEnviar.map(m => ({
    id: m.id,
    clienteNome: m.cliente.nome,
    clienteIniciais: getIniciais(m.cliente.nome),
    canal: m.canal,
    preview: (() => {
      const txt = m.mensagemFinal ?? m.mensagemGerada ?? ""
      return txt.length > 80 ? txt.slice(0, 80) + "…" : txt || "—"
    })(),
  }))

  const dias7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(hoje)
    d.setDate(d.getDate() + 1 + i)
    return d
  })
  const porDia = new Map<string, typeof sessõesSemana>()
  for (const s of sessõesSemana) {
    const chave = s.data.toISOString().slice(0, 10)
    porDia.set(chave, [...(porDia.get(chave) ?? []), s])
  }
  const diasRows = dias7
    .filter(d => (porDia.get(d.toISOString().slice(0, 10)) ?? []).length > 0)
    .map(d => {
      const chave = d.toISOString().slice(0, 10)
      const sessoesDia = (porDia.get(chave) ?? []).sort((a, b) => (a.hora ?? "").localeCompare(b.hora ?? ""))
      return {
        chave, diaSemana: formatarDiaSemana(d), dataCurta: formatarDataCurta(d),
        sessoes: sessoesDia.map(s => ({
          id: s.id, hora: s.hora, clienteId: s.clienteId,
          clienteNome: s.cliente.nome, clienteIniciais: getIniciais(s.cliente.nome),
          servico: s.servico, terapeuta: s.terapeuta, estado: s.estado,
        })),
      }
    })

  const PRIORIDADE_COR: Record<string, string> = {
    urgente: "text-red-600", alta: "text-orange-500", normal: "text-blue-500", baixa: "text-gray-400",
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Saudação */}
      <DashboardHeader saudacao={saudacao} totalHoje={sessõesHoje.length} />

      <FiltroTerapeutaSlot />

      {/* ── Linha 1: 4 KPI cards ── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCardPremium
          titulo="Sessões Hoje"
          valor={sessõesHoje.length}
          descricao={sessõesHoje.length === 0 ? "Dia livre" : `${sessõesHoje.filter(s => s.estado === "confirmada").length} confirmada(s)`}
          cor="blue" index={0}
          icon={<Calendar className="w-4 h-4" />}
        />
        <KpiCardPremium
          titulo="Receita do Mês"
          valor={Math.round(receitaMesTotal)}
          suffix=" €"
          descricao="Sessões realizadas"
          cor="green" index={1}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.25 7.756a4.5 4.5 0 1 0 0 8.488M7.5 10.5h5.25m-5.25 3h5.25M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>}
        />
        <KpiCardPremium
          titulo="Clientes Ativas"
          valor={totalClientesActivos}
          descricao={`${tendencia >= 0 ? "+" : ""}${tendencia}pp vs mês ant.`}
          cor="gold" index={2}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>}
        />
        <KpiCardPremium
          titulo="Mensagens"
          valor={totalMensagensPendentes}
          descricao={totalMensagensPendentes === 0 ? "Tudo aprovado" : "A aguardar aprovação"}
          cor={totalMensagensPendentes > 0 ? "red" : "gold"} index={3}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>}
        />
      </section>

      {/* ── Linha 2: Sessões de hoje + Tarefas do dia ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <SessoesHojeCard sessoes={sessoesHojeRows} />

        {/* Widget de tarefas */}
        <div style={{
          backgroundColor: "var(--nuit-overlay)",
          border: "1px solid rgba(212,184,134,0.16)",
          borderRadius: "2px",
          padding: "20px",
        }}>
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
                  <Link key={t.id} href="/tarefas" style={{
                    display: "flex", alignItems: "flex-start", gap: "8px",
                    textDecoration: "none",
                  }}>
                    <span style={{ fontSize: "10px", marginTop: "2px", color: "#b06050" }}>●</span>
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
                  <Link key={t.id} href="/tarefas" style={{
                    display: "flex", alignItems: "flex-start", gap: "8px",
                    textDecoration: "none",
                  }}>
                    <span style={{ fontSize: "10px", marginTop: "2px", color: "var(--nuit-champagne-soft)" }}>●</span>
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
        </div>
      </section>

      {/* ── Linha 3: Próximos 7 dias + Alertas ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ProximosDiasCard
          dias={diasRows}
          totalSessoes={sessõesSemana.length}
          isHero={sessõesHoje.length === 0}
        />

        {/* Widget de alertas */}
        <div style={{
          backgroundColor: "var(--nuit-overlay)",
          border: "1px solid rgba(212,184,134,0.16)",
          borderRadius: "2px",
          padding: "20px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <AlertTriangle size={13} style={{ color: "#b06050" }} />
            <h3 style={{
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.18em",
              color: "var(--nuit-smoke)", textTransform: "uppercase",
            }}>Alertas</h3>
          </div>

          {clientesEmRisco > 0 && (
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
          )}

          {alertasSatisfacao.length > 0 && (
            <div style={{ padding: "10px 0", borderBottom: "1px solid rgba(212,184,134,0.08)" }}>
              <p style={{
                fontFamily: "var(--font-sans, sans-serif)",
                fontSize: "11px", fontWeight: 600, color: "#b06050",
                marginBottom: "6px",
              }}>Avaliações baixas</p>
              {alertasSatisfacao.slice(0, 3).map((s) => (
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

          {inativasMais90.length > 0 && (
            <div style={{ padding: "10px 0" }}>
              <p style={{
                fontFamily: "var(--font-sans, sans-serif)",
                fontSize: "11px", fontWeight: 600, color: "var(--nuit-bone-soft)",
                marginBottom: "6px",
              }}>Inativas +90 dias</p>
              {inativasMais90.slice(0, 3).map((c) => (
                <Link key={c.id} href={`/clientes/${c.id}`} style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "3px 0", textDecoration: "none",
                  fontFamily: "var(--font-sans, sans-serif)",
                  fontSize: "12px", color: "var(--nuit-smoke)",
                }}>
                  <span>{c.nome}</span>
                </Link>
              ))}
            </div>
          )}

          {clientesEmRisco === 0 && alertasSatisfacao.length === 0 && inativasMais90.length === 0 && (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              padding: "32px 0",
            }}>
              <p style={{
                fontFamily: "var(--font-heading, serif)", fontStyle: "italic",
                fontSize: "14px", color: "var(--nuit-smoke)",
              }}>Nenhum alerta activo</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Linha 4: Mensagens a aprovar + Clientes a reativar ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <MensagensCard mensagens={mensagensRows} />

        {/* Clientes a reativar */}
        <div style={{
          backgroundColor: "var(--nuit-overlay)",
          border: "1px solid rgba(212,184,134,0.16)",
          borderRadius: "2px",
          padding: "20px",
        }}>
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
          {[...inativas30a60, ...inativas61a90].slice(0, 5).length === 0 ? (
            <p style={{
              fontFamily: "var(--font-heading, serif)", fontStyle: "italic",
              fontSize: "14px", color: "var(--nuit-smoke)",
              textAlign: "center", padding: "24px 0",
            }}>Nenhuma cliente inativa</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {[...inativas30a60, ...inativas61a90].slice(0, 5).map((c) => {
                const diasInativa = c.ultimaSessao
                  ? Math.floor((Date.now() - c.ultimaSessao.getTime()) / 86_400_000)
                  : null
                return (
                  <Link key={c.id} href={`/clientes/${c.id}`} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "9px 0",
                    borderBottom: "1px solid rgba(212,184,134,0.08)",
                    textDecoration: "none",
                  }}>
                    <p style={{
                      fontFamily: "var(--font-sans, sans-serif)",
                      fontSize: "13px", color: "var(--nuit-bone-soft)",
                    }}>{c.nome}</p>
                    {diasInativa && (
                      <span style={{
                        fontFamily: "var(--font-sans, sans-serif)",
                        fontSize: "11px", fontWeight: 600, color: "#b9a07a",
                      }}>{diasInativa}d</span>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
