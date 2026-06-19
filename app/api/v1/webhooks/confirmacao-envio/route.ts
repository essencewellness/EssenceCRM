// N8N confirma o resultado do envio de WhatsApp
// Sucesso → "enviada"; falha → "falhada" com erroEnvio preenchido
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKey, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { confirmacaoEnvioSchema, validarBody } from "@/lib/validations"
import { auditar } from "@/lib/audit"

export async function POST(request: NextRequest) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const v = await validarBody(request, confirmacaoEnvioSchema)
  if (!v.ok) return v.resposta
  const { mensagemId, sucesso, erroDescricao } = v.data

  try {
    const mensagem = await prisma.mensagemIA.update({
      where: { id: mensagemId },
      data: {
        estado: sucesso ? "enviada" : "falhada",
        ...(sucesso ? { enviadaEm: new Date() } : {}),
        ...(!sucesso ? { erroEnvio: erroDescricao ?? "Falha sem descrição" } : {}),
      },
      select: { id: true, estado: true, clienteId: true },
    })

    auditar({
      quem: "api:n8n",
      acao: sucesso ? "mensagem.enviada" : "mensagem.falhada",
      entidade: "MensagemIA",
      entidadeId: mensagemId,
      detalhe: sucesso ? undefined : { erro: erroDescricao ?? null },
    })

    return respostaSucesso({ mensagemId, estado: mensagem.estado, sucesso })
  } catch (error) {
    console.error("POST /api/v1/webhooks/confirmacao-envio:", error)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
