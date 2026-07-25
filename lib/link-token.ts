// Tokens curtos e opacos para links públicos enviados por WhatsApp (ficha-sessao,
// pos-sessao, atribuir-sessao, confirmar-sessao). Substituem o modelo antigo de
// confiar apenas no sessaoId ser um cuid: o link passa a levar ?t=<codigo>, um
// código aleatório curto guardado na tabela LinkToken com expiração — mesmo
// padrão do PortalToken. Preferido a um HMAC longo por ficar muito mais curto
// no link final enviado por WhatsApp.
//
// Migração faseada: enquanto LINK_TOKEN_OBRIGATORIO !== "true", pedidos sem
// token continuam a passar (os workflows N8N ainda geram links antigos) mas
// ficam registados no audit log para medir a transição. Com a variável a
// "true", pedidos sem token válido recebem 401.
import { randomBytes } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auditar } from "@/lib/audit"

const DIAS_VALIDADE_DEFAULT = 7

/** Gera e regista um novo token para incluir num link: `?t=<codigo>`. */
export async function gerarLinkToken(sessaoId: string, diasValidade = DIAS_VALIDADE_DEFAULT): Promise<string> {
  const codigo = randomBytes(8).toString("base64url") // ~11 caracteres, 64 bits de entropia
  const expiraEm = new Date(Date.now() + diasValidade * 24 * 60 * 60 * 1000)
  await prisma.linkToken.create({ data: { codigo, sessaoId, expiraEm } })
  return codigo
}

/**
 * Guard para os endpoints públicos de sessão. Retorna null se o pedido pode
 * prosseguir, NextResponse 401 se o token é obrigatório e falta/é inválido.
 * Em modo transição (LINK_TOKEN_OBRIGATORIO !== "true"), nunca bloqueia —
 * apenas audita pedidos sem token válido.
 */
export async function validarLinkToken(
  request: NextRequest,
  sessaoId: string,
  recurso: string,
  tokenBody?: string | null
): Promise<NextResponse | null> {
  const codigo = tokenBody ?? new URL(request.url).searchParams.get("t")
  const obrigatorio = process.env.LINK_TOKEN_OBRIGATORIO === "true"

  if (codigo) {
    const linkToken = await prisma.linkToken.findUnique({ where: { codigo } })
    if (linkToken && linkToken.sessaoId === sessaoId && linkToken.expiraEm > new Date()) {
      return null
    }
  }

  if (obrigatorio) {
    auditar({
      quem: "publico",
      acao: "link_token.rejeitado",
      entidade: "Sessao",
      entidadeId: sessaoId,
      detalhe: { recurso },
      ip: request.headers.get("x-forwarded-for"),
    })
    return NextResponse.json(
      { error: "Link expirado ou inválido. Pede um link novo.", code: "LINK_TOKEN_INVALIDO" },
      { status: 401 }
    )
  }

  // Modo transição: deixa passar mas regista, para sabermos quando os
  // workflows N8N já enviam todos os links com token.
  auditar({
    quem: "publico",
    acao: "link_token.ausente_transicao",
    entidade: "Sessao",
    entidadeId: sessaoId,
    detalhe: { recurso },
    ip: request.headers.get("x-forwarded-for"),
  })
  return null
}
