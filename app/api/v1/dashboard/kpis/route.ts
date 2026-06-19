import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKey, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { validarQuery, kpisQuerySchema } from "@/lib/validations"
import { serializarDecimais } from "@/lib/serialize"

function parseMes(mes?: string): { inicio: Date; fim: Date } {
  const ref = mes ?? new Date().toISOString().slice(0, 7)
  const [ano, mesNum] = ref.split("-").map(Number)
  return {
    inicio: new Date(ano!, mesNum! - 1, 1),
    fim:    new Date(ano!, mesNum!, 1),
  }
}

function parseSemana(semana?: string): { inicio: Date; fim: Date } {
  if (semana) {
    const [ano, wStr] = semana.split("-W")
    const semanaNum = parseInt(wStr ?? "1", 10)
    // ISO week: primeira quinta da semana
    const jan4 = new Date(parseInt(ano ?? "2026"), 0, 4)
    const diaSemana = jan4.getDay() || 7
    const inicioAno = new Date(jan4.getTime() - (diaSemana - 1) * 86400000)
    const inicio = new Date(inicioAno.getTime() + (semanaNum - 1) * 7 * 86400000)
    const fim = new Date(inicio.getTime() + 7 * 86400000)
    return { inicio, fim }
  }
  // Semana atual (segunda a domingo)
  const hoje = new Date()
  const diaSemana = hoje.getDay() || 7
  const inicio = new Date(hoje)
  inicio.setDate(hoje.getDate() - diaSemana + 1)
  inicio.setHours(0, 0, 0, 0)
  const fim = new Date(inicio.getTime() + 7 * 86400000)
  return { inicio, fim }
}

export async function GET(request: NextRequest) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const q = validarQuery(request.url, kpisQuerySchema)
  if (!q.ok) return q.resposta
  const { mes, semana } = q.data

  const { inicio: inicioMes, fim: fimMes } = parseMes(mes)
  const { inicio: inicioSemana, fim: fimSemana } = parseSemana(semana)

  const hoje = new Date()
  const ha30 = new Date(hoje); ha30.setDate(hoje.getDate() - 30)
  const ha60 = new Date(hoje); ha60.setDate(hoje.getDate() - 60)
  const ha90 = new Date(hoje); ha90.setDate(hoje.getDate() - 90)

  try {
    const [
      sessoesDoMes,
      inativas30a60raw,
      inativas61a90raw,
      inativasMais90raw,
      rankingServicosRaw,
      sessoesSemana,
      alertasSatisfacao,
    ] = await Promise.all([
      // Sessões do mês com dados financeiros
      prisma.sessao.findMany({
        where: { data: { gte: inicioMes, lt: fimMes }, apagadoEm: null },
        select: { estado: true, valorPago: true, estadoPagamento: true },
      }),
      // Clientes inativas 30-60 dias
      prisma.cliente.findMany({
        where: {
          ultimaSessao: { gte: ha60, lt: ha30 },
          estado: { notIn: ["blacklist", "perdida"] },
          apagadoEm: null,
        },
        select: { id: true, nome: true, telefone: true, ultimaSessao: true },
        orderBy: { ultimaSessao: "asc" },
      }),
      // Clientes inativas 61-90 dias
      prisma.cliente.findMany({
        where: {
          ultimaSessao: { gte: ha90, lt: ha60 },
          estado: { notIn: ["blacklist", "perdida"] },
          apagadoEm: null,
        },
        select: { id: true, nome: true, telefone: true, ultimaSessao: true },
        orderBy: { ultimaSessao: "asc" },
      }),
      // Clientes inativas > 90 dias
      prisma.cliente.findMany({
        where: {
          ultimaSessao: { lt: ha90 },
          estado: { notIn: ["blacklist", "perdida"] },
          apagadoEm: null,
        },
        select: { id: true, nome: true, telefone: true, ultimaSessao: true },
        orderBy: { ultimaSessao: "asc" },
      }),
      // Ranking de serviços realizados no mês
      prisma.sessao.groupBy({
        by: ["servico"],
        where: {
          data: { gte: inicioMes, lt: fimMes },
          estado: "realizada",
          servico: { not: null },
          apagadoEm: null,
        },
        _count: { servico: true },
        orderBy: { _count: { servico: "desc" } },
      }),
      // Sessões da semana
      prisma.sessao.findMany({
        where: {
          data: { gte: inicioSemana, lt: fimSemana },
          apagadoEm: null,
          estado: { notIn: ["cancelada", "falta"] },
        },
        select: { data: true },
        orderBy: { data: "asc" },
      }),
      // Alertas de satisfação (nota 1-2)
      prisma.sessao.findMany({
        where: {
          avaliacaoNota: { lte: 2, not: null },
          apagadoEm: null,
        },
        select: {
          id: true,
          data: true,
          avaliacaoNota: true,
          cliente: { select: { nome: true } },
        },
        orderBy: { avaliacaoRespondidaEm: "desc" },
        take: 10,
      }),
    ])

    // Processar sessões do mês
    let receitaMes = 0
    let sessoesRealizadas = 0
    let sessoesConfirmadas = 0
    let sessoesCanceladas = 0
    let sessoesFalta = 0

    for (const s of sessoesDoMes) {
      if (s.estado === "realizada") { sessoesRealizadas++; if (s.valorPago) receitaMes += Number(s.valorPago) }
      if (s.estado === "confirmada") sessoesConfirmadas++
      if (s.estado === "cancelada") sessoesCanceladas++
      if (s.estado === "falta") sessoesFalta++
    }

    // Ocupação semanal — agrupar por dia
    const diasSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
    const ocupacaoMap = new Map<string, { data: string; diaSemana: string; sessoes: number }>()
    for (const s of sessoesSemana) {
      const d = new Date(s.data)
      const key = d.toISOString().slice(0, 10)
      if (!ocupacaoMap.has(key)) {
        ocupacaoMap.set(key, { data: key, diaSemana: diasSemana[d.getDay()] ?? "", sessoes: 0 })
      }
      ocupacaoMap.get(key)!.sessoes++
    }

    return respostaSucesso(
      serializarDecimais({
        financeiro: {
          receitaMes: receitaMes.toFixed(2),
          sessoesMes: sessoesDoMes.length,
          sessoesRealizadas,
          sessoesConfirmadas,
          sessoesCanceladas,
          sessoesFalta,
        },
        retencao: {
          inativas30a60: inativas30a60raw,
          inativas61a90: inativas61a90raw,
          inativasMais90: inativasMais90raw,
        },
        servicos: rankingServicosRaw.map((r) => ({
          servico: r.servico,
          total: r._count.servico,
        })),
        ocupacaoSemanal: [...ocupacaoMap.values()],
        alertasSatisfacao: alertasSatisfacao.map((s) => ({
          sessaoId: s.id,
          clienteNome: s.cliente.nome,
          nota: s.avaliacaoNota,
          data: s.data,
        })),
      })
    )
  } catch (error) {
    console.error("GET /api/v1/dashboard/kpis:", error)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
