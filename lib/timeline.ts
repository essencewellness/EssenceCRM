import { prisma } from "@/lib/prisma"

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

/**
 * Constrói a timeline de atividade de um cliente agregando sessões, mensagens,
 * tarefas concluídas e eventos de auditoria (estado/etiquetas).
 * Função partilhada: usada no render do servidor e na rota da API.
 */
export async function construirEventosTimeline(
  clienteId: string,
  limite = 50,
): Promise<EventoTimeline[]> {
  const [sessoes, mensagens, tarefas, auditLogs] = await Promise.all([
    prisma.sessao.findMany({
      where: { clienteId, apagadoEm: null },
      select: {
        id: true, data: true, hora: true, estado: true, servico: true, criadoEm: true,
        // Nome oficial via terapeutaId, não o texto livre "terapeuta"
        // (valores antigos inconsistentes: "beatriz" vs "Beatriz Leão").
        user: { select: { name: true } },
      },
      orderBy: { data: "desc" },
      take: limite,
    }),
    prisma.mensagemIA.findMany({
      where: { clienteId },
      select: { id: true, estado: true, canal: true, geradaEm: true, enviadaEm: true, mensagemGerada: true },
      orderBy: { geradaEm: "desc" },
      take: limite,
    }),
    prisma.tarefa.findMany({
      where: { clienteId, estado: "concluida" },
      select: { id: true, titulo: true, resolvidaEm: true, criadoEm: true },
      orderBy: { resolvidaEm: "desc" },
      take: 20,
    }),
    prisma.auditLog.findMany({
      where: {
        entidadeId: clienteId,
        acao: { in: ["cliente.estado_alterado", "etiqueta.adicionada", "etiqueta.removida"] },
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
      detalhe: { hora: s.hora, terapeuta: s.user?.name ?? "-", estado: s.estado },
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
      detalhe: { preview: (m.mensagemGerada ?? "").slice(0, 80), canal: m.canal },
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

  eventos.sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime())
  return eventos.slice(0, limite)
}
