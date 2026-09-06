import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKey, validarApiKeyOuSessao, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { webhooks } from "@/lib/webhooks"
import { clienteUpdateSchema, validarBody, normalizarTelefone } from "@/lib/validations"
import { serializarDecimais } from "@/lib/serialize"
import { auditar } from "@/lib/audit"
import { verificarRateLimit } from "@/lib/rate-limit"
import { auth } from "@/lib/auth"
import { Prisma } from "@/lib/prisma-client"
import { gerarLinkToken } from "@/lib/link-token"

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
        feedbacks: { orderBy: { criadoEm: "desc" }, take: 5 },
        precos: {
          include: { servico: { select: { nome: true, precoBase: true } } },
          orderBy: { criadoEm: "desc" },
        },
        packs: {
          where: { ativo: true },
          include: { servico: { select: { nome: true } } },
          orderBy: { criadoEm: "desc" },
        },
        // Contexto de IA (WF11/WF18) até agora não tinha vouchers do
        // cliente — nem os que recebeu como beneficiária nem os que
        // comprou. As duas FKs são separadas de propósito (ver GiftCard no
        // schema): beneficiária != comprador.
        giftCards: { orderBy: { dataCompra: "desc" }, take: 10 },
        vouchersComprados: { orderBy: { dataCompra: "desc" }, take: 10 },
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

    // linkToken: código curto para o N8N construir links públicos (onboarding,
    // feedback) quando ainda não há sessaoId — ex.: lead a caminho da primeira
    // marcação. Quando já existe sessão, preferir o linkToken dessa sessão
    // (mais preciso — GET /sessoes ou o webhook Calendly).
    return respostaSucesso(
      serializarDecimais({ ...cliente, linkToken: await gerarLinkToken({ clienteId: cliente.id }) })
    )
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
      select: { id: true, nome: true, estado: true, fichaClinica: true },
    })

    if (!clienteAntes) return respostaErro("Cliente não encontrado", "CLIENTE_NAO_ENCONTRADO", 404)

    // "origemSessaoId" não é campo do Cliente — é só metadado para o
    // snapshot da ficha clínica abaixo (ver lib/ficha-clinica.ts). Nunca
    // pode chegar ao Prisma.
    const { origemSessaoId, ...camposParaGravar } = campos

    const cliente = await prisma.cliente.update({
      where: { id },
      data: {
        ...camposParaGravar,
        // Sem isto, um PATCH externo (N8N, integrações) grava o telefone tal
        // como vier — foi exactamente essa inconsistência que já causou um
        // bug real (vouchers nunca ligados ao cliente certo, 2026-09-07).
        ...(campos.telefone !== undefined
          ? { telefone: campos.telefone ? normalizarTelefone(campos.telefone) : null }
          : {}),
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

    // Regista qual sessão (origemSessaoId) despoletou esta escrita da ficha
    // clínica — se essa sessão vier a ser cancelada antes de acontecer, é
    // isto que permite assinalar o aviso no sítio certo (ver
    // lib/ficha-clinica.ts). fichaClinicaAnterior fica só como registo
    // histórico (já não é usado para reverter). Escrito de propósito (não
    // via auditar(), que é fire-and-forget) — sem isto persistido antes da
    // resposta, uma função serverless cortada a meio perdia a ligação.
    if (campos.fichaClinica !== undefined && campos.fichaClinica !== clienteAntes.fichaClinica) {
      await prisma.auditLog.create({
        data: {
          quem: "api:n8n",
          acao: "cliente.ficha_clinica_atualizada",
          entidade: "Cliente",
          entidadeId: id,
          detalhe: { fichaClinicaAnterior: clienteAntes.fichaClinica, sessaoId: origemSessaoId ?? null },
          ip: request.headers.get("x-forwarded-for"),
        },
      })
    }

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
