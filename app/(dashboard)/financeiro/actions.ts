"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

async function verificarSessao() {
  const session = await auth()
  if (!session?.user) throw new Error("Não autenticado")
  return session
}

// ── Pagamento de sessão ───────────────────────────────────────

export async function atualizarPagamento(
  sessaoId: string,
  dados: {
    estadoPagamento: "pendente" | "pago" | "parcial" | "isento"
    valorPago?: number | null
    metodoPagamento?: "dinheiro" | "mbway" | "transferencia" | "voucher" | null
  }
) {
  await verificarSessao()

  await prisma.sessao.update({
    where: { id: sessaoId },
    data: {
      estadoPagamento: dados.estadoPagamento,
      valorPago: dados.valorPago ?? null,
      metodoPagamento: dados.metodoPagamento ?? null,
      pagamentoEm: dados.estadoPagamento === "pago" ? new Date() : undefined,
    },
  })

  revalidatePath("/financeiro")
}

// ── Gift Cards / Vouchers ─────────────────────────────────────

export async function criarVoucher(dados: {
  tipo: "digital" | "fisico"
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

  const ano = new Date(dados.dataCompra).getFullYear()
  // Digital: EWD2026-XXXX | Físico: EW2026-XXXX
  const prefixo = dados.tipo === "digital" ? `EWD${ano}` : `EW${ano}`

  // Próximo número de sequência para este prefixo/ano
  const existentes = await prisma.giftCard.count({
    where: { codigo: { startsWith: prefixo } },
  })
  const seq = String(existentes + 1).padStart(4, "0")
  const codigo = `${prefixo}-${seq}`

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

  revalidatePath("/financeiro")
  return { codigo }
}

export async function atualizarEstadoVoucher(
  voucherId: string,
  estado: "ativo" | "usado" | "expirado" | "cancelado"
) {
  await verificarSessao()

  await prisma.giftCard.update({
    where: { id: voucherId },
    data: {
      estado,
      dataUso: estado === "usado" ? new Date() : undefined,
    },
  })

  revalidatePath("/financeiro")
}
