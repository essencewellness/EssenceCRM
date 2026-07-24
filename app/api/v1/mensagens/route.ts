// API v1 de mensagens IA — criação (N8N), listagem e mudança de estado.
// Aprovação em massa com fila espaçada: ver /api/v1/mensagens/aprovar-bulk.
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKey, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { webhooks } from "@/lib/webhooks"
import { mensagemCreateSchema, mensagemPatchSchema, validarBody, normalizarTelefone, ESTADOS_MENSAGEM, CANAIS } from "@/lib/validations"
import { auditar } from "@/lib/audit"

async function resolverCliente(clienteId?: string, telefone?: string, email?: string) {
  if (clienteId) return prisma.cliente.findFirst({ where: { id: clienteId, apagadoEm: null } })
  if (telefone) {
    return prisma.cliente.findFirst({
      where: { telefone: { contains: normalizarTelefone(telefone) }, apagadoEm: null },
    })
  }
  if (email) return prisma.cliente.findFirst({ where: { email, apagadoEm: null } })
  return null
}

export async function POST(request: NextRequest) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const v = await validarBody(request, mensagemCreateSchema)
  if (!v.ok) return v.resposta
  const { telefone, email, clienteId, mensagemGerada, canal, motivoGeracao } = v.data

  try {
    const cliente = await resolverCliente(clienteId, telefone, email)
    if (!cliente) {
      return respostaErro(
        "Cliente não encontrado. Forneça clienteId, telefone ou email.",
        "CLIENTE_NAO_ENCONTRADO",
        404
      )
    }

    // Guardas de comunicação: nunca gerar mensagens para quem não pode receber
    if (cliente.estado === "blacklist") {
      return respostaErro("Cliente em blacklist — não contactar.", "CLIENTE_BLACKLIST", 422)
    }
    if (!cliente.aceitaMarketing) {
      return respostaErro("Cliente recusou marketing (RGPD).", "SEM_CONSENTIMENTO", 422)
    }

    const mensagem = await prisma.mensagemIA.create({
      data: {
        clienteId: cliente.id,
        mensagemGerada,
        canal: canal ?? "whatsapp",
        motivoGeracao: motivoGeracao ?? null,
        estado: "pendente",
        geradaEm: new Date(),
      },
    })

    return respostaSucesso(
      {
        mensagemId: mensagem.id,
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        estado: "pendente",
      },
      undefined,
      201
    )
  } catch (error) {
    console.error("POST /api/v1/mensagens:", (error as Error).message)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}

export async function GET(request: NextRequest) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const { searchParams } = new URL(request.url)
  const estado = searchParams.get("estado") ?? "pendente"
  const canal = searchParams.get("canal")
  const clienteId = searchParams.get("clienteId")

  if (!ESTADOS_MENSAGEM.includes(estado as (typeof ESTADOS_MENSAGEM)[number])) {
    return respostaErro(`Estado inválido. Use: ${ESTADOS_MENSAGEM.join(", ")}`, "ESTADO_INVALIDO", 400)
  }
  if (canal && !CANAIS.includes(canal as (typeof CANAIS)[number])) {
    return respostaErro(`Canal inválido. Use: ${CANAIS.join(", ")}`, "CANAL_INVALIDO", 400)
  }

  try {
    const mensagens = await prisma.mensagemIA.findMany({
      where: {
        estado: estado as (typeof ESTADOS_MENSAGEM)[number],
        ...(canal ? { canal: canal as (typeof CANAIS)[number] } : {}),
        ...(clienteId ? { clienteId } : {}),
      },
      include: {
        cliente: { select: { id: true, nome: true, telefone: true, email: true } },
      },
      orderBy: { geradaEm: "desc" },
      take: 50,
    })

    return respostaSucesso(mensagens, { total: mensagens.length })
  } catch (error) {
    console.error("GET /api/v1/mensagens:", (error as Error).message)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}

export async function PATCH(request: NextRequest) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const v = await validarBody(request, mensagemPatchSchema)
  if (!v.ok) return v.resposta
  const { mensagemId, estado, mensagemFinal, converteu } = v.data

  try {
    const mensagem = await prisma.mensagemIA.update({
      where: { id: mensagemId },
      data: {
        estado,
        ...(mensagemFinal ? { mensagemFinal } : {}),
        ...(converteu !== undefined ? { converteu } : {}),
        ...(estado === "enviada" ? { enviadaEm: new Date() } : {}),
        ...(estado === "aprovada" ? { aprovadaEm: new Date() } : {}),
      },
      include: {
        cliente: { select: { id: true, nome: true, telefone: true } },
      },
    })

    auditar({
      quem: "api:n8n",
      acao: `mensagem.${estado}`,
      entidade: "MensagemIA",
      entidadeId: mensagemId,
      ip: request.headers.get("x-forwarded-for"),
    })

    // Disparar webhook → N8N recebe e envia automaticamente via WhatsApp
    if (estado === "aprovada") {
      void webhooks.mensagemAprovada({
        mensagemId,
        clienteId: mensagem.clienteId,
        telefone: mensagem.cliente.telefone,
        mensagemFinal: mensagem.mensagemFinal ?? mensagem.mensagemGerada,
        canal: mensagem.canal,
      })
    }

    return respostaSucesso(mensagem)
  } catch (error) {
    console.error("PATCH /api/v1/mensagens:", (error as Error).message)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
