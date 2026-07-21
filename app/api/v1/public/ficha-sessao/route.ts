// Ficha de sessão para a terapeuta — relatório clínico gerado pelo Groq 24h antes
// da sessão. Sem autenticação — pensado para abrir a partir de um link WhatsApp,
// fora de uma sessão do dashboard. Protegido só pelo sessaoId (cuid impossível
// de adivinhar), tal como /public/atribuir-sessao.
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { fichaSessaoQuerySchema, validarQuery } from "@/lib/validations"
import { verificarRateLimit } from "@/lib/rate-limit"
import { validarLinkToken } from "@/lib/link-token"

export async function GET(request: NextRequest) {
  const bloqueio = await verificarRateLimit(request, {
    recurso: "ficha-sessao-get",
    limite: 60,
    janelaSeg: 3600,
  })
  if (bloqueio) return bloqueio

  const q = validarQuery(request.url, fichaSessaoQuerySchema)
  if (!q.ok) return q.resposta
  const { sessaoId, t } = q.data

  const erroToken = validarLinkToken(request, sessaoId, "ficha-sessao", t)
  if (erroToken) return erroToken

  const sessao = await prisma.sessao.findFirst({
    where: { id: sessaoId, apagadoEm: null },
    select: {
      id: true, servico: true, data: true, hora: true, duracao: true,
      terapeuta: true, briefingJson: true,
      cliente: { select: { nome: true } },
    },
  })

  if (!sessao) {
    return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 })
  }

  if (!sessao.briefingJson) {
    return NextResponse.json({ error: "Ficha ainda não disponível para esta sessão" }, { status: 404 })
  }

  return NextResponse.json({
    cliente: { nome: sessao.cliente.nome },
    sessao: {
      servico: sessao.servico, data: sessao.data, hora: sessao.hora,
      duracao: sessao.duracao, terapeuta: sessao.terapeuta,
    },
    briefing: sessao.briefingJson,
  })
}
