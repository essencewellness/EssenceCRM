import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKey, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { revalidatePath } from "next/cache"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; etiquetaId: string }> }
) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const { id: clienteId, etiquetaId } = await params

  try {
    const deletado = await prisma.clienteEtiqueta.deleteMany({
      where: { clienteId, etiquetaId },
    })

    if (deletado.count === 0) {
      return respostaErro("Ligação etiqueta-cliente não encontrada", "NAO_ENCONTRADO", 404)
    }

    revalidatePath(`/clientes/${clienteId}`)

    return respostaSucesso({ clienteId, etiquetaId, removida: true })
  } catch (error) {
    console.error("DELETE /api/v1/clientes/[id]/etiquetas/[etiquetaId]:", error)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
