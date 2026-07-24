"use server"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { Prisma } from "@/lib/prisma-client"

export async function criarServico(formData: FormData) {
  const nome = formData.get("nome") as string
  const precoBase = parseFloat(formData.get("precoBase") as string)
  const duracaoMinutos = parseInt(formData.get("duracaoMinutos") as string) || 60
  const descricao = (formData.get("descricao") as string) || null

  if (!nome || isNaN(precoBase) || precoBase < 0) {
    return { erro: "Nome e preço base são obrigatórios" }
  }

  const existente = await prisma.servico.findUnique({ where: { nome } })
  if (existente) return { erro: "Já existe um serviço com este nome" }

  await prisma.servico.create({
    data: {
      nome,
      precoBase: new Prisma.Decimal(precoBase),
      duracaoMinutos,
      descricao,
    },
  })

  revalidatePath("/servicos")
  return { ok: true }
}
