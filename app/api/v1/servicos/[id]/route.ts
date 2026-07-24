import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKey, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { servicoUpdateSchema, validarBody } from "@/lib/validations"
import { serializarDecimais } from "@/lib/serialize"
import { Prisma } from "@/lib/prisma-client"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const { id } = await params

  try {
    const servico = await prisma.servico.findUnique({ where: { id } })
    if (!servico) return respostaErro("Serviço não encontrado", "SERVICO_NAO_ENCONTRADO", 404)
    return respostaSucesso(serializarDecimais(servico))
  } catch (error) {
    console.error("GET /api/v1/servicos/[id]:", (error as Error).message)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const { id } = await params
  const v = await validarBody(request, servicoUpdateSchema)
  if (!v.ok) return v.resposta
  const campos = v.data

  try {
    const existente = await prisma.servico.findUnique({ where: { id } })
    if (!existente) return respostaErro("Serviço não encontrado", "SERVICO_NAO_ENCONTRADO", 404)

    // Verificar nome único se estiver a ser alterado
    if (campos.nome && campos.nome !== existente.nome) {
      const duplicado = await prisma.servico.findUnique({ where: { nome: campos.nome } })
      if (duplicado) return respostaErro("Já existe um serviço com este nome", "NOME_DUPLICADO", 409)
    }

    const servico = await prisma.servico.update({
      where: { id },
      data: {
        ...campos,
        ...(campos.precoBase !== undefined ? { precoBase: new Prisma.Decimal(campos.precoBase) } : {}),
      },
    })

    return respostaSucesso(serializarDecimais(servico))
  } catch (error) {
    console.error("PATCH /api/v1/servicos/[id]:", (error as Error).message)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
