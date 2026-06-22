import { prisma } from "@/lib/prisma"
import { KpiCardPremium } from "@/components/kpi-card"
import { DashboardHeader, SessoesHojeCard, MensagensCard, ProximosDiasCard } from "@/components/dashboard-live"
import { getContextoUtilizador } from "@/lib/contexto-utilizador"
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
  const ctx = await getContextoUtilizador()
  const { terapeuta: terapeutaFiltroId } = await searchParams

  const filtroSessao: Prisma.SessaoWhereInput = ctx.isAdmin && terapeutaFiltroId
    ? { terapeutaId: terapeutaFiltroId }
    : (ctx.filtroSessao as Prisma.SessaoWhereInput)

  const filtroCliente: Prisma.ClienteWhereInput = ctx.isAdmin && terapeutaFiltroId
    ? { sessoes: { some: { terapeutaId: terapeutaFiltroId } } }
    : (ctx.filtroCliente as Prisma.ClienteWhereInput)

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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#064E3B] flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-600" />
              As minhas tarefas
            </h3>
            <Link href="/tarefas" className="text-xs text-emerald-600 hover:text-emerald-700">
              Ver todas →
            </Link>
          </div>

          {tarefasVencidas.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wide mb-1.5">
                Vencidas ({tarefasVencidas.length})
              </p>
              <div className="space-y-1.5">
                {tarefasVencidas.map((t) => (
                  <Link key={t.id} href="/tarefas" className="flex items-start gap-2 group">
                    <span className={`text-xs mt-0.5 ${PRIORIDADE_COR[t.prioridade] ?? "text-gray-400"}`}>●</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#064E3B] truncate group-hover:text-emerald-600 transition-colors">
                        {t.titulo}
                      </p>
                      {t.cliente && (
                        <p className="text-xs text-gray-400 truncate">{t.cliente.nome}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {tarefasHoje.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-orange-500 uppercase tracking-wide mb-1.5">
                Hoje ({tarefasHoje.length})
              </p>
              <div className="space-y-1.5">
                {tarefasHoje.map((t) => (
                  <Link key={t.id} href="/tarefas" className="flex items-start gap-2 group">
                    <span className={`text-xs mt-0.5 ${PRIORIDADE_COR[t.prioridade] ?? "text-gray-400"}`}>●</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#064E3B] truncate group-hover:text-emerald-600 transition-colors">
                        {t.titulo}
                      </p>
                      {t.cliente && (
                        <p className="text-xs text-gray-400 truncate">{t.cliente.nome}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {tarefasHoje.length === 0 && tarefasVencidas.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <CheckSquare className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">Nenhuma tarefa para hoje</p>
              <Link href="/tarefas" className="text-xs text-emerald-600 mt-1 hover:underline">
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <h3 className="font-semibold text-[#064E3B]">Alertas</h3>
          </div>

          {clientesEmRisco > 0 && (
            <Link href="/clientes?estado=vip_em_risco" className="flex items-center justify-between py-2.5 border-b border-gray-50 hover:bg-gray-50 rounded px-1 transition-colors group">
              <div>
                <p className="text-sm font-medium text-[#064E3B] group-hover:text-emerald-700">Clientes em risco</p>
                <p className="text-xs text-gray-400">VIP em risco + reativação</p>
              </div>
              <span className="text-sm font-bold text-orange-500">{clientesEmRisco}</span>
            </Link>
          )}

          {alertasSatisfacao.length > 0 && (
            <div className="py-2.5 border-b border-gray-50">
              <p className="text-sm font-medium text-red-600 mb-1">Avaliações baixas</p>
              {alertasSatisfacao.slice(0, 3).map((s) => (
                <p key={s.id} className="text-xs text-gray-500 flex justify-between">
                  <span>{s.cliente.nome}</span>
                  <span className="text-red-500">{"★".repeat(s.avaliacaoNota ?? 0)} ({s.avaliacaoNota}/5)</span>
                </p>
              ))}
            </div>
          )}

          {inativasMais90.length > 0 && (
            <div className="py-2.5">
              <p className="text-sm font-medium text-[#064E3B] mb-1">Inativas +90 dias</p>
              {inativasMais90.slice(0, 3).map((c) => (
                <Link key={c.id} href={`/clientes/${c.id}`} className="text-xs text-gray-500 hover:text-emerald-600 flex justify-between py-0.5">
                  <span>{c.nome}</span>
                </Link>
              ))}
            </div>
          )}

          {clientesEmRisco === 0 && alertasSatisfacao.length === 0 && inativasMais90.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <p className="text-sm">Nenhum alerta activo</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Linha 4: Mensagens a aprovar + Clientes a reativar ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <MensagensCard mensagens={mensagensRows} />

        {/* Clientes a reativar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#064E3B]">Clientes a reativar</h3>
            <Link href="/clientes?estado=reativacao" className="text-xs text-emerald-600 hover:text-emerald-700">
              Ver todas →
            </Link>
          </div>
          {[...inativas30a60, ...inativas61a90].slice(0, 5).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Nenhuma cliente inativa</p>
          ) : (
            <div className="space-y-2">
              {[...inativas30a60, ...inativas61a90].slice(0, 5).map((c) => {
                const diasInativa = c.ultimaSessao
                  ? Math.floor((Date.now() - c.ultimaSessao.getTime()) / 86_400_000)
                  : null
                return (
                  <Link key={c.id} href={`/clientes/${c.id}`} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded px-1 transition-colors">
                    <p className="text-sm text-[#064E3B]">{c.nome}</p>
                    {diasInativa && (
                      <span className="text-xs text-orange-500 font-medium">{diasInativa}d</span>
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
