import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKey, respostaSucesso, respostaErro } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const erro = validarApiKey(request)
  if (erro) return erro

  try {
    const hoje = new Date()
    const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
    const fimDia = new Date(inicioDia)
    fimDia.setDate(fimDia.getDate() + 1)

    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
    const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

    const [contagens, sessoesHoje, mensagensPendentes, emFila, totalClientes,
           ativosEsteMes, ativosMesAnterior, clientesEmRisco] = await Promise.all([
      prisma.cliente.groupBy({
        by: ["estado"],
        where: { apagadoEm: null },
        _count: { estado: true },
      }),
      prisma.sessao.count({
        where: {
          data: { gte: inicioDia, lt: fimDia },
          estado: { in: ["agendada", "confirmada", "realizada"] },
          apagadoEm: null,
        },
      }),
      prisma.mensagemIA.count({ where: { estado: "pendente" } }),
      prisma.mensagemIA.count({ where: { estado: "em_fila" } }),
      prisma.cliente.count({ where: { apagadoEm: null } }),
      prisma.cliente.count({
        where: { ultimaSessao: { gte: inicioMes }, apagadoEm: null },
      }),
      prisma.cliente.count({
        where: { ultimaSessao: { gte: inicioMesAnterior, lt: fimMesAnterior }, apagadoEm: null },
      }),
      prisma.cliente.count({
        where: { estado: { in: ["vip_em_risco", "reativacao"] }, apagadoEm: null },
      }),
    ])

    const estados: Record<string, number> = {}
    for (const c of contagens) {
      estados[c.estado] = c._count.estado
    }

    const percentagemAtivosEsteMes = totalClientes > 0
      ? Math.round((ativosEsteMes / totalClientes) * 100)
      : 0
    const percentagemAtivosMesAnterior = totalClientes > 0
      ? Math.round((ativosMesAnterior / totalClientes) * 100)
      : 0

    return respostaSucesso({
      estados,
      metricas: {
        totalClientes,
        sessoesHoje,
        mensagensPendentes,
        mensagensEmFila: emFila,
        ativosEsteMes,
        ativosMesAnterior,
        percentagemAtivosEsteMes,
        percentagemAtivosMesAnterior,
        clientesEmRisco,
      },
    })
  } catch (error) {
    console.error("GET /api/v1/pipeline:", (error as Error).message)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
