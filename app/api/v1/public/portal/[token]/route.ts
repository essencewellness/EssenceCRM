import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { respostaSucesso, respostaErro } from "@/lib/api-auth"
import { serializarDecimais } from "@/lib/serialize"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  try {
    const portalToken = await prisma.portalToken.findUnique({
      where: { token },
      include: {
        cliente: {
          select: {
            id: true,
            nome: true,
            sessoes: {
              where: { apagadoEm: null },
              select: {
                id: true,
                data: true,
                servico: true,
                terapeuta: true,
                estado: true,
                pdfUrl: true,
              },
              orderBy: { data: "desc" },
            },
          },
        },
      },
    })

    if (!portalToken) {
      return respostaErro("Link expirado ou inválido", "TOKEN_INVALIDO", 404)
    }

    if (portalToken.expiraEm < new Date()) {
      return respostaErro("Link expirado ou inválido", "TOKEN_INVALIDO", 404)
    }

    const { cliente } = portalToken

    const documentos = cliente.sessoes
      .filter((s) => s.pdfUrl)
      .map((s) => ({
        sessaoId: s.id,
        data: s.data.toISOString().slice(0, 10),
        pdfUrl: s.pdfUrl,
      }))

    return respostaSucesso(
      serializarDecimais({
        nome: cliente.nome,
        sessoes: cliente.sessoes,
        documentos,
      })
    )
  } catch (error) {
    console.error("GET /api/v1/public/portal/[token]:", (error as Error).message)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
