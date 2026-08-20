"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { voucherCreateSchema, voucherUpdateSchema, normalizarTelefone } from "@/lib/validations"
import { adicionarMeses, origemDoVoucher, linkDoVoucher } from "@/lib/utils"
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
  // O que aparece no voucher que a pessoa recebe
  "nomesNoVoucher", "mensagemVoucher",
  // De quem é a receita desta venda. Null = da Bea (o normal); passa-se
  // para a Cristina quando é ela que vai fazer a sessão.
  "terapeutaId",
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
  dataCompra?: string
  notas?: string
  nomesNoVoucher?: string
  mensagemVoucher?: string
  /** Descrição do serviço no catálogo — vai no link para a página mostrar. */
  descricaoServico?: string
}): Promise<{ ok: true; link: string } | { ok: false; erro: string }> {
  const session = await verificarSessao()

  const parsed = voucherCreateSchema.safeParse(dados)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { ok: false, erro: `${issue?.path.join(".") ?? "Campo"}: ${issue?.message ?? "inválido"}` }
  }

  const existente = await prisma.giftCard.findUnique({ where: { codigo: parsed.data.codigo } })
  if (existente) return { ok: false, erro: "Já existe um voucher com este código." }

  // A validade é sempre derivada, nunca escrita à mão: 6 meses a contar da
  // data de compra — o prazo que a Essence pratica em todos os vouchers
  // emitidos (ver folha de controlo).
  const dataCompra = parsed.data.dataCompra ? new Date(parsed.data.dataCompra) : new Date()
  const validade = adicionarMeses(dataCompra, 6)

  try {
    const voucher = await prisma.giftCard.create({
      data: {
        codigo: parsed.data.codigo,
        tipo: parsed.data.tipo ?? "digital",
        compradorNome: parsed.data.compradorNome,
        compradorTelefone: parsed.data.compradorTelefone ?? null,
        servicoNome: parsed.data.servicoNome,
        valorPago: new Prisma.Decimal(parsed.data.valorPago),
        beneficiarioNome: parsed.data.beneficiarioNome ?? null,
        dataCompra,
        validade,
        notas: parsed.data.notas ?? null,
        nomesNoVoucher: parsed.data.nomesNoVoucher ?? null,
        mensagemVoucher: parsed.data.mensagemVoucher ?? null,
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
            // Coluna "Origem" na lista de Leads — diz de onde veio e para
            // quem foi, sem ser preciso abrir a ficha.
            comoNosConheceu: origemDoVoucher(parsed.data.codigo, parsed.data.beneficiarioNome),
          },
        })
        await prisma.observacao.create({
          data: {
            clienteId: cliente.id,
            texto: `Comprou o voucher ${parsed.data.codigo} (${parsed.data.servicoNome}, ${parsed.data.valorPago}€).`,
            autor: session.user?.name ?? "bea",
          },
        })
        // Liga a compra à ficha do comprador — é o que alimenta o separador
        // "Vouchers" no perfil dele. Sem isto a nota acima era o único
        // vestígio, e não dava para listar nem contar as compras.
        await prisma.giftCard.update({
          where: { id: voucher.id },
          data: { compradorClienteId: cliente.id },
        })
      }
    }

    revalidatePath("/vouchers")
    // O link é o que a Bea vai enviar à pessoa — devolvido já pronto para
    // não haver um segundo passo noutra ferramenta.
    return {
      ok: true,
      link: linkDoVoucher({
        codigo: voucher.codigo,
        servicoNome: voucher.servicoNome,
        nomesNoVoucher: voucher.nomesNoVoucher,
        compradorNome: voucher.compradorNome,
        beneficiarioNome: voucher.beneficiarioNome,
        mensagemVoucher: voucher.mensagemVoucher,
        validade: voucher.validade,
        descricaoServico: dados.descricaoServico ?? null,
      }),
    }
  } catch {
    return { ok: false, erro: "Erro ao criar voucher" }
  }
}
