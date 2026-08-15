"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { voucherCreateSchema, voucherUpdateSchema, normalizarTelefone } from "@/lib/validations"
import { Prisma } from "@/lib/prisma-client"

async function verificarSessao() {
  const session = await auth()
  if (!session?.user) throw new Error("Não autenticado")
  return session
}

const CAMPOS_EDITAVEIS = [
  "codigo", "tipo", "estado", "compradorNome", "compradorTelefone", "compradorEmail",
  "servicoNome", "valorPago", "beneficiarioNome", "beneficiarioTelefone",
  "validade", "dataUso", "notas",
] as const
type CampoEditavel = (typeof CAMPOS_EDITAVEIS)[number]

export async function atualizarCampoVoucher(
  id: string,
  campo: CampoEditavel,
  valor: unknown
): Promise<{ ok: true } | { ok: false; erro: string }> {
  await verificarSessao()

  if (!CAMPOS_EDITAVEIS.includes(campo)) {
    return { ok: false, erro: "Campo não editável" }
  }

  const parsed = voucherUpdateSchema.safeParse({ [campo]: valor })
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Valor inválido" }
  }
  const valorValidado = (parsed.data as Record<string, unknown>)[campo]

  if (campo === "codigo" && typeof valorValidado === "string") {
    const existente = await prisma.giftCard.findFirst({
      where: { id: { not: id }, codigo: valorValidado },
    })
    if (existente) return { ok: false, erro: "Já existe um voucher com este código." }
  }

  try {
    await prisma.giftCard.update({
      where: { id },
      data: {
        [campo]:
          campo === "valorPago" ? new Prisma.Decimal(valorValidado as number)
          : (campo === "validade" || campo === "dataUso") && valorValidado ? new Date(valorValidado as string)
          : valorValidado,
      },
    })
    revalidatePath("/vouchers")
    return { ok: true }
  } catch {
    return { ok: false, erro: "Erro ao guardar" }
  }
}

// Grava várias alterações de uma vez (painel de edição). Ao contrário do
// atualizarCampoVoucher — que gravava a cada clique — aqui a terapeuta só
// confirma no fim, o que evita alterações acidentais.
export async function atualizarVoucher(
  id: string,
  dados: Record<string, unknown>
): Promise<{ ok: true } | { ok: false; erro: string }> {
  await verificarSessao()

  const limpos: Record<string, unknown> = {}
  for (const [campo, valor] of Object.entries(dados)) {
    if (!CAMPOS_EDITAVEIS.includes(campo as CampoEditavel)) continue
    limpos[campo] = valor === "" ? null : valor
  }

  const parsed = voucherUpdateSchema.safeParse(limpos)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { ok: false, erro: `${issue?.path.join(".") ?? "Campo"}: ${issue?.message ?? "inválido"}` }
  }

  const campos = parsed.data as Record<string, unknown>

  if (typeof campos.codigo === "string") {
    const duplicado = await prisma.giftCard.findFirst({
      where: { id: { not: id }, codigo: campos.codigo },
    })
    if (duplicado) return { ok: false, erro: "Já existe um voucher com este código." }
  }

  try {
    await prisma.giftCard.update({
      where: { id },
      data: {
        ...campos,
        ...(campos.valorPago !== undefined ? { valorPago: new Prisma.Decimal(campos.valorPago as number) } : {}),
        ...(campos.validade !== undefined ? { validade: campos.validade ? new Date(campos.validade as string) : null } : {}),
        ...(campos.dataUso !== undefined ? { dataUso: campos.dataUso ? new Date(campos.dataUso as string) : null } : {}),
      },
    })
    revalidatePath("/vouchers")
    return { ok: true }
  } catch {
    return { ok: false, erro: "Erro ao guardar" }
  }
}

export async function criarVoucher(dados: {
  codigo: string
  tipo: string
  compradorNome: string
  compradorTelefone?: string
  servicoNome: string
  valorPago: number
  beneficiarioNome?: string
  validade?: string
  notas?: string
}): Promise<{ ok: true } | { ok: false; erro: string }> {
  const session = await verificarSessao()

  const parsed = voucherCreateSchema.safeParse(dados)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { ok: false, erro: `${issue?.path.join(".") ?? "Campo"}: ${issue?.message ?? "inválido"}` }
  }

  const existente = await prisma.giftCard.findUnique({ where: { codigo: parsed.data.codigo } })
  if (existente) return { ok: false, erro: "Já existe um voucher com este código." }

  // Validade por omissão: 6 meses a contar de hoje — é o prazo que a Essence
  // já pratica em todos os vouchers emitidos (ver folha de controlo).
  const validade = parsed.data.validade
    ? new Date(parsed.data.validade)
    : (() => {
        const d = new Date()
        d.setMonth(d.getMonth() + 6)
        return d
      })()

  try {
    await prisma.giftCard.create({
      data: {
        codigo: parsed.data.codigo,
        tipo: parsed.data.tipo ?? "digital",
        compradorNome: parsed.data.compradorNome,
        compradorTelefone: parsed.data.compradorTelefone ?? null,
        servicoNome: parsed.data.servicoNome,
        valorPago: new Prisma.Decimal(parsed.data.valorPago),
        beneficiarioNome: parsed.data.beneficiarioNome ?? null,
        validade,
        notas: parsed.data.notas ?? null,
      },
    })

    // O comprador de um voucher é um lead em potencial — regista-o no CRM
    // automaticamente (upsert por telefone) com uma nota da compra, para a
    // Bea não precisar de o fazer à mão sempre que emite um voucher.
    if (parsed.data.compradorTelefone) {
      const telefone = normalizarTelefone(parsed.data.compradorTelefone)
      if (telefone) {
        const clienteExistente = await prisma.cliente.findUnique({ where: { telefone } })
        const cliente = clienteExistente ?? await prisma.cliente.create({
          data: {
            nome: parsed.data.compradorNome,
            telefone,
            estado: "lead",
            fonte: "voucher",
          },
        })
        await prisma.observacao.create({
          data: {
            clienteId: cliente.id,
            texto: `Comprou o voucher ${parsed.data.codigo} (${parsed.data.servicoNome}, ${parsed.data.valorPago}€).`,
            autor: session.user?.name ?? "bea",
          },
        })
      }
    }

    revalidatePath("/vouchers")
    return { ok: true }
  } catch {
    return { ok: false, erro: "Erro ao criar voucher" }
  }
}
