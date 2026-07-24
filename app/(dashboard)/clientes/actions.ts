"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { auditar } from "@/lib/audit"
import { webhooks } from "@/lib/webhooks"
import { clienteUpdateSchema, normalizarTelefone } from "@/lib/validations"
import type { EstadoCliente, Prisma } from "@/lib/prisma-client"

async function verificarSessao() {
  const session = await auth()
  if (!session?.user) throw new Error("Não autenticado")
  return session
}

// ── Tags ────────────────────────────────────────────────────────

export async function adicionarEtiqueta(clienteId: string, etiquetaId: string) {
  const session = await verificarSessao()
  const result = await prisma.clienteEtiqueta.upsert({
    where:  { clienteId_etiquetaId: { clienteId, etiquetaId } },
    create: { clienteId, etiquetaId },
    update: {},
    select: { etiqueta: { select: { nome: true } } },
  })
  auditar({
    quem: session.user?.email ?? "dashboard",
    acao: "etiqueta.adicionada",
    entidade: "Cliente",
    entidadeId: clienteId,
    detalhe: { etiquetaId, nome: result.etiqueta.nome },
  })
  revalidatePath(`/clientes/${clienteId}`)
}

export async function removerEtiqueta(clienteId: string, etiquetaId: string) {
  const session = await verificarSessao()
  const etiqueta = await prisma.etiqueta.findUnique({ where: { id: etiquetaId }, select: { nome: true } })
  await prisma.clienteEtiqueta.deleteMany({ where: { clienteId, etiquetaId } })
  auditar({
    quem: session.user?.email ?? "dashboard",
    acao: "etiqueta.removida",
    entidade: "Cliente",
    entidadeId: clienteId,
    detalhe: { etiquetaId, nome: etiqueta?.nome },
  })
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

// ── Edição inline de campos do perfil ────────────────────────────
// Uma única action genérica para todos os campos editáveis (InlineEditField),
// em vez de um editor dedicado por campo. Valida contra o mesmo Zod schema
// da API (clienteUpdateSchema) — nunca duplica regras. totalSessoes/totalGasto/
// ultimaSessao ficam de fora (calculados); estado e terapeutaPrincipalId já têm
// as suas próprias actions acima (com webhook e permissão de admin).
const CAMPOS_CLIENTE_EDITAVEIS = [
  "nome", "telefone", "email", "dataNascimento", "comoNosConheceu", "fonte",
  "canalPreferido", "temWhatsapp", "aceitaMarketing", "melhorDiaContacto",
  "historicoAromasPreferidos", "historicoCondicoesAlergias", "historicoEstadoEmocional",
  "historicoZonasTensao", "historicoUltimaPausa", "notasPessoais", "fichaClinica",
] as const
type CampoClienteEditavel = typeof CAMPOS_CLIENTE_EDITAVEIS[number]

export async function atualizarCampoCliente(
  clienteId: string,
  campo: CampoClienteEditavel,
  valor: unknown
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const session = await verificarSessao()

  if (!CAMPOS_CLIENTE_EDITAVEIS.includes(campo)) {
    return { ok: false, erro: "Campo não editável" }
  }

  // Validação campo-a-campo contra o schema partilhado com a API (sem duplicar regras)
  const parsed = clienteUpdateSchema.safeParse({ [campo]: valor })
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Valor inválido" }
  }
  let valorValidado = (parsed.data as Record<string, unknown>)[campo]

  // Indicativo obrigatório — evita ambiguidade entre números nacionais e
  // internacionais quando alguém escreve o telefone à mão no dashboard.
  if (campo === "telefone" && valorValidado) {
    const telefoneStr = String(valorValidado).trim()
    if (!telefoneStr.startsWith("+")) {
      return { ok: false, erro: "O telefone tem de incluir o indicativo do país (ex: +351 911 150 025)." }
    }
    // Guarda no mesmo formato normalizado que o resto do sistema já usa
    // (webhook Calendly, WhatsApp) — nunca duplicar formatos na mesma coluna.
    valorValidado = normalizarTelefone(telefoneStr)
  }

  // Guarda anti-colisão — clientes são upsert por telefone/email, nunca duplicar (CLAUDE.md)
  if ((campo === "telefone" || campo === "email") && valorValidado) {
    const existente = await prisma.cliente.findFirst({
      where: { id: { not: clienteId }, apagadoEm: null, [campo]: valorValidado as string },
      select: { id: true, nome: true },
    })
    if (existente) {
      return {
        ok: false,
        erro: `Já existe outra cliente (${existente.nome}) com este ${campo === "telefone" ? "telefone" : "email"}.`,
      }
    }
  }

  const clienteAntes = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { [campo]: true } as Prisma.ClienteSelect,
  })

  const dataUpdate: Record<string, unknown> = { [campo]: valorValidado }
  if (campo === "dataNascimento" && typeof valorValidado === "string") {
    dataUpdate[campo] = new Date(valorValidado)
  }

  await prisma.cliente.update({
    where: { id: clienteId },
    data: dataUpdate as Prisma.ClienteUpdateInput,
  })

  const valorAntes = (clienteAntes as Record<string, unknown> | null)?.[campo] ?? null

  auditar({
    quem: session.user?.email ?? "dashboard",
    acao: "cliente.campo_atualizado",
    entidade: "Cliente",
    entidadeId: clienteId,
    detalhe: {
      campo,
      de: (valorAntes instanceof Date ? valorAntes.toISOString() : valorAntes) as Prisma.InputJsonValue,
      para: (valorValidado ?? null) as Prisma.InputJsonValue,
    },
  })

  revalidatePath(`/clientes/${clienteId}`)
  revalidatePath("/clientes")
  return { ok: true }
}

// ── Terapeuta responsável ───────────────────────────────────────

export async function atribuirTerapeutaCliente(clienteId: string, terapeutaId: string | null) {
  const session = await verificarSessao()
  const role = (session.user as { role?: string })?.role ?? "terapeuta"
  if (role !== "admin") throw new Error("Apenas o administrador pode mudar a terapeuta")

  // Validar que o destino é mesmo uma terapeuta (ou null para remover atribuição)
  if (terapeutaId) {
    const terapeuta = await prisma.user.findUnique({ where: { id: terapeutaId }, select: { id: true } })
    if (!terapeuta) throw new Error("Terapeuta não encontrada")
  }

  const anterior = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { terapeutaPrincipalId: true },
  })

  await prisma.cliente.update({
    where: { id: clienteId },
    data: { terapeutaPrincipalId: terapeutaId },
  })

  auditar({
    quem: session.user?.email ?? "admin",
    acao: "cliente.terapeuta_alterada",
    entidade: "Cliente",
    entidadeId: clienteId,
    detalhe: { de: anterior?.terapeutaPrincipalId ?? null, para: terapeutaId },
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
