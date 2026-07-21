// Tokens assinados para links públicos enviados por WhatsApp (ficha-sessao,
// pos-sessao, atribuir-sessao, confirmar-sessao). Substituem o modelo antigo
// de confiar apenas no sessaoId ser um cuid: o link passa a levar ?t=<exp>.<sig>
// onde sig = HMAC-SHA256(secret, sessaoId + "." + exp), com expiração.
//
// Migração faseada: enquanto LINK_TOKEN_OBRIGATORIO !== "true", pedidos sem
// token continuam a passar (os workflows N8N ainda geram links antigos) mas
// ficam registados no audit log para medir a transição. Com a variável a
// "true", pedidos sem token válido recebem 401.
import { createHmac, timingSafeEqual } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { auditar } from "@/lib/audit"

const DIAS_VALIDADE_DEFAULT = 7

function segredo(): string | null {
  const s = process.env.LINK_TOKEN_SECRET ?? process.env.WEBHOOK_SECRET
  return s && s.length >= 16 ? s : null
}

function assinar(sessaoId: string, exp: number, secret: string): string {
  return createHmac("sha256", secret).update(`${sessaoId}.${exp}`, "utf8").digest("hex")
}

/** Gera o token para incluir num link: `<exp>.<sig>`. Null se não há segredo configurado. */
export function gerarLinkToken(sessaoId: string, diasValidade = DIAS_VALIDADE_DEFAULT): string | null {
  const secret = segredo()
  if (!secret) return null
  const exp = Math.floor(Date.now() / 1000) + diasValidade * 24 * 60 * 60
  return `${exp}.${assinar(sessaoId, exp, secret)}`
}

/** Valida um token `<exp>.<sig>` para uma sessão. */
export function tokenValido(sessaoId: string, token: string | null | undefined): boolean {
  const secret = segredo()
  if (!secret || !token) return false
  const [expStr, sig] = token.split(".")
  const exp = Number(expStr)
  if (!expStr || !sig || Number.isNaN(exp)) return false
  if (exp * 1000 < Date.now()) return false
  const esperado = assinar(sessaoId, exp, secret)
  const bufA = Buffer.from(esperado, "utf8")
  const bufB = Buffer.from(sig, "utf8")
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}

/**
 * Guard para os endpoints públicos de sessão. Retorna null se o pedido pode
 * prosseguir, NextResponse 401 se o token é obrigatório e falta/é inválido.
 * Em modo transição (LINK_TOKEN_OBRIGATORIO !== "true"), nunca bloqueia —
 * apenas audita pedidos sem token válido.
 */
export function validarLinkToken(
  request: NextRequest,
  sessaoId: string,
  recurso: string,
  tokenBody?: string | null
): NextResponse | null {
  const token = tokenBody ?? new URL(request.url).searchParams.get("t")
  const valido = tokenValido(sessaoId, token)
  const obrigatorio = process.env.LINK_TOKEN_OBRIGATORIO === "true"

  if (valido) return null

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
