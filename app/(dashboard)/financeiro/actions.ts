"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getTerapeutaPrincipalPadraoId } from "@/lib/terapeuta-padrao"
import { webhooks } from "@/lib/webhooks"
import { calcularRepasse } from "@/lib/repasses"

async function verificarSessao() {
  const session = await auth()
  if (!session?.user) throw new Error("Não autenticado")
  return session
}

// Adiciona/troca a tag de voucher no cliente correspondente (fire-and-forget)
async function sincronizarTagVoucher(
  telefone: string | null | undefined,
  tagNomeRemover: string | null,
  tagNomeAdicionar: string
) {
  if (!telefone) return

  const cliente = await prisma.cliente.findFirst({
    where: { telefone, apagadoEm: null },
    select: { id: true },
  })
  if (!cliente) return

  const [tagRemover, tagAdicionar] = await Promise.all([
    tagNomeRemover ? prisma.etiqueta.findFirst({ where: { nome: tagNomeRemover } }) : null,
    prisma.etiqueta.findFirst({ where: { nome: tagNomeAdicionar } }),
  ])

  if (tagRemover) {
    await prisma.clienteEtiqueta.deleteMany({
      where: { clienteId: cliente.id, etiquetaId: tagRemover.id },
    })
  }

  if (tagAdicionar) {
    await prisma.clienteEtiqueta.upsert({
      where: { clienteId_etiquetaId: { clienteId: cliente.id, etiquetaId: tagAdicionar.id } },
      create: { clienteId: cliente.id, etiquetaId: tagAdicionar.id },
      update: {},
    })
  }
}

// ── Pagamento de sessão ───────────────────────────────────────

export async function atualizarPagamento(
  sessaoId: string,
  dados: {
    estadoPagamento: "pendente" | "pago" | "parcial" | "isento"
    valorPago?: number | null
    metodoPagamento?: "dinheiro" | "mbway" | "mbway_essence" | "mbway_beatriz" | "transferencia" | "stripe" | "voucher" | null
  }
) {
  await verificarSessao()

  // Só há um MBWay físico (é da Bea) — se quem fez a sessão não foi ela e o
  // pagamento passa a ser por lá, fica um repasse por fazer até a Bea
  // entregar a parte da outra terapeuta em mão. Usa terapeutaId/terapeuta2Id
  // (FK), nunca o campo de texto "terapeuta" — esse fica desatualizado em
  // sessões vindas do Calendly (grava sempre "bea") e nunca é corrigido para
  // a segunda terapeuta numa massagem a dois (bug real encontrado 2026-08-20:
  // o repasse manual nunca disparava para a Cristina por causa disto).
  const idBea = await getTerapeutaPrincipalPadraoId()
  const [sessao, voucherLigado] = await Promise.all([
    prisma.sessao.findUnique({
      where: { id: sessaoId },
      select: {
        terapeutaId: true, terapeuta2Id: true, estadoPagamento: true, servico: true, data: true,
        cliente: { select: { nome: true } },
      },
    }),
    prisma.giftCard.findFirst({ where: { sessaoId }, select: { id: true } }),
  ])
  const outraTerapeuta = (id: string | null) => id !== null && id !== idBea
  const ehADois = sessao?.terapeuta2Id !== null && sessao?.terapeuta2Id !== undefined
  const ehOutraTerapeuta = outraTerapeuta(sessao?.terapeutaId ?? null) || outraTerapeuta(sessao?.terapeuta2Id ?? null)
  // Mesmo critério de "envolve a Bea" usado em lib/sessoes.ts — explícito
  // sobre QUEM está envolvida, não uma aproximação via "é a dois ou não".
  const envolveABea = sessao?.terapeutaId === idBea || sessao?.terapeutaId === null || sessao?.terapeuta2Id === idBea
  const ehMbway = dados.metodoPagamento === "mbway_essence" || dados.metodoPagamento === "mbway_beatriz"
  const emAberto = dados.estadoPagamento === "pago" || dados.estadoPagamento === "parcial"
  const repasseNecessario = ehOutraTerapeuta && ehMbway && emAberto
  // Numa massagem a dois só metade do valor é da outra terapeuta — a outra
  // metade é trabalho da Bea, que fica com ela mesma. Comparação explícita
  // com null/undefined, não truthy — um valorPago de 0€ (sessão de oferta)
  // é um valor real, não "por preencher" (bug real: um €0 a dois ficava com
  // repasseNecessario=true mas valorRepasse=null).
  const valorRepasse = repasseNecessario && ehADois && dados.valorPago !== null && dados.valorPago !== undefined
    ? Math.round((dados.valorPago / 2) * 100) / 100
    : null

  await prisma.sessao.update({
    where: { id: sessaoId },
    data: {
      estadoPagamento: dados.estadoPagamento,
      valorPago: dados.valorPago ?? null,
      metodoPagamento: dados.metodoPagamento ?? null,
      pagamentoEm: dados.estadoPagamento === "pago" ? new Date() : undefined,
      repasseNecessario,
      valorRepasse,
    },
  })

  // Dashboard financeiro da Beatriz (Google Sheets): quando esta sessão já
  // tinha passado por dispararEfeitosSessaoRealizada() (ao ficar "realizada"
  // sem pagamento definido ainda), aquele disparo não tinha dinheiro para
  // reportar. Se o pagamento só é preenchido/corrigido aqui — o fluxo normal
  // de fechar o dia — sem isto a receita nunca chegava à folha. Só dispara
  // na transição PARA "pago" (nunca tinha sido antes), para não duplicar
  // o que já foi enviado por outro caminho.
  if (
    sessao &&
    !voucherLigado &&
    envolveABea &&
    dados.estadoPagamento === "pago" &&
    sessao.estadoPagamento !== "pago" &&
    dados.valorPago !== null &&
    dados.valorPago !== undefined
  ) {
    void webhooks.sessaoReceitaBea({
      sessaoId,
      clienteNome: sessao.cliente.nome,
      servico: sessao.servico,
      valor: ehADois ? Math.round((dados.valorPago / 2) * 100) / 100 : dados.valorPago,
      data: sessao.data.toISOString(),
      metodoPagamento: dados.metodoPagamento ?? null,
      notas: ehADois ? "Casal" : null,
    })
  }

  revalidatePath("/financeiro")
}

// ── Repasse à Cristina (MBWay cai sempre na conta da Bea) ─────
// id vem prefixado "voucher-" quando é um repasse de venda de voucher (ver
// linhasVoucher/repassesVoucher em page.tsx) — mesmo padrão já usado nas
// linhas de movimentos do mês, para nunca colidir com um id de Sessao.
export async function marcarRepasseFeito(id: string) {
  await verificarSessao()

  if (id.startsWith("voucher-")) {
    await prisma.giftCard.update({
      where: { id: id.slice("voucher-".length) },
      data: { repasseFeito: true, repasseFeitoEm: new Date() },
    })
  } else {
    await prisma.sessao.update({
      where: { id },
      data: { repasseFeito: true, repasseFeitoEm: new Date() },
    })
  }

  revalidatePath("/financeiro")
}

// ── Gift Cards / Vouchers ─────────────────────────────────────

export async function criarVoucher(dados: {
  tipo: "digital" | "fisico"
  codigo?: string
  compradorNome: string
  compradorTelefone?: string
  compradorEmail?: string
  servicoNome: string
  valorPago: number
  beneficiarioNome?: string
  beneficiarioTelefone?: string
  dataCompra: string
  validade?: string
  notas?: string
  terapeutaId?: string
  metodoPagamento?: string
}): Promise<{ codigo: string }> {
  await verificarSessao()

  let codigo = dados.codigo?.trim() || ""

  if (!codigo) {
    const ano = new Date(dados.dataCompra).getFullYear()
    // Digital: EWD2026-XXXX | Físico: EW2026-XXXX
    const prefixo = dados.tipo === "digital" ? `EWD${ano}` : `EW${ano}`
    const existentes = await prisma.giftCard.count({
      where: { codigo: { startsWith: prefixo } },
    })
    const seq = String(existentes + 1).padStart(4, "0")
    codigo = `${prefixo}-${seq}`
  }

  // Verificar se o código já existe
  const jaExiste = await prisma.giftCard.findUnique({ where: { codigo } })
  if (jaExiste) throw new Error(`O código "${codigo}" já está em uso.`)

  // Serviço "a dois": sabe-se logo à compra que são as duas terapeutas —
  // mesma lógica do outro formulário de criar voucher (app/vouchers/actions.ts).
  let terapeuta2Id: string | null = null
  if (/a dois|a duas|casal/i.test(dados.servicoNome)) {
    const [idBea, terapeutasAtivas] = await Promise.all([
      getTerapeutaPrincipalPadraoId(),
      prisma.user.findMany({ where: { role: "terapeuta", ativo: true }, select: { id: true } }),
    ])
    if (terapeutasAtivas.length === 2) {
      terapeuta2Id = terapeutasAtivas.find(t => t.id !== idBea)?.id ?? null
    }
  }

  const terapeutaId = dados.terapeutaId || null
  const metodoPagamento = dados.metodoPagamento || null
  const { repasseNecessario, valorRepasse } = calcularRepasse({
    terapeutaId,
    terapeuta2Id,
    metodoPagamento,
    valorPago: dados.valorPago,
  })

  await prisma.giftCard.create({
    data: {
      codigo,
      tipo: dados.tipo,
      compradorNome: dados.compradorNome,
      compradorTelefone: dados.compradorTelefone || null,
      compradorEmail: dados.compradorEmail || null,
      servicoNome: dados.servicoNome,
      valorPago: dados.valorPago,
      beneficiarioNome: dados.beneficiarioNome || null,
      beneficiarioTelefone: dados.beneficiarioTelefone || null,
      dataCompra: new Date(dados.dataCompra),
      validade: dados.validade ? new Date(dados.validade) : null,
      notas: dados.notas || null,
      terapeutaId,
      terapeuta2Id,
      metodoPagamento,
      repasseNecessario,
      valorRepasse,
    },
  })

  // Auto-tag: se houver beneficiário, marcar como "Voucher ativo"
  void sincronizarTagVoucher(dados.beneficiarioTelefone, null, "Voucher ativo")

  revalidatePath("/financeiro")
  return { codigo }
}

export async function atualizarEstadoVoucher(
  voucherId: string,
  estado: "ativo" | "usado" | "expirado" | "cancelado"
) {
  await verificarSessao()

  const voucher = await prisma.giftCard.findUnique({
    where: { id: voucherId },
    select: { beneficiarioTelefone: true },
  })

  await prisma.giftCard.update({
    where: { id: voucherId },
    data: {
      estado,
      dataUso: estado === "usado" ? new Date() : undefined,
    },
  })

  // Auto-tag: swap "Voucher ativo" → "Voucher usado" ao marcar como usado
  if (estado === "usado") {
    void sincronizarTagVoucher(voucher?.beneficiarioTelefone, "Voucher ativo", "Voucher usado")
  }

  revalidatePath("/financeiro")
}
