// Aprovação em massa — o coração do "20 mensagens em 10 minutos".
// A Bea seleciona N mensagens no dashboard, edita as que quiser, e este
// endpoint coloca todas na fila com espaçamento aleatório anti-ban.
// Usado tanto pelo dashboard (sessão) como pelo N8N (X-API-Key).
import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { validarApiKey, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { aprovarBulkSchema, validarBody } from "@/lib/validations"
import { aprovarEAgendar } from "@/lib/fila-envio"
import { auditar } from "@/lib/audit"

export async function POST(request: NextRequest) {
  // Autenticação dupla: sessão de dashboard OU X-API-Key
  const sessao = await auth()
  let quem = sessao?.user?.email ?? null

  if (!quem) {
    const erro = validarApiKey(request)
    if (erro) return erro
    quem = "api:n8n"
  }

  const v = await validarBody(request, aprovarBulkSchema)
  if (!v.ok) return v.resposta
  const { mensagens, espacamentoMinSeg, espacamentoMaxSeg, agendarPara } = v.data

  if (espacamentoMinSeg !== undefined && espacamentoMaxSeg !== undefined && espacamentoMinSeg > espacamentoMaxSeg) {
    return respostaErro("espacamentoMinSeg não pode exceder espacamentoMaxSeg", "ESPACAMENTO_INVALIDO", 400)
  }

  try {
    const resultado = await aprovarEAgendar(
      mensagens.map((m) => ({
        ...m,
        agendarPara: m.agendarPara ? new Date(m.agendarPara) : undefined,
      })),
      espacamentoMinSeg,
      espacamentoMaxSeg,
      agendarPara ? new Date(agendarPara) : undefined
    )

    auditar({
      quem,
      acao: "mensagem.aprovacao_bulk",
      entidade: "MensagemIA",
      detalhe: {
        agendadas: resultado.agendadas.length,
        ignoradas: resultado.ignoradas.length,
      },
      ip: request.headers.get("x-forwarded-for"),
    })

    return respostaSucesso(resultado, {
      agendadas: resultado.agendadas.length,
      ignoradas: resultado.ignoradas.length,
    })
  } catch (error) {
    console.error("POST /api/v1/mensagens/aprovar-bulk:", (error as Error).message)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
