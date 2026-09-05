import { prisma } from "@/lib/prisma"
import { KpiCardPremium } from "@/components/kpi-card"
import { DashboardHeader, SessoesHojeCard, MensagensCard, ProximosDiasCard, TarefasWidget, AlertasWidget, ClientesReativarWidget } from "@/components/dashboard-live"
import { getFiltrosTerapeuta } from "@/lib/contexto-utilizador"
import { getTerapeutaPrincipalPadraoId } from "@/lib/terapeuta-padrao"
import { FiltroTerapeutaSlot } from "@/components/filtro-terapeuta-slot"
import { Calendar } from "lucide-react"
import type { Prisma } from "@/lib/prisma-client"

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
  const { ctx, alvo, filtroSessao: filtroSessaoBase, filtroCliente: filtroClienteBase } = await getFiltrosTerapeuta(terapeutaFiltroId)
  const filtroSessao = filtroSessaoBase as Prisma.SessaoWhereInput
  const filtroCliente = filtroClienteBase as Prisma.ClienteWhereInput
  // "Receita do Mês" tem de bater sempre com /financeiro — esse usa quem
  // REALMENTE fez a sessão (Sessao.terapeutaId/terapeuta2Id), não a
  // terapeuta "habitual" do cliente (filtroSessao acima, cliente.
  // terapeutaPrincipalId — serve bem para "Sessões Hoje"/"Sessões da
  // Semana", mas nunca para dinheiro). Bug real encontrado 2026-08-26: os
  // dois ecrãs mostravam totais por terapeuta diferentes (a soma batia,
  // a repartição não) — mesma família do bug corrigido no /financeiro.
  const filtroReceitaSessao: Prisma.SessaoWhereInput = alvo
    ? { OR: [{ terapeutaId: alvo }, { terapeuta2Id: alvo }] }
    : {}
  const idBea = await getTerapeutaPrincipalPadraoId()

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
    alertasSatisfacao, tarefasHoje, tarefasVencidas, receitaMesSessoes, vendasVoucherMes, pagamentosPackMes,
  ] = await Promise.all([
    prisma.sessao.findMany({
      where: { data: { gte: hoje, lt: amanha }, ...filtroSessao },
      include: { cliente: true, user: { select: { name: true } } },
      orderBy: { hora: "asc" },
    }),
    prisma.sessao.findMany({
      where: { data: { gte: amanha, lt: semanaFim }, ...filtroSessao },
      include: { cliente: true, user: { select: { name: true } } },
      orderBy: [{ data: "asc" }, { hora: "asc" }],
    }),
    // Mensagens IA nunca aparece para a Cristina — só Bea/admin (decisão de
    // negócio 2026-09-04, ver lib/contexto-utilizador.ts). Nem a query corre.
    ctx.podeAprovarMensagens
      ? prisma.mensagemIA.findMany({
          where: { estado: "aprovada", enviadaEm: null },
          include: { cliente: { select: { nome: true, telefone: true } } },
          orderBy: { aprovadaEm: "asc" },
        })
      : Promise.resolve([]),
    prisma.cliente.count({
      where: { estado: { in: ["ativa_recente", "ativa_frequente", "vip_embaixadora"] }, ...filtroCliente },
    }),
    ctx.podeAprovarMensagens ? prisma.mensagemIA.count({ where: { estado: "pendente" } }) : Promise.resolve(0),
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
    // Receita do mês — mesmo critério do /financeiro (dinheiro que entrou de
    // facto, não o preço de tabela de sessões "realizada"): soma valorPago
    // das sessões pagas diretamente + vendas de voucher pelo mês da COMPRA
    // (não da sessão). Antes somava-se Sessao.preco de sessões "realizada",
    // o que nunca incluía vendas de voucher (a sessão paga por voucher fica
    // "isento", não "pago" — nunca entrava aqui) — bug real encontrado
    // 2026-08-21: Bea via o dashboard "sem os valores dos vouchers".
    // filtroReceitaSessao (não filtroSessao) + findMany em vez de aggregate:
    // precisa de terapeuta2Id linha a linha para dividir sessões "a dois"
    // pagas directamente — ver comentário grande acima e o mesmo fix em
    // app/(dashboard)/financeiro/page.tsx.
    prisma.sessao.findMany({
      where: { data: { gte: inicioMes }, estadoPagamento: "pago", ...filtroReceitaSessao },
      select: { valorPago: true, terapeuta2Id: true },
    }),
    prisma.giftCard.findMany({
      where: {
        dataCompra: { gte: inicioMes },
        ...(alvo
          ? {
              OR: [
                { terapeutaId: alvo },
                { terapeuta2Id: alvo },
                ...(alvo === idBea ? [{ terapeutaId: null }] : []),
              ],
            }
          : {}),
      },
      select: { valorPago: true, terapeuta2Id: true },
    }),
    // Pagamentos de pack — mesmo bug que os vouchers tinham (ver comentário
    // acima): "Receita do Mês" nunca somava PackPagamento, só sessões e
    // vouchers, ficando sempre atrás do que o /financeiro mostrava para o
    // mesmo mês. Packs são individuais (nunca "a dois"), sem split por 2.
    prisma.packPagamento.findMany({
      where: {
        criadoEm: { gte: inicioMes },
        ...(alvo
          ? { pack: { OR: [{ terapeutaId: alvo }, ...(alvo === idBea ? [{ terapeutaId: null }] : [])] } }
          : {}),
      },
      select: { valor: true },
    }),
  ])

  const pctEsteMes = totalClientes > 0 ? Math.round((ativosEsteMes / totalClientes) * 100) : 0
  const pctMesAnterior = totalClientes > 0 ? Math.round((ativosMesAnterior / totalClientes) * 100) : 0
  const tendencia = pctEsteMes - pctMesAnterior

  // Voucher a dois, visto na vista de uma terapeuta específica: só a fatia
  // dela (metade) — mesmo critério do /financeiro (ver lá o comentário).
  const receitaVouchersMes = vendasVoucherMes.reduce(
    (soma, v) => soma + (alvo && v.terapeuta2Id ? Number(v.valorPago) / 2 : Number(v.valorPago)),
    0
  )
  const receitaPacksMes = pagamentosPackMes.reduce((soma, pg) => soma + Number(pg.valor), 0)
  // Mesma regra "a dois" das vendas de voucher acima, aplicada às sessões
  // pagas directamente — sem isto entrava o valor cheio duas vezes (uma em
  // cada terapeuta filtrada) para uma sessão feita pelas duas ao mesmo tempo.
  const receitaSessoesMes = receitaMesSessoes.reduce(
    (soma, s) => soma + (s.valorPago === null ? 0 : (alvo && s.terapeuta2Id ? Number(s.valorPago) / 2 : Number(s.valorPago))),
    0
  )
  const receitaMesTotal = receitaSessoesMes + receitaVouchersMes + receitaPacksMes
  const saudacao = getSaudacao()

  // Sessão "fantasma" (cliente apagado) nunca deveria aparecer aqui — é
  // sempre uma sessão passada, preservada só para o histórico financeiro —
  // mas o filtro guarda contra isso mesmo assim.
  const sessoesHojeRows = sessõesHoje.filter(s => s.cliente).map(s => ({
    id: s.id, hora: s.hora, clienteId: s.clienteId as string,
    clienteNome: s.cliente!.nome, clienteIniciais: getIniciais(s.cliente!.nome),
    // Nome oficial via terapeutaId (user.name), nunca o texto livre
    // "terapeuta" — esse tem valores antigos inconsistentes ("beatriz"
    // minúsculas vs "Beatriz Leão"). "-" enquanto não há ninguém atribuída.
    servico: s.servico, terapeuta: s.user?.name ?? "-", estado: s.estado,
  }))

  const mensagensRows = mensagensParaEnviar.filter(m => m.cliente).map(m => ({
    id: m.id,
    clienteNome: m.cliente!.nome,
    clienteIniciais: getIniciais(m.cliente!.nome),
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
        sessoes: sessoesDia.filter(s => s.cliente).map(s => ({
          id: s.id, hora: s.hora, clienteId: s.clienteId as string,
          clienteNome: s.cliente!.nome, clienteIniciais: getIniciais(s.cliente!.nome),
          servico: s.servico, terapeuta: s.user?.name ?? "-", estado: s.estado,
        })),
      }
    })

  const tarefasHojeRows = tarefasHoje.map(t => ({ id: t.id, titulo: t.titulo, cliente: t.cliente }))
  const tarefasVencidasRows = tarefasVencidas.map(t => ({ id: t.id, titulo: t.titulo, cliente: t.cliente }))
  const alertasRows = alertasSatisfacao.map(s => ({ id: s.id, avaliacaoNota: s.avaliacaoNota, cliente: s.cliente }))
  const inativasRows = inativasMais90.map(c => ({ id: c.id, nome: c.nome }))
  // eslint-disable-next-line react-hooks/purity
  const agora = Date.now()
  const reativarRows = [...inativas30a60, ...inativas61a90].slice(0, 5).map(c => ({
    id: c.id,
    nome: c.nome,
    diasInativa: c.ultimaSessao ? Math.floor((agora - c.ultimaSessao.getTime()) / 86_400_000) : null,
  }))

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Saudação */}
      <DashboardHeader saudacao={saudacao} nome={ctx.nome || "Bea"} totalHoje={sessõesHoje.length} />

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
        {ctx.podeAprovarMensagens ? (
          <KpiCardPremium
            titulo="Mensagens"
            valor={totalMensagensPendentes}
            descricao={totalMensagensPendentes === 0 ? "Tudo aprovado" : "A aguardar aprovação"}
            cor={totalMensagensPendentes > 0 ? "red" : "gold"} index={3}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>}
          />
        ) : (
          // Cristina não vê a Mensagens IA — mostra a semana em vez disso
          <KpiCardPremium
            titulo="Esta Semana"
            valor={sessõesSemana.length}
            descricao="sessões agendadas"
            cor="blue" index={3}
            icon={<Calendar className="w-4 h-4" />}
          />
        )}
      </section>

      {/* ── Linha 2: Sessões de hoje + Tarefas do dia ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <SessoesHojeCard sessoes={sessoesHojeRows} />

        <TarefasWidget tarefasHoje={tarefasHojeRows} tarefasVencidas={tarefasVencidasRows} />
      </section>

      {/* ── Linha 3: Próximos 7 dias + Alertas ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ProximosDiasCard
          dias={diasRows}
          totalSessoes={sessõesSemana.length}
          isHero={sessõesHoje.length === 0}
        />

        <AlertasWidget clientesEmRisco={clientesEmRisco} alertas={alertasRows} inativas={inativasRows} />
      </section>

      {/* ── Linha 4: Mensagens a aprovar + Clientes a reativar ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {ctx.podeAprovarMensagens && <MensagensCard mensagens={mensagensRows} />}

        <ClientesReativarWidget clientes={reativarRows} />
      </section>
    </div>
  )
}
