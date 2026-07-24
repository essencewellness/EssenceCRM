// RGPD — direitos da titular dos dados:
// GET    → exportação completa (Art. 15/20: acesso e portabilidade)
// DELETE → anonimização irreversível (Art. 17: direito ao apagamento)
//          Mantém métricas agregadas sem qualquer dado pessoal/clínico.
//          Restrito: sessão de dashboard ou API_KEY_ADMIN (não a chave N8N).
import { NextRequest } from "next/server"
import { Prisma } from "@/lib/prisma-client"
import { prisma } from "@/lib/prisma"
import { validarApiKeyAdminOuSessao, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { serializarDecimais } from "@/lib/serialize"
import { auditar } from "@/lib/audit"
import { verificarRateLimit } from "@/lib/rate-limit"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Exportação completa de dados clínicos é tão sensível como a anonimização
  // (Art. 17) — exige a mesma autenticação forte (sessão de dashboard ou
  // API_KEY_ADMIN), não a API_KEY_N8N partilhada com todos os workflows.
  const erro = await validarApiKeyAdminOuSessao(request)
  if (erro) return erro

  const bloqueio = await verificarRateLimit(request, {
    recurso: "rgpd-exportacao",
    limite: 5,
    janelaSeg: 3600,
  })
  if (bloqueio) return bloqueio

  const { id } = await params

  try {
    const [cliente, tarefas, giftCards, auditoria] = await Promise.all([
      prisma.cliente.findUnique({
        where: { id },
        include: {
          sessoes: { orderBy: { data: "desc" } },
          mensagens: { orderBy: { geradaEm: "desc" } },
          observacoes: { orderBy: { criadoEm: "desc" } },
          etiquetas: { include: { etiqueta: true } },
          feedbacks: { orderBy: { criadoEm: "desc" } },
          portalToken: { select: { criadoEm: true, expiraEm: true } },
        },
      }),
      prisma.tarefa.findMany({ where: { clienteId: id }, orderBy: { criadoEm: "desc" } }),
      prisma.giftCard.findMany({ where: { clienteId: id }, orderBy: { dataCompra: "desc" } }),
      prisma.auditLog.findMany({
        where: { entidade: "Cliente", entidadeId: id },
        orderBy: { criadoEm: "desc" },
        select: { acao: true, quem: true, criadoEm: true },
        take: 500,
      }),
    ])

    if (!cliente) return respostaErro("Cliente não encontrado", "CLIENTE_NAO_ENCONTRADO", 404)

    auditar({
      quem: "admin",
      acao: "rgpd.exportacao",
      entidade: "Cliente",
      entidadeId: id,
      ip: request.headers.get("x-forwarded-for"),
    })

    return respostaSucesso({
      exportadoEm: new Date().toISOString(),
      formato: "RGPD Art. 15/20 — exportação completa",
      dados: serializarDecimais({ ...cliente, tarefas, giftCards, historicoAuditoria: auditoria }),
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
  const erro = await validarApiKeyAdminOuSessao(request)
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

    // Transação: apagar PII do perfil + TODO o conteúdo clínico das sessões
    // (incluindo fichas de onboarding, briefing IA e avaliações) + mensagens,
    // observações, feedbacks, tarefas, portal token e PII de gift cards.
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
          fichaClinica: null,
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
          fichaEstadoEmocional: null,
          fichaZonasTensao: null,
          fichaFoco: null,
          fichaCondicoesAlergias: null,
          fichaAromasPreferidos: null,
          briefingJson: Prisma.DbNull,
          avaliacaoComentario: null,
          pdfUrl: null,
          googleDocLink: null,
          calendlyRescheduleUrl: null,
          calendlyCancelUrl: null,
        },
      }),
      prisma.mensagemIA.deleteMany({ where: { clienteId: id } }),
      prisma.observacao.deleteMany({ where: { clienteId: id } }),
      prisma.feedback.deleteMany({ where: { clienteId: id } }),
      prisma.portalToken.deleteMany({ where: { clienteId: id } }),
      // Tarefas ligadas à cliente podem conter PII no título/descrição
      // atualizadoEm definido à mão: @updatedAt não dispara em updateMany()
      prisma.tarefa.updateMany({
        where: { clienteId: id },
        data: { titulo: "Tarefa anonimizada", descricao: null, atualizadoEm: new Date() },
      }),
      // Gift cards ligados à cliente: limpar identificação do beneficiário E do
      // comprador — uma cliente que compra E usa um gift card ligado ao seu
      // próprio clienteId mantinha os dados de comprador após anonimização.
      // compradorNome é obrigatório no schema (não aceita null), por isso
      // segue o mesmo padrão do cliente.nome acima ("Cliente anonimizada").
      // atualizadoEm definido à mão: @updatedAt não dispara em updateMany()
      prisma.giftCard.updateMany({
        where: { clienteId: id },
        data: {
          beneficiarioNome: null,
          beneficiarioTelefone: null,
          compradorNome: "Comprador anonimizado",
          compradorTelefone: null,
          compradorEmail: null,
          notas: null,
          atualizadoEm: new Date(),
        },
      }),
    ])

    auditar({
      quem: "admin",
      acao: "rgpd.anonimizacao",
      entidade: "Cliente",
      entidadeId: id,
      ip: request.headers.get("x-forwarded-for"),
    })

    return respostaSucesso({
      id,
      anonimizada: true,
      nota: "PII, ficha clínica, briefings, feedbacks e documentos removidos; métricas agregadas preservadas para contabilidade.",
    })
  } catch (error) {
    console.error("DELETE /api/v1/clientes/[id]/rgpd:", (error as Error).message)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
