"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { auditar } from "@/lib/audit"
import { webhooks } from "@/lib/webhooks"
import type { EstadoCliente } from "@prisma/client"

async function verificarSessao() {
  const session = await auth()
  if (!session?.user) throw new Error("Não autenticado")
  return session
}

// ── Tags ────────────────────────────────────────────────────────

export async function adicionarEtiqueta(clienteId: string, etiquetaId: string) {
  await verificarSessao()
  await prisma.clienteEtiqueta.upsert({
    where:  { clienteId_etiquetaId: { clienteId, etiquetaId } },
    create: { clienteId, etiquetaId },
    update: {},
  })
  revalidatePath(`/clientes/${clienteId}`)
}

export async function removerEtiqueta(clienteId: string, etiquetaId: string) {
  await verificarSessao()
  await prisma.clienteEtiqueta.deleteMany({ where: { clienteId, etiquetaId } })
  revalidatePath(`/clientes/${clienteId}`)
}

export async function criarEtiqueta(dados: {
  nome: string
  cor: string
  tipo: "saude" | "campanha" | "preferencia"
  bloqueiaAutomacoes?: boolean
  atribuirClienteId?: string
}): Promise<{ id: string; nome: string }> {
  await verificarSessao()

  const existente = await prisma.etiqueta.findUnique({ where: { nome: dados.nome.trim() } })
  if (existente) throw new Error(`NOME_DUPLICADO: A etiqueta "${dados.nome}" já existe.`)

  const etiqueta = await prisma.etiqueta.create({
    data: {
      nome:               dados.nome.trim(),
      cor:                dados.cor,
      tipo:               dados.tipo,
      bloqueiaAutomacoes: dados.bloqueiaAutomacoes ?? false,
    },
  })

  if (dados.atribuirClienteId) {
    await prisma.clienteEtiqueta.create({
      data: { clienteId: dados.atribuirClienteId, etiquetaId: etiqueta.id },
    })
    revalidatePath(`/clientes/${dados.atribuirClienteId}`)
  }

  revalidatePath("/etiquetas")
  return { id: etiqueta.id, nome: etiqueta.nome }
}

// ── Estado CRM ──────────────────────────────────────────────────

export async function atualizarEstadoCliente(clienteId: string, estado: EstadoCliente) {
  const session = await verificarSessao()

  const anterior = await prisma.cliente.findUnique({ where: { id: clienteId }, select: { estado: true } })

  await prisma.cliente.update({ where: { id: clienteId }, data: { estado } })

  auditar({
    quem:      session.user?.email ?? "bea",
    acao:      "cliente.estado_alterado",
    entidade:  "Cliente",
    entidadeId: clienteId,
    detalhe:   { manual: true, de: anterior?.estado, para: estado },
  })

  void webhooks.clienteEstadoAlterado({
    clienteId,
    nomeCliente: "",
    estadoAnterior: anterior?.estado ?? "novo",
    estadoNovo:     estado,
  })

  revalidatePath(`/clientes/${clienteId}`)
  revalidatePath("/clientes")
}

// ── Campanhas ───────────────────────────────────────────────────

export async function criarCampanhaFromFiltro(dados: {
  nome: string
  templateId: string
  etiquetaIds: string[]
  estados?: EstadoCliente[]
  inativoDesdeDias?: number
}): Promise<{ campanhaId: string; totalCriadas: number; totalExcluidas: number }> {
  await verificarSessao()

  const baseWhere = {
    apagadoEm: null as null,
    ...(dados.etiquetaIds.length > 0 ? {
      etiquetas: { some: { etiquetaId: { in: dados.etiquetaIds } } },
    } : {}),
    ...(dados.estados && dados.estados.length > 0 ? {
      estado: { in: dados.estados },
    } : {}),
    ...(dados.inativoDesdeDias ? {
      ultimaSessao: { lt: new Date(Date.now() - dados.inativoDesdeDias * 86_400_000) },
    } : {}),
  }

  // Contar excluídos (têm tag bloqueante)
  const totalSemFiltro = await prisma.cliente.count({ where: baseWhere })

  const clientesFiltrados = await prisma.cliente.findMany({
    where: {
      ...baseWhere,
      NOT: { etiquetas: { some: { etiqueta: { bloqueiaAutomacoes: true } } } },
    },
    select: { id: true, nome: true },
    take: 200,
  })

  const totalExcluidas = totalSemFiltro - clientesFiltrados.length

  const template = await prisma.templateMensagem.findUnique({ where: { id: dados.templateId } })
  if (!template) throw new Error("Template não encontrado")

  const campanha = await prisma.campanha.create({
    data: {
      nome:      dados.nome,
      templateId: dados.templateId,
      segmento:  dados as object,
      estado:    "ativa",
    },
  })

  for (const cliente of clientesFiltrados) {
    const texto = template.texto.replace(/\{\{nome\}\}/g, cliente.nome.split(" ")[0])
    await prisma.mensagemIA.create({
      data: {
        clienteId:       cliente.id,
        campanhaId:      campanha.id,
        mensagemGerada:  texto,
        tipo:            "campanha",
        estado:          "pendente",
        motivoGeracao:   `Campanha: ${dados.nome}`,
      },
    })
  }

  revalidatePath("/mensagens")
  revalidatePath("/campanhas")

  return {
    campanhaId:    campanha.id,
    totalCriadas:  clientesFiltrados.length,
    totalExcluidas,
  }
}
