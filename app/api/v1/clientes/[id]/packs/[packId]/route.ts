import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKey, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { packUpdateSchema, validarBody } from "@/lib/validations"
import { serializarDecimais } from "@/lib/serialize"
import { webhooks } from "@/lib/webhooks"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; packId: string }> }
) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const { id, packId } = await params
  const v = await validarBody(request, packUpdateSchema)
  if (!v.ok) return v.resposta
  const campos = v.data

  try {
    const pack = await prisma.pack.findFirst({
      where: { id: packId, clienteId: id },
      include: { servico: { select: { nome: true } } },
    })
    if (!pack) return respostaErro("Pack não encontrado", "PACK_NAO_ENCONTRADO", 404)

    const novasSessoesUsadas = campos.sessoesUsadas ?? pack.sessoesUsadas
    if (novasSessoesUsadas > pack.totalSessoes) {
      return respostaErro(
        `Não é possível usar mais sessões do que o total do pack (${pack.totalSessoes})`,
        "PACK_ESGOTADO",
        400
      )
    }

    const packAtualizado = await prisma.pack.update({
      where: { id: packId },
      data: {
        ...(campos.sessoesUsadas !== undefined ? { sessoesUsadas: campos.sessoesUsadas } : {}),
        ...(campos.ativo !== undefined ? { ativo: campos.ativo } : {}),
        ...(campos.descricao !== undefined ? { descricao: campos.descricao } : {}),
        // Fechar pack automaticamente quando esgotado
        ...(novasSessoesUsadas >= pack.totalSessoes ? { ativo: false } : {}),
      },
      include: { servico: { select: { nome: true } } },
    })

    // Notificar N8N quando sessões usadas mudam
    if (campos.sessoesUsadas !== undefined && campos.sessoesUsadas !== pack.sessoesUsadas) {
      void webhooks.packAtualizado({
        packId,
        clienteId: id,
        servicoNome: pack.servico.nome,
        sessoesUsadas: packAtualizado.sessoesUsadas,
        totalSessoes: packAtualizado.totalSessoes,
        ativo: packAtualizado.ativo,
      })
    }

    return respostaSucesso(serializarDecimais({
      ...packAtualizado,
      sessoesRestantes: packAtualizado.totalSessoes - packAtualizado.sessoesUsadas,
    }))
  } catch (error) {
    console.error("PATCH /api/v1/clientes/[id]/packs/[packId]:", (error as Error).message)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
