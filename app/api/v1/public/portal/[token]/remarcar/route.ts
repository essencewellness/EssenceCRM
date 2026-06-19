import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { respostaSucesso, respostaErro } from "@/lib/api-auth"
import { validarBody, portalRemarcarSchema } from "@/lib/validations"
import { webhooks } from "@/lib/webhooks"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const v = await validarBody(request, portalRemarcarSchema)
  if (!v.ok) return v.resposta
  const { mensagem, preferencia, website } = v.data

  // Honeypot anti-bot
  if (website) {
    return respostaErro("Spam detectado", "SPAM_DETECTADO", 400)
  }

  try {
    const portalToken = await prisma.portalToken.findUnique({
      where: { token },
      select: { clienteId: true, expiraEm: true },
    })

    if (!portalToken || portalToken.expiraEm < new Date()) {
      return respostaErro("Link expirado ou inválido", "TOKEN_INVALIDO", 404)
    }

    const { clienteId } = portalToken

    const textoObservacao = [
      `Pedido de remarcação via portal: ${mensagem}`,
      preferencia ? `Preferência: ${preferencia}` : null,
    ]
      .filter(Boolean)
      .join(" | ")

    await prisma.observacao.create({
      data: {
        clienteId,
        texto: textoObservacao,
        autor: "portal",
      },
    })

    void webhooks.pedidoRemarcacao({ clienteId, mensagem, preferencia })

    return respostaSucesso({ recebido: true })
  } catch (error) {
    console.error("POST /api/v1/public/portal/[token]/remarcar:", error)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
