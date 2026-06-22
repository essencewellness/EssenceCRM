import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKey, respostaSucesso, respostaErro } from "@/lib/api-auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const { id } = await params
  const url = new URL(request.url)
  const cursor = url.searchParams.get("cursor") ?? undefined
  const limite = Math.min(parseInt(url.searchParams.get("limite") ?? "20"), 50)

  try {
    const cliente = await prisma.cliente.findFirst({
      where: { id, apagadoEm: null },
      select: { id: true },
    })
    if (!cliente) return respostaErro("Cliente não encontrado", "NOT_FOUND", 404)

    const logs = await prisma.auditLog.findMany({
      where: { entidadeId: id },
      orderBy: { criadoEm: "desc" },
      take: limite + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    const temMais = logs.length > limite
    const pagina = temMais ? logs.slice(0, limite) : logs
    const proximoCursor = temMais ? pagina[pagina.length - 1].id : null

    return respostaSucesso(pagina, { proximoCursor, temMais })
  } catch (e) {
    console.error("[audit-log]", e)
    return respostaErro("Erro interno", "INTERNAL_ERROR", 500)
  }
}
