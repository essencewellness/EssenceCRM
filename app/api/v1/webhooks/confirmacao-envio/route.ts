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
    const atual = await prisma.mensagemIA.findUnique({
      where: { id: mensagemId },
      select: { id: true, estado: true, clienteId: true },
    })
    if (!atual) return respostaErro("Mensagem não encontrada", "MENSAGEM_NAO_ENCONTRADA", 404)

    const estadoAlvo = sucesso ? "enviada" : "falhada"

    // Idempotência: o N8N pode reenviar a mesma confirmação (retry de rede).
    // Se a mensagem já está no estado alvo, ou já saiu de "em_fila" (só daí
    // é suposto transitar para enviada/falhada), não repetir a escrita nem
    // o audit log — devolve sucesso sem reprocessar.
    if (atual.estado === estadoAlvo || atual.estado !== "em_fila") {
      return respostaSucesso({
        mensagemId,
        estado: atual.estado,
        sucesso,
        jaProcessada: true,
      })
    }

    const mensagem = await prisma.mensagemIA.update({
      where: { id: mensagemId },
      data: {
        estado: estadoAlvo,
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
    console.error("POST /api/v1/webhooks/confirmacao-envio:", (error as Error).message)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
