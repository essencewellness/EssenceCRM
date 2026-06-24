import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKey, respostaSucesso, respostaErro } from "@/lib/api-auth"

export type TipoEvento =
  | "sessao_realizada"
  | "sessao_agendada"
  | "mensagem_enviada"
  | "mensagem_pendente"
  | "estado_alterado"
  | "tarefa_concluida"
  | "etiqueta_adicionada"
  | "etiqueta_removida"
  | "audit"

export interface EventoTimeline {
  id: string
  tipo: TipoEvento
  descricao: string
  detalhe?: Record<string, unknown>
  autor?: string | null
  criadoEm: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const { id } = await params
  const url = new URL(request.url)
  const limite = Math.min(parseInt(url.searchParams.get("limite") ?? "50"), 100)

  try {
    const cliente = await prisma.cliente.findFirst({
      where: { id, apagadoEm: null },
      select: { id: true },
    })
    if (!cliente) return respostaErro("Cliente não encontrado", "NOT_FOUND", 404)

    const [sessoes, mensagens, tarefas, auditLogs] = await Promise.all([
      prisma.sessao.findMany({
        where: { clienteId: id, apagadoEm: null },
        select: {
          id: true, data: true, hora: true, estado: true,
          servico: true, terapeuta: true, criadoEm: true,
        },
        orderBy: { data: "desc" },
        take: limite,
      }),
      prisma.mensagemIA.findMany({
        where: { clienteId: id },
        select: { id: true, estado: true, canal: true, geradaEm: true, enviadaEm: true, mensagemGerada: true },
        orderBy: { geradaEm: "desc" },
        take: limite,
      }),
      prisma.tarefa.findMany({
        where: { clienteId: id, estado: "concluida" },
        select: { id: true, titulo: true, resolvidaEm: true, criadoEm: true },
        orderBy: { resolvidaEm: "desc" },
        take: 20,
      }),
      prisma.auditLog.findMany({
        where: {
          entidadeId: id,
          acao: {
            in: [
              "cliente.estado_alterado",
              "etiqueta.adicionada",
              "etiqueta.removida",
            ],
          },
        },
        select: { id: true, acao: true, detalhe: true, quem: true, criadoEm: true },
        orderBy: { criadoEm: "desc" },
        take: 30,
      }),
    ])

    const eventos: EventoTimeline[] = []

    for (const s of sessoes) {
      const tipo: TipoEvento = s.estado === "realizada" ? "sessao_realizada" : "sessao_agendada"
      eventos.push({
        id: `sessao-${s.id}`,
        tipo,
        descricao: s.estado === "realizada"
          ? `Sessão realizada: ${s.servico ?? "Massagem"}`
          : `Sessão agendada: ${s.servico ?? "Massagem"}`,
        detalhe: { hora: s.hora, terapeuta: s.terapeuta, estado: s.estado },
        criadoEm: (s.data ?? s.criadoEm).toISOString(),
      })
    }

    for (const m of mensagens) {
      const enviada = m.estado === "enviada" || m.estado === "em_fila"
      if (!enviada && m.estado !== "pendente") continue
      eventos.push({
        id: `msg-${m.id}`,
        tipo: enviada ? "mensagem_enviada" : "mensagem_pendente",
        descricao: enviada
          ? `Mensagem enviada via ${m.canal ?? "WhatsApp"}`
          : `Mensagem gerada (a aguardar aprovação)`,
        detalhe: {
          preview: (m.mensagemGerada ?? "").slice(0, 80),
          canal: m.canal,
        },
        criadoEm: (m.enviadaEm ?? m.geradaEm).toISOString(),
      })
    }

    for (const t of tarefas) {
      eventos.push({
        id: `tarefa-${t.id}`,
        tipo: "tarefa_concluida",
        descricao: `Tarefa concluída: ${t.titulo}`,
        criadoEm: (t.resolvidaEm ?? t.criadoEm).toISOString(),
      })
    }

    for (const a of auditLogs) {
      const detalhe = (a.detalhe as Record<string, unknown>) ?? {}
      let descricao = a.acao
      let tipo: TipoEvento = "audit"

      if (a.acao === "cliente.estado_alterado") {
        descricao = `Estado: ${detalhe.de ?? "?"} → ${detalhe.para ?? "?"}`
        tipo = "estado_alterado"
      } else if (a.acao === "etiqueta.adicionada") {
        descricao = `Tag adicionada: ${detalhe.etiqueta ?? ""}`
        tipo = "etiqueta_adicionada"
      } else if (a.acao === "etiqueta.removida") {
        descricao = `Tag removida: ${detalhe.etiqueta ?? ""}`
        tipo = "etiqueta_removida"
      }

      eventos.push({
        id: `audit-${a.id}`,
        tipo,
        descricao,
        detalhe,
        autor: a.quem,
        criadoEm: a.criadoEm.toISOString(),
      })
    }

    // Ordenar por data desc e aplicar limite
    eventos.sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime())
    const paginados = eventos.slice(0, limite)

    return respostaSucesso(paginados, { total: paginados.length })
  } catch (e) {
    console.error("[timeline]", (e as Error).message)
    return respostaErro("Erro interno", "INTERNAL_ERROR", 500)
  }
}
