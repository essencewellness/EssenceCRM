// Endpoint público para recolha de feedback 24h pós-sessão.
// Sem autenticação — recebe dados do formulário HTML enviado por WhatsApp.
// Proteções: rate limit, Zod estrito, honeypot, blacklist guard.
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { webhooks } from "@/lib/webhooks"
import { feedbackPublicSchema, validarBody } from "@/lib/validations"
import { verificarRateLimit } from "@/lib/rate-limit"
import { validarLinkToken } from "@/lib/link-token"

export async function POST(request: NextRequest) {
  const bloqueio = await verificarRateLimit(request, {
    recurso: "feedback",
    limite: 10,
    janelaSeg: 3600,
  })
  if (bloqueio) return bloqueio

  const v = await validarBody(request, feedbackPublicSchema)
  if (!v.ok) return v.resposta
  const { clienteId, sessaoId, t, rating, pontosPositivos, pontosMelhorar, comentario, quandoVoltar, interesseServico, website } = v.data

  // Honeypot preenchido = bot
  if (website) {
    return NextResponse.json({ ok: true })
  }

  // IDOR: mesmo modelo de confiança que onboarding/confirmar-sessao — exige o
  // token assinado ligado ao clienteId/sessaoId do link enviado por WhatsApp,
  // para que um cuid adivinhado não baste para submeter feedback em nome de
  // outra cliente (e disparar o alerta de rating negativo à Bea por engano).
  const erroToken = await validarLinkToken(request, sessaoId ?? clienteId, "feedback", t)
  if (erroToken) return erroToken

  try {
    // Verificar que o cliente existe e não está na blacklist
    const cliente = await prisma.cliente.findFirst({
      where: { id: clienteId, apagadoEm: null },
      select: { id: true, nome: true, estado: true },
    })

    if (!cliente) {
      // Resposta 200 silenciosa — não revelar se o id existe
      return NextResponse.json({ ok: true })
    }

    if (cliente.estado === "blacklist") {
      return NextResponse.json({ ok: true })
    }

    // Verificar sessão se fornecida
    if (sessaoId) {
      const sessao = await prisma.sessao.findFirst({
        where: { id: sessaoId, clienteId, apagadoEm: null },
        select: { id: true, estado: true },
      })
      // Sessão cancelada: trata-se como não encontrada — não faz sentido feedback
      // de um serviço que não chegou a acontecer, nem alerta de rating à Bea
      if (!sessao || sessao.estado === "cancelada") {
        return NextResponse.json({ ok: true })
      }

      // Deduplicação: 1 feedback por sessão (evita spam de notificações à Bea)
      const feedbackExistente = await prisma.feedback.findFirst({
        where: { sessaoId, clienteId },
        select: { id: true, encaminhadoGoogle: true },
      })
      if (feedbackExistente) {
        return NextResponse.json({ ok: true, feedbackId: feedbackExistente.id, encaminharGoogle: feedbackExistente.encaminhadoGoogle })
      }
    }

    const encaminhadoGoogle = rating >= 4

    const feedback = await prisma.feedback.create({
      data: {
        clienteId,
        sessaoId: sessaoId ?? null,
        rating,
        pontosPositivos: pontosPositivos ?? null,
        pontosMelhorar: pontosMelhorar ?? null,
        comentario: comentario ?? null,
        encaminhadoGoogle,
        // Só perguntado no ecrã de rating positivo (feedback.html) — em
        // feedback negativo estes campos vêm sempre null, de propósito.
        quandoVoltar: quandoVoltar ?? null,
        interesseServico: interesseServico ?? null,
      },
    })

    // Webhook de métricas (sempre)
    void webhooks.feedbackRecebido({
      feedbackId: feedback.id,
      clienteId,
      sessaoId: sessaoId ?? null,
      rating,
      encaminhadoGoogle,
      quandoVoltar: quandoVoltar ?? null,
      interesseServico: interesseServico ?? null,
    })

    // Alerta privado à Bea quando rating é negativo (≤3)
    if (rating <= 3) {
      void webhooks.feedbackNegativo({
        feedbackId: feedback.id,
        clienteId,
        nomeCliente: cliente.nome,
        sessaoId: sessaoId ?? null,
        rating,
        pontosMelhorar: pontosMelhorar ?? null,
        comentario: comentario ?? null,
      })
    }

    return NextResponse.json({ ok: true, feedbackId: feedback.id, encaminharGoogle: encaminhadoGoogle })
  } catch (error) {
    console.error("POST /api/v1/public/feedback:", (error as Error).message)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
