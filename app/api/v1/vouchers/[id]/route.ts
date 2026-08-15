import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKey, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { voucherUpdateSchema, validarBody } from "@/lib/validations"
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
    const voucher = await prisma.giftCard.findUnique({ where: { id } })
    if (!voucher) return respostaErro("Voucher não encontrado", "VOUCHER_NAO_ENCONTRADO", 404)
    return respostaSucesso(serializarDecimais(voucher))
  } catch (error) {
    console.error("GET /api/v1/vouchers/[id]:", (error as Error).message)
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
  const v = await validarBody(request, voucherUpdateSchema)
  if (!v.ok) return v.resposta
  const campos = v.data

  try {
    const existente = await prisma.giftCard.findUnique({ where: { id } })
    if (!existente) return respostaErro("Voucher não encontrado", "VOUCHER_NAO_ENCONTRADO", 404)

    const voucher = await prisma.giftCard.update({
      where: { id },
      data: {
        ...campos,
        ...(campos.valorPago !== undefined ? { valorPago: new Prisma.Decimal(campos.valorPago) } : {}),
        ...(campos.validade !== undefined ? { validade: campos.validade ? new Date(campos.validade) : null } : {}),
        ...(campos.dataUso !== undefined ? { dataUso: campos.dataUso ? new Date(campos.dataUso) : null } : {}),
      },
    })

    return respostaSucesso(serializarDecimais(voucher))
  } catch (error) {
    console.error("PATCH /api/v1/vouchers/[id]:", (error as Error).message)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
