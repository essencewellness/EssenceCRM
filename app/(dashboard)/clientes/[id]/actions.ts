"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { auditar } from "@/lib/audit"
import { EstadoSessao, Prisma } from "@prisma/client"

// Soft delete — preserva histórico clínico; apagamento RGPD definitivo é via API /rgpd
export async function eliminarCliente(clienteId: string) {
  const session = await auth()
  if (!session?.user) throw new Error("Não autorizado")

  await prisma.cliente.update({
    where: { id: clienteId },
    data: { apagadoEm: new Date() },
  })

  auditar({
    quem: session.user.email ?? "dashboard",
    acao: "cliente.apagado_soft",
    entidade: "Cliente",
    entidadeId: clienteId,
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
