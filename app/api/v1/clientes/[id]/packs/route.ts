import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKey, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { packCreateSchema, validarBody, validarQuery } from "@/lib/validations"
import { serializarDecimais } from "@/lib/serialize"
import { Prisma } from "@prisma/client"
import { z } from "zod"

const packsQuerySchema = z.object({
  ativo: z.enum(["true", "false", "all"]).optional().default("true"),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const { id } = await params
  const q = validarQuery(request.url, packsQuerySchema)
  if (!q.ok) return q.resposta

  try {
    const cliente = await prisma.cliente.findFirst({ where: { id, apagadoEm: null }, select: { id: true } })
    if (!cliente) return respostaErro("Cliente não encontrado", "CLIENTE_NAO_ENCONTRADO", 404)

    const where: Prisma.PackWhereInput = { clienteId: id }
    if (q.data.ativo !== "all") where.ativo = q.data.ativo === "true"

    const packs = await prisma.pack.findMany({
      where,
      include: { servico: { select: { nome: true, precoBase: true } } },
      orderBy: { criadoEm: "desc" },
    })

    const packsComRestantes = packs.map(p => ({
      ...p,
      sessoesRestantes: p.totalSessoes - p.sessoesUsadas,
    }))

    return respostaSucesso(serializarDecimais(packsComRestantes), { total: packs.length })
  } catch (error) {
    console.error("GET /api/v1/clientes/[id]/packs:", error)
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
  const v = await validarBody(request, packCreateSchema)
  if (!v.ok) return v.resposta
  const { servicoId, totalSessoes, valorTotal, descricao } = v.data

  try {
    const [cliente, servico] = await Promise.all([
      prisma.cliente.findFirst({ where: { id, apagadoEm: null }, select: { id: true } }),
      prisma.servico.findUnique({ where: { id: servicoId }, select: { id: true, ativo: true, nome: true } }),
    ])

    if (!cliente) return respostaErro("Cliente não encontrado", "CLIENTE_NAO_ENCONTRADO", 404)
    if (!servico || !servico.ativo) return respostaErro("Serviço não encontrado ou inativo", "SERVICO_NAO_ENCONTRADO", 404)

    const pack = await prisma.pack.create({
      data: {
        clienteId: id,
        servicoId,
        totalSessoes,
        valorTotal: new Prisma.Decimal(valorTotal),
        descricao: descricao ?? null,
        ativo: true,
      },
      include: { servico: { select: { nome: true } } },
    })

    return respostaSucesso(serializarDecimais({ ...pack, sessoesRestantes: pack.totalSessoes }))
  } catch (error) {
    console.error("POST /api/v1/clientes/[id]/packs:", error)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
