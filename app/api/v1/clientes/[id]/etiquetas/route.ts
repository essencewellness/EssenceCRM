import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKey, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { z } from "zod"
import { validarBody } from "@/lib/validations"
import { revalidatePath } from "next/cache"

const etiquetaBody = z.object({
  etiquetaId: z.string().trim().min(1).optional(),
  etiquetaNome: z.string().trim().min(1).max(60).optional(),
}).refine(d => d.etiquetaId || d.etiquetaNome, { message: "etiquetaId ou etiquetaNome obrigatório" })

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const { id: clienteId } = await params

  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId, apagadoEm: null }, select: { id: true } })
  if (!cliente) return respostaErro("Cliente não encontrado", "NAO_ENCONTRADO", 404)

  const v = await validarBody(request, etiquetaBody)
  if (!v.ok) return v.resposta

  try {
    const etiqueta = v.data.etiquetaId
      ? await prisma.etiqueta.findUnique({ where: { id: v.data.etiquetaId } })
      : await prisma.etiqueta.findFirst({ where: { nome: v.data.etiquetaNome } })

    if (!etiqueta) return respostaErro("Etiqueta não encontrada", "NAO_ENCONTRADO", 404)

    await prisma.clienteEtiqueta.upsert({
      where:  { clienteId_etiquetaId: { clienteId, etiquetaId: etiqueta.id } },
      create: { clienteId, etiquetaId: etiqueta.id },
      update: {},
    })

    revalidatePath(`/clientes/${clienteId}`)

    return respostaSucesso({ clienteId, etiquetaId: etiqueta.id, nome: etiqueta.nome })
  } catch (error) {
    console.error("POST /api/v1/clientes/[id]/etiquetas:", (error as Error).message)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
