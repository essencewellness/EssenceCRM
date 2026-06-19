// Fila de envio — o N8N chama este endpoint a cada minuto e recebe apenas
// as mensagens "maduras" (enviarApos <= agora). Envia via Evolution API e
// confirma com POST /api/v1/webhooks/confirmacao-envio.
import { NextRequest } from "next/server"
import { validarApiKey, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { obterMensagensMaduras } from "@/lib/fila-envio"

export async function GET(request: NextRequest) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const { searchParams } = new URL(request.url)
  const limite = Math.min(parseInt(searchParams.get("limite") ?? "10") || 10, 50)

  try {
    const maduras = await obterMensagensMaduras(limite)

    return respostaSucesso(
      maduras.map((m) => ({
        mensagemId: m.id,
        clienteId: m.clienteId,
        clienteNome: m.cliente.nome,
        telefone: m.cliente.telefone,
        temWhatsapp: m.cliente.temWhatsapp,
        canal: m.canal,
        texto: m.mensagemFinal ?? m.mensagemGerada,
        enviarApos: m.enviarApos?.toISOString() ?? null,
      })),
      { total: maduras.length }
    )
  } catch (error) {
    console.error("GET /api/v1/mensagens/fila:", error)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
