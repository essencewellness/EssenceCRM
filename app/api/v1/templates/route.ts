import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKey, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { validarQuery, templateQuerySchema } from "@/lib/validations"

export async function GET(request: NextRequest) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const q = validarQuery(request.url, templateQuerySchema)
  if (!q.ok) return q.resposta
  const { nome, tipo } = q.data

  try {
    const where: { nome?: { contains: string }; tipo?: string } = {}
    if (nome) where.nome = { contains: nome }
    if (tipo) where.tipo = tipo

    const templates = await prisma.templateMensagem.findMany({
      where,
      orderBy: [{ tipo: "asc" }, { nome: "asc" }],
    })

    return respostaSucesso(templates)
  } catch (error) {
    console.error("GET /api/v1/templates:", error)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
