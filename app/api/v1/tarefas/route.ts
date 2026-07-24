import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKeyOuSessao } from "@/lib/api-auth"
import { validarBody, validarQuery, tarefaCreateSchema, tarefaQuerySchema } from "@/lib/validations"
import { auditar } from "@/lib/audit"
import { auth } from "@/lib/auth"
import { verificarRateLimit } from "@/lib/rate-limit"
import type { Prisma } from "@/lib/prisma-client"

export async function GET(request: NextRequest) {
  const apiKeyError = await validarApiKeyOuSessao(request)
  if (apiKeyError) return apiKeyError

  const validacao = validarQuery(request.url, tarefaQuerySchema)
  if (!validacao.ok) return validacao.resposta
  const q = validacao.data

  const where: Prisma.TarefaWhereInput = {}
  if (q.clienteId) where.clienteId = q.clienteId
  if (q.estado) where.estado = q.estado
  if (q.atribuidaA) where.atribuidaA = q.atribuidaA
  if (q.tipo) where.tipo = q.tipo
  if (q.prioridade) where.prioridade = q.prioridade
  if (q.de || q.ate) {
    where.dataLimite = {
      ...(q.de ? { gte: new Date(q.de) } : {}),
      ...(q.ate ? { lte: new Date(q.ate) } : {}),
    }
  }

  // Isolamento por sessão: terapeuta (não-admin) só vê tarefas dos SEUS clientes
  // ou atribuídas a si. Admin pode filtrar por terapeuta via ?terapeuta=.
  // Chamadas N8N (X-API-Key sem cookie de sessão) não são afetadas.
  try {
    const session = await auth()
    const u = session?.user as { id?: string; role?: string } | undefined
    if (u?.id && u.role !== "admin") {
      where.OR = [
        { cliente: { terapeutaPrincipalId: u.id } },
        { atribuidaA: u.id },
      ]
    } else if (u?.role === "admin" && q.terapeuta) {
      where.cliente = { terapeutaPrincipalId: q.terapeuta }
    }
  } catch { /* sem sessão (N8N) — sem scope */ }

  const tarefas = await prisma.tarefa.findMany({
    where,
    include: {
      cliente: { select: { id: true, nome: true, telefone: true } },
      atribuida: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ estado: "asc" }, { dataLimite: "asc" }, { criadoEm: "desc" }],
    take: q.limit + 1,
    ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
  })

  const hasMore = tarefas.length > q.limit
  const data = hasMore ? tarefas.slice(0, q.limit) : tarefas
  const nextCursor = hasMore ? data[data.length - 1]?.id : undefined

  const total = await prisma.tarefa.count({ where })

  return NextResponse.json({
    data,
    meta: { nextCursor, total, timestamp: new Date().toISOString() },
  })
}

export async function POST(request: NextRequest) {
  const apiKeyError = await validarApiKeyOuSessao(request)
  if (apiKeyError) return apiKeyError

  const bloqueio = await verificarRateLimit(request, {
    recurso: "tarefa-post",
    limite: 100,
    janelaSeg: 3600,
  })
  if (bloqueio) return bloqueio

  const validacao = await validarBody(request, tarefaCreateSchema)
  if (!validacao.ok) return validacao.resposta
  const dados = validacao.data

  if (dados.clienteId) {
    const existe = await prisma.cliente.findUnique({ where: { id: dados.clienteId }, select: { id: true } })
    if (!existe) {
      return NextResponse.json({ error: "Cliente não encontrado", code: "CLIENTE_NAO_ENCONTRADO" }, { status: 404 })
    }
  }

  // criadoPor: tentar extrair userId da sessão JWT; fallback "api:n8n"
  let criadoPor = "api:n8n"
  try {
    const session = await auth()
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
      if (user) criadoPor = user.id
    }
  } catch { /* ignora — pode não haver sessão em chamadas N8N */ }

  const tarefa = await prisma.tarefa.create({
    data: {
      clienteId:  dados.clienteId ?? null,
      titulo:     dados.titulo,
      descricao:  dados.descricao ?? null,
      dataLimite: dados.dataLimite ? new Date(dados.dataLimite) : null,
      prioridade: dados.prioridade ?? "normal",
      tipo:       dados.tipo ?? "follow_up",
      atribuidaA: dados.atribuidaA ?? null,
      criadoPor,
    },
  })

  auditar({
    quem: criadoPor,
    acao: "tarefa.criada",
    entidade: "Tarefa",
    entidadeId: tarefa.id,
    detalhe: { titulo: tarefa.titulo, clienteId: tarefa.clienteId },
  })

  return NextResponse.json(
    { data: tarefa, meta: { timestamp: new Date().toISOString() } },
    { status: 201 }
  )
}
