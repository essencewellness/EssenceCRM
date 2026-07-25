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

    // Auto-concluir sessões agendadas cuja data já passou
    const agora = new Date()
    const sessoesPassadas = await prisma.sessao.findMany({
      where: { estado: "agendada", data: { lt: agora }, apagadoEm: null },
      select: { id: true, clienteId: true },
    })
    if (sessoesPassadas.length > 0) {
      await prisma.sessao.updateMany({
        where: { id: { in: sessoesPassadas.map(s => s.id) } },
        data: { estado: "realizada" },
      })
      const clientesAfetados = [...new Set(sessoesPassadas.map(s => s.clienteId))]
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

    // Expirar mensagens pendentes com mais de 3 dias sem aprovação
    const limiteExpiracao = new Date()
    limiteExpiracao.setDate(limiteExpiracao.getDate() - 3)
    const { count: mensagensExpiradas } = await prisma.mensagemIA.updateMany({
      where: {
        estado: "pendente",
        geradaEm: { lt: limiteExpiracao },
      },
      data: {
        estado: "rejeitada",
        motivoGeracao: "expirada_automaticamente",
      },
    })

    auditar({
      quem: "sistema",
      acao: "motor_estados.executado",
      detalhe: {
        analisados: resultado.analisados,
        alterados: resultado.alterados,
        falhas: resultado.falhas,
        sessoesConcluidas: sessoesPassadas.length,
        mensagensExpiradas,
        duracaoMs: Date.now() - inicio,
      },
    })

    return respostaSucesso({ ...resultado, sessoesConcluidas: sessoesPassadas.length, mensagensExpiradas }, { duracaoMs: Date.now() - inicio })
  } catch (error) {
    console.error("GET /api/cron/estados:", (error as Error).message)
    Sentry.captureException(error)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
