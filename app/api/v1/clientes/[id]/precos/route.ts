import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKey, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { precoPersonalizadoCreateSchema, validarBody } from "@/lib/validations"
import { serializarDecimais } from "@/lib/serialize"
import { Prisma } from "@prisma/client"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const { id } = await params

  try {
    const cliente = await prisma.cliente.findFirst({ where: { id, apagadoEm: null }, select: { id: true } })
    if (!cliente) return respostaErro("Cliente não encontrado", "CLIENTE_NAO_ENCONTRADO", 404)

    const precos = await prisma.precoPersonalizado.findMany({
      where: { clienteId: id },
      include: { servico: { select: { nome: true, precoBase: true } } },
      orderBy: { criadoEm: "desc" },
    })

    return respostaSucesso(serializarDecimais(precos), { total: precos.length })
  } catch (error) {
    console.error("GET /api/v1/clientes/[id]/precos:", error)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const { id } = await params
  const v = await validarBody(request, precoPersonalizadoCreateSchema)
  if (!v.ok) return v.resposta
  const { servicoId, valor, motivo, validade } = v.data

  try {
    const [cliente, servico] = await Promise.all([
      prisma.cliente.findFirst({ where: { id, apagadoEm: null }, select: { id: true } }),
      prisma.servico.findUnique({ where: { id: servicoId }, select: { id: true, ativo: true } }),
    ])

    if (!cliente) return respostaErro("Cliente não encontrado", "CLIENTE_NAO_ENCONTRADO", 404)
    if (!servico || !servico.ativo) return respostaErro("Serviço não encontrado ou inativo", "SERVICO_NAO_ENCONTRADO", 404)

    // Upsert por (clienteId, servicoId) — sem duplicados
    const preco = await prisma.precoPersonalizado.upsert({
      where: { clienteId_servicoId: { clienteId: id, servicoId } },
      update: {
        valor: new Prisma.Decimal(valor),
        motivo: motivo ?? null,
        validade: validade ? new Date(validade) : null,
      },
      create: {
        clienteId: id,
        servicoId,
        valor: new Prisma.Decimal(valor),
        motivo: motivo ?? null,
        validade: validade ? new Date(validade) : null,
      },
      include: { servico: { select: { nome: true, precoBase: true } } },
    })

    return respostaSucesso(serializarDecimais(preco))
  } catch (error) {
    console.error("POST /api/v1/clientes/[id]/precos:", error)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const { id } = await params
  const url = new URL(request.url)
  const servicoId = url.searchParams.get("servicoId")
  if (!servicoId) return respostaErro("servicoId obrigatório", "CAMPO_OBRIGATORIO", 400)

  try {
    const preco = await prisma.precoPersonalizado.findUnique({
      where: { clienteId_servicoId: { clienteId: id, servicoId } },
    })
    if (!preco) return respostaErro("Preço não encontrado", "PRECO_NAO_ENCONTRADO", 404)

    await prisma.precoPersonalizado.delete({
      where: { clienteId_servicoId: { clienteId: id, servicoId } },
    })

    return respostaSucesso({ removido: true })
  } catch (error) {
    console.error("DELETE /api/v1/clientes/[id]/precos:", error)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
