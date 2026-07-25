import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKey, validarApiKeyOuSessao, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { webhooks } from "@/lib/webhooks"
import { clienteUpdateSchema, validarBody } from "@/lib/validations"
import { serializarDecimais } from "@/lib/serialize"
import { auditar } from "@/lib/audit"
import { verificarRateLimit } from "@/lib/rate-limit"
import { auth } from "@/lib/auth"
import { Prisma } from "@/lib/prisma-client"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const erro = await validarApiKeyOuSessao(request)
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

    // RGPD Art. 30 (responsabilização): registar quem consultou a ficha
    // clínica completa de uma cliente, não só quem a alterou/exportou.
    // Este GET aceita chave N8N OU sessão de dashboard — identifica a
    // sessão quando existe, para não misturar tudo debaixo de "api:n8n".
    const sessaoAtual = await auth()
    auditar({
      quem: sessaoAtual?.user?.email ?? "api:n8n",
      acao: "cliente.consultado",
      entidade: "Cliente",
      entidadeId: id,
      ip: request.headers.get("x-forwarded-for"),
    })

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

  const bloqueio = await verificarRateLimit(request, {
    recurso: "cliente-patch",
    limite: 100,
    janelaSeg: 3600,
  })
  if (bloqueio) return bloqueio

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
    // telefone/email @unique (schema) — devolver 409 claro em vez de
    // deixar cair no 500 genérico, mesmo padrão do POST /api/v1/clientes.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return respostaErro("Já existe outra cliente com este telefone ou email.", "CLIENTE_DUPLICADO", 409)
    }
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
