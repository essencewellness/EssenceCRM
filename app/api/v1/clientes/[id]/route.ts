import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKey, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { webhooks } from "@/lib/webhooks"
import { clienteUpdateSchema, validarBody } from "@/lib/validations"
import { serializarDecimais } from "@/lib/serialize"
import { auditar } from "@/lib/audit"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const { id } = await params

  try {
    const cliente = await prisma.cliente.findFirst({
      where: { id, apagadoEm: null },
      include: {
        sessoes: { where: { apagadoEm: null }, orderBy: { data: "desc" }, take: 10 },
        etiquetas: { include: { etiqueta: true } },
        mensagens: { orderBy: { geradaEm: "desc" }, take: 5 },
        observacoes: { orderBy: { criadoEm: "desc" }, take: 10 },
        tarefas: { orderBy: { criadoEm: "desc" }, take: 10 },
        precos: {
          include: { servico: { select: { nome: true, precoBase: true } } },
          orderBy: { criadoEm: "desc" },
        },
        packs: {
          where: { ativo: true },
          include: { servico: { select: { nome: true } } },
          orderBy: { criadoEm: "desc" },
        },
      },
    })

    if (!cliente) return respostaErro("Cliente não encontrado", "CLIENTE_NAO_ENCONTRADO", 404)

    return respostaSucesso(serializarDecimais(cliente))
  } catch (error) {
    console.error("GET /api/v1/clientes/[id]:", (error as Error).message)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const { id } = await params

  // Whitelist estrita via Zod — substitui o spread de body inteiro (mass-assignment)
  const v = await validarBody(request, clienteUpdateSchema)
  if (!v.ok) return v.resposta
  const campos = v.data

  try {
    const clienteAntes = await prisma.cliente.findFirst({
      where: { id, apagadoEm: null },
      select: { id: true, nome: true, estado: true },
    })

    if (!clienteAntes) return respostaErro("Cliente não encontrado", "CLIENTE_NAO_ENCONTRADO", 404)

    const cliente = await prisma.cliente.update({
      where: { id },
      data: {
        ...campos,
        ...(campos.dataNascimento ? { dataNascimento: new Date(campos.dataNascimento) } : {}),
        ...(campos.ultimaSessao ? { ultimaSessao: new Date(campos.ultimaSessao) } : {}),
        ...(campos.consentimentoMarketingEm
          ? { consentimentoMarketingEm: new Date(campos.consentimentoMarketingEm) }
          : {}),
        ...(campos.consentimentoSaudeEm
          ? { consentimentoSaudeEm: new Date(campos.consentimentoSaudeEm) }
          : {}),
      },
    })

    auditar({
      quem: "api:n8n",
      acao: "cliente.atualizado",
      entidade: "Cliente",
      entidadeId: id,
      detalhe: { campos: Object.keys(campos) },
      ip: request.headers.get("x-forwarded-for"),
    })

    // Webhook quando estado muda
    if (campos.estado && campos.estado !== clienteAntes.estado) {
      void webhooks.clienteEstadoAlterado({
        clienteId: id,
        nomeCliente: clienteAntes.nome,
        estadoAnterior: clienteAntes.estado,
        estadoNovo: campos.estado,
      })
    }

    return respostaSucesso(serializarDecimais(cliente))
  } catch (error) {
    console.error("PATCH /api/v1/clientes/[id]:", (error as Error).message)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}

// Soft delete — marca como apagada, preserva histórico clínico para auditoria.
// O apagamento RGPD definitivo (anonimização) é feito via /rgpd.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const { id } = await params

  try {
    const cliente = await prisma.cliente.findFirst({
      where: { id, apagadoEm: null },
      select: { id: true, nome: true },
    })
    if (!cliente) return respostaErro("Cliente não encontrado", "CLIENTE_NAO_ENCONTRADO", 404)

    const agora = new Date()
    await prisma.$transaction([
      prisma.cliente.update({
        where: { id },
        data: { apagadoEm: agora },
      }),
      // Arrastar as sessões: soft-delete + libertar o calendlyEventId
      // (senão o @unique impede recriar a sessão se a marcação voltar a entrar)
      prisma.sessao.updateMany({
        where: { clienteId: id, apagadoEm: null },
        data: { apagadoEm: agora, calendlyEventId: null },
      }),
    ])

    auditar({
      quem: "api:n8n",
      acao: "cliente.apagado_soft",
      entidade: "Cliente",
      entidadeId: id,
      ip: request.headers.get("x-forwarded-for"),
    })

    return respostaSucesso({ id, apagado: true })
  } catch (error) {
    console.error("DELETE /api/v1/clientes/[id]:", (error as Error).message)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
