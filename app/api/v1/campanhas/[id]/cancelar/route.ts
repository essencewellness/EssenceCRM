import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKey, respostaSucesso, respostaErro } from "@/lib/api-auth"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const { id } = await params

  try {
    const campanha = await prisma.campanha.findUnique({
      where: { id },
      select: { id: true, estado: true },
    })

    if (!campanha) {
      return respostaErro("Campanha não encontrada", "CAMPANHA_NAO_ENCONTRADA", 404)
    }

    if (campanha.estado !== "ativa") {
      return respostaErro(
        "Só campanhas ativas podem ser canceladas",
        "CAMPANHA_NAO_ATIVA",
        422
      )
    }

    // Cancelar campanha e remover mensagens ainda em fila/pendentes
    const [campanhaAtualizada, mensagensCanceladas] = await prisma.$transaction([
      prisma.campanha.update({
        where: { id },
        data: { estado: "cancelada" },
      }),
      prisma.mensagemIA.updateMany({
        where: {
          campanhaId: id,
          estado: { in: ["pendente", "em_fila"] },
        },
        data: { estado: "rejeitada" },
      }),
    ])

    return respostaSucesso({
      campanha: campanhaAtualizada,
      mensagensCanceladas: mensagensCanceladas.count,
    })
  } catch (error) {
    console.error("PATCH /api/v1/campanhas/[id]/cancelar:", (error as Error).message)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
