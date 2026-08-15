import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKey, validarApiKeyOuSessao, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { voucherCreateSchema, voucherQuerySchema, validarBody, validarQuery, normalizarTelefone } from "@/lib/validations"
import { serializarDecimais } from "@/lib/serialize"
import { verificarRateLimit } from "@/lib/rate-limit"
import { origemDoVoucher } from "@/lib/utils"
import { Prisma } from "@/lib/prisma-client"

export async function GET(request: NextRequest) {
  const erro = await validarApiKeyOuSessao(request)
  if (erro) return erro

  const q = validarQuery(request.url, voucherQuerySchema)
  if (!q.ok) return q.resposta
  const { estado, tipo, codigo } = q.data

  try {
    const where: Prisma.GiftCardWhereInput = {}
    if (estado) where.estado = estado
    if (tipo) where.tipo = tipo
    if (codigo) where.codigo = { contains: codigo }

    const vouchers = await prisma.giftCard.findMany({
      where,
      orderBy: { dataCompra: "desc" },
    })

    return respostaSucesso(serializarDecimais(vouchers), { total: vouchers.length })
  } catch (error) {
    console.error("GET /api/v1/vouchers:", (error as Error).message)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}

export async function POST(request: NextRequest) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const bloqueio = await verificarRateLimit(request, {
    recurso: "voucher-post",
    limite: 100,
    janelaSeg: 3600,
  })
  if (bloqueio) return bloqueio

  const v = await validarBody(request, voucherCreateSchema)
  if (!v.ok) return v.resposta
  const dados = v.data

  try {
    const existente = await prisma.giftCard.findUnique({ where: { codigo: dados.codigo } })
    if (existente) {
      return respostaErro("Já existe um voucher com este código", "CODIGO_DUPLICADO", 409)
    }

    const voucher = await prisma.giftCard.create({
      data: {
        codigo: dados.codigo,
        tipo: dados.tipo ?? "digital",
        estado: dados.estado ?? "ativo",
        compradorNome: dados.compradorNome,
        compradorTelefone: dados.compradorTelefone ?? null,
        compradorEmail: dados.compradorEmail ?? null,
        servicoNome: dados.servicoNome,
        valorPago: new Prisma.Decimal(dados.valorPago),
        beneficiarioNome: dados.beneficiarioNome ?? null,
        beneficiarioTelefone: dados.beneficiarioTelefone ?? null,
        ...(dados.dataCompra ? { dataCompra: new Date(dados.dataCompra) } : {}),
        validade: dados.validade ? new Date(dados.validade) : null,
        dataUso: dados.dataUso ? new Date(dados.dataUso) : null,
        notas: dados.notas ?? null,
        clienteId: dados.clienteId ?? null,
      },
    })

    // O comprador de um voucher é um lead em potencial — regista-o no CRM
    // automaticamente (upsert por telefone) com uma nota da compra, tal como
    // acontece ao criar um voucher pelo dashboard.
    if (dados.compradorTelefone && !dados.clienteId) {
      const telefone = normalizarTelefone(dados.compradorTelefone)
      if (telefone) {
        const clienteExistente = await prisma.cliente.findUnique({ where: { telefone } })
        const cliente = clienteExistente ?? await prisma.cliente.create({
          data: {
            nome: dados.compradorNome,
            telefone,
            estado: "lead",
            fonte: "voucher",
            comoNosConheceu: origemDoVoucher(dados.codigo, dados.beneficiarioNome),
          },
        })
        await prisma.observacao.create({
          data: {
            clienteId: cliente.id,
            texto: `Comprou o voucher ${dados.codigo} (${dados.servicoNome}, ${dados.valorPago}€).`,
            autor: "sistema",
          },
        })
      }
    }

    return respostaSucesso(serializarDecimais(voucher), undefined, 201)
  } catch (error) {
    console.error("POST /api/v1/vouchers:", (error as Error).message)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
