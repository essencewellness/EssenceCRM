// Endpoint público para a Bea atribuir terapeuta/preço/nota a uma sessão recém-criada
// pelo Calendly. Sem autenticação — pensado para ser aberto a partir de um link
// enviado por WhatsApp (pode ser no telemóvel, fora de uma sessão do dashboard).
// Protegido só pelo sessaoId (cuid impossível de adivinhar) + rate limit.

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { atribuirSessaoQuerySchema, atribuirSessaoSchema, validarBody, validarQuery } from "@/lib/validations"
import { verificarRateLimit } from "@/lib/rate-limit"
import { auditar } from "@/lib/audit"
import { validarLinkToken } from "@/lib/link-token"

export async function GET(request: NextRequest) {
  const bloqueio = await verificarRateLimit(request, {
    recurso: "atribuir-sessao-get",
    limite: 60,
    janelaSeg: 3600,
  })
  if (bloqueio) return bloqueio

  const q = validarQuery(request.url, atribuirSessaoQuerySchema)
  if (!q.ok) return q.resposta
  const { sessaoId, t } = q.data

  const erroToken = validarLinkToken(request, sessaoId, "atribuir-sessao-get", t)
  if (erroToken) return erroToken

  const sessao = await prisma.sessao.findFirst({
    where: { id: sessaoId, apagadoEm: null },
    select: {
      id: true, servico: true, data: true, hora: true, duracao: true, preco: true,
      clienteId: true,
      cliente: {
        select: {
          nome: true, telefone: true, totalSessoes: true, criadoEm: true,
          terapeutaPrincipal: { select: { id: true, name: true } },
        },
      },
    },
  })
  if (!sessao) {
    return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 })
  }

  const [terapeutas, servicoCatalogo, sessoesAnteriores, notas] = await Promise.all([
    prisma.user.findMany({
      where: { ativo: true, role: "terapeuta" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    sessao.servico
      ? prisma.servico.findFirst({ where: { nome: sessao.servico }, select: { precoBase: true } })
      : null,
    prisma.sessao.count({
      where: { clienteId: sessao.clienteId, apagadoEm: null, id: { not: sessao.id } },
    }),
    prisma.observacao.findMany({
      where: { clienteId: sessao.clienteId },
      select: { texto: true, autor: true, criadoEm: true },
      orderBy: { criadoEm: "desc" },
      take: 5,
    }),
  ])

  return NextResponse.json({
    cliente: {
      nome: sessao.cliente.nome,
      telefone: sessao.cliente.telefone,
      primeiraVisita: sessoesAnteriores === 0,
      totalSessoesAnteriores: sessoesAnteriores,
      terapeutaHabitual: sessao.cliente.terapeutaPrincipal,
    },
    sessao: {
      servico: sessao.servico, data: sessao.data, hora: sessao.hora, duracao: sessao.duracao,
      precoAtual: sessao.preco,
    },
    precoBase: servicoCatalogo?.precoBase ?? sessao.preco ?? null,
    terapeutas,
    notas,
  })
}

export async function POST(request: NextRequest) {
  const bloqueio = await verificarRateLimit(request, {
    recurso: "atribuir-sessao",
    limite: 20,
    janelaSeg: 3600,
  })
  if (bloqueio) return bloqueio

  const v = await validarBody(request, atribuirSessaoSchema)
  if (!v.ok) return v.resposta
  const { sessaoId, t, terapeutaId, preco, nota, website } = v.data

  // Honeypot preenchido = bot
  if (website) {
    return NextResponse.json({ ok: true })
  }

  const erroToken = validarLinkToken(request, sessaoId, "atribuir-sessao-post", t)
  if (erroToken) return erroToken

  try {
    const sessao = await prisma.sessao.findFirst({
      where: { id: sessaoId, apagadoEm: null },
      select: { id: true, clienteId: true, cliente: { select: { terapeutaPrincipalId: true } } },
    })
    if (!sessao) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 })
    }

    const terapeuta = await prisma.user.findFirst({
      where: { id: terapeutaId, ativo: true, role: "terapeuta" },
      select: { id: true, name: true },
    })
    if (!terapeuta) {
      return NextResponse.json({ error: "Terapeuta inválida" }, { status: 400 })
    }

    const nomeTerapeuta = terapeuta.name ?? "terapeuta"

    await prisma.sessao.update({
      where: { id: sessao.id },
      data: {
        terapeutaId: terapeuta.id,
        terapeuta: nomeTerapeuta,
        preco,
      },
    })

    // Se a cliente ainda não tem terapeuta principal, esta atribuição define-a
    if (!sessao.cliente.terapeutaPrincipalId) {
      await prisma.cliente.update({
        where: { id: sessao.clienteId },
        data: { terapeutaPrincipalId: terapeuta.id },
      })
    }

    if (nota) {
      await prisma.observacao.create({
        data: {
          clienteId: sessao.clienteId,
          texto: nota,
          autor: nomeTerapeuta,
        },
      })
    }

    auditar({
      quem: "publico",
      acao: "atribuir_sessao.submetido",
      entidade: "Sessao",
      entidadeId: sessao.id,
      detalhe: { terapeutaId: terapeuta.id, preco, temNota: !!nota },
      ip: request.headers.get("x-forwarded-for"),
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("POST /api/v1/public/atribuir-sessao:", (error as Error).message)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
