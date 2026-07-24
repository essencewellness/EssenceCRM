"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { auditar } from "@/lib/audit"
import { EstadoSessao, Prisma } from "@/lib/prisma-client"
import { recalcularMetricasCliente } from "@/lib/metricas"
import { sessaoUpdateSchema } from "@/lib/validations"

// Garante que a terapeuta autenticada é admin OU a dona do cliente
// (terapeutaPrincipalId). Sem isto, qualquer terapeuta autenticada conseguia
// eliminar/editar clientes e sessões de outra colega só por adivinhar o cuid
// — estas actions só validavam sessão, nunca posse.
type SessaoComUser = { user?: { role?: string; id?: string } | null } | null | undefined

async function verificarDonoCliente(session: SessaoComUser, clienteId: string) {
  const role = (session?.user as { role?: string })?.role ?? "terapeuta"
  if (role === "admin") return

  const userId = (session?.user as { id?: string })?.id
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { terapeutaPrincipalId: true },
  })
  if (!cliente || !userId || cliente.terapeutaPrincipalId !== userId) {
    throw new Error("Não tens permissão para aceder a este cliente.")
  }
}

// Apagamento DEFINITIVO do cliente (hard delete). A cascata do schema remove
// sessões, mensagens, etiquetas, observações, preços, packs e portal token.
// Como Sessao.clienteId é obrigatório, apagar o cliente implica apagar as sessões:
// se o cliente tiver sessões, exige-se confirmação explícita (apagarSessoes).
export async function eliminarCliente(clienteId: string, apagarSessoes = false) {
  const session = await auth()
  if (!session?.user) throw new Error("Não autorizado")
  await verificarDonoCliente(session, clienteId)

  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { id: true, nome: true, _count: { select: { sessoes: true } } },
  })
  if (!cliente) throw new Error("Cliente não encontrado")

  // Se há sessões e não foi confirmado apagá-las, bloquear (a cascata removê-las-ia)
  if (cliente._count.sessoes > 0 && !apagarSessoes) {
    return { ok: false as const, motivo: "TEM_SESSOES" as const, sessoes: cliente._count.sessoes }
  }

  // Hard delete — onDelete: Cascade no schema remove tudo o que depende do cliente
  await prisma.cliente.delete({ where: { id: clienteId } })

  auditar({
    quem: session.user.email ?? "dashboard",
    acao: "cliente.apagado_definitivo",
    entidade: "Cliente",
    entidadeId: clienteId,
    detalhe: { nome: cliente.nome, sessoesApagadas: cliente._count.sessoes },
  })

  revalidatePath("/clientes")
  redirect("/clientes")
}

// Apagamento DEFINITIVO de uma sessão (hard delete)
export async function eliminarSessao(sessaoId: string, clienteId: string) {
  const session = await auth()
  if (!session?.user) throw new Error("Não autorizado")
  await verificarDonoCliente(session, clienteId)

  const sessao = await prisma.sessao.findUnique({
    where: { id: sessaoId },
    select: { estado: true, clienteId: true },
  })
  if (!sessao) throw new Error("Sessão não encontrada")
  if (sessao.clienteId !== clienteId) throw new Error("Sessão não pertence a este cliente")

  // Apagar a sessão e recalcular as métricas na mesma transação — evita a
  // janela de corrida em que duas edições concorrentes no mesmo cliente (ex:
  // Bea e Cris a mexer em sessões diferentes ao mesmo tempo) leem/escrevem
  // totalGasto/totalSessoes fora de ordem.
  await prisma.$transaction(async (tx) => {
    await tx.sessao.delete({ where: { id: sessaoId } })

    if (sessao.estado === "realizada") {
      await recalcularMetricasCliente(tx, clienteId)
    }
  })

  auditar({
    quem: session.user.email ?? "dashboard",
    acao: "sessao.apagada_definitivo",
    entidade: "Sessao",
    entidadeId: sessaoId,
  })

  revalidatePath(`/clientes/${clienteId}`)
  revalidatePath("/clientes")
}

// Campos de sessão editáveis a partir do dashboard (estado + InlineEditField)
type DadosSessao = {
  resumoSessao?: string | null
  notasPosSessao?: string | null
  estadoEmocional?: string | null
  estado?: EstadoSessao
  servico?: string | null
  preco?: number | null
  data?: string
  hora?: string | null
  duracao?: number | null
  aromaSessao?: string | null
  dataRecomendadaRegresso?: string | null
}

// Núcleo partilhado: aplica a atualização + recalcula métricas quando um
// campo que afeta totalGasto/totalSessoes muda (transição para "realizada",
// preço, data, ou saída de "realizada") — na hora, sem esperar pelo cron.
async function aplicarAtualizacaoSessao(sessaoId: string, clienteId: string, dados: DadosSessao) {
  const session = await auth()
  if (!session?.user) throw new Error("Não autorizado")
  await verificarDonoCliente(session, clienteId)

  const sessaoAntes = await prisma.sessao.findUnique({
    where: { id: sessaoId },
    select: { estado: true, clienteId: true },
  })
  if (!sessaoAntes) throw new Error("Sessão não encontrada")
  if (sessaoAntes.clienteId !== clienteId) throw new Error("Sessão não pertence a este cliente")

  const { data: dataSessao, dataRecomendadaRegresso, ...resto } = dados

  const eraRealizada = sessaoAntes.estado === "realizada"
  const ficaRealizada = (dados.estado ?? sessaoAntes.estado) === "realizada"
  const afetaMetricas = (ficaRealizada && !eraRealizada)
    || (eraRealizada && (dados.preco !== undefined || dados.data !== undefined || dados.estado !== undefined))

  // O update da sessão e o recálculo de totalGasto/totalSessoes correm na
  // mesma transação: sem isto, duas edições concorrentes de sessões diferentes
  // do mesmo cliente podiam intercalar leitura+escrita das métricas e deixar
  // o cliente com valores desatualizados até à próxima edição ou ao cron das 07h.
  await prisma.$transaction(async (tx) => {
    await tx.sessao.update({
      where: { id: sessaoId },
      data: {
        ...resto,
        ...(dataSessao ? { data: new Date(dataSessao) } : {}),
        ...(dataRecomendadaRegresso !== undefined
          ? { dataRecomendadaRegresso: dataRecomendadaRegresso ? new Date(dataRecomendadaRegresso) : null }
          : {}),
      } as Prisma.SessaoUpdateInput,
    })

    if (afetaMetricas) {
      await recalcularMetricasCliente(tx, clienteId)
    }
  })

  auditar({
    quem: session.user.email ?? "dashboard",
    acao: "sessao.atualizada",
    entidade: "Sessao",
    entidadeId: sessaoId,
    detalhe: { campos: Object.keys(dados) },
  })

  revalidatePath(`/clientes/${clienteId}`)
  revalidatePath("/clientes")
}

// Atualizar estado/notas de uma sessão (dropdown de estado no SessoesTab)
export async function atualizarObservacoesSessao(sessaoId: string, clienteId: string, dados: DadosSessao) {
  await aplicarAtualizacaoSessao(sessaoId, clienteId, dados)
}

// Edição inline campo-a-campo (InlineEditField) — valida contra o mesmo
// schema partilhado com a API (sessaoUpdateSchema), sem duplicar regras.
const CAMPOS_SESSAO_EDITAVEIS = [
  "servico", "preco", "data", "hora", "duracao", "aromaSessao",
  "resumoSessao", "notasPosSessao", "dataRecomendadaRegresso",
] as const
type CampoSessaoEditavel = typeof CAMPOS_SESSAO_EDITAVEIS[number]

export async function atualizarCampoSessao(
  sessaoId: string,
  clienteId: string,
  campo: CampoSessaoEditavel,
  valor: unknown
): Promise<{ ok: true } | { ok: false; erro: string }> {
  if (!CAMPOS_SESSAO_EDITAVEIS.includes(campo)) {
    return { ok: false, erro: "Campo não editável" }
  }

  const parsed = sessaoUpdateSchema.safeParse({ [campo]: valor })
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Valor inválido" }
  }

  try {
    await aplicarAtualizacaoSessao(sessaoId, clienteId, parsed.data as DadosSessao)
    return { ok: true }
  } catch (e) {
    // Nunca expor o erro interno (Prisma/JS) à Bea — pode incluir nomes de
    // colunas/detalhes de constraints. Log completo fica só no servidor.
    console.error("atualizarCampoSessao:", e)
    return { ok: false, erro: "Erro ao guardar. Tenta novamente." }
  }
}
