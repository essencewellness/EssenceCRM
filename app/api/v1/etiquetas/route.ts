import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKey, respostaSucesso, respostaErro } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const erro = validarApiKey(request)
  if (erro) return erro

  try {
    const etiquetas = await prisma.etiqueta.findMany({
      include: { _count: { select: { clientes: true } } },
      orderBy: [{ tipo: "asc" }, { nome: "asc" }],
    })

    return respostaSucesso(etiquetas.map(e => ({
      id:                 e.id,
      nome:               e.nome,
      cor:                e.cor,
      tipo:               e.tipo,
      bloqueiaAutomacoes: e.bloqueiaAutomacoes,
      totalClientes:      e._count.clientes,
    })))
  } catch (error) {
    console.error("GET /api/v1/etiquetas:", (error as Error).message)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
