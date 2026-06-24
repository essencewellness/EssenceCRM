import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKey, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { criarTokenPortal } from "@/lib/portal-token"

const BASE_URL = process.env.AUTH_URL ?? "https://essence-crm-z4kp.vercel.app"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const { id } = await params

  try {
    const cliente = await prisma.cliente.findFirst({
      where: { id, apagadoEm: null },
      select: { id: true, nome: true },
    })

    if (!cliente) return respostaErro("Cliente não encontrado", "CLIENTE_NAO_ENCONTRADO", 404)

    const { token, expiraEm } = await criarTokenPortal(id)

    return respostaSucesso({
      clienteId: id,
      token,
      portalUrl: `${BASE_URL}/portal/${token}`,
      expiraEm,
    })
  } catch (error) {
    console.error("POST /api/v1/clientes/[id]/portal-token:", (error as Error).message)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
