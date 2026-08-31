// Fila de envio com espaçamento aleatório — proteção anti-ban do WhatsApp.
// Ao aprovar N mensagens, cada uma recebe um horário `enviarApos` espaçado
// 30–90s da anterior. O N8N consulta GET /api/v1/mensagens/fila e só recebe
// as que já estão "maduras" (enviarApos <= agora).
import { prisma } from "@/lib/prisma"

function aleatorioEntre(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export interface ItemAprovacao {
  id: string
  mensagemFinal?: string
}

export interface ResultadoFila {
  agendadas: Array<{ id: string; clienteId: string; enviarApos: string }>
  ignoradas: string[] // ids que não estavam em estado aprovável
}

/**
 * Aprova mensagens em massa e coloca-as na fila com espaçamento.
 * Só mensagens `pendente` ou `aprovada` entram na fila.
 */
export async function aprovarEAgendar(
  itens: ItemAprovacao[],
  espacamentoMinSeg = 30,
  espacamentoMaxSeg = 90,
  // Hora escolhida pela Bea para o primeiro envio do lote — sem isto,
  // mantém o comportamento antigo (cascata a partir de "agora"). Nunca
  // aceita uma hora no passado (ia disparar tudo de imediato sem querer).
  agendarPara?: Date
): Promise<ResultadoFila> {
  const ids = itens.map((i) => i.id)
  const existentes = await prisma.mensagemIA.findMany({
    where: { id: { in: ids }, estado: { in: ["pendente", "aprovada"] } },
    select: { id: true, clienteId: true },
  })
  const validas = new Set(existentes.map((m) => m.id))

  const resultado: ResultadoFila = { agendadas: [], ignoradas: [] }
  const agora = new Date()
  let cursor = agendarPara && agendarPara.getTime() > agora.getTime() ? agendarPara.getTime() : Date.now()

  for (const item of itens) {
    if (!validas.has(item.id)) {
      resultado.ignoradas.push(item.id)
      continue
    }

    // primeira mensagem sai já; as seguintes acumulam espaçamento aleatório
    if (resultado.agendadas.length > 0) {
      cursor += aleatorioEntre(espacamentoMinSeg, espacamentoMaxSeg) * 1000
    }
    const enviarApos = new Date(cursor)

    const m = await prisma.mensagemIA.update({
      where: { id: item.id },
      data: {
        estado: "em_fila",
        aprovadaEm: agora,
        enviarApos,
        ...(item.mensagemFinal ? { mensagemFinal: item.mensagemFinal } : {}),
      },
      select: { id: true, clienteId: true },
    })

    resultado.agendadas.push({
      id: m.id,
      clienteId: m.clienteId,
      enviarApos: enviarApos.toISOString(),
    })
  }

  return resultado
}

/** Mensagens maduras para envio (em_fila com enviarApos no passado). */
export async function obterMensagensMaduras(limite = 10) {
  return prisma.mensagemIA.findMany({
    where: {
      estado: "em_fila",
      enviarApos: { lte: new Date() },
    },
    include: {
      cliente: { select: { id: true, nome: true, telefone: true, temWhatsapp: true } },
    },
    orderBy: { enviarApos: "asc" },
    take: limite,
  })
}
