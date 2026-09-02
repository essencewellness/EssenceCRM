// Fonte única de verdade para as métricas agregadas do cliente.
//
// `totalSessoes` e `ultimaSessao` derivam SEMPRE das sessões realizadas.
// `totalGasto` soma isso mais os vouchers que este cliente comprou (mesmo
// para oferecer a outra pessoa) — é dinheiro real que ela entregou à
// Essence, devia contar como "gasto" mesmo sem ter sido ela a receber a
// massagem. Nenhum destes valores é escrito à mão. Qualquer via que crie ou
// conclua uma sessão (API PATCH, POST, webhook Calendly, onboarding, seed)
// OU que ligue um voucher a um comprador (vouchers/actions.ts) deve chamar
// este helper para que cliente, sessões e vouchers nunca fiquem
// dessincronizados.
//
// Aceita um `db` explícito (o singleton da app OU um PrismaClient próprio de um
// script/seed) para funcionar tanto no Next.js como em `tsx` standalone.
import type { PrismaClient } from "@/lib/prisma-client"
import { paraNumero } from "./serialize"

type DbCliente = Pick<PrismaClient, "sessao" | "cliente" | "giftCard">

export interface MetricasCliente {
  totalSessoes: number
  totalGasto: number
  ultimaSessao: Date | null
}

/**
 * Recalcula e persiste as métricas de um cliente a partir das suas sessões
 * realizadas mais os vouchers que comprou. `totalGasto` = Σ do preço
 * faturado das sessões (não do valorPago — a receita efetivamente cobrada
 * vive no Financeiro, via `valorPago`) + Σ do valor pago pelos vouchers
 * comprados por este cliente.
 */
export async function recalcularMetricasCliente(
  db: DbCliente,
  clienteId: string
): Promise<MetricasCliente> {
  const [sessoesRealizadas, vouchersComprados] = await Promise.all([
    db.sessao.findMany({
      where: { clienteId, estado: "realizada", apagadoEm: null },
      select: { preco: true, data: true },
      orderBy: { data: "desc" },
    }),
    db.giftCard.findMany({
      where: { compradorClienteId: clienteId },
      select: { valorPago: true, sessaoId: true },
    }),
  ])

  const totalSessoes = sessoesRealizadas.length
  const gastoSessoes = sessoesRealizadas.reduce((soma, s) => soma + paraNumero(s.preco), 0)
  const ultimaSessao = sessoesRealizadas[0]?.data ?? null

  // Um voucher comprado para si própria e já usada numa sessão SUA já entra
  // em gastoSessoes através do preço dessa sessão — somar o valor do
  // voucher outra vez duplicava o gasto. Só acontece quando comprador e
  // beneficiária são a mesma pessoa; um voucher oferecido a outra cliente
  // nunca colide (a sessão de quem recebe conta para o totalGasto DELA,
  // nunca para o de quem ofereceu).
  const sessaoIdsLigados = vouchersComprados.map(v => v.sessaoId).filter((id): id is string => id !== null)
  const sessoesLigadas = sessaoIdsLigados.length
    ? await db.sessao.findMany({ where: { id: { in: sessaoIdsLigados } }, select: { id: true, clienteId: true } })
    : []
  const clienteIdPorSessao = new Map(sessoesLigadas.map(s => [s.id, s.clienteId]))
  const gastoVouchers = vouchersComprados.reduce((soma, v) => {
    if (v.sessaoId && clienteIdPorSessao.get(v.sessaoId) === clienteId) return soma
    return soma + paraNumero(v.valorPago)
  }, 0)

  const totalGasto = gastoSessoes + gastoVouchers

  await db.cliente.update({
    where: { id: clienteId },
    data: { totalSessoes, totalGasto, ultimaSessao },
  })

  return { totalSessoes, totalGasto, ultimaSessao }
}
