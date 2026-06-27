"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { auditar } from "@/lib/audit"
import { EstadoSessao, Prisma } from "@prisma/client"
import { recalcularMetricasCliente } from "@/lib/metricas"

// Apagamento DEFINITIVO do cliente (hard delete). A cascata do schema remove
// sessões, mensagens, etiquetas, observações, preços, packs e portal token.
// Como Sessao.clienteId é obrigatório, apagar o cliente implica apagar as sessões:
// se o cliente tiver sessões, exige-se confirmação explícita (apagarSessoes).
export async function eliminarCliente(clienteId: string, apagarSessoes = false) {
  const session = await auth()
  if (!session?.user) throw new Error("Não autorizado")

  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { id: true, nome: true, _count: { select: { sessoes: true } } },
  })
  if (!cliente) throw new Error("Cliente não encontrado")

  // Se há sessões e não foi confirmado apagá-las, bloquear (a cascata removê-las-ia)
  if (cliente._count.sessoes > 0 && !apagarSessoes) {
    return { ok: false as const, motivo: "TEM_SESSOES" as const, sessoes: cliente._count.sessoes }
  }

  // Hard delete — onDelete: Cascade no schema remove tudo o que depende do cliente
  await prisma.cliente.delete({ where: { id: clienteId } })

  auditar({
    quem: session.user.email ?? "dashboard",
    acao: "cliente.apagado_definitivo",
    entidade: "Cliente",
    entidadeId: clienteId,
    detalhe: { nome: cliente.nome, sessoesApagadas: cliente._count.sessoes },
  })

  revalidatePath("/clientes")
  redirect("/clientes")
}

// Atualizar estado/notas de uma sessão (SessoesTab)
export async function atualizarObservacoesSessao(
  sessaoId: string,
  clienteId: string,
  dados: {
    resumoSessao?: string
    notasPosSessao?: string
    estadoEmocional?: string
    estado?: EstadoSessao
  }
) {
  const session = await auth()
  if (!session?.user) throw new Error("Não autorizado")

  await prisma.sessao.update({
    where: { id: sessaoId },
    data: dados as Prisma.SessaoUpdateInput,
  })

  auditar({
    quem: session.user.email ?? "dashboard",
    acao: "sessao.atualizada",
    entidade: "Sessao",
    entidadeId: sessaoId,
  })

  revalidatePath(`/clientes/${clienteId}`)
}
