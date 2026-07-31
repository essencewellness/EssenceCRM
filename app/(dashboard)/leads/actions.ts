"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { auditar } from "@/lib/audit"
import { webhooks } from "@/lib/webhooks"
import { normalizarTelefone } from "@/lib/validations"

// mesma forma (trim + lowercase) que lib/validations.ts usa em todos os
// outros schemas — email fica @unique no schema, e maiúsculas diferentes
// ("Maria@..." vs "maria@...") criariam duas clientes para a mesma pessoa
const emailSchema = z.string().trim().toLowerCase().email().max(254)

export interface CriarLeadManualInput {
  nome: string
  email?: string | null
  telefone?: string | null
  comoNosConheceu?: string | null
}

// Lead adicionada à mão pela Beatriz — ex: alguém perguntou pelo WhatsApp
// ou Instagram e depois não respondeu mais nada. Fica registada como
// "lead" (mesmo estado que os leads automáticos) para não se perder o
// contacto, com origem "manual" a distinguir de indicação/formulário.
// Erros esperados (validação, duplicado) vêm como { ok: false, erro } em vez
// de throw — a Next.js oculta a mensagem de erros lançados por Server
// Actions em produção, mostrando só um "An error occurred..." genérico. O
// resto do código desta pasta já segue este padrão (ver eliminarCliente em
// clientes/[id]/actions.ts). "Não autorizado" continua a ser throw, porque
// nunca deve acontecer através da UI normal.
export async function criarLeadManual(input: CriarLeadManualInput) {
  const session = await auth()
  if (!session?.user) throw new Error("Não autorizado")

  const nome = input.nome.trim()
  if (!nome) return { ok: false as const, erro: "O nome é obrigatório" }

  const emailBruto = input.email?.trim() || null
  const telefoneBruto = input.telefone?.trim() || null
  if (!emailBruto && !telefoneBruto) return { ok: false as const, erro: "Indica pelo menos um contacto (email ou telefone)" }
  const emailParse = emailBruto ? emailSchema.safeParse(emailBruto) : null
  if (emailParse && !emailParse.success) return { ok: false as const, erro: "Email inválido" }
  const email = emailParse?.data ?? null
  // Normalizado da mesma forma que o resto do CRM (POST /api/v1/clientes,
  // pesquisa por telefone) — senão esta lead não aparece numa pesquisa por
  // telefone feita a partir de outro sítio do sistema.
  const telefone = telefoneBruto ? normalizarTelefone(telefoneBruto) : null

  // Nunca duplicar — telefone/email já são @unique no schema, mas uma
  // mensagem clara aqui poupa um erro de constraint feio no ecrã da Bea.
  const existente = await prisma.cliente.findFirst({
    where: {
      apagadoEm: null,
      OR: [...(email ? [{ email }] : []), ...(telefone ? [{ telefone }] : [])],
    },
    select: { id: true, nome: true },
  })
  if (existente) return { ok: false as const, erro: `Já existe um registo para este contacto: ${existente.nome}` }

  const cliente = await prisma.cliente.create({
    data: {
      nome,
      email,
      telefone,
      fonte: "manual",
      comoNosConheceu: input.comoNosConheceu?.trim() || "manual",
      estado: "lead",
    },
  })

  auditar({
    quem: session.user.email ?? "dashboard",
    acao: "lead.criado_manual",
    entidade: "Cliente",
    entidadeId: cliente.id,
  })

  void webhooks.leadCriado({
    clienteId: cliente.id,
    nomeCliente: cliente.nome,
    email: cliente.email,
    telefone: cliente.telefone,
  })

  revalidatePath("/leads")
  return { ok: true as const, id: cliente.id }
}
