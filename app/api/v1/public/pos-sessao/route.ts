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
import { processarSessaoRealizada } from "@/lib/sessoes"
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

  const erroToken = validarLinkToken(request, sessaoId, "pos-sessao-get", t)
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
  const { sessaoId, t, servico, preco, aromaSessao, estadoEmocional, resumoSessao, notasPosSessao, dataRecomendadaRegresso } = v.data

  const erroToken = validarLinkToken(request, sessaoId, "pos-sessao-patch", t)
  if (erroToken) return erroToken

  try {
    const sessaoAntes = await prisma.sessao.findFirst({
      where: { id: sessaoId, apagadoEm: null },
      select: { id: true, clienteId: true, estado: true, servico: true, terapeuta: true },
    })
    if (!sessaoAntes) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 })
    }

    const sessao = await prisma.sessao.update({
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
      },
    })

    if (sessaoAntes.estado !== "realizada") {
      await processarSessaoRealizada(sessaoAntes, sessao.preco)
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
