// Cron diário (Vercel Cron) — motor de transição automática dos 9 estados CRM.
// Segurança: Vercel envia Authorization: Bearer <CRON_SECRET>.
// Também aceita X-API-Key para disparo manual via N8N/curl.
import { NextRequest } from "next/server"
import { timingSafeEqual } from "node:crypto"
import * as Sentry from "@sentry/nextjs"
import { prisma } from "@/lib/prisma"
import { validarApiKey, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { executarMotorEstados } from "@/lib/crm-estados"
import { recalcularMetricasCliente } from "@/lib/metricas"
import { auditar } from "@/lib/audit"
import { detectarConversao } from "@/lib/mensagens-performance"
import { aplicarEtiquetasAutomaticas } from "@/lib/etiquetas-automaticas"

// Fim real da sessão (data + hora + duração), calculado em UTC a partir da
// hora local de Lisboa guardada nos campos `hora`/`duracao` — mesma lógica
// do sub-workflow N8N 05b (Filtrar Por Registar). Sem isto, comparar só o
// campo `data` (meia-noite) com "agora" marcaria sessões de hoje como
// "realizada" horas antes de sequer começarem.
function fimSessaoUTC(data: Date, hora: string | null, duracaoMin: number | null): Date {
  const dataYMD = data.toISOString().slice(0, 10)
  const horaHHmm = hora || "23:59" // sem hora definida: conservador, só no fim do dia
  const duracao = duracaoMin ?? 60
  const comoSeFosseUTC = new Date(`${dataYMD}T${horaHHmm}:00Z`)
  const lisboaStr = comoSeFosseUTC.toLocaleString("en-US", { timeZone: "Europe/Lisbon" })
  const utcStr = comoSeFosseUTC.toLocaleString("en-US", { timeZone: "UTC" })
  const offsetMs = new Date(lisboaStr).getTime() - new Date(utcStr).getTime()
  const inicioUTC = new Date(comoSeFosseUTC.getTime() - offsetMs)
  return new Date(inicioUTC.getTime() + duracao * 60000)
}

function validarCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = request.headers.get("authorization") ?? ""
  const esperado = `Bearer ${secret}`
  const bufA = Buffer.from(header, "utf8")
  const bufB = Buffer.from(esperado, "utf8")
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}

export async function GET(request: NextRequest) {
  // Aceita CRON_SECRET (Vercel Cron) OU X-API-Key (manual/N8N)
  if (!validarCronSecret(request)) {
    const erro = validarApiKey(request)
    if (erro) return erro
  }

  try {
    const inicio = Date.now()

    // Auto-concluir sessões "agendada" ou "confirmada" cujo fim real (data +
    // hora + duração) já passou há mais de 1h — margem para a Bea ainda
    // preencher o pos-sessao.html a tempo com os dados reais (aroma, preço,
    // notas), sem a sessão ficar presa para sempre em "confirmada" só porque
    // ninguém a fechou manualmente.
    const MARGEM_MIN = 60
    const agora = new Date()
    const candidatas = await prisma.sessao.findMany({
      where: { estado: { in: ["agendada", "confirmada"] }, data: { lt: agora }, apagadoEm: null },
      select: { id: true, clienteId: true, data: true, hora: true, duracao: true },
    })
    const sessoesPassadas = candidatas.filter(
      s => fimSessaoUTC(s.data, s.hora, s.duracao).getTime() + MARGEM_MIN * 60000 < agora.getTime()
    )
    if (sessoesPassadas.length > 0) {
      await prisma.sessao.updateMany({
        where: { id: { in: sessoesPassadas.map(s => s.id) } },
        data: { estado: "realizada" },
      })
      // Sessão "fantasma" (cliente apagado) nunca deveria estar aqui — nunca
      // fica "agendada"/"confirmada", só é criada já com dados históricos —
      // mas o filtro guarda o tipo mesmo assim.
      const clientesAfetados = [...new Set(sessoesPassadas.map(s => s.clienteId).filter((id): id is string => id !== null))]
      await Promise.all(clientesAfetados.map(id => recalcularMetricasCliente(prisma, id)))
    }

    const resultado = await executarMotorEstados()

    // O motor isola falhas por cliente (não aborta o lote todo) — mas isso
    // significa que uma falha parcial não gera exceção nenhuma, por isso
    // nunca chegaria ao Sentry sem isto: alerta explícito quando há falhas,
    // mesmo o cron continuando a devolver sucesso.
    if (resultado.falhas > 0) {
      Sentry.captureMessage(
        `Motor de estados: ${resultado.falhas} cliente(s) falharam a recalcular estado`,
        { level: "warning", extra: { analisados: resultado.analisados, alterados: resultado.alterados, falhas: resultado.falhas } }
      )
    }

    // Expirar mensagens pendentes com mais de 3 dias sem aprovação.
    // updateMany não dá para preservar o motivo original de cada linha
    // (era sobrescrito com uma string fixa, apagando o motivo real gerado
    // pela IA) — por isso isto passou a update individual, mesmo padrão de
    // isolamento por item já usado acima para as sessões passadas.
    const limiteExpiracao = new Date()
    limiteExpiracao.setDate(limiteExpiracao.getDate() - 3)
    const mensagensAExpirar = await prisma.mensagemIA.findMany({
      where: { estado: "pendente", geradaEm: { lt: limiteExpiracao } },
      select: { id: true, motivoGeracao: true },
    })
    if (mensagensAExpirar.length > 0) {
      await Promise.all(
        mensagensAExpirar.map(m =>
          prisma.mensagemIA.update({
            where: { id: m.id },
            data: {
              estado: "rejeitada",
              motivoGeracao: m.motivoGeracao
                ? `${m.motivoGeracao} [expirou sem aprovação, 3d]`
                : "expirada_automaticamente",
            },
          })
        )
      )
    }
    const mensagensExpiradas = mensagensAExpirar.length

    // Motor de deteção de conversão — MensagemIA.converteu nunca era
    // calculado por nada no sistema (só um PATCH externo explícito o
    // escrevia, o que na prática nunca acontecia; a UI de /mensagens já
    // mostrava uma "taxa de conversão" que ficava sempre a 0%). Olha para
    // mensagens enviadas há pelo menos 14 dias (ou já decididas como
    // convertidas antes disso) sem decisão ainda, e verifica se o cliente
    // reservou uma sessão ou comprou um pack depois do envio.
    const JANELA_CONVERSAO_DIAS = 14
    const mensagensParaAvaliar = await prisma.mensagemIA.findMany({
      where: { estado: "enviada", converteu: null, enviadaEm: { not: null }, clienteId: { not: null } },
      select: { id: true, clienteId: true, enviadaEm: true },
    })
    let conversoesDetectadas = 0
    if (mensagensParaAvaliar.length > 0) {
      const clienteIds = [...new Set(mensagensParaAvaliar.map(m => m.clienteId!))]
      const [sessoesPorCliente, packsPorCliente] = await Promise.all([
        prisma.sessao.findMany({ where: { clienteId: { in: clienteIds } }, select: { clienteId: true, criadoEm: true } }),
        prisma.pack.findMany({ where: { clienteId: { in: clienteIds } }, select: { clienteId: true, criadoEm: true } }),
      ])
      const registosPorCliente = new Map<string, { criadoEm: Date }[]>()
      for (const r of [...sessoesPorCliente, ...packsPorCliente]) {
        if (!r.clienteId) continue
        const lista = registosPorCliente.get(r.clienteId) ?? []
        lista.push({ criadoEm: r.criadoEm })
        registosPorCliente.set(r.clienteId, lista)
      }

      const atualizacoes: Promise<unknown>[] = []
      for (const m of mensagensParaAvaliar) {
        const resultado = detectarConversao(m.enviadaEm!, registosPorCliente.get(m.clienteId!) ?? [], agora, JANELA_CONVERSAO_DIAS)
        if (!resultado) continue // ainda dentro da janela, decidir mais tarde
        if (resultado.converteu) conversoesDetectadas++
        atualizacoes.push(
          prisma.mensagemIA.update({
            where: { id: m.id },
            data: { converteu: resultado.converteu, convertidoEm: resultado.convertidoEm },
          })
        )
      }
      await Promise.all(atualizacoes)
    }

    // Motor de etiquetas automáticas — as 7 etiquetas que dão para calcular
    // directamente de dados estruturados (ver lib/etiquetas-automaticas.ts).
    // Aplicadas/removidas sem aprovação (são metadados internos, nunca
    // tocam o cliente directamente) — mesmo espírito do motor de estados.
    const { etiquetasAplicadas, etiquetasRemovidas } = await aplicarEtiquetasAutomaticas(prisma, agora)

    auditar({
      quem: "sistema",
      acao: "motor_estados.executado",
      detalhe: {
        analisados: resultado.analisados,
        alterados: resultado.alterados,
        falhas: resultado.falhas,
        sessoesConcluidas: sessoesPassadas.length,
        mensagensExpiradas,
        conversoesDetectadas,
        etiquetasAplicadas,
        etiquetasRemovidas,
        duracaoMs: Date.now() - inicio,
      },
    })

    return respostaSucesso(
      { ...resultado, sessoesConcluidas: sessoesPassadas.length, mensagensExpiradas, conversoesDetectadas, etiquetasAplicadas, etiquetasRemovidas },
      { duracaoMs: Date.now() - inicio }
    )
  } catch (error) {
    console.error("GET /api/cron/estados:", (error as Error).message)
    Sentry.captureException(error)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
