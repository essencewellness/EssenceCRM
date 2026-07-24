// Fonte única de verdade para as métricas agregadas do cliente.
//
// `totalSessoes`, `totalGasto` e `ultimaSessao` derivam SEMPRE das sessões
// realizadas — nunca são escritos à mão. Qualquer via que crie ou conclua uma
// sessão (API PATCH, POST, webhook Calendly, onboarding, seed) deve chamar este
// helper para que cliente e sessões nunca fiquem dessincronizados.
//
// Aceita um `db` explícito (o singleton da app OU um PrismaClient próprio de um
// script/seed) para funcionar tanto no Next.js como em `tsx` standalone.
import type { PrismaClient } from "@/lib/prisma-client"
import { paraNumero } from "./serialize"

type DbCliente = Pick<PrismaClient, "sessao" | "cliente">

export interface MetricasCliente {
  totalSessoes: number
  totalGasto: number
  ultimaSessao: Date | null
}

/**
 * Recalcula e persiste as métricas de um cliente a partir das suas sessões
 * realizadas. `totalGasto` = Σ do preço faturado (não do valorPago — a receita
 * efetivamente cobrada vive no Financeiro, via `valorPago`).
 */
export async function recalcularMetricasCliente(
  db: DbCliente,
  clienteId: string
): Promise<MetricasCliente> {
  const sessoesRealizadas = await db.sessao.findMany({
    where: { clienteId, estado: "realizada", apagadoEm: null },
    select: { preco: true, data: true },
    orderBy: { data: "desc" },
  })

  const totalSessoes = sessoesRealizadas.length
  const totalGasto = sessoesRealizadas.reduce((soma, s) => soma + paraNumero(s.preco), 0)
  const ultimaSessao = sessoesRealizadas[0]?.data ?? null

  await db.cliente.update({
    where: { id: clienteId },
    data: { totalSessoes, totalGasto, ultimaSessao },
  })

  return { totalSessoes, totalGasto, ultimaSessao }
}
