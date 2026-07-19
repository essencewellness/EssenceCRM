import { NextRequest } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { validarApiKey, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { webhooks } from "@/lib/webhooks"
import { sessaoUpdateSchema, validarBody } from "@/lib/validations"
import { serializarDecimais, paraNumero } from "@/lib/serialize"
import { recalcularMetricasCliente } from "@/lib/metricas"
import { auditar } from "@/lib/audit"


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const { id } = await params

  try {
    const sessao = await prisma.sessao.findFirst({
      where: { id, apagadoEm: null },
      include: { cliente: { select: { id: true, nome: true, telefone: true } } },
    })

    if (!sessao) return respostaErro("Sessão não encontrada", "SESSAO_NAO_ENCONTRADA", 404)

    return respostaSucesso(serializarDecimais(sessao))
  } catch (error) {
    console.error("GET /api/v1/sessoes/[id]:", (error as Error).message)
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

  const v = await validarBody(request, sessaoUpdateSchema)
  if (!v.ok) return v.resposta
  const {
    estado, resumoSessao, notasPosSessao,
    aromaSessao, estadoEmocional, linkDocumento,
    dataRecomendadaRegresso, preco, servico,
    briefingEnviado, lembreteEnviado, confirmacaoPresenca,
    nutricaoBoasVindasEnviado, nutricao14dEnviado, nutricao7dEnviado, googleDocLink, briefingJson,
    estadoPagamento, valorPago, metodoPagamento, pagamentoEm,
    calendarEventId, pdfUrl, calendlyEventUri,
    avaliacaoNota, avaliacaoComentario, avaliacaoEnviadaEm, avaliacaoRespondidaEm,
  } = v.data

  try {
    const sessaoAntes = await prisma.sessao.findFirst({
      where: { id, apagadoEm: null },
      select: { id: true, clienteId: true, estado: true, servico: true, terapeuta: true },
    })

    if (!sessaoAntes) return respostaErro("Sessão não encontrada", "SESSAO_NAO_ENCONTRADA", 404)

    const sessao = await prisma.sessao.update({
      where: { id },
      data: {
        ...(estado !== undefined ? { estado } : {}),
        ...(resumoSessao !== undefined ? { resumoSessao } : {}),
        ...(notasPosSessao !== undefined ? { notasPosSessao } : {}),
        ...(aromaSessao !== undefined ? { aromaSessao } : {}),
        ...(estadoEmocional !== undefined ? { estadoEmocional } : {}),
        ...(linkDocumento !== undefined ? { linkDocumento } : {}),
        ...(preco !== undefined ? { preco } : {}),
        ...(servico !== undefined ? { servico } : {}),
        ...(dataRecomendadaRegresso
          ? { dataRecomendadaRegresso: new Date(dataRecomendadaRegresso) }
          : {}),
        ...(briefingEnviado     !== undefined ? { briefingEnviado }     : {}),
        ...(lembreteEnviado     !== undefined ? { lembreteEnviado }     : {}),
        ...(confirmacaoPresenca !== undefined ? { confirmacaoPresenca } : {}),
        ...(nutricaoBoasVindasEnviado !== undefined ? { nutricaoBoasVindasEnviado } : {}),
        ...(nutricao14dEnviado  !== undefined ? { nutricao14dEnviado }  : {}),
        ...(nutricao7dEnviado   !== undefined ? { nutricao7dEnviado }   : {}),
        ...(googleDocLink       !== undefined ? { googleDocLink }       : {}),
        ...(briefingJson        !== undefined ? { briefingJson: (briefingJson ?? Prisma.JsonNull) as Prisma.InputJsonValue } : {}),
        // Pagamento
        ...(estadoPagamento !== undefined ? { estadoPagamento } : {}),
        ...(valorPago       !== undefined ? { valorPago }       : {}),
        ...(metodoPagamento !== undefined ? { metodoPagamento } : {}),
        ...(pagamentoEm     !== undefined ? { pagamentoEm: pagamentoEm ? new Date(pagamentoEm) : null } : {}),
        // Integrações
        ...(calendarEventId  !== undefined ? { calendarEventId }  : {}),
        ...(pdfUrl           !== undefined ? { pdfUrl }           : {}),
        ...(calendlyEventUri !== undefined ? { calendlyEventUri } : {}),
        // Avaliação
        ...(avaliacaoNota         !== undefined ? { avaliacaoNota }         : {}),
        ...(avaliacaoComentario   !== undefined ? { avaliacaoComentario }   : {}),
        ...(avaliacaoEnviadaEm    !== undefined ? { avaliacaoEnviadaEm: avaliacaoEnviadaEm ? new Date(avaliacaoEnviadaEm) : null }    : {}),
        ...(avaliacaoRespondidaEm !== undefined ? { avaliacaoRespondidaEm: avaliacaoRespondidaEm ? new Date(avaliacaoRespondidaEm) : null } : {}),
      },
    })

    let clienteAtualizado = null

    // Quando passa a "realizada" — recalcular métricas (fonte única: lib/metricas)
    if (estado === "realizada" && sessaoAntes.estado !== "realizada") {
      const metricas = await recalcularMetricasCliente(prisma, sessaoAntes.clienteId)
      clienteAtualizado = { id: sessaoAntes.clienteId, ...metricas }

      void webhooks.sessaoRealizada({
        sessaoId: id,
        clienteId: sessaoAntes.clienteId,
        preco: paraNumero(sessao.preco),
        servico: sessao.servico,
        terapeuta: sessao.terapeuta,
      })

      // Agendar mensagem de avaliação de satisfação (fire-and-forget)
      const templateAvaliacao = await prisma.templateMensagem.findUnique({
        where: { nome: "avaliacao_pos_sessao" },
        select: { id: true, texto: true },
      })
      const clienteParaAvaliacao = await prisma.cliente.findUnique({
        where: { id: sessaoAntes.clienteId },
        select: { nome: true, estado: true },
      })

      if (
        templateAvaliacao &&
        clienteParaAvaliacao &&
        clienteParaAvaliacao.estado !== "blacklist"
      ) {
        const textoAvaliacao = templateAvaliacao.texto.replace(
          /\{\{nome\}\}/g,
          clienteParaAvaliacao.nome ?? ""
        )
        // Agendada para 2 horas após a sessão
        const enviarApos = new Date(Date.now() + 4 * 60 * 60 * 1000)
        void prisma.mensagemIA.create({
          data: {
            clienteId: sessaoAntes.clienteId,
            canal: "whatsapp",
            tipo: "avaliacao",
            estado: "em_fila",
            mensagemGerada: textoAvaliacao,
            mensagemFinal: textoAvaliacao,
            aprovadaEm: new Date(),
            enviarApos,
          },
        })
      }
    }

    auditar({
      quem: "api:n8n",
      acao: "sessao.atualizada",
      entidade: "Sessao",
      entidadeId: id,
      detalhe: { estado: estado ?? null },
      ip: request.headers.get("x-forwarded-for"),
    })

    return respostaSucesso(
      serializarDecimais(sessao),
      clienteAtualizado ? { clienteAtualizado: serializarDecimais(clienteAtualizado) } : undefined
    )
  } catch (error) {
    console.error("PATCH /api/v1/sessoes/[id]:", (error as Error).message)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
