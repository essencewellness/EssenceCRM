// Confirmação de presença pela cliente — substitui o antigo fluxo de pedir
// resposta SIM/NÃO por WhatsApp. Sem autenticação — pensado para abrir a
// partir de um link WhatsApp, fora de uma sessão do dashboard. Protegido só
// pelo sessaoId (cuid impossível de adivinhar), tal como ficha-sessao.
export const preferredRegion = "fra1"

import { NextRequest, NextResponse, after } from "next/server"
import { prisma } from "@/lib/prisma"
import { webhooks } from "@/lib/webhooks"
import { confirmarSessaoQuerySchema, confirmarSessaoBodySchema, validarQuery, validarBody } from "@/lib/validations"
import { verificarRateLimit } from "@/lib/rate-limit"
import { auditar } from "@/lib/audit"

export async function GET(request: NextRequest) {
  const bloqueio = await verificarRateLimit(request, {
    recurso: "confirmar-sessao-get",
    limite: 60,
    janelaSeg: 3600,
  })
  if (bloqueio) return bloqueio

  const q = validarQuery(request.url, confirmarSessaoQuerySchema)
  if (!q.ok) return q.resposta
  const { sessaoId } = q.data

  const sessao = await prisma.sessao.findFirst({
    where: { id: sessaoId, apagadoEm: null },
    select: {
      id: true, servico: true, data: true, hora: true, estado: true,
      confirmacaoPresenca: true, calendlyRescheduleUrl: true,
      cliente: { select: { nome: true } },
    },
  })

  if (!sessao) {
    return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 })
  }

  return NextResponse.json({
    sessaoId: sessao.id,
    cliente: { nome: sessao.cliente.nome },
    servico: sessao.servico,
    data: sessao.data,
    hora: sessao.hora,
    estado: sessao.estado,
    confirmacaoPresenca: sessao.confirmacaoPresenca,
    calendlyRescheduleUrl: sessao.calendlyRescheduleUrl,
  })
}

export async function POST(request: NextRequest) {
  const bloqueio = await verificarRateLimit(request, {
    recurso: "confirmar-sessao-post",
    limite: 20,
    janelaSeg: 3600,
  })
  if (bloqueio) return bloqueio

  const v = await validarBody(request, confirmarSessaoBodySchema)
  if (!v.ok) return v.resposta
  const { sessaoId } = v.data

  const sessao = await prisma.sessao.findFirst({
    where: { id: sessaoId, apagadoEm: null },
    select: {
      id: true, clienteId: true, servico: true, data: true, hora: true, estado: true,
      cliente: { select: { nome: true } },
    },
  })

  if (!sessao) {
    return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 })
  }

  // Sessão já concluída/cancelada — nada a confirmar, devolve o estado tal como está
  if (sessao.estado === "realizada" || sessao.estado === "cancelada" || sessao.estado === "falta") {
    return NextResponse.json({ sessaoId: sessao.id, estado: sessao.estado, jaAtualizada: false })
  }

  await prisma.sessao.update({
    where: { id: sessao.id },
    data: { confirmacaoPresenca: true, estado: "confirmada" },
  })

  auditar({
    quem: "publico",
    acao: "sessao.confirmada_pela_cliente",
    entidade: "Sessao",
    entidadeId: sessao.id,
    ip: request.headers.get("x-forwarded-for"),
  })

  after(async () => {
    await webhooks.sessaoConfirmada({
      sessaoId: sessao.id,
      clienteId: sessao.clienteId,
      nomeCliente: sessao.cliente.nome,
      servico: sessao.servico,
      data: sessao.data?.toISOString() ?? null,
      hora: sessao.hora,
    })
  })

  return NextResponse.json({ sessaoId: sessao.id, estado: "confirmada", jaAtualizada: true })
}
