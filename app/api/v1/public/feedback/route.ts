// Endpoint público para recolha de feedback 24h pós-sessão.
// Sem autenticação — recebe dados do formulário HTML enviado por WhatsApp.
// Proteções: rate limit, Zod estrito, honeypot, blacklist guard.
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { webhooks } from "@/lib/webhooks"
import { feedbackPublicSchema, validarBody, mapearNpsParaRating, normalizarTelefone } from "@/lib/validations"
import { verificarRateLimit } from "@/lib/rate-limit"
import { validarLinkToken } from "@/lib/link-token"
import { auditar } from "@/lib/audit"

export async function POST(request: NextRequest) {
  const bloqueio = await verificarRateLimit(request, {
    recurso: "feedback",
    limite: 10,
    janelaSeg: 3600,
  })
  if (bloqueio) return bloqueio

  const v = await validarBody(request, feedbackPublicSchema)
  if (!v.ok) return v.resposta
  const {
    clienteId, sessaoId, t, npsScore, pontosPositivos, pontosMelhorar, comentario,
    quandoVoltar, interesseServico, momentoPico, motivoRegresso, faltaParaDez,
    pedidoContactoMarcacao, diaPreferido, horaPreferida, indicacoes, website,
  } = v.data

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
      select: { id: true, nome: true, estado: true, telefone: true },
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

    const rating = mapearNpsParaRating(npsScore)
    // Só promotoras (9-10) veem o pedido de review no forms — o flag reflete
    // isso, em vez do limiar antigo (rating >= 4, que incluía passivas).
    const encaminhadoGoogle = npsScore >= 9

    const feedback = await prisma.feedback.create({
      data: {
        clienteId,
        sessaoId: sessaoId ?? null,
        rating,
        npsScore,
        pontosPositivos: pontosPositivos ?? null,
        pontosMelhorar: pontosMelhorar ?? null,
        comentario: comentario ?? null,
        encaminhadoGoogle,
        // Só perguntado no ecrã de rating positivo (feedback.html) — em
        // feedback negativo estes campos vêm sempre null, de propósito.
        quandoVoltar: quandoVoltar ?? null,
        interesseServico: interesseServico ?? null,
        momentoPico: momentoPico ?? null,
        motivoRegresso: motivoRegresso ?? null,
        faltaParaDez: faltaParaDez ?? null,
        pedidoContactoMarcacao: pedidoContactoMarcacao ?? false,
        diaPreferido: diaPreferido ?? null,
        horaPreferida: horaPreferida ?? null,
      },
    })

    // Webhook de métricas (sempre)
    void webhooks.feedbackRecebido({
      feedbackId: feedback.id,
      clienteId,
      sessaoId: sessaoId ?? null,
      rating,
      npsScore,
      encaminhadoGoogle,
      quandoVoltar: quandoVoltar ?? null,
      interesseServico: interesseServico ?? null,
      momentoPico: momentoPico ?? null,
      motivoRegresso: motivoRegresso ?? null,
    })

    // Alerta privado à Bea quando é detratora (NPS ≤ 6)
    if (npsScore <= 6) {
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

    // Implementation intention: pediu para a Bea tratar já da marcação —
    // lead quente, disparado à parte para não se perder no meio do resto.
    if (pedidoContactoMarcacao) {
      void webhooks.feedbackPedidoContacto({
        feedbackId: feedback.id,
        clienteId,
        nomeCliente: cliente.nome,
        telefone: cliente.telefone,
        quandoVoltar: quandoVoltar ?? null,
        interesseServico: interesseServico ?? null,
        motivoRegresso: motivoRegresso ?? null,
        diaPreferido: diaPreferido ?? null,
        horaPreferida: horaPreferida ?? null,
      })
    }

    // Indicações (programa "O Miminho", spec-010) — cada amiga válida vira
    // uma lead nova, com a origem a apontar para quem a indicou. Nunca
    // duplicar: se já existe um registo com o mesmo contacto, ignora-se
    // silenciosamente essa entrada (não é erro — só não cria duplicado).
    if (indicacoes && indicacoes.length > 0) {
      for (const amiga of indicacoes) {
        // Isolado por entrada: uma indicação a falhar (ex: corrida rara com o
        // mesmo telefone noutro pedido em simultâneo) não pode arrastar o
        // feedback já guardado com sucesso para um 500 — só perde-se essa
        // indicação, que fica no log do servidor.
        try {
          const nomeAmiga = amiga.nome.trim()
          if (!nomeAmiga) continue
          const telefoneAmiga = amiga.telefone?.trim() ? normalizarTelefone(amiga.telefone.trim()) : null
          if (!telefoneAmiga) continue // sem contacto nenhum, não há como a Bea falar com ela

          const jaExiste = await prisma.cliente.findFirst({
            where: { apagadoEm: null, telefone: telefoneAmiga },
            select: { id: true },
          })
          if (jaExiste) continue

          const leadAmiga = await prisma.cliente.create({
            data: {
              nome: nomeAmiga,
              telefone: telefoneAmiga,
              fonte: "formulario",
              comoNosConheceu: `Indicação de ${cliente.nome}`,
              estado: "lead",
            },
          })

          auditar({
            quem: "publico",
            acao: "lead.criado_indicacao",
            entidade: "Cliente",
            entidadeId: leadAmiga.id,
            detalhe: { indicadoPor: clienteId },
            ip: request.headers.get("x-forwarded-for"),
          })

          void webhooks.leadCriado({
            clienteId: leadAmiga.id,
            nomeCliente: leadAmiga.nome,
            telefone: leadAmiga.telefone,
          })
        } catch (e) {
          console.error("POST /api/v1/public/feedback — falha ao criar lead de indicação:", (e as Error).message)
        }
      }
    }

    return NextResponse.json({ ok: true, feedbackId: feedback.id, encaminharGoogle: encaminhadoGoogle })
  } catch (error) {
    console.error("POST /api/v1/public/feedback:", (error as Error).message)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
