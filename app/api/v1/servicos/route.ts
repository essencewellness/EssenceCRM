import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKey, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { servicoCreateSchema, servicoQuerySchema, validarBody, validarQuery } from "@/lib/validations"
import { serializarDecimais } from "@/lib/serialize"
import { webhooks } from "@/lib/webhooks"
import { Prisma } from "@prisma/client"

export async function GET(request: NextRequest) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const q = validarQuery(request.url, servicoQuerySchema)
  if (!q.ok) return q.resposta
  const { ativo, nome } = q.data

  try {
    const where: Prisma.ServicoWhereInput = {}
    if (ativo !== undefined) where.ativo = ativo === "true"
    if (nome) where.nome = { contains: nome }

    const servicos = await prisma.servico.findMany({
      where,
      orderBy: { nome: "asc" },
    })

    return respostaSucesso(serializarDecimais(servicos), { total: servicos.length })
  } catch (error) {
    console.error("GET /api/v1/servicos:", error)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}

export async function POST(request: NextRequest) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const v = await validarBody(request, servicoCreateSchema)
  if (!v.ok) return v.resposta
  const { nome, descricao, duracaoMinutos, precoBase, ativo } = v.data

  try {
    const existente = await prisma.servico.findUnique({ where: { nome } })
    if (existente) {
      return respostaErro("Já existe um serviço com este nome", "NOME_DUPLICADO", 409)
    }

    const servico = await prisma.servico.create({
      data: {
        nome,
        descricao: descricao ?? null,
        duracaoMinutos: duracaoMinutos ?? 60,
        precoBase: new Prisma.Decimal(precoBase),
        ativo: ativo ?? true,
      },
    })

    void webhooks.servicoCriado({
      servicoId: servico.id,
      nome: servico.nome,
      precoBase: servico.precoBase.toString(),
      duracaoMinutos: servico.duracaoMinutos,
    })

    return respostaSucesso(serializarDecimais(servico))
  } catch (error) {
    console.error("POST /api/v1/servicos:", error)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
