import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKey, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { validarQuery, financeiroQuerySchema } from "@/lib/validations"
import { serializarDecimais } from "@/lib/serialize"

export async function GET(request: NextRequest) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const q = validarQuery(request.url, financeiroQuerySchema)
  if (!q.ok) return q.resposta
  const { mes } = q.data

  const mesRef = mes ?? new Date().toISOString().slice(0, 7) // YYYY-MM
  const [ano, mesNum] = mesRef.split("-").map(Number)
  const inicioMes = new Date(ano!, mesNum! - 1, 1)
  const fimMes = new Date(ano!, mesNum!, 1)

  try {
    const [sessoesDoMes, sessoesPendentes] = await Promise.all([
      prisma.sessao.findMany({
        where: {
          data: { gte: inicioMes, lt: fimMes },
          apagadoEm: null,
        },
        select: {
          estadoPagamento: true,
          valorPago: true,
          metodoPagamento: true,
          data: true,
          servico: true,
          preco: true,
          id: true,
          cliente: { select: { nome: true, telefone: true } },
        },
      }),
      prisma.sessao.findMany({
        where: {
          data: { gte: inicioMes, lt: fimMes },
          estadoPagamento: "pendente",
          apagadoEm: null,
          estado: "realizada",
        },
        select: {
          id: true,
          data: true,
          servico: true,
          preco: true,
          valorPago: true,
          cliente: { select: { nome: true, telefone: true } },
        },
        orderBy: { data: "asc" },
      }),
    ])

    // Receita total: só sessões "pago" com valorPago
    let receitaTotal = 0
    const receitaPorMetodo: Record<string, number> = {
      dinheiro: 0, mbway: 0, transferencia: 0, voucher: 0,
    }
    const sessoesPorEstadoPagamento: Record<string, number> = {
      pendente: 0, pago: 0, parcial: 0, isento: 0,
    }

    for (const s of sessoesDoMes) {
      const ep = s.estadoPagamento as string
      sessoesPorEstadoPagamento[ep] = (sessoesPorEstadoPagamento[ep] ?? 0) + 1

      if (s.estadoPagamento === "pago" && s.valorPago) {
        const valor = Number(s.valorPago)
        receitaTotal += valor
        const metodo = s.metodoPagamento as string | null
        if (metodo && metodo in receitaPorMetodo) {
          receitaPorMetodo[metodo]! += valor
        }
      }
    }

    return respostaSucesso(
      serializarDecimais({
        mes: mesRef,
        receitaTotal: receitaTotal.toFixed(2),
        receitaPorMetodo: Object.fromEntries(
          Object.entries(receitaPorMetodo).map(([k, v]) => [k, v.toFixed(2)])
        ),
        sessoesPorEstadoPagamento,
        sessoesPendentes: sessoesPendentes.map((s) => ({
          id: s.id,
          clienteNome: s.cliente.nome,
          clienteTelefone: s.cliente.telefone,
          data: s.data,
          servico: s.servico,
          preco: s.preco,
          valorPago: s.valorPago,
        })),
      })
    )
  } catch (error) {
    console.error("GET /api/v1/financeiro/resumo:", (error as Error).message)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
