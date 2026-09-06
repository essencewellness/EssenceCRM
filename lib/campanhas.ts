// Lógica partilhada de criação de campanhas — usada tanto pelo endpoint
// público (POST /api/v1/campanhas, para N8N/integrações externas) como
// pela ação de servidor do dashboard (para a Bea criar campanhas sem
// precisar da API key). Uma só fonte de verdade para resolver o segmento
// e criar a campanha + mensagens, para as duas entradas nunca divergirem.
import { prisma } from "@/lib/prisma"
import { aprovarEAgendar } from "@/lib/fila-envio"
import type { Prisma } from "@/lib/prisma-client"

export interface SegmentoCampanha {
  tipo: "servico" | "estado" | "inatividade" | "todos"
  valor?: string
}

/** Filtro Prisma base: nunca contactar blacklist/perdida, nunca sem opt-in, nunca sem telefone. */
function whereBaseSegmento(): Prisma.ClienteWhereInput {
  return {
    apagadoEm: null,
    estado: { notIn: ["blacklist", "perdida"] },
    aceitaMarketing: true,
    anonimizadoEm: null,
    telefone: { not: null },
  }
}

export function resolverWhereSegmento(segmento: SegmentoCampanha): Prisma.ClienteWhereInput {
  const where = whereBaseSegmento()

  if (segmento.tipo === "servico" && segmento.valor) {
    where.sessoes = { some: { servico: segmento.valor, estado: "realizada" } }
  } else if (segmento.tipo === "estado" && segmento.valor) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where.estado = segmento.valor as any
  } else if (segmento.tipo === "inatividade" && segmento.valor) {
    const dias = parseInt(segmento.valor, 10)
    if (!isNaN(dias)) {
      const corte = new Date()
      corte.setDate(corte.getDate() - dias)
      where.ultimaSessao = { lt: corte }
    }
  }
  // tipo "todos": sem filtro extra

  return where
}

/** Conta quantos clientes seriam contactados por este segmento, sem criar nada — para preview no formulário. */
export async function contarClientesSegmento(segmento: SegmentoCampanha): Promise<number> {
  return prisma.cliente.count({ where: resolverWhereSegmento(segmento) })
}

export interface CriarCampanhaInput {
  nome: string
  templateId: string
  segmento: SegmentoCampanha
  espacamentoMinSeg?: number
  espacamentoMaxSeg?: number
}

export class CampanhaError extends Error {
  constructor(message: string, public codigo: string) {
    super(message)
  }
}

/** Cria a campanha, uma MensagemIA por cliente do segmento, e já as coloca na fila com espaçamento anti-ban. */
export async function criarCampanha(input: CriarCampanhaInput) {
  const { nome, templateId, segmento, espacamentoMinSeg, espacamentoMaxSeg } = input

  const template = await prisma.templateMensagem.findUnique({
    where: { id: templateId },
    select: { id: true, texto: true, ativo: true },
  })
  if (!template) throw new CampanhaError("Template não encontrado", "TEMPLATE_NAO_ENCONTRADO")
  if (!template.ativo) throw new CampanhaError("Template está inativo", "TEMPLATE_INATIVO")

  const clientes = await prisma.cliente.findMany({
    where: resolverWhereSegmento(segmento),
    select: { id: true, nome: true, telefone: true },
  })
  if (clientes.length === 0) {
    throw new CampanhaError("Nenhum cliente corresponde ao segmento", "SEGMENTO_VAZIO")
  }

  const campanha = await prisma.campanha.create({
    data: {
      nome,
      templateId,
      segmento: segmento as unknown as Prisma.InputJsonValue,
      mensagens: {
        create: clientes.map((c) => ({
          clienteId: c.id,
          canal: "whatsapp",
          tipo: "campanha",
          estado: "pendente",
          mensagemGerada: template.texto.replace(/\{\{nome\}\}/g, c.nome ?? ""),
        })),
      },
    },
    include: { _count: { select: { mensagens: true } } },
  })

  const mensagens = await prisma.mensagemIA.findMany({
    where: { campanhaId: campanha.id, estado: "pendente" },
    select: { id: true },
  })

  const resultadoFila = await aprovarEAgendar(
    mensagens.map((m) => ({ id: m.id })),
    espacamentoMinSeg,
    espacamentoMaxSeg
  )

  return { campanha, totalClientes: clientes.length, agendadas: resultadoFila.agendadas.length }
}

/** Cancela uma campanha ativa e rejeita as mensagens ainda por enviar. */
export async function cancelarCampanha(id: string) {
  const campanha = await prisma.campanha.findUnique({ where: { id }, select: { id: true, estado: true } })
  if (!campanha) throw new CampanhaError("Campanha não encontrada", "CAMPANHA_NAO_ENCONTRADA")
  if (campanha.estado !== "ativa") {
    throw new CampanhaError("Só campanhas ativas podem ser canceladas", "CAMPANHA_NAO_ATIVA")
  }

  const [campanhaAtualizada, mensagensCanceladas] = await prisma.$transaction([
    prisma.campanha.update({ where: { id }, data: { estado: "cancelada" } }),
    prisma.mensagemIA.updateMany({
      where: { campanhaId: id, estado: { in: ["pendente", "em_fila"] } },
      data: { estado: "rejeitada" },
    }),
  ])

  return { campanha: campanhaAtualizada, mensagensCanceladas: mensagensCanceladas.count }
}
