// RGPD — direitos da titular dos dados:
// GET    → exportação completa (Art. 15/20: acesso e portabilidade)
// DELETE → anonimização irreversível (Art. 17: direito ao apagamento)
//          Mantém métricas agregadas sem qualquer dado pessoal/clínico.
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKey, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { serializarDecimais } from "@/lib/serialize"
import { auditar } from "@/lib/audit"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const { id } = await params

  try {
    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        sessoes: { orderBy: { data: "desc" } },
        mensagens: { orderBy: { geradaEm: "desc" } },
        observacoes: { orderBy: { criadoEm: "desc" } },
        etiquetas: { include: { etiqueta: true } },
      },
    })

    if (!cliente) return respostaErro("Cliente não encontrado", "CLIENTE_NAO_ENCONTRADO", 404)

    auditar({
      quem: "api:n8n",
      acao: "rgpd.exportacao",
      entidade: "Cliente",
      entidadeId: id,
      ip: request.headers.get("x-forwarded-for"),
    })

    return respostaSucesso({
      exportadoEm: new Date().toISOString(),
      formato: "RGPD Art. 15/20 — exportação completa",
      dados: serializarDecimais(cliente),
    })
  } catch (error) {
    console.error("GET /api/v1/clientes/[id]/rgpd:", (error as Error).message)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const { id } = await params

  try {
    const cliente = await prisma.cliente.findUnique({
      where: { id },
      select: { id: true, anonimizadoEm: true },
    })
    if (!cliente) return respostaErro("Cliente não encontrado", "CLIENTE_NAO_ENCONTRADO", 404)
    if (cliente.anonimizadoEm) {
      return respostaErro("Cliente já anonimizada", "JA_ANONIMIZADA", 409)
    }

    const agora = new Date()

    // Transação: apagar PII do perfil + conteúdo clínico das sessões + mensagens/observações
    await prisma.$transaction([
      prisma.cliente.update({
        where: { id },
        data: {
          nome: "Cliente anonimizada",
          telefone: null,
          email: null,
          dataNascimento: null,
          comoNosConheceu: null,
          historicoAromasPreferidos: null,
          historicoCondicoesAlergias: null,
          historicoEstadoEmocional: null,
          historicoZonasTensao: null,
          historicoUltimaPausa: null,
          notasPessoais: null,
          melhorDiaContacto: null,
          aceitaMarketing: false,
          temWhatsapp: false,
          consentimentoMarketingEm: null,
          consentimentoSaudeEm: null,
          anonimizadoEm: agora,
          apagadoEm: agora,
        },
      }),
      prisma.sessao.updateMany({
        where: { clienteId: id },
        data: {
          aromaSessao: null,
          estadoEmocional: null,
          resumoSessao: null,
          notasPosSessao: null,
          linkDocumento: null,
        },
      }),
      prisma.mensagemIA.deleteMany({ where: { clienteId: id } }),
      prisma.observacao.deleteMany({ where: { clienteId: id } }),
    ])

    auditar({
      quem: "api:n8n",
      acao: "rgpd.anonimizacao",
      entidade: "Cliente",
      entidadeId: id,
      ip: request.headers.get("x-forwarded-for"),
    })

    return respostaSucesso({
      id,
      anonimizada: true,
      nota: "PII e dados clínicos removidos; métricas agregadas preservadas para contabilidade.",
    })
  } catch (error) {
    console.error("DELETE /api/v1/clientes/[id]/rgpd:", (error as Error).message)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
