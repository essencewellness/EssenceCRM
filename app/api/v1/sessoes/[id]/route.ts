import { NextRequest } from "next/server"
import { Prisma } from "@/lib/prisma-client"
import { prisma } from "@/lib/prisma"
import { validarApiKeyOuSessao, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { sessaoUpdateSchema, validarBody } from "@/lib/validations"
import { serializarDecimais } from "@/lib/serialize"
import { processarSessaoRealizada } from "@/lib/sessoes"
import { recalcularMetricasCliente } from "@/lib/metricas"
import { auditar } from "@/lib/audit"
import { gerarLinkToken } from "@/lib/link-token"


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const erro = await validarApiKeyOuSessao(request)
  if (erro) return erro

  const { id } = await params

  try {
    const sessao = await prisma.sessao.findFirst({
      where: { id, apagadoEm: null },
      include: { cliente: { select: { id: true, nome: true, telefone: true } } },
    })

    if (!sessao) return respostaErro("Sessão não encontrada", "SESSAO_NAO_ENCONTRADA", 404)

    // linkToken: para o N8N construir links públicos seguros (&t=<token>)
    return respostaSucesso(serializarDecimais({ ...sessao, linkToken: gerarLinkToken(sessao.id) }))
  } catch (error) {
    console.error("GET /api/v1/sessoes/[id]:", (error as Error).message)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const erro = await validarApiKeyOuSessao(request)
  if (erro) return erro

  const { id } = await params

  const v = await validarBody(request, sessaoUpdateSchema)
  if (!v.ok) return v.resposta
  const {
    estado, data, hora, duracao, resumoSessao, notasPosSessao,
    aromaSessao, estadoEmocional, linkDocumento,
    dataRecomendadaRegresso, preco, servico,
    briefingEnviado, lembreteEnviado, confirmacaoPresenca,
    nutricaoBoasVindasEnviado, nutricao14dEnviado, nutricao7dEnviado, lembretePosSessaoEnviado, googleDocLink, briefingJson,
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
        ...(data !== undefined ? { data: new Date(data) } : {}),
        ...(hora !== undefined ? { hora } : {}),
        ...(duracao !== undefined ? { duracao } : {}),
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
        ...(lembretePosSessaoEnviado !== undefined ? { lembretePosSessaoEnviado } : {}),
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

    const eraRealizada = sessaoAntes.estado === "realizada"
    const ficaRealizada = (estado ?? sessaoAntes.estado) === "realizada"

    if (ficaRealizada && !eraRealizada) {
      // Transição para "realizada" — recalcular métricas + webhook + avaliação (lib/sessoes)
      const metricas = await processarSessaoRealizada(sessaoAntes, sessao.preco)
      clienteAtualizado = { id: sessaoAntes.clienteId, ...metricas }
    } else if (eraRealizada && (preco !== undefined || data !== undefined || estado !== undefined)) {
      // Já realizada e um campo que afeta as métricas mudou (preço, data, ou saiu de "realizada")
      const metricas = await recalcularMetricasCliente(prisma, sessaoAntes.clienteId)
      clienteAtualizado = { id: sessaoAntes.clienteId, ...metricas }
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
