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
    const estadoAlvo = sucesso ? "enviada" : "falhada"

    // Idempotência atómica: o N8N pode reenviar a mesma confirmação em
    // paralelo (retry de rede) — um simples "ler estado, depois escrever"
    // tem uma janela de corrida em que dois pedidos concorrentes passam
    // ambos a verificação antes de qualquer um escrever. A condição
    // "estado: em_fila" no WHERE do update torna isto atómico ao nível da
    // base de dados: só o primeiro pedido a chegar consegue transitar; os
    // restantes ficam com count 0 e sabem que já foi processada.
    const resultado = await prisma.mensagemIA.updateMany({
      where: { id: mensagemId, estado: "em_fila" },
      data: {
        estado: estadoAlvo,
        ...(sucesso ? { enviadaEm: new Date() } : {}),
        ...(!sucesso ? { erroEnvio: erroDescricao ?? "Falha sem descrição" } : {}),
      },
    })

    if (resultado.count === 0) {
      const atual = await prisma.mensagemIA.findUnique({
        where: { id: mensagemId },
        select: { id: true, estado: true },
      })
      if (!atual) return respostaErro("Mensagem não encontrada", "MENSAGEM_NAO_ENCONTRADA", 404)

      return respostaSucesso({
        mensagemId,
        estado: atual.estado,
        sucesso,
        jaProcessada: true,
      })
    }

    auditar({
      quem: "api:n8n",
      acao: sucesso ? "mensagem.enviada" : "mensagem.falhada",
      entidade: "MensagemIA",
      entidadeId: mensagemId,
      detalhe: sucesso ? undefined : { erro: erroDescricao ?? null },
    })

    return respostaSucesso({ mensagemId, estado: estadoAlvo, sucesso })
  } catch (error) {
    console.error("POST /api/v1/webhooks/confirmacao-envio:", (error as Error).message)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
