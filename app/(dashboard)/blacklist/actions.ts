"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function addToBlacklist(formData: FormData) {
  const session = await auth()
  if (!session?.user) throw new Error("Não autorizado")

  const nome = (formData.get("nome") as string)?.trim() || null
  const telefone = (formData.get("telefone") as string)?.trim().replace(/[^0-9+]/g, "") || null
  const email = (formData.get("email") as string)?.trim() || null
  const motivo = (formData.get("motivo") as string)?.trim() || null

  if (!nome && !telefone && !email) return

  const nomeFinal = nome || telefone || email || "Bloqueado"

  const orConditions = [
    ...(telefone ? [{ telefone }] : []),
    ...(email ? [{ email }] : []),
  ]

  const existing = orConditions.length > 0
    ? await prisma.cliente.findFirst({ where: { OR: orConditions } })
    : null

  if (existing) {
    await prisma.cliente.update({
      where: { id: existing.id },
      data: {
        estado: "blacklist",
        notasPessoais: motivo ? `[BLACKLIST] ${motivo}` : existing.notasPessoais,
      },
    })
  } else {
    await prisma.cliente.create({
      data: {
        nome: nomeFinal,
        telefone,
        email,
        estado: "blacklist",
        notasPessoais: motivo ? `[BLACKLIST] ${motivo}` : null,
        fonte: "blacklist",
      },
    })
  }

  revalidatePath("/blacklist")
}

export async function removeFromBlacklist(formData: FormData) {
  const session = await auth()
  if (!session?.user) throw new Error("Não autorizado")

  const id = formData.get("id") as string
  if (!id) return
  await prisma.cliente.update({
    where: { id },
    data: { estado: "perdida" },
  })
  revalidatePath("/blacklist")
}
