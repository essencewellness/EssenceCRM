import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKey, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { voucherUpdateSchema, validarBody, normalizarTelefone } from "@/lib/validations"
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

    // Corrigir/editar um telefone (ex: erro de digitação, ou voucher
    // importado sem ligação nenhuma — bug real encontrado 2026-09-07) deve
    // tentar religar à ficha certa, tal como já acontece na criação
    // (POST). Nunca cria uma cliente nova aqui (isso só faz sentido no
    // momento da compra) — só liga se já existir alguém com esse telefone,
    // e só quando o telefone está mesmo a mudar e ninguém pediu explicitamente
    // outra ligação na mesma chamada.
    const religacoes: { compradorClienteId?: string | null; clienteId?: string | null } = {}
    const telefoneCompradorMudou = campos.compradorTelefone !== undefined && campos.compradorTelefone !== existente.compradorTelefone
    const telefoneBeneficiarioMudou = campos.beneficiarioTelefone !== undefined && campos.beneficiarioTelefone !== existente.beneficiarioTelefone

    if (telefoneCompradorMudou && campos.compradorClienteId === undefined) {
      const telefone = campos.compradorTelefone ? normalizarTelefone(campos.compradorTelefone) : null
      const match = telefone ? await prisma.cliente.findUnique({ where: { telefone }, select: { id: true } }) : null
      // Só liga quando encontra alguém — um telefone editado sem match não
      // deve desfazer uma ligação manual já existente que não veio por aqui.
      if (match) religacoes.compradorClienteId = match.id
    }
    if (telefoneBeneficiarioMudou && campos.clienteId === undefined) {
      const telefone = campos.beneficiarioTelefone ? normalizarTelefone(campos.beneficiarioTelefone) : null
      const match = telefone ? await prisma.cliente.findUnique({ where: { telefone }, select: { id: true } }) : null
      if (match) religacoes.clienteId = match.id
    }

    const voucher = await prisma.giftCard.update({
      where: { id },
      data: {
        ...campos,
        ...religacoes,
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
