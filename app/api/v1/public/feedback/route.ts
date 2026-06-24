// Endpoint público para recolha de feedback 24h pós-sessão.
// Sem autenticação — recebe dados do formulário HTML enviado por WhatsApp.
// Proteções: rate limit, Zod estrito, honeypot, blacklist guard.
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { webhooks } from "@/lib/webhooks"
import { feedbackPublicSchema, validarBody } from "@/lib/validations"
import { verificarRateLimit } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  const bloqueio = await verificarRateLimit(request, {
    recurso: "feedback",
    limite: 10,
    janelaSeg: 3600,
  })
  if (bloqueio) return bloqueio

  const v = await validarBody(request, feedbackPublicSchema)
  if (!v.ok) return v.resposta
  const { clienteId, sessaoId, rating, pontosPositivos, pontosMelhorar, comentario, website } = v.data

  // Honeypot preenchido = bot
  if (website) {
    return NextResponse.json({ ok: true })
  }

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
        select: { id: true },
      })
      if (!sessao) {
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
      },
    })

    // Webhook de métricas (sempre)
    void webhooks.feedbackRecebido({
      feedbackId: feedback.id,
      clienteId,
      sessaoId: sessaoId ?? null,
      rating,
      encaminhadoGoogle,
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
