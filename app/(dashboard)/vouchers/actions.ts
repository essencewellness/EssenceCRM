"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { voucherCreateSchema, voucherUpdateSchema, normalizarTelefone } from "@/lib/validations"
import { adicionarMeses, origemDoVoucher, linkCurtoDoVoucher } from "@/lib/utils"
import { getTerapeutaPrincipalPadraoId } from "@/lib/terapeuta-padrao"
import { webhooks } from "@/lib/webhooks"
import { Prisma } from "@/lib/prisma-client"
import { calcularRepasse } from "@/lib/repasses"

async function verificarSessao() {
  const session = await auth()
  if (!session?.user) throw new Error("Não autenticado")
  return session
}

const CAMPOS_EDITAVEIS = [
  "codigo", "tipo", "estado", "compradorNome", "compradorTelefone", "compradorEmail",
  "servicoNome", "valorPago", "beneficiarioNome", "beneficiarioTelefone",
  "validade", "dataUso", "notas",
  // O que aparece no voucher que a pessoa recebe
  "nomesNoVoucher", "mensagemVoucher",
  // De quem é a receita desta venda. Null = da Bea (o normal); passa-se
  // para a Cristina quando é ela que vai fazer a sessão.
  "terapeutaId",
  "metodoPagamento",
] as const
type CampoEditavel = (typeof CAMPOS_EDITAVEIS)[number]

export async function atualizarCampoVoucher(
  id: string,
  campo: CampoEditavel,
  valor: unknown
): Promise<{ ok: true } | { ok: false; erro: string }> {
  await verificarSessao()

  if (!CAMPOS_EDITAVEIS.includes(campo)) {
    return { ok: false, erro: "Campo não editável" }
  }

  const parsed = voucherUpdateSchema.safeParse({ [campo]: valor })
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Valor inválido" }
  }
  const valorValidado = (parsed.data as Record<string, unknown>)[campo]

  if (campo === "codigo" && typeof valorValidado === "string") {
    const existente = await prisma.giftCard.findFirst({
      where: { id: { not: id }, codigo: valorValidado },
    })
    if (existente) return { ok: false, erro: "Já existe um voucher com este código." }
  }

  try {
    await prisma.giftCard.update({
      where: { id },
      data: {
        [campo]:
          campo === "valorPago" ? new Prisma.Decimal(valorValidado as number)
          : (campo === "validade" || campo === "dataUso") && valorValidado ? new Date(valorValidado as string)
          : valorValidado,
      },
    })
    revalidatePath("/vouchers")
    return { ok: true }
  } catch {
    return { ok: false, erro: "Erro ao guardar" }
  }
}

// Grava várias alterações de uma vez (painel de edição). Ao contrário do
// atualizarCampoVoucher — que gravava a cada clique — aqui a terapeuta só
// confirma no fim, o que evita alterações acidentais.
export async function atualizarVoucher(
  id: string,
  dados: Record<string, unknown>
): Promise<{ ok: true } | { ok: false; erro: string }> {
  await verificarSessao()

  const limpos: Record<string, unknown> = {}
  for (const [campo, valor] of Object.entries(dados)) {
    if (!CAMPOS_EDITAVEIS.includes(campo as CampoEditavel)) continue
    limpos[campo] = valor === "" ? null : valor
  }

  const parsed = voucherUpdateSchema.safeParse(limpos)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { ok: false, erro: `${issue?.path.join(".") ?? "Campo"}: ${issue?.message ?? "inválido"}` }
  }

  const campos = parsed.data as Record<string, unknown>

  if (typeof campos.codigo === "string") {
    const duplicado = await prisma.giftCard.findFirst({
      where: { id: { not: id }, codigo: campos.codigo },
    })
    if (duplicado) return { ok: false, erro: "Já existe um voucher com este código." }
  }

  // Recalcula o repasse sempre que terapeuta ou método de pagamento mudam —
  // busca o estado atual para combinar com o que está a ser editado agora.
  const precisaRecalcular = "terapeutaId" in campos || "metodoPagamento" in campos || "valorPago" in campos
  let repasseCampos: { repasseNecessario: boolean; valorRepasse: Prisma.Decimal | null } | null = null
  if (precisaRecalcular) {
    const atual = await prisma.giftCard.findUnique({
      where: { id },
      select: { terapeutaId: true, terapeuta2Id: true, metodoPagamento: true, valorPago: true },
    })
    if (atual) {
      const { repasseNecessario, valorRepasse } = calcularRepasse({
        terapeutaId: "terapeutaId" in campos ? (campos.terapeutaId as string | null) : atual.terapeutaId,
        terapeuta2Id: atual.terapeuta2Id,
        metodoPagamento: "metodoPagamento" in campos ? (campos.metodoPagamento as string | null) : atual.metodoPagamento,
        valorPago: "valorPago" in campos ? (campos.valorPago as number) : Number(atual.valorPago),
      })
      repasseCampos = { repasseNecessario, valorRepasse: valorRepasse !== null ? new Prisma.Decimal(valorRepasse) : null }
    }
  }

  try {
    await prisma.giftCard.update({
      where: { id },
      data: {
        ...campos,
        ...(campos.valorPago !== undefined ? { valorPago: new Prisma.Decimal(campos.valorPago as number) } : {}),
        ...(campos.validade !== undefined ? { validade: campos.validade ? new Date(campos.validade as string) : null } : {}),
        ...(campos.dataUso !== undefined ? { dataUso: campos.dataUso ? new Date(campos.dataUso as string) : null } : {}),
        ...(repasseCampos ?? {}),
      },
    })
    revalidatePath("/vouchers")
    revalidatePath("/financeiro")
    return { ok: true }
  } catch {
    return { ok: false, erro: "Erro ao guardar" }
  }
}

// Apaga o voucher a sério (não é o "cancelado" — esse fica na lista). Só
// avança se quem pede escrever exatamente o código ou o nome do comprador,
// para não ser possível apagar sem querer com um clique. Não há nada mais
// no schema com FK a apontar para GiftCard.id (ver prisma/schema.prisma),
// por isso um delete simples já limpa tudo — não há registos órfãos a
// deixar para trás.
export async function apagarVoucher(
  id: string,
  confirmacao: string
): Promise<{ ok: true } | { ok: false; erro: string }> {
  await verificarSessao()

  const voucher = await prisma.giftCard.findUnique({
    where: { id },
    select: { codigo: true, compradorNome: true },
  })
  if (!voucher) return { ok: false, erro: "Voucher não encontrado." }

  const escrito = confirmacao.trim().toLowerCase()
  const confere =
    escrito.length > 0 &&
    (escrito === voucher.codigo.toLowerCase() || escrito === voucher.compradorNome.trim().toLowerCase())
  if (!confere) {
    return { ok: false, erro: "O texto não corresponde ao código nem ao nome do comprador." }
  }

  try {
    await prisma.giftCard.delete({ where: { id } })
    revalidatePath("/vouchers")
    revalidatePath("/financeiro")
    return { ok: true }
  } catch {
    return { ok: false, erro: "Erro ao apagar o voucher." }
  }
}

export async function criarVoucher(dados: {
  codigo: string
  tipo: string
  compradorNome: string
  compradorTelefone?: string
  servicoNome: string
  valorPago: number
  beneficiarioNome?: string
  dataCompra?: string
  notas?: string
  nomesNoVoucher?: string
  mensagemVoucher?: string
  terapeutaId?: string
  metodoPagamento?: string
}): Promise<{ ok: true; link: string } | { ok: false; erro: string }> {
  const session = await verificarSessao()

  const parsed = voucherCreateSchema.safeParse(dados)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { ok: false, erro: `${issue?.path.join(".") ?? "Campo"}: ${issue?.message ?? "inválido"}` }
  }

  const existente = await prisma.giftCard.findUnique({ where: { codigo: parsed.data.codigo } })
  if (existente) return { ok: false, erro: "Já existe um voucher com este código." }

  // A validade é sempre derivada, nunca escrita à mão: 6 meses a contar da
  // data de compra — o prazo que a Essence pratica em todos os vouchers
  // emitidos (ver folha de controlo).
  const dataCompra = parsed.data.dataCompra ? new Date(parsed.data.dataCompra) : new Date()
  const validade = adicionarMeses(dataCompra, 6)

  // Serviço "a dois": sabe-se logo à compra que são as duas terapeutas — sem
  // ambiguidade nenhuma a resolver mais tarde na sessão (é por isso que o
  // forms de atribuição nem pergunta nestes casos). Por isso o voucher já
  // nasce atribuído às duas, em vez de ficar preso à Bea por omissão até
  // uma sessão ser marcada "realizada".
  let terapeuta2Id: string | null = null
  if (/a dois|a duas|casal/i.test(parsed.data.servicoNome)) {
    const [idBea, terapeutasAtivas] = await Promise.all([
      getTerapeutaPrincipalPadraoId(),
      prisma.user.findMany({ where: { role: "terapeuta", ativo: true }, select: { id: true } }),
    ])
    if (terapeutasAtivas.length === 2) {
      terapeuta2Id = terapeutasAtivas.find(t => t.id !== idBea)?.id ?? null
    }
  }

  const { repasseNecessario, valorRepasse } = calcularRepasse({
    terapeutaId: parsed.data.terapeutaId ?? null,
    terapeuta2Id,
    metodoPagamento: parsed.data.metodoPagamento ?? null,
    valorPago: parsed.data.valorPago,
  })

  try {
    const voucher = await prisma.giftCard.create({
      data: {
        codigo: parsed.data.codigo,
        tipo: parsed.data.tipo ?? "digital",
        compradorNome: parsed.data.compradorNome,
        compradorTelefone: parsed.data.compradorTelefone ?? null,
        servicoNome: parsed.data.servicoNome,
        valorPago: new Prisma.Decimal(parsed.data.valorPago),
        beneficiarioNome: parsed.data.beneficiarioNome ?? null,
        dataCompra,
        validade,
        notas: parsed.data.notas ?? null,
        nomesNoVoucher: parsed.data.nomesNoVoucher ?? null,
        mensagemVoucher: parsed.data.mensagemVoucher ?? null,
        terapeutaId: parsed.data.terapeutaId ?? null,
        terapeuta2Id,
        metodoPagamento: parsed.data.metodoPagamento ?? null,
        repasseNecessario,
        valorRepasse: valorRepasse !== null ? new Prisma.Decimal(valorRepasse) : null,
      },
    })

    // O comprador de um voucher é um lead em potencial — regista-o no CRM
    // automaticamente (upsert por telefone) com uma nota da compra, para a
    // Bea não precisar de o fazer à mão sempre que emite um voucher.
    if (parsed.data.compradorTelefone) {
      const telefone = normalizarTelefone(parsed.data.compradorTelefone)
      if (telefone) {
        const clienteExistente = await prisma.cliente.findUnique({ where: { telefone } })
        const cliente = clienteExistente ?? await prisma.cliente.create({
          data: {
            nome: parsed.data.compradorNome,
            telefone,
            estado: "lead",
            fonte: "voucher",
            // Coluna "Origem" na lista de Leads — diz de onde veio e para
            // quem foi, sem ser preciso abrir a ficha.
            comoNosConheceu: origemDoVoucher(parsed.data.codigo, parsed.data.beneficiarioNome),
          },
        })
        await prisma.observacao.create({
          data: {
            clienteId: cliente.id,
            texto: `Comprou o voucher ${parsed.data.codigo} (${parsed.data.servicoNome}, ${parsed.data.valorPago}€).`,
            autor: session.user?.name ?? "bea",
          },
        })
        // Liga a compra à ficha do comprador — é o que alimenta o separador
        // "Vouchers" no perfil dele. Sem isto a nota acima era o único
        // vestígio, e não dava para listar nem contar as compras.
        await prisma.giftCard.update({
          where: { id: voucher.id },
          data: { compradorClienteId: cliente.id },
        })
      }
    }

    // Dashboard financeiro da Beatriz (Google Sheets): todo o voucher conta
    // para ela — individual, valor inteiro; a dois, sempre metade (a outra
    // metade é da Cristina e não entra neste sheet, que é só dela).
    void webhooks.voucherVendido({
      codigo: voucher.codigo,
      servicoNome: voucher.servicoNome,
      valor: terapeuta2Id ? parsed.data.valorPago / 2 : parsed.data.valorPago,
      compradorNome: voucher.compradorNome,
      dataCompra: voucher.dataCompra.toISOString(),
      notas: terapeuta2Id ? "Casal" : null,
    })

    revalidatePath("/vouchers")
    // O link é o que a Bea vai enviar à pessoa — devolvido já pronto para
    // não haver um segundo passo noutra ferramenta. É o link curto: a rota
    // app/v/[codigo] resolve os dados completos em tempo real a partir do
    // código, por isso não precisa de os receber já montados aqui.
    return { ok: true, link: linkCurtoDoVoucher(voucher.codigo) }
  } catch {
    return { ok: false, erro: "Erro ao criar voucher" }
  }
}
