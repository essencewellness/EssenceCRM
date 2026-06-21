"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

async function verificarSessao() {
  const session = await auth()
  if (!session?.user) throw new Error("Não autenticado")
  return session
}

export async function atualizarEtiqueta(id: string, dados: {
  nome?: string
  cor?: string
  bloqueiaAutomacoes?: boolean
}) {
  await verificarSessao()

  if (dados.nome) {
    const existente = await prisma.etiqueta.findFirst({
      where: { nome: dados.nome.trim(), NOT: { id } },
    })
    if (existente) throw new Error(`NOME_DUPLICADO: A etiqueta "${dados.nome}" já existe.`)
  }

  await prisma.etiqueta.update({
    where: { id },
    data: {
      ...(dados.nome ? { nome: dados.nome.trim() } : {}),
      ...(dados.cor ? { cor: dados.cor } : {}),
      ...(dados.bloqueiaAutomacoes !== undefined ? { bloqueiaAutomacoes: dados.bloqueiaAutomacoes } : {}),
    },
  })

  revalidatePath("/etiquetas")
  revalidatePath("/clientes")
}

export async function apagarEtiqueta(id: string) {
  await verificarSessao()

  // Cascade: ClienteEtiqueta apagadas pelo Prisma (onDelete: Cascade no schema)
  await prisma.etiqueta.delete({ where: { id } })

  revalidatePath("/etiquetas")
  revalidatePath("/clientes")
}
