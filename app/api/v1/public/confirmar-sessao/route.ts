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
import { validarLinkToken } from "@/lib/link-token"

export async function GET(request: NextRequest) {
  const bloqueio = await verificarRateLimit(request, {
    recurso: "confirmar-sessao-get",
    limite: 60,
    janelaSeg: 3600,
  })
  if (bloqueio) return bloqueio

  const q = validarQuery(request.url, confirmarSessaoQuerySchema)
  if (!q.ok) return q.resposta
  const { sessaoId, t } = q.data

  const erroToken = await validarLinkToken(request, sessaoId, "confirmar-sessao-get", t)
  if (erroToken) return erroToken

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
  if (!sessao.cliente) {
    return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 })
  }

  return NextResponse.json({
    sessaoId: sessao.id,
    cliente: { nome: sessao.cliente.nome },
    servico: sessao.servico,
    data: sessao.data,
    hora: sessao.hora,
    estado: sessao.estado,
    // Uso único: já confirmou antes — o formulário mostra logo isso em vez
    // do botão "Confirmar", para não parecer que ainda está por fazer.
    jaSubmetido: sessao.confirmacaoPresenca === true,
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
  const { sessaoId, t } = v.data

  const erroToken = await validarLinkToken(request, sessaoId, "confirmar-sessao-post", t)
  if (erroToken) return erroToken

  const sessao = await prisma.sessao.findFirst({
    where: { id: sessaoId, apagadoEm: null },
    select: {
      id: true, clienteId: true, servico: true, data: true, hora: true, estado: true,
      cliente: { select: { nome: true, estado: true, telefone: true } },
    },
  })

  if (!sessao) {
    return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 })
  }
  if (!sessao.cliente) {
    return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 })
  }
  const clienteId = sessao.clienteId as string

  // Blacklist: confirma a sessão no CRM mas não dispara nenhuma automação a jusante
  if (sessao.cliente.estado === "blacklist") {
    return NextResponse.json({ sessaoId: sessao.id, estado: sessao.estado, jaAtualizada: false })
  }

  // Sessão já concluída/cancelada — nada a confirmar, devolve o estado tal como está
  if (sessao.estado === "realizada" || sessao.estado === "cancelada" || sessao.estado === "falta") {
    return NextResponse.json({ sessaoId: sessao.id, estado: sessao.estado, jaAtualizada: false })
  }

  // Uso único: já tinha confirmado antes — não regrava nada. Sem isto, reabrir
  // o link (ou um duplo toque) disparava outra vez o webhook sessaoConfirmada
  // para o N8N a cada confirmação repetida, mesmo sem mudar nada de real.
  if (sessao.estado === "confirmada") {
    return NextResponse.json({ sessaoId: sessao.id, estado: sessao.estado, jaSubmetido: true })
  }

  // Uso único ATÓMICO: o pré-check acima (linha ~98) deixa uma janela entre
  // dois pedidos concorrentes (duplo toque, retry de rede) — os dois podem
  // ler "ainda não confirmada" antes de qualquer um escrever. O WHERE com
  // estado: "confirmada" ainda no where garante que só um consegue mesmo
  // escrever; sem isto o webhook sessaoConfirmada disparava duas vezes.
  const escrita = await prisma.sessao.updateMany({
    where: { id: sessao.id, estado: { not: "confirmada" } },
    data: { confirmacaoPresenca: true, estado: "confirmada" },
  })
  if (escrita.count === 0) {
    return NextResponse.json({ sessaoId: sessao.id, estado: "confirmada", jaSubmetido: true })
  }

  auditar({
    quem: "publico",
    acao: "sessao.confirmada_pela_cliente",
    entidade: "Sessao",
    entidadeId: sessao.id,
    ip: request.headers.get("x-forwarded-for"),
  })

  const nomeCliente = sessao.cliente.nome
  const telefoneCliente = sessao.cliente.telefone
  after(async () => {
    await webhooks.sessaoConfirmada({
      sessaoId: sessao.id,
      clienteId,
      nomeCliente,
      telefone: telefoneCliente,
      servico: sessao.servico,
      data: sessao.data?.toISOString() ?? null,
      hora: sessao.hora,
    })
  })

  return NextResponse.json({ sessaoId: sessao.id, estado: "confirmada", jaAtualizada: true })
}
