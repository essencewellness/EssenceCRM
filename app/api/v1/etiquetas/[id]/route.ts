import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKey, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { auditar } from "@/lib/audit"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const { id } = await params
  const url = new URL(request.url)
  const forcar = url.searchParams.get("forcar") === "true"

  try {
    const etiqueta = await prisma.etiqueta.findUnique({
      where: { id },
      select: { id: true, nome: true },
    })
    if (!etiqueta) return respostaErro("Etiqueta não encontrada", "NOT_FOUND", 404)

    const totalClientes = await prisma.clienteEtiqueta.count({ where: { etiquetaId: id } })

    // Se etiqueta está aplicada a clientes e não foi forçado, retornar 409 com contagem
    if (totalClientes > 0 && !forcar) {
      return NextResponse.json(
        {
          error: `Esta etiqueta está aplicada a ${totalClientes} cliente${totalClientes !== 1 ? "s" : ""}. Use ?forcar=true para eliminar.`,
          code: "CASCADE_WARNING",
          totalClientes,
        },
        { status: 409 }
      )
    }

    await prisma.etiqueta.delete({ where: { id } })

    auditar({
      quem: "api:dashboard",
      acao: "etiqueta.eliminada",
      entidade: "Etiqueta",
      entidadeId: id,
      detalhe: { nome: etiqueta.nome, clientesAfetados: totalClientes },
    })

    return respostaSucesso({ eliminada: true, clientesAfetados: totalClientes })
  } catch (e) {
    console.error("[etiqueta-delete]", e)
    return respostaErro("Erro interno", "INTERNAL_ERROR", 500)
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const { id } = await params

  try {
    const etiqueta = await prisma.etiqueta.findUnique({
      where: { id },
      include: { _count: { select: { clientes: true } } },
    })
    if (!etiqueta) return respostaErro("Etiqueta não encontrada", "NOT_FOUND", 404)

    return respostaSucesso({ ...etiqueta, totalClientes: etiqueta._count.clientes })
  } catch (e) {
    return respostaErro("Erro interno", "INTERNAL_ERROR", 500)
  }
}
