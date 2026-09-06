import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKey, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { validarBody, validarQuery, campanhaCreateSchema, campanhasQuerySchema } from "@/lib/validations"
import { criarCampanha, CampanhaError } from "@/lib/campanhas"
import { verificarRateLimit } from "@/lib/rate-limit"
import type { Prisma } from "@/lib/prisma-client"

export async function GET(request: NextRequest) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const q = validarQuery(request.url, campanhasQuerySchema)
  if (!q.ok) return q.resposta
  const { estado, limit, cursor } = q.data

  try {
    const where: Prisma.CampanhaWhereInput = {}
    if (estado) where.estado = estado

    const campanhas = await prisma.campanha.findMany({
      where,
      include: {
        template: { select: { nome: true, tipo: true } },
        _count: { select: { mensagens: true } },
      },
      orderBy: { criadaEm: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    const hasMore = campanhas.length > limit
    if (hasMore) campanhas.pop()

    return respostaSucesso(campanhas, {
      nextCursor: hasMore ? campanhas[campanhas.length - 1]?.id : null,
    })
  } catch (error) {
    console.error("GET /api/v1/campanhas:", (error as Error).message)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}

export async function POST(request: NextRequest) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const bloqueio = await verificarRateLimit(request, {
    recurso: "campanha-post",
    limite: 100,
    janelaSeg: 3600,
  })
  if (bloqueio) return bloqueio

  const v = await validarBody(request, campanhaCreateSchema)
  if (!v.ok) return v.resposta

  try {
    const { campanha, agendadas, totalClientes } = await criarCampanha(v.data)
    return respostaSucesso({ campanha, agendadas }, { totalClientes }, 201)
  } catch (error) {
    if (error instanceof CampanhaError) {
      const status = error.codigo === "SEGMENTO_VAZIO" || error.codigo === "TEMPLATE_INATIVO" ? 422 : 404
      return respostaErro(error.message, error.codigo, status)
    }
    console.error("POST /api/v1/campanhas:", (error as Error).message)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
