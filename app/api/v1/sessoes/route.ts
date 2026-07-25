import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKey, validarApiKeyOuSessao, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { sessaoCreateSchema, sessoesQuerySchema, validarBody, validarQuery, normalizarTelefone } from "@/lib/validations"
import { serializarDecimais } from "@/lib/serialize"
import { recalcularMetricasCliente } from "@/lib/metricas"
import { auditar } from "@/lib/audit"
import { gerarLinkToken } from "@/lib/link-token"
import type { Prisma } from "@/lib/prisma-client"

// Devolve o intervalo [início do dia, fim do dia] em UTC para o fuso de Lisboa
// offsetDias=0 → hoje; offsetDias=1 → amanhã
// Usa o truque de parsing locale para converter sem bibliotecas externas
function inicioFimDiaLisboa(offsetDias = 0): { gte: Date; lt: Date } {
  const utcNow = new Date()
  // Interpretar a hora atual como "string Lisboa" e re-parsear como UTC local do servidor
  const lisboaNow = new Date(utcNow.toLocaleString("en-US", { timeZone: "Europe/Lisbon" }))
  // offsetMs = Lisboa_timestamp - UTC_timestamp (positivo se Lisboa está à frente de UTC)
  const offsetMs = lisboaNow.getTime() - utcNow.getTime()
  // Meia-noite Lisboa do dia alvo (em "pseudo-UTC" do parser)
  const meiaNoiteLisboa = new Date(lisboaNow)
  meiaNoiteLisboa.setHours(0, 0, 0, 0)
  meiaNoiteLisboa.setDate(meiaNoiteLisboa.getDate() + offsetDias)
  // Converter de volta para UTC real
  const gte = new Date(meiaNoiteLisboa.getTime() - offsetMs)
  const lt  = new Date(gte.getTime() + 24 * 60 * 60 * 1000)
  return { gte, lt }
}

// Resolução de cliente: id → telefone → email (padrão consistente em toda a API v1)
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

export async function GET(request: NextRequest) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const q = validarQuery(request.url, sessoesQuerySchema)
  if (!q.ok) return q.resposta
  const {
    clienteId, calendlyEventId, estado, status, data: dataFiltro,
    briefingEnviado, lembreteEnviado, nutricaoBoasVindasEnviado, nutricao14dEnviado, nutricao7dEnviado,
    lembretePosSessaoEnviado, proxima, terapeuta, de, ate, limit, cursor,
  } = q.data

  // proxima=true requer clienteId
  if (proxima === "true" && !clienteId) {
    return respostaErro("proxima=true requer clienteId", "FALTA_CLIENTE_ID", 400)
  }

  try {
    const where: Prisma.SessaoWhereInput = { apagadoEm: null }
    if (clienteId) where.clienteId = clienteId
    if (calendlyEventId) where.calendlyEventId = calendlyEventId
    if (terapeuta) where.terapeuta = terapeuta

    // Estado (com alias status)
    const estadoEfetivo = status ?? estado
    if (estadoEfetivo) where.estado = estadoEfetivo

    // Filtros de data
    if (dataFiltro === "hoje")  where.data = inicioFimDiaLisboa(0)
    else if (dataFiltro === "amanha") where.data = inicioFimDiaLisboa(1)
    else if (de || ate) {
      where.data = {
        ...(de ? { gte: new Date(de) } : {}),
        ...(ate ? { lte: new Date(ate) } : {}),
      }
    }

    // Filtros de rastreio de comunicações
    if (briefingEnviado    !== undefined) where.briefingEnviado    = briefingEnviado    === "true"
    if (lembreteEnviado    !== undefined) where.lembreteEnviado    = lembreteEnviado    === "true"
    if (nutricaoBoasVindasEnviado !== undefined) where.nutricaoBoasVindasEnviado = nutricaoBoasVindasEnviado === "true"
    if (nutricao14dEnviado !== undefined) where.nutricao14dEnviado = nutricao14dEnviado === "true"
    if (nutricao7dEnviado  !== undefined) where.nutricao7dEnviado  = nutricao7dEnviado  === "true"
    if (lembretePosSessaoEnviado !== undefined) where.lembretePosSessaoEnviado = lembretePosSessaoEnviado === "true"

    // proxima=true → próxima sessão futura do cliente (take: 1, orderBy asc)
    if (proxima === "true") {
      where.data = { gt: new Date() }
    }

    // Cursor-based pagination
    const cursorClause = cursor ? { id: cursor } : undefined

    const sessoes = await prisma.sessao.findMany({
      where,
      include: { cliente: { select: { id: true, nome: true, telefone: true, email: true, temWhatsapp: true } } },
      orderBy: proxima === "true" ? { data: "asc" } : { data: "desc" },
      take: proxima === "true" ? 1 : limit,
      ...(cursorClause ? { cursor: cursorClause, skip: 1 } : {}),
    })

    const nextCursor = sessoes.length === limit && proxima !== "true"
      ? sessoes[sessoes.length - 1]?.id
      : undefined

    // linkToken: token assinado para o N8N construir links públicos seguros
    // (?sessaoId=X&t=<token>) para ficha-sessao/pos-sessao/confirmar-sessao/atribuir-sessao
    const sessoesComToken = sessoes.map((s) => ({ ...s, linkToken: gerarLinkToken(s.id) }))

    return respostaSucesso(
      serializarDecimais(sessoesComToken),
      { total: sessoes.length, ...(nextCursor ? { nextCursor } : {}) }
    )
  } catch (error) {
    console.error("GET /api/v1/sessoes:", (error as Error).message)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}

export async function POST(request: NextRequest) {
  const erro = await validarApiKeyOuSessao(request)
  if (erro) return erro

  const v = await validarBody(request, sessaoCreateSchema)
  if (!v.ok) return v.resposta
  const {
    clienteId, telefone, email,
    data, hora, duracao, servico, preco, terapeuta,
    estado, aromaSessao, resumoSessao, linkDocumento, calendlyEventId,
  } = v.data

  try {
    const cliente = await resolverCliente(clienteId, telefone, email)
    if (!cliente) {
      return respostaErro(
        "Cliente não encontrado. Forneça clienteId, telefone ou email.",
        "CLIENTE_NAO_ENCONTRADO",
        404
      )
    }

    // Idempotência: se já existe sessão com este calendlyEventId, devolvê-la
    // (evita duplicados e 500 por violação de @unique ao reprocessar a marcação)
    if (calendlyEventId) {
      const existente = await prisma.sessao.findFirst({ where: { calendlyEventId, apagadoEm: null } })
      if (existente) {
        return respostaSucesso(serializarDecimais({ ...existente, clienteNome: cliente.nome, created: false }))
      }
    }

    const dataSessao = new Date(data)

    // Criação da sessão + recálculo de métricas na mesma transação — evita a
    // janela de corrida em que duas escritas concorrentes no mesmo cliente
    // leem/escrevem totalGasto/totalSessoes fora de ordem.
    const sessao = await prisma.$transaction(async (tx) => {
      const sessao = await tx.sessao.create({
        data: {
          clienteId: cliente.id,
          data: dataSessao,
          hora: hora ?? null,
          duracao: duracao ?? null,
          servico: servico ?? null,
          preco: preco ?? null,
          terapeuta: terapeuta ?? "bea",
          estado: estado ?? "agendada",
          aromaSessao: aromaSessao ?? null,
          resumoSessao: resumoSessao ?? null,
          linkDocumento: linkDocumento ?? null,
          ...(calendlyEventId ? { calendlyEventId } : {}),
        },
      })

      // Métricas só mudam quando a sessão entra como "realizada" — fonte única
      // (lib/metricas). Sessões agendada/confirmada futuras não alteram totalGasto,
      // totalSessoes nem ultimaSessao.
      if ((estado ?? "agendada") === "realizada") {
        await recalcularMetricasCliente(tx, cliente.id)
      }

      return sessao
    })

    auditar({
      quem: "api:n8n",
      acao: "sessao.criada",
      entidade: "Sessao",
      entidadeId: sessao.id,
      detalhe: { clienteId: cliente.id, servico: servico ?? null },
      ip: request.headers.get("x-forwarded-for"),
    })

    return respostaSucesso(serializarDecimais({ ...sessao, clienteNome: cliente.nome }))
  } catch (error) {
    console.error("POST /api/v1/sessoes:", (error as Error).message)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
