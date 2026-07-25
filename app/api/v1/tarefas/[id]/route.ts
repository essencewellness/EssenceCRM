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

  const tarefa = await prisma.tarefa.findUnique({
    where: { id },
    include: { cliente: { select: { terapeutaPrincipalId: true } } },
  })
  if (!tarefa) {
    return NextResponse.json({ error: "Tarefa não encontrada", code: "TAREFA_NAO_ENCONTRADA" }, { status: 404 })
  }

  // Isolamento por sessão: mesmo padrão de GET /api/v1/tarefas — uma
  // terapeuta (não-admin) só pode alterar tarefas dos SEUS clientes ou
  // atribuídas a si. Sem isto, qualquer terapeuta autenticada conseguia
  // concluir/cancelar/reatribuir tarefas de outra colega só por
  // adivinhar o id. Chamadas N8N (X-API-Key sem sessão) não são afetadas.
  try {
    const session = await auth()
    const u = session?.user as { id?: string; role?: string } | undefined
    if (u?.id && u.role !== "admin") {
      const donaDoCliente = tarefa.cliente?.terapeutaPrincipalId === u.id
      const atribuidaAoUtilizador = tarefa.atribuidaA === u.id
      if (!donaDoCliente && !atribuidaAoUtilizador) {
        return NextResponse.json(
          { error: "Não tens permissão para alterar esta tarefa.", code: "SEM_PERMISSAO" },
          { status: 403 }
        )
      }
    }
  } catch { /* sem sessão (N8N) — sem scope, comportamento igual ao GET */ }

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
