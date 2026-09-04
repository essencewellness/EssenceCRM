// Fila de envio com espaçamento anti-ban do WhatsApp (Evolution API).
// Ao aprovar N mensagens, cada uma recebe um horário `enviarApos`. O N8N
// consulta GET /api/v1/mensagens/fila e só recebe as que já estão "maduras"
// (enviarApos <= agora) — verificação periódica, rede de segurança. Para a
// PRIMEIRA mensagem de um lote sem hora escolhida por ninguém (a Bea quis
// dizer "envia já"), dispara-se também o webhook mensagem.aprovada para um
// envio quase instantâneo, sem esperar pela próxima verificação.
//
// Duas coisas podem definir a hora de uma mensagem, por ordem de força:
// 1. `item.agendarPara` — hora escolhida pela Bea PARA AQUELA mensagem em
//    particular (dashboard: um seletor de data/hora por cartão, 2026-09-04
//    — antes havia só um seletor único aplicado a todo o lote de uma vez).
// 2. `agendarParaLote` — hora única para o lote inteiro, mantida por
//    compatibilidade com chamadores que ainda não mandam hora por item
//    (campanhas em massa via API/N8N).
// Sem nenhuma das duas, a mensagem quer sair "assim que possível".
//
// Seja qual for a hora desejada, o espaçamento anti-ban é sempre respeitado
// entre envios consecutivos — mesmo que duas mensagens peçam a mesma hora e
// minuto, a segunda é empurrada para a frente o suficiente para não sair
// colada à primeira. A largura desse descanso escala com o tamanho do lote
// (mais mensagens = mais espaço entre cada uma, decisão do Nuno 2026-09-04:
// ~1m30 para 10 mensagens, ~2min para 50) — a não ser que o chamador passe
// espacamentoMinSeg/MaxSeg explícitos, que têm sempre prioridade.
import { prisma } from "@/lib/prisma"
import { webhooks } from "@/lib/webhooks"

function aleatorioEntre(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Janela de espaçamento (segundos) calculada a partir do volume do lote.
 * Números redondos pedidos pelo Nuno: ~90s para 10 mensagens, ~120s para 50.
 * Nunca abaixo de 40s (perderia o efeito anti-ban) nem acima de 3min (um
 * lote grande demoraria demasiado tempo a escoar todo).
 */
function janelaEspacamentoPorVolume(n: number): { min: number; max: number } {
  const centro = Math.min(180, Math.max(60, Math.round(80 + n * 0.8)))
  return { min: Math.max(40, centro - 20), max: centro + 20 }
}

export interface ItemAprovacao {
  id: string
  mensagemFinal?: string
  // Hora desejada para ESTA mensagem — sem isto, cai para agendarParaLote
  // (se existir) ou para "agora".
  agendarPara?: Date
}

export interface ResultadoFila {
  agendadas: Array<{ id: string; clienteId: string; enviarApos: string }>
  ignoradas: string[] // ids que não estavam em estado aprovável
}

/**
 * Aprova mensagens em massa e coloca-as na fila com espaçamento anti-ban.
 * Só mensagens `pendente` ou `aprovada` entram na fila.
 */
export async function aprovarEAgendar(
  itens: ItemAprovacao[],
  // Sem isto, o espaçamento é calculado automaticamente a partir do nº de
  // mensagens do lote (ver janelaEspacamentoPorVolume). Passar os dois
  // explícitos substitui o cálculo automático.
  espacamentoMinSeg?: number,
  espacamentoMaxSeg?: number,
  // Hora única para o lote inteiro — só usada pelos itens que não tenham a
  // sua própria `agendarPara` (compatibilidade com chamadores por API).
  agendarParaLote?: Date
): Promise<ResultadoFila> {
  const janela =
    espacamentoMinSeg !== undefined && espacamentoMaxSeg !== undefined
      ? { min: espacamentoMinSeg, max: espacamentoMaxSeg }
      : janelaEspacamentoPorVolume(itens.length)

  const ids = itens.map((i) => i.id)
  const existentes = await prisma.mensagemIA.findMany({
    where: { id: { in: ids }, estado: { in: ["pendente", "aprovada"] } },
    select: { id: true },
  })
  const validas = new Set(existentes.map((m) => m.id))

  const resultado: ResultadoFila = { agendadas: [], ignoradas: [] }
  const agora = Date.now()

  // Processar por ordem da hora desejada — garante que o cursor de
  // espaçamento avança sempre para a frente, nunca escreve horas fora de
  // ordem quando os itens chegam com horas desejadas misturadas.
  const ordenados = itens
    .map((item) => {
      const desejada = item.agendarPara ?? agendarParaLote
      const semHoraEscolhida = !desejada
      const base = desejada && desejada.getTime() > agora ? desejada.getTime() : agora
      return { item, base, semHoraEscolhida }
    })
    .sort((a, b) => a.base - b.base)

  let cursor = 0
  let jaEnviouImediata = false

  for (const { item, base, semHoraEscolhida } of ordenados) {
    if (!validas.has(item.id)) {
      resultado.ignoradas.push(item.id)
      continue
    }

    // A hora desejada é o mínimo possível — nunca sai mais cedo do que
    // isso. Mas se cair perto demais do envio anterior, empurra-se para a
    // frente o suficiente para respeitar o descanso anti-ban.
    cursor =
      resultado.agendadas.length === 0
        ? base
        : Math.max(base, cursor + aleatorioEntre(janela.min, janela.max) * 1000)
    const enviarApos = new Date(cursor)

    const m = await prisma.mensagemIA.update({
      where: { id: item.id },
      data: {
        estado: "em_fila",
        aprovadaEm: new Date(),
        enviarApos,
        ...(item.mensagemFinal ? { mensagemFinal: item.mensagemFinal } : {}),
      },
      select: {
        id: true,
        clienteId: true,
        canal: true,
        mensagemFinal: true,
        mensagemGerada: true,
        cliente: { select: { telefone: true } },
      },
    })

    resultado.agendadas.push({
      id: m.id,
      clienteId: m.clienteId,
      enviarApos: enviarApos.toISOString(),
    })

    // Só a primeira mensagem do lote que genuinamente não pediu hora
    // nenhuma (nem por item, nem pelo lote) é "quero já" — dispara o
    // webhook para envio quase instantâneo. As restantes, mesmo que também
    // sem hora escolhida, já ficam cobertas pelo espaçamento anti-ban e não
    // devem disparar nada extra.
    if (!jaEnviouImediata && semHoraEscolhida) {
      jaEnviouImediata = true
      void webhooks.mensagemAprovada({
        mensagemId: m.id,
        clienteId: m.clienteId,
        telefone: m.cliente.telefone,
        mensagemFinal: m.mensagemFinal ?? m.mensagemGerada,
        canal: m.canal,
      })
    }
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
