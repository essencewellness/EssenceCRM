import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKey, validarApiKeyOuSessao, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { auth } from "@/lib/auth"
import { clientesQuerySchema, clienteCreateSchema, validarBody, validarQuery, normalizarTelefone } from "@/lib/validations"
import { serializarDecimais } from "@/lib/serialize"
import { auditar } from "@/lib/audit"
import { gerarLinkToken } from "@/lib/link-token"
import { Prisma } from "@/lib/prisma-client"

export async function GET(request: NextRequest) {
  const erro = await validarApiKeyOuSessao(request)
  if (erro) return erro

  const q = validarQuery(request.url, clientesQuerySchema)
  if (!q.ok) return q.resposta
  const { q: pesquisa, estado, canal, aceitaMarketing, email, telefone, inactivos_desde_dias, semMensagemDias, blacklist, ativo, etiquetas, etiquetas_modo, sem_automacoes, terapeuta, limit, cursor } = q.data

  try {
    const where: Prisma.ClienteWhereInput = {
      apagadoEm: null, // soft delete: nunca listar apagadas
    }

    // blacklist e ativo têm precedência sobre estado
    if (blacklist === "true") {
      where.estado = "blacklist"
    } else if (ativo === "true") {
      where.estado = { notIn: ["blacklist", "perdida"] }
      where.telefone = { not: null }
    } else if (estado) {
      where.estado = estado
    } else {
      // Sem filtro explícito: leads (zero sessões realizadas) têm o seu
      // próprio espaço em /leads — não aparecem por defeito aqui.
      where.estado = { not: "lead" }
    }

    if (canal) where.canalPreferido = canal
    if (aceitaMarketing !== undefined) where.aceitaMarketing = aceitaMarketing === "true"

    if (pesquisa) {
      // Pesquisa livre em nome, email ou telefone (OR). Sem mode:"insensitive" — incompatível com SQLite.
      const isProd = process.env.DATABASE_URL?.startsWith("postgresql")
      const containsOpt = isProd ? { contains: pesquisa, mode: "insensitive" as const } : { contains: pesquisa }
      where.OR = [
        { nome:     containsOpt },
        { email:    containsOpt },
        { telefone: containsOpt },
      ]
    } else if (email || telefone) {
      const orConditions: Prisma.ClienteWhereInput[] = []
      if (email) orConditions.push({ email })
      if (telefone) orConditions.push({ telefone: { contains: normalizarTelefone(telefone) } })
      where.OR = orConditions
    }

    if (inactivos_desde_dias) {
      const diasAtras = new Date()
      diasAtras.setDate(diasAtras.getDate() - inactivos_desde_dias)
      where.ultimaSessao = { lt: diasAtras }
      // Não contactar blacklist nem perdidas em campanhas de reativação;
      // anonimizadas também ficam de fora (RGPD)
      where.estado = { notIn: ["blacklist", "perdida"] }
      where.anonimizadoEm = null
      where.aceitaMarketing = true
    }

    if (semMensagemDias) {
      const corteMsg = new Date()
      corteMsg.setDate(corteMsg.getDate() - semMensagemDias)
      where.mensagens = {
        none: { geradaEm: { gte: corteMsg }, estado: { in: ["enviada", "em_fila"] } }
      }
    }

    if (etiquetas) {
      const ids = Array.isArray(etiquetas) ? etiquetas : [etiquetas]
      if (etiquetas_modo === "and") {
        // AND: cliente deve ter TODAS as etiquetas (uma condição every por etiqueta)
        where.AND = ids.map((id) => ({
          etiquetas: { some: { etiquetaId: id } },
        }))
      } else {
        // OR (padrão): basta ter uma das etiquetas
        where.etiquetas = { some: { etiquetaId: { in: ids } } }
      }
    }

    if (sem_automacoes === "true") {
      where.NOT = { etiquetas: { some: { etiqueta: { bloqueiaAutomacoes: true } } } }
    }

    // Isolamento por sessão: terapeuta (não-admin) só vê os SEUS clientes.
    // Admin pode filtrar por ?terapeuta=. N8N (só API key, sem sessão) vê tudo.
    if (!validarApiKey(request)) {
      // pedido autenticado por API key (N8N) — sem isolamento
    } else {
      const session = await auth()
      const u = session?.user as { id?: string; role?: string } | undefined
      if (u?.id && u.role !== "admin") {
        where.terapeutaPrincipalId = u.id
      } else if (u?.role === "admin" && terapeuta) {
        where.terapeutaPrincipalId = terapeuta
      }
    }

    const clientes = await prisma.cliente.findMany({
      where,
      select: {
        id: true, nome: true, telefone: true, email: true,
        estado: true, ultimaSessao: true, totalSessoes: true,
        totalGasto: true, canalPreferido: true, dataNascimento: true,
        aceitaMarketing: true, temWhatsapp: true,
        historicoEstadoEmocional: true, notasPessoais: true,
        etiquetas: { include: { etiqueta: true } },
        sessoes: {
          where: { apagadoEm: null },
          select: { servico: true, estado: true, data: true },
          orderBy: { data: "asc" as const },
        },
      },
      orderBy: [{ nome: "asc" }, { id: "asc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    const hasMore = clientes.length > limit
    if (hasMore) clientes.pop()

    const total = await prisma.cliente.count({ where })

    const agora = new Date()
    const clientesEnriquecidos = clientes.map(({ sessoes, ...c }) => {
      const contagem = new Map<string, number>()
      let proximaSessaoData: string | null = null
      for (const s of sessoes) {
        if (s.estado === "realizada" && s.servico) {
          contagem.set(s.servico, (contagem.get(s.servico) ?? 0) + 1)
        }
        if (s.estado === "agendada" && new Date(s.data) >= agora && !proximaSessaoData) {
          proximaSessaoData = new Date(s.data).toISOString()
        }
      }
      const servicosAfinidade = [...contagem.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([servico, count]) => ({ servico, count }))
      return { ...c, servicosAfinidade, proximaSessaoData }
    })

    // linkToken: código curto para o N8N construir links de onboarding/feedback
    // sem sessão associada (ex.: reativação — GET ?inactivos_desde_dias=45)
    const clientesComToken = await Promise.all(
      clientesEnriquecidos.map(async (c) => ({ ...c, linkToken: await gerarLinkToken({ clienteId: c.id }) }))
    )

    return respostaSucesso(serializarDecimais(clientesComToken), {
      nextCursor: hasMore ? clientes[clientes.length - 1]?.id : null,
      total,
    })
  } catch (error) {
    console.error("GET /api/v1/clientes:", (error as Error).message)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}

export async function POST(request: NextRequest) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const v = await validarBody(request, clienteCreateSchema)
  if (!v.ok) return v.resposta
  const { nome, telefone, email, fonte, comoNosConheceu, dataNascimento, aceitaMarketing } = v.data

  try {
    // Upsert: procurar por telefone ou email antes de criar (sem duplicados)
    let existente = null

    if (telefone) {
      existente = await prisma.cliente.findFirst({
        where: { telefone: { contains: normalizarTelefone(telefone) }, apagadoEm: null },
      })
    }

    if (!existente && email) {
      existente = await prisma.cliente.findFirst({ where: { email, apagadoEm: null } })
    }

    if (existente) {
      return respostaSucesso(serializarDecimais({ ...existente, created: false }))
    }

    const cliente = await prisma.cliente.create({
      data: {
        nome,
        telefone: telefone ? normalizarTelefone(telefone) : null,
        email: email ?? null,
        fonte: fonte ?? "api",
        comoNosConheceu: comoNosConheceu ?? null,
        dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
        aceitaMarketing: aceitaMarketing ?? true,
        ...(aceitaMarketing ? { consentimentoMarketingEm: new Date() } : {}),
        estado: "lead",
      },
    })

    auditar({
      quem: "api:n8n",
      acao: "cliente.criado",
      entidade: "Cliente",
      entidadeId: cliente.id,
      ip: request.headers.get("x-forwarded-for"),
    })

    return respostaSucesso(serializarDecimais({ ...cliente, created: true }), undefined, 201)
  } catch (error) {
    // Corrida rara: o findFirst acima não viu o duplicado a tempo (outro
    // upsert/edição concorrente ganhou), mas o @unique na BD apanha-o —
    // devolver 409 claro em vez de um 500 genérico.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return respostaErro("Já existe uma cliente com este telefone ou email.", "CLIENTE_DUPLICADO", 409)
    }
    console.error("POST /api/v1/clientes:", (error as Error).message)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
