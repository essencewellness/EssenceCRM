import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKey, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { validarBody, validarQuery, campanhaCreateSchema, campanhasQuerySchema } from "@/lib/validations"
import { aprovarEAgendar } from "@/lib/fila-envio"
import type { Prisma } from "@prisma/client"

export async function GET(request: NextRequest) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const q = validarQuery(request.url, campanhasQuerySchema)
  if (!q.ok) return q.resposta
  const { estado, limit, cursor } = q.data

  try {
    const where: Prisma.CampanhaWhereInput = {}
    if (estado) where.estado = estado

    const campanhas = await prisma.campanha.findMany({
      where,
      include: {
        template: { select: { nome: true, tipo: true } },
        _count: { select: { mensagens: true } },
      },
      orderBy: { criadaEm: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    const hasMore = campanhas.length > limit
    if (hasMore) campanhas.pop()

    return respostaSucesso(campanhas, {
      nextCursor: hasMore ? campanhas[campanhas.length - 1]?.id : null,
    })
  } catch (error) {
    console.error("GET /api/v1/campanhas:", error)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}

export async function POST(request: NextRequest) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const v = await validarBody(request, campanhaCreateSchema)
  if (!v.ok) return v.resposta
  const { nome, templateId, segmento, espacamentoMinSeg, espacamentoMaxSeg } = v.data

  try {
    const template = await prisma.templateMensagem.findUnique({
      where: { id: templateId },
      select: { id: true, texto: true, ativo: true },
    })
    if (!template) {
      return respostaErro("Template não encontrado", "TEMPLATE_NAO_ENCONTRADO", 404)
    }
    if (!template.ativo) {
      return respostaErro("Template está inativo", "TEMPLATE_INATIVO", 422)
    }

    // Resolver segmento → lista de clientes
    const whereCliente: Prisma.ClienteWhereInput = {
      apagadoEm: null,
      estado: { notIn: ["blacklist", "perdida"] },
      aceitaMarketing: true,
      anonimizadoEm: null,
      telefone: { not: null },
    }

    if (segmento.tipo === "servico" && segmento.valor) {
      whereCliente.sessoes = {
        some: { servico: segmento.valor, estado: "realizada" },
      }
    } else if (segmento.tipo === "estado" && segmento.valor) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      whereCliente.estado = segmento.valor as any
    } else if (segmento.tipo === "inatividade" && segmento.valor) {
      const dias = parseInt(segmento.valor, 10)
      if (!isNaN(dias)) {
        const corte = new Date()
        corte.setDate(corte.getDate() - dias)
        whereCliente.ultimaSessao = { lt: corte }
      }
    }
    // tipo "todos": sem filtro extra

    const clientes = await prisma.cliente.findMany({
      where: whereCliente,
      select: { id: true, nome: true, telefone: true },
    })

    if (clientes.length === 0) {
      return respostaErro(
        "Nenhum cliente corresponde ao segmento",
        "SEGMENTO_VAZIO",
        422
      )
    }

    // Criar campanha + MensagemIA por cliente
    const campanha = await prisma.campanha.create({
      data: {
        nome,
        templateId,
        segmento,
        mensagens: {
          create: clientes.map((c) => ({
            clienteId: c.id,
            canal: "whatsapp",
            tipo: "campanha",
            estado: "pendente",
            // Substituição simples de {{nome}}
            mensagemGerada: template.texto.replace(/\{\{nome\}\}/g, c.nome ?? ""),
          })),
        },
      },
      include: { _count: { select: { mensagens: true } } },
    })

    // Buscar ids das mensagens criadas e colocar na fila com espaçamento
    const mensagens = await prisma.mensagemIA.findMany({
      where: { campanhaId: campanha.id, estado: "pendente" },
      select: { id: true },
    })

    const resultadoFila = await aprovarEAgendar(
      mensagens.map((m) => ({ id: m.id })),
      espacamentoMinSeg,
      espacamentoMaxSeg
    )

    return respostaSucesso(
      { campanha, agendadas: resultadoFila.agendadas.length },
      { totalClientes: clientes.length }
    )
  } catch (error) {
    console.error("POST /api/v1/campanhas:", error)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
