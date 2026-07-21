import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { respostaSucesso, respostaErro } from "@/lib/api-auth"
import { serializarDecimais } from "@/lib/serialize"
import { verificarRateLimit } from "@/lib/rate-limit"
import { auditar } from "@/lib/audit"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  // Rate limit por IP — trava tentativas de adivinhar tokens por força bruta
  const bloqueio = await verificarRateLimit(request, {
    recurso: "portal-get",
    limite: 30,
    janelaSeg: 3600,
  })
  if (bloqueio) return bloqueio

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

    // Registo de acesso ao portal — visibilidade sobre quem consulta os dados
    auditar({
      quem: "publico",
      acao: "portal.acedido",
      entidade: "Cliente",
      entidadeId: cliente.id,
      ip: request.headers.get("x-forwarded-for"),
    })

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
