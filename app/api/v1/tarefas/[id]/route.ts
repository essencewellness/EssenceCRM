import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKeyOuSessao } from "@/lib/api-auth"
import { validarBody, tarefaUpdateSchema } from "@/lib/validations"
import { auditar } from "@/lib/audit"
import { auth } from "@/lib/auth"
import { verificarRateLimit } from "@/lib/rate-limit"

const TRANSICOES_INVALIDAS: Record<string, string[]> = {
  concluida: ["pendente", "em_progresso"],
  cancelada:  ["pendente", "em_progresso", "concluida"],
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const apiKeyError = await validarApiKeyOuSessao(request)
  if (apiKeyError) return apiKeyError

  const bloqueio = await verificarRateLimit(request, {
    recurso: "tarefa-patch",
    limite: 100,
    janelaSeg: 3600,
  })
  if (bloqueio) return bloqueio

  const { id } = await params

  const tarefa = await prisma.tarefa.findUnique({ where: { id } })
  if (!tarefa) {
    return NextResponse.json({ error: "Tarefa não encontrada", code: "TAREFA_NAO_ENCONTRADA" }, { status: 404 })
  }

  const validacao = await validarBody(request, tarefaUpdateSchema)
  if (!validacao.ok) return validacao.resposta
  const dados = validacao.data

  // Validar transição de estado
  if (dados.estado && dados.estado !== tarefa.estado) {
    const estadosProibidos = TRANSICOES_INVALIDAS[tarefa.estado]
    if (estadosProibidos?.includes(dados.estado)) {
      return NextResponse.json(
        { error: `Transição inválida: ${tarefa.estado} → ${dados.estado}`, code: "TRANSICAO_INVALIDA" },
        { status: 422 }
      )
    }
  }

  const update: Record<string, unknown> = { ...dados }
  if (dados.dataLimite !== undefined) {
    update.dataLimite = dados.dataLimite ? new Date(dados.dataLimite) : null
  }
  // Preencher resolvidaEm automaticamente quando concluída
  if (dados.estado === "concluida" && !tarefa.resolvidaEm) {
    update.resolvidaEm = new Date()
  }

  const atualizada = await prisma.tarefa.update({
    where: { id },
    data: update as Parameters<typeof prisma.tarefa.update>[0]["data"],
    include: {
      cliente: { select: { id: true, nome: true } },
      atribuida: { select: { id: true, name: true } },
    },
  })

  // AuditLog
  let quem = "api:n8n"
  try {
    const session = await auth()
    if (session?.user?.email) quem = session.user.email
  } catch { /* ignora */ }

  const acao = dados.estado === "concluida" ? "tarefa.concluida" : "tarefa.atualizada"
  auditar({
    quem,
    acao,
    entidade: "Tarefa",
    entidadeId: id,
    detalhe: { alteracoes: dados, titulo: tarefa.titulo },
  })

  return NextResponse.json({ data: atualizada, meta: { timestamp: new Date().toISOString() } })
}
