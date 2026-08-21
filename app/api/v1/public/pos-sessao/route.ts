// Registo de sessão pela terapeuta (público) — mesmo modelo de confiança que
// atribuir-sessao/ficha-sessao/confirmar-sessao: sem login, protegido só pelo
// sessaoId ser um cuid, pensado para abrir a partir do link WhatsApp enviado
// logo após o fim do tratamento (Workflow 05, Parte 2).
export const preferredRegion = "fra1"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { posSessaoQuerySchema, posSessaoPatchSchema, validarQuery, validarBody } from "@/lib/validations"
import { verificarRateLimit } from "@/lib/rate-limit"
import { serializarDecimais } from "@/lib/serialize"
import { dispararEfeitosSessaoRealizada } from "@/lib/sessoes"
import { recalcularMetricasCliente } from "@/lib/metricas"
import { recalcularEstadoCliente } from "@/lib/crm-estados"
import { auditar } from "@/lib/audit"
import { validarLinkToken } from "@/lib/link-token"

export async function GET(request: NextRequest) {
  const bloqueio = await verificarRateLimit(request, {
    recurso: "pos-sessao-get",
    limite: 60,
    janelaSeg: 3600,
  })
  if (bloqueio) return bloqueio

  const q = validarQuery(request.url, posSessaoQuerySchema)
  if (!q.ok) return q.resposta
  const { sessaoId, t } = q.data

  const erroToken = await validarLinkToken(request, sessaoId, "pos-sessao-get", t)
  if (erroToken) return erroToken

  const sessao = await prisma.sessao.findFirst({
    where: { id: sessaoId, apagadoEm: null },
    select: {
      id: true, clienteId: true, data: true, hora: true, servico: true, preco: true, estado: true,
      terapeutaId: true, terapeuta2Id: true,
      cliente: { select: { nome: true } },
    },
  })

  if (!sessao) {
    return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 })
  }

  // Uso único: sessão já registada como realizada — não há nada para
  // preencher outra vez (o voucher associado, se houver, já fechou).
  // Correções depois disto passam pelo dashboard, não por este link.
  if (sessao.estado === "realizada") {
    return NextResponse.json({
      jaSubmetido: true,
      cliente: { nome: sessao.cliente.nome },
      // preco convertido explicitamente: é Decimal do Prisma, e este ramo
      // não passa pelo serializarDecimais() usado no resto da rota (ver
      // return mais abaixo) — sem isto ia para o JSON num formato que o
      // frontend não esperava.
      sessao: { servico: sessao.servico, data: sessao.data, hora: sessao.hora, preco: sessao.preco === null ? null : Number(sessao.preco) },
    })
  }

  const [servicos, terapeutas] = await Promise.all([
    prisma.servico.findMany({
      where: { ativo: true },
      select: { nome: true, precoBase: true },
      orderBy: { nome: "asc" },
    }),
    prisma.user.findMany({
      where: { ativo: true, role: "terapeuta" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  return NextResponse.json(serializarDecimais({
    sessao: {
      id: sessao.id, data: sessao.data, hora: sessao.hora,
      servico: sessao.servico, preco: sessao.preco, estado: sessao.estado,
      // Já atribuídas antes (atribuir-sessao.html) — o form pré-preenche com
      // isto para não as apagar sem querer ao guardar o registo pós-sessão.
      terapeutaId: sessao.terapeutaId, terapeuta2Id: sessao.terapeuta2Id,
    },
    cliente: { nome: sessao.cliente.nome },
    servicos,
    terapeutas,
  }))
}

export async function PATCH(request: NextRequest) {
  const bloqueio = await verificarRateLimit(request, {
    recurso: "pos-sessao-patch",
    limite: 20,
    janelaSeg: 3600,
  })
  if (bloqueio) return bloqueio

  const v = await validarBody(request, posSessaoPatchSchema)
  if (!v.ok) return v.resposta
  const {
    sessaoId, t, servico, preco, aromaSessao, estadoEmocional, resumoSessao, notasPosSessao, dataRecomendadaRegresso,
    estadoPagamento, valorPago, metodoPagamento, repasseNecessario, terapeuta2Id, valorRepasse,
  } = v.data

  const erroToken = await validarLinkToken(request, sessaoId, "pos-sessao-patch", t)
  if (erroToken) return erroToken

  try {
    const sessaoAntes = await prisma.sessao.findFirst({
      where: { id: sessaoId, apagadoEm: null },
      select: { id: true, clienteId: true, estado: true, servico: true, terapeuta: true, terapeutaId: true, data: true },
    })
    if (!sessaoAntes) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 })
    }

    // Sessão cancelada não pode ser "ressuscitada" como realizada via link antigo
    // (o link tem 7 dias de validade e pode sobreviver a um cancelamento/reagendamento)
    if (sessaoAntes.estado === "cancelada") {
      return NextResponse.json({ sessaoId: sessaoAntes.id, estado: sessaoAntes.estado, jaAtualizada: false })
    }

    // Sessão cancelada já foi tratada acima; a partir daqui "realizada" é o
    // único estado que bloqueia a escrita.
    //
    // Uso único ATÓMICO: o check "já está realizada?" e a escrita que a marca
    // como tal têm de ser a mesma operação — ler o estado antes e escrever
    // depois (como acontecia aqui) deixa uma janela de corrida: um duplo
    // toque ou um retry de rede dispara dois PATCHs em paralelo, os dois
    // leem "ainda não realizada" antes de qualquer um escrever, e os dois
    // passam. O `updateMany` com `estado: { not: "realizada" }` no WHERE
    // resolve isto da mesma forma que já resolvemos em confirmacao-envio: só
    // uma das escritas concorrentes consegue mesmo mudar a linha (count=1),
    // a outra vê count=0 e sabe que perdeu a corrida.
    const resultado = await prisma.$transaction(async (tx) => {
      const escrita = await tx.sessao.updateMany({
        where: { id: sessaoAntes.id, estado: { not: "realizada" } },
        data: {
          estado: "realizada",
          servico,
          ...(preco !== undefined ? { preco } : {}),
          ...(aromaSessao !== undefined ? { aromaSessao } : {}),
          ...(estadoEmocional !== undefined ? { estadoEmocional } : {}),
          ...(resumoSessao !== undefined ? { resumoSessao } : {}),
          ...(notasPosSessao !== undefined ? { notasPosSessao } : {}),
          ...(dataRecomendadaRegresso ? { dataRecomendadaRegresso: new Date(dataRecomendadaRegresso) } : {}),
          // Massagem a dois — a segunda terapeuta é escolhida no formulário.
          // `undefined` não toca no campo; `null` limpa-o (deixou de ser a dois).
          ...(terapeuta2Id !== undefined ? { terapeuta2Id: terapeuta2Id || null } : {}),
          ...(estadoPagamento !== undefined ? {
            estadoPagamento,
            valorPago: valorPago ?? null,
            metodoPagamento: metodoPagamento ?? null,
            // mesmo critério do editor manual no /financeiro (só "pago" fixa a data)
            ...(estadoPagamento === "pago" ? { pagamentoEm: new Date() } : {}),
            repasseNecessario: repasseNecessario ?? false,
            // null = a Cristina leva o valor todo (sessão só dela). Numa
            // massagem a dois vem metade, calculada no formulário.
            valorRepasse: valorRepasse ?? null,
          } : {}),
        },
      })

      // Perdeu a corrida (ou a sessão já estava realizada à entrada): não há
      // nada mais a fazer nesta chamada — os efeitos já correram na escrita
      // que ganhou.
      if (escrita.count === 0) return null

      const sessao = await tx.sessao.findUniqueOrThrow({
        where: { id: sessaoAntes.id },
        select: { id: true, estado: true, preco: true, terapeuta2Id: true },
      })

      await recalcularMetricasCliente(tx, sessaoAntes.clienteId)

      // As observações da terapeuta entram diretamente nas notas do cliente
      // (mais recente primeiro) — sem isto, ficavam presas dentro da sessão e
      // só visíveis abrindo-a uma a uma no separador Sessões.
      if (resumoSessao?.trim() || notasPosSessao?.trim()) {
        const dataSessao = new Date(sessaoAntes.data).toLocaleDateString("pt-PT")
        const linhas = [resumoSessao?.trim(), notasPosSessao?.trim()].filter(Boolean)
        const novaEntrada = `[${dataSessao}] ${linhas.join(" — ")}`

        const clienteAtual = await tx.cliente.findUnique({
          where: { id: sessaoAntes.clienteId },
          select: { notasPessoais: true },
        })
        const notasAnteriores = clienteAtual?.notasPessoais?.trim()
        await tx.cliente.update({
          where: { id: sessaoAntes.clienteId },
          data: { notasPessoais: notasAnteriores ? `${novaEntrada}\n\n${notasAnteriores}` : novaEntrada },
        })
      }

      return sessao
    })

    if (!resultado) {
      return NextResponse.json({ sessaoId: sessaoAntes.id, estado: "realizada", jaSubmetido: true })
    }
    const sessao = resultado

    // Webhook + mensagem de avaliação: só depois da transação committar,
    // fora dela — fire-and-forget (lib/sessoes).
    // terapeutaId vem de sessaoAntes (este PATCH não o altera) mas
    // terapeuta2Id vem do resultado do update: é o único dos dois que
    // pode ter sido definido nesta mesma chamada.
    await dispararEfeitosSessaoRealizada(
      { ...sessaoAntes, terapeuta2Id: sessao.terapeuta2Id },
      sessao.preco
    )
    // Recalcular o estado CRM do cliente já — sem isto ficava até 24h
    // desfasado à espera do cron das 7h (lib/crm-estados).
    await recalcularEstadoCliente(sessaoAntes.clienteId)

    auditar({
      quem: "publico",
      acao: "pos_sessao.registada",
      entidade: "Sessao",
      entidadeId: sessao.id,
      ip: request.headers.get("x-forwarded-for"),
    })

    return NextResponse.json({ sessaoId: sessao.id, estado: sessao.estado })
  } catch (error) {
    console.error("PATCH /api/v1/public/pos-sessao:", (error as Error).message)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
