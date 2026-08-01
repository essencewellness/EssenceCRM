"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

async function verificarSessao() {
  const session = await auth()
  if (!session?.user) throw new Error("Não autenticado")
  return session
}

// Adiciona/troca a tag de voucher no cliente correspondente (fire-and-forget)
async function sincronizarTagVoucher(
  telefone: string | null | undefined,
  tagNomeRemover: string | null,
  tagNomeAdicionar: string
) {
  if (!telefone) return

  const cliente = await prisma.cliente.findFirst({
    where: { telefone, apagadoEm: null },
    select: { id: true },
  })
  if (!cliente) return

  const [tagRemover, tagAdicionar] = await Promise.all([
    tagNomeRemover ? prisma.etiqueta.findFirst({ where: { nome: tagNomeRemover } }) : null,
    prisma.etiqueta.findFirst({ where: { nome: tagNomeAdicionar } }),
  ])

  if (tagRemover) {
    await prisma.clienteEtiqueta.deleteMany({
      where: { clienteId: cliente.id, etiquetaId: tagRemover.id },
    })
  }

  if (tagAdicionar) {
    await prisma.clienteEtiqueta.upsert({
      where: { clienteId_etiquetaId: { clienteId: cliente.id, etiquetaId: tagAdicionar.id } },
      create: { clienteId: cliente.id, etiquetaId: tagAdicionar.id },
      update: {},
    })
  }
}

// ── Pagamento de sessão ───────────────────────────────────────

export async function atualizarPagamento(
  sessaoId: string,
  dados: {
    estadoPagamento: "pendente" | "pago" | "parcial" | "isento"
    valorPago?: number | null
    metodoPagamento?: "dinheiro" | "mbway" | "mbway_essence" | "mbway_beatriz" | "transferencia" | "voucher" | null
  }
) {
  await verificarSessao()

  // Só há um MBWay físico (é da Bea) — se a sessão é da Cristina e o
  // pagamento passa a ser por lá, fica um repasse por fazer até a Bea
  // entregar a parte dela em mão.
  const sessao = await prisma.sessao.findUnique({ where: { id: sessaoId }, select: { terapeuta: true } })
  const ehCristina = /cristina/i.test(sessao?.terapeuta ?? "")
  const ehMbway = dados.metodoPagamento === "mbway_essence" || dados.metodoPagamento === "mbway_beatriz"
  const emAberto = dados.estadoPagamento === "pago" || dados.estadoPagamento === "parcial"

  await prisma.sessao.update({
    where: { id: sessaoId },
    data: {
      estadoPagamento: dados.estadoPagamento,
      valorPago: dados.valorPago ?? null,
      metodoPagamento: dados.metodoPagamento ?? null,
      pagamentoEm: dados.estadoPagamento === "pago" ? new Date() : undefined,
      repasseNecessario: ehCristina && ehMbway && emAberto,
    },
  })

  revalidatePath("/financeiro")
}

// ── Repasse à Cristina (MBWay cai sempre na conta da Bea) ─────
export async function marcarRepasseFeito(sessaoId: string) {
  await verificarSessao()

  await prisma.sessao.update({
    where: { id: sessaoId },
    data: { repasseFeito: true, repasseFeitoEm: new Date() },
  })

  revalidatePath("/financeiro")
}

// ── Gift Cards / Vouchers ─────────────────────────────────────

export async function criarVoucher(dados: {
  tipo: "digital" | "fisico"
  codigo?: string
  compradorNome: string
  compradorTelefone?: string
  compradorEmail?: string
  servicoNome: string
  valorPago: number
  beneficiarioNome?: string
  beneficiarioTelefone?: string
  dataCompra: string
  validade?: string
  notas?: string
}): Promise<{ codigo: string }> {
  await verificarSessao()

  let codigo = dados.codigo?.trim() || ""

  if (!codigo) {
    const ano = new Date(dados.dataCompra).getFullYear()
    // Digital: EWD2026-XXXX | Físico: EW2026-XXXX
    const prefixo = dados.tipo === "digital" ? `EWD${ano}` : `EW${ano}`
    const existentes = await prisma.giftCard.count({
      where: { codigo: { startsWith: prefixo } },
    })
    const seq = String(existentes + 1).padStart(4, "0")
    codigo = `${prefixo}-${seq}`
  }

  // Verificar se o código já existe
  const jaExiste = await prisma.giftCard.findUnique({ where: { codigo } })
  if (jaExiste) throw new Error(`O código "${codigo}" já está em uso.`)

  await prisma.giftCard.create({
    data: {
      codigo,
      tipo: dados.tipo,
      compradorNome: dados.compradorNome,
      compradorTelefone: dados.compradorTelefone || null,
      compradorEmail: dados.compradorEmail || null,
      servicoNome: dados.servicoNome,
      valorPago: dados.valorPago,
      beneficiarioNome: dados.beneficiarioNome || null,
      beneficiarioTelefone: dados.beneficiarioTelefone || null,
      dataCompra: new Date(dados.dataCompra),
      validade: dados.validade ? new Date(dados.validade) : null,
      notas: dados.notas || null,
    },
  })

  // Auto-tag: se houver beneficiário, marcar como "Voucher ativo"
  void sincronizarTagVoucher(dados.beneficiarioTelefone, null, "Voucher ativo")

  revalidatePath("/financeiro")
  return { codigo }
}

export async function atualizarEstadoVoucher(
  voucherId: string,
  estado: "ativo" | "usado" | "expirado" | "cancelado"
) {
  await verificarSessao()

  const voucher = await prisma.giftCard.findUnique({
    where: { id: voucherId },
    select: { beneficiarioTelefone: true },
  })

  await prisma.giftCard.update({
    where: { id: voucherId },
    data: {
      estado,
      dataUso: estado === "usado" ? new Date() : undefined,
    },
  })

  // Auto-tag: swap "Voucher ativo" → "Voucher usado" ao marcar como usado
  if (estado === "usado") {
    void sincronizarTagVoucher(voucher?.beneficiarioTelefone, "Voucher ativo", "Voucher usado")
  }

  revalidatePath("/financeiro")
}
