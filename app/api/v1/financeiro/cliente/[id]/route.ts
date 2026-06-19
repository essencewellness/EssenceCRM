import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKey, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { serializarDecimais } from "@/lib/serialize"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const { id } = await params

  try {
    const cliente = await prisma.cliente.findFirst({
      where: { id, apagadoEm: null },
      select: {
        id: true,
        nome: true,
        sessoes: {
          where: { apagadoEm: null },
          select: {
            id: true,
            data: true,
            servico: true,
            preco: true,
            estadoPagamento: true,
            valorPago: true,
            metodoPagamento: true,
            pagamentoEm: true,
          },
          orderBy: { data: "desc" },
        },
      },
    })

    if (!cliente) return respostaErro("Cliente não encontrado", "CLIENTE_NAO_ENCONTRADO", 404)

    let totalFaturado = 0
    let totalRecebido = 0

    for (const s of cliente.sessoes) {
      if (s.preco) totalFaturado += Number(s.preco)
      if (s.estadoPagamento === "pago" && s.valorPago) totalRecebido += Number(s.valorPago)
    }

    const totalPendente = totalFaturado - totalRecebido

    return respostaSucesso(
      serializarDecimais({
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        totalSessoes: cliente.sessoes.length,
        totalFaturado: totalFaturado.toFixed(2),
        totalRecebido: totalRecebido.toFixed(2),
        totalPendente: Math.max(0, totalPendente).toFixed(2),
        sessoes: cliente.sessoes,
      })
    )
  } catch (error) {
    console.error("GET /api/v1/financeiro/cliente/[id]:", error)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
