"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { auditar } from "@/lib/audit"
import { EstadoSessao, Prisma } from "@/lib/prisma-client"
import { recalcularMetricasCliente } from "@/lib/metricas"
import { sessaoUpdateSchema } from "@/lib/validations"
import { getTerapeutaPrincipalPadraoId } from "@/lib/terapeuta-padrao"
import { webhooks } from "@/lib/webhooks"
import { calcularReatribuicaoBea } from "@/lib/reatribuicao-financeira"
import { encontrarConflitoAgenda, ConflitoAgendaError } from "@/lib/conflito-agenda"
import { assinalarSessaoCanceladaNaFichaClinica } from "@/lib/ficha-clinica"
import { dispararEfeitosSessaoRealizada } from "@/lib/sessoes"
import { recalcularEstadoCliente } from "@/lib/crm-estados"

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
    select: {
      id: true, estado: true, clienteId: true, data: true, hora: true, duracao: true,
      servico: true, terapeuta: true, terapeutaId: true, terapeuta2Id: true,
    },
  })
  if (!sessaoAntes) throw new Error("Sessão não encontrada")
  if (sessaoAntes.clienteId !== clienteId) throw new Error("Sessão não pertence a este cliente")

  const { data: dataSessao, dataRecomendadaRegresso, ...resto } = dados

  // Só uma sala: hora/data/duração mudam → verificar sobreposição com outra
  // sessão activa antes de gravar (ver lib/conflito-agenda.ts).
  if (dados.hora !== undefined || dados.data !== undefined || dados.duracao !== undefined) {
    const horaEfetiva = dados.hora !== undefined ? dados.hora : sessaoAntes.hora
    if (horaEfetiva) {
      const conflito = await encontrarConflitoAgenda({
        data: dataSessao ? new Date(dataSessao) : sessaoAntes.data,
        hora: horaEfetiva,
        duracao: dados.duracao !== undefined ? dados.duracao : sessaoAntes.duracao,
        excluirSessaoId: sessaoId,
      })
      if (conflito) throw new ConflitoAgendaError(conflito)
    }
  }

  const eraRealizada = sessaoAntes.estado === "realizada"
  const ficaRealizada = (dados.estado ?? sessaoAntes.estado) === "realizada"
  const afetaMetricas = (ficaRealizada && !eraRealizada)
    || (eraRealizada && (dados.preco !== undefined || dados.data !== undefined || dados.estado !== undefined))

  // O update da sessão e o recálculo de totalGasto/totalSessoes correm na
  // mesma transação: sem isto, duas edições concorrentes de sessões diferentes
  // do mesmo cliente podiam intercalar leitura+escrita das métricas e deixar
  // o cliente com valores desatualizados até à próxima edição ou ao cron das 07h.
  const sessaoDepois = await prisma.$transaction(async (tx) => {
    const atualizada = await tx.sessao.update({
      where: { id: sessaoId },
      data: {
        ...resto,
        ...(dataSessao ? { data: new Date(dataSessao) } : {}),
        ...(dataRecomendadaRegresso !== undefined
          ? { dataRecomendadaRegresso: dataRecomendadaRegresso ? new Date(dataRecomendadaRegresso) : null }
          : {}),
      } as Prisma.SessaoUpdateInput,
      select: { preco: true, terapeutaId: true, terapeuta2Id: true },
    })

    if (afetaMetricas) {
      await recalcularMetricasCliente(tx, clienteId)
    }

    return atualizada
  })

  // Sessão cancelada OU falta pela Bea no dashboard: mesmo aviso automático
  // na ficha clínica que já acontece via API (ver lib/ficha-clinica.ts) —
  // as vias nunca podem divergir aqui.
  if (
    (dados.estado === "cancelada" || dados.estado === "falta") &&
    sessaoAntes.estado !== "cancelada" && sessaoAntes.estado !== "falta"
  ) {
    await assinalarSessaoCanceladaNaFichaClinica(sessaoId, clienteId, dados.estado)
  }

  // Sessão passa a "realizada" a partir do dashboard: os MESMOS efeitos que
  // já disparam via API (PATCH /api/v1/sessoes/[id]) — webhook de receita
  // para a folha da Bea, fecho do voucher associado, mensagem de avaliação
  // agendada, e o recálculo do estado CRM na hora (sem isto, o cliente
  // ficava preso em "lead" até ao cron das 7h — bug real encontrado pelo
  // Nuno 2026-09-03: marcou uma sessão como realizada no dashboard e o
  // estado nunca mudou). As duas vias nunca podem divergir aqui.
  if (ficaRealizada && !eraRealizada) {
    await dispararEfeitosSessaoRealizada(
      { ...sessaoAntes, terapeutaId: sessaoDepois.terapeutaId, terapeuta2Id: sessaoDepois.terapeuta2Id },
      sessaoDepois.preco
    )
    await recalcularEstadoCliente(clienteId)
  }

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
    // ConflitoAgendaError: mensagem já pensada para a Bea ver — passa
    // directa. Tudo o resto (Prisma/JS) fica só no log do servidor, nunca
    // no ecrã (pode incluir nomes de colunas/detalhes de constraints).
    if (e instanceof ConflitoAgendaError) {
      return { ok: false, erro: e.message }
    }
    console.error("atualizarCampoSessao:", e)
    return { ok: false, erro: "Erro ao guardar. Tenta novamente." }
  }
}

// Corrigir a terapeuta de uma sessão já atribuída (o forms "quem vai
// realizar a sessão?" é de uso único — não dá para reabrir para corrigir um
// engano). Além de mudar terapeutaId/terapeuta2Id, propaga a correção para
// onde o dinheiro já tenha sido reconhecido: o voucher ligado (se houver) e
// o Google Sheets da Beatriz — mesmo mecanismo já usado para reatribuição
// automática de vouchers (lib/sessoes.ts), replicado aqui para o caso manual.
export async function atualizarTerapeutaSessao(
  sessaoId: string,
  clienteId: string,
  terapeutaId: string,
  terapeuta2Id: string | null
): Promise<{ ok: true } | { ok: false; erro: string }> {
  try {
    const session = await auth()
    if (!session?.user) throw new Error("Não autorizado")
    await verificarDonoCliente(session, clienteId)

    const terapeuta = await prisma.user.findFirst({
      where: { id: terapeutaId, ativo: true, role: "terapeuta" },
      select: { id: true, name: true },
    })
    if (!terapeuta) return { ok: false, erro: "Terapeuta inválida" }
    if (terapeuta2Id === terapeutaId) {
      return { ok: false, erro: "As duas terapeutas têm de ser diferentes" }
    }
    let terapeuta2: { id: string; name: string | null } | null = null
    if (terapeuta2Id) {
      terapeuta2 = await prisma.user.findFirst({
        where: { id: terapeuta2Id, ativo: true, role: "terapeuta" },
        select: { id: true, name: true },
      })
      if (!terapeuta2) return { ok: false, erro: "Segunda terapeuta inválida" }
    }

    const sessaoAntes = await prisma.sessao.findUnique({
      where: { id: sessaoId },
      select: {
        clienteId: true, terapeutaId: true, terapeuta2Id: true, estado: true,
        estadoPagamento: true, valorPago: true, metodoPagamento: true, servico: true, data: true,
        cliente: { select: { nome: true } },
      },
    })
    if (!sessaoAntes) return { ok: false, erro: "Sessão não encontrada" }
    if (sessaoAntes.clienteId !== clienteId) return { ok: false, erro: "Sessão não pertence a este cliente" }

    const naoMudouNada =
      sessaoAntes.terapeutaId === terapeuta.id && (sessaoAntes.terapeuta2Id ?? null) === (terapeuta2?.id ?? null)
    if (naoMudouNada) return { ok: true }

    await prisma.sessao.update({
      where: { id: sessaoId },
      data: {
        terapeutaId: terapeuta.id,
        terapeuta: terapeuta.name ?? "terapeuta",
        terapeuta2Id: terapeuta2?.id ?? null,
      },
    })

    // Só há dinheiro para corrigir se a sessão já foi realizada — antes
    // disso nada foi enviado a lado nenhum.
    if (sessaoAntes.estado === "realizada") {
      const idBea = await getTerapeutaPrincipalPadraoId()
      const voucherLigado = await prisma.giftCard.findFirst({
        where: { sessaoId },
        select: { id: true, codigo: true, servicoNome: true, valorPago: true, terapeutaId: true, terapeuta2Id: true, compradorNome: true, dataCompra: true },
      })

      if (voucherLigado) {
        await prisma.giftCard.update({
          where: { id: voucherLigado.id },
          data: { terapeutaId: terapeuta.id, terapeuta2Id: terapeuta2?.id ?? null },
        })
        // Compara quanto a Bea deveria ter no sheet antes e depois — cobre
        // não só "mudou de dono" mas também um voucher criado individual
        // cuja sessão real acaba por ser a dois (ou o inverso): o valor
        // dela passa de 100% para 50%, não é um simples sim/não.
        const { valorAntes, valorDepois } = calcularReatribuicaoBea({
          valorTotal: Number(voucherLigado.valorPago),
          idBea,
          terapeutaIdAntes: voucherLigado.terapeutaId,
          terapeuta2IdAntes: voucherLigado.terapeuta2Id,
          terapeutaIdDepois: terapeuta.id,
          terapeuta2IdDepois: terapeuta2?.id ?? null,
        })
        if (valorAntes !== valorDepois) {
          if (valorAntes > 0) {
            void webhooks.voucherReceitaReatribuida({
              codigo: voucherLigado.codigo, servicoNome: voucherLigado.servicoNome, valor: valorAntes,
              compradorNome: voucherLigado.compradorNome, dataCompra: voucherLigado.dataCompra.toISOString(),
              direcao: "bea_perde",
            })
          }
          if (valorDepois > 0) {
            void webhooks.voucherReceitaReatribuida({
              codigo: voucherLigado.codigo, servicoNome: voucherLigado.servicoNome, valor: valorDepois,
              compradorNome: voucherLigado.compradorNome, dataCompra: voucherLigado.dataCompra.toISOString(),
              direcao: "bea_ganha",
            })
          }
        }
      } else if (sessaoAntes.estadoPagamento === "pago" && sessaoAntes.valorPago !== null) {
        // Sessão paga diretamente (sem voucher) — pode já ter sido enviada
        // ao sheet via sessaoReceitaBea.
        const { valorAntes, valorDepois } = calcularReatribuicaoBea({
          valorTotal: Number(sessaoAntes.valorPago),
          idBea,
          terapeutaIdAntes: sessaoAntes.terapeutaId,
          terapeuta2IdAntes: sessaoAntes.terapeuta2Id,
          terapeutaIdDepois: terapeuta.id,
          terapeuta2IdDepois: terapeuta2?.id ?? null,
        })
        if (valorAntes !== valorDepois) {
          if (valorAntes > 0) {
            void webhooks.sessaoReceitaReatribuida({
              sessaoId, clienteNome: sessaoAntes.cliente.nome, servico: sessaoAntes.servico, valor: valorAntes,
              data: sessaoAntes.data.toISOString(), metodoPagamento: sessaoAntes.metodoPagamento,
              direcao: "bea_perde",
            })
          }
          if (valorDepois > 0) {
            void webhooks.sessaoReceitaReatribuida({
              sessaoId, clienteNome: sessaoAntes.cliente.nome, servico: sessaoAntes.servico, valor: valorDepois,
              data: sessaoAntes.data.toISOString(), metodoPagamento: sessaoAntes.metodoPagamento,
              direcao: "bea_ganha",
            })
          }
        }
      }
    }

    auditar({
      quem: session.user.email ?? "dashboard",
      acao: "sessao.terapeuta_corrigida",
      entidade: "Sessao",
      entidadeId: sessaoId,
      detalhe: {
        de: sessaoAntes.terapeutaId, de2: sessaoAntes.terapeuta2Id,
        para: terapeuta.id, para2: terapeuta2?.id ?? null,
      },
    })

    revalidatePath(`/clientes/${clienteId}`)
    return { ok: true }
  } catch (e) {
    console.error("atualizarTerapeutaSessao:", e)
    return { ok: false, erro: "Erro ao guardar. Tenta novamente." }
  }
}

// ── Packs de sessões ──────────────────────────────────────────
// Packs são individuais (nunca "a dois") — a receita é sempre só desta
// terapeuta, nunca dividida (ao contrário de sessão/voucher a dois).

export async function criarPack(
  clienteId: string,
  dados: {
    servicoId?: string | null
    totalSessoes: number
    valorTotal: number
    descricao?: string | null
    terapeutaId: string
  }
): Promise<{ ok: true; packId: string } | { ok: false; erro: string }> {
  try {
    const session = await auth()
    if (!session?.user) throw new Error("Não autorizado")
    await verificarDonoCliente(session, clienteId)

    if (dados.totalSessoes < 1 || dados.totalSessoes > 100) {
      return { ok: false, erro: "Número de sessões inválido" }
    }
    if (dados.valorTotal <= 0) {
      return { ok: false, erro: "O valor total tem de ser maior que zero" }
    }
    if (!dados.terapeutaId) {
      return { ok: false, erro: "Escolhe a terapeuta" }
    }

    const terapeuta = await prisma.user.findFirst({
      where: { id: dados.terapeutaId, ativo: true, role: "terapeuta" },
      select: { id: true },
    })
    if (!terapeuta) return { ok: false, erro: "Terapeuta inválida" }

    const pack = await prisma.pack.create({
      data: {
        clienteId,
        servicoId: dados.servicoId ?? null,
        totalSessoes: dados.totalSessoes,
        valorTotal: dados.valorTotal,
        descricao: dados.descricao ?? null,
        terapeutaId: dados.terapeutaId,
      },
    })

    auditar({
      quem: session.user.email ?? "dashboard",
      acao: "pack.criado",
      entidade: "Pack",
      entidadeId: pack.id,
      detalhe: { clienteId, totalSessoes: dados.totalSessoes, valorTotal: dados.valorTotal, terapeutaId: dados.terapeutaId ?? null },
    })

    revalidatePath(`/clientes/${clienteId}`)
    return { ok: true, packId: pack.id }
  } catch (e) {
    console.error("criarPack:", e)
    return { ok: false, erro: "Erro ao criar o pack. Tenta novamente." }
  }
}

export async function registarPagamentoPack(
  packId: string,
  clienteId: string,
  dados: { valor: number; metodoPagamento?: string | null; notas?: string | null }
): Promise<{ ok: true } | { ok: false; erro: string }> {
  try {
    const session = await auth()
    if (!session?.user) throw new Error("Não autorizado")
    await verificarDonoCliente(session, clienteId)

    if (dados.valor <= 0) return { ok: false, erro: "O valor tem de ser maior que zero" }

    const pack = await prisma.pack.findUnique({
      where: { id: packId },
      select: {
        clienteId: true, valorTotal: true, valorPago: true, terapeutaId: true,
        servico: { select: { nome: true } }, cliente: { select: { nome: true } },
      },
    })
    if (!pack || pack.clienteId !== clienteId) return { ok: false, erro: "Pack não encontrado" }

    const valorPagoAntes = Number(pack.valorPago)
    const novoValorPago = valorPagoAntes + dados.valor
    const valorTotalNum = Number(pack.valorTotal)
    // Comparação com margem de 1 cêntimo — floats de Decimal→Number podem
    // ficar a 349.9999999 em vez de 350, e "pago" nunca acontecia.
    const novoEstado = novoValorPago >= valorTotalNum - 0.01 ? "pago" : novoValorPago > 0 ? "parcial" : "pendente"

    await prisma.$transaction([
      prisma.packPagamento.create({
        data: {
          packId,
          valor: dados.valor,
          metodoPagamento: dados.metodoPagamento ?? null,
          notas: dados.notas ?? null,
        },
      }),
      prisma.pack.update({
        where: { id: packId },
        data: { valorPago: novoValorPago, estadoPagamento: novoEstado },
      }),
    ])

    // Dashboard financeiro (Google Sheets) — mesmo padrão fire-and-forget dos
    // outros eventos de receita. Sem workflow N8N ligado ainda para este
    // evento específico: a variável de ambiente não estando definida faz
    // isto ser silenciosamente ignorado (comportamento documentado em
    // lib/webhooks.ts), não é um erro.
    void webhooks.packPagamentoRegistado({
      packId,
      clienteNome: pack.cliente.nome,
      servicoNome: pack.servico?.nome ?? "Massagens",
      valor: dados.valor,
      data: new Date().toISOString(),
      metodoPagamento: dados.metodoPagamento ?? null,
      terapeutaId: pack.terapeutaId,
    })

    auditar({
      quem: session.user.email ?? "dashboard",
      acao: "pack.pagamento_registado",
      entidade: "Pack",
      entidadeId: packId,
      detalhe: { valor: dados.valor, valorPagoTotal: novoValorPago, estadoPagamento: novoEstado },
    })

    revalidatePath(`/clientes/${clienteId}`)
    revalidatePath("/financeiro")
    return { ok: true }
  } catch (e) {
    console.error("registarPagamentoPack:", e)
    return { ok: false, erro: "Erro ao registar o pagamento. Tenta novamente." }
  }
}

// Apagamento DEFINITIVO de um pack (hard delete). A cascata do schema remove
// os pagamentos (PackPagamento); sessões que já estavam ligadas a este pack
// (Sessao.packId) ficam com o campo a null em vez de serem apagadas — a
// sessão em si aconteceu de verdade, só deixa de estar contabilizada num pack.
export async function eliminarPack(packId: string, clienteId: string) {
  const session = await auth()
  if (!session?.user) throw new Error("Não autorizado")
  await verificarDonoCliente(session, clienteId)

  const pack = await prisma.pack.findUnique({
    where: { id: packId },
    select: { clienteId: true },
  })
  if (!pack) throw new Error("Pack não encontrado")
  if (pack.clienteId !== clienteId) throw new Error("Pack não pertence a este cliente")

  await prisma.pack.delete({ where: { id: packId } })

  auditar({
    quem: session.user.email ?? "dashboard",
    acao: "pack.apagado_definitivo",
    entidade: "Pack",
    entidadeId: packId,
  })

  revalidatePath(`/clientes/${clienteId}`)
  revalidatePath("/financeiro")
  return { ok: true as const }
}
