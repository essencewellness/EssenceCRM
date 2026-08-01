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
      cliente: { select: { nome: true } },
    },
  })

  if (!sessao) {
    return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 })
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
    estadoPagamento, valorPago, metodoPagamento, repasseNecessario,
  } = v.data

  const erroToken = await validarLinkToken(request, sessaoId, "pos-sessao-patch", t)
  if (erroToken) return erroToken

  try {
    const sessaoAntes = await prisma.sessao.findFirst({
      where: { id: sessaoId, apagadoEm: null },
      select: { id: true, clienteId: true, estado: true, servico: true, terapeuta: true, data: true },
    })
    if (!sessaoAntes) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 })
    }

    // Sessão cancelada não pode ser "ressuscitada" como realizada via link antigo
    // (o link tem 7 dias de validade e pode sobreviver a um cancelamento/reagendamento)
    if (sessaoAntes.estado === "cancelada") {
      return NextResponse.json({ sessaoId: sessaoAntes.id, estado: sessaoAntes.estado, jaAtualizada: false })
    }

    const eraRealizada = sessaoAntes.estado === "realizada"

    // Update da sessão + recálculo de métricas na mesma transação — evita a
    // janela de corrida com outras escritas concorrentes no mesmo cliente.
    const sessao = await prisma.$transaction(async (tx) => {
      const sessao = await tx.sessao.update({
        where: { id: sessaoAntes.id },
        data: {
          estado: "realizada",
          servico,
          ...(preco !== undefined ? { preco } : {}),
          ...(aromaSessao !== undefined ? { aromaSessao } : {}),
          ...(estadoEmocional !== undefined ? { estadoEmocional } : {}),
          ...(resumoSessao !== undefined ? { resumoSessao } : {}),
          ...(notasPosSessao !== undefined ? { notasPosSessao } : {}),
          ...(dataRecomendadaRegresso ? { dataRecomendadaRegresso: new Date(dataRecomendadaRegresso) } : {}),
          ...(estadoPagamento !== undefined ? {
            estadoPagamento,
            valorPago: valorPago ?? null,
            metodoPagamento: metodoPagamento ?? null,
            // mesmo critério do editor manual no /financeiro (só "pago" fixa a data)
            ...(estadoPagamento === "pago" ? { pagamentoEm: new Date() } : {}),
            repasseNecessario: repasseNecessario ?? false,
          } : {}),
        },
      })

      if (!eraRealizada) {
        await recalcularMetricasCliente(tx, sessaoAntes.clienteId)
      }

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

    if (!eraRealizada) {
      // Webhook + mensagem de avaliação: só depois da transação committar,
      // fora dela — fire-and-forget (lib/sessoes).
      await dispararEfeitosSessaoRealizada(sessaoAntes, sessao.preco)
    }

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
