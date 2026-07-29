// Tokens curtos e opacos para links públicos enviados por WhatsApp (ficha-sessao,
// pos-sessao, atribuir-sessao, confirmar-sessao, onboarding, feedback). O link
// passa a levar ?t=<codigo>, um código aleatório curto guardado na tabela
// LinkToken com expiração — mesmo padrão do PortalToken. Preferido a um HMAC
// longo por ficar muito mais curto no link final enviado por WhatsApp.
//
// Cada token liga-se a uma Sessao (caso ideal — mais preciso, usado sempre
// que já existe sessão) ou a um Cliente (quando ainda não há sessão marcada,
// ex.: onboarding de um lead antes de reservar).
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

type AlvoToken = { sessaoId: string; clienteId?: never } | { sessaoId?: never; clienteId: string }

/** Gera e regista um novo token para incluir num link: `?t=<codigo>`. */
export async function gerarLinkToken(alvo: AlvoToken, diasValidade = DIAS_VALIDADE_DEFAULT): Promise<string> {
  const codigo = randomBytes(8).toString("base64url") // ~11 caracteres, 64 bits de entropia
  const expiraEm = new Date(Date.now() + diasValidade * 24 * 60 * 60 * 1000)
  await prisma.linkToken.create({
    data: {
      codigo,
      expiraEm,
      sessaoId: alvo.sessaoId ?? null,
      clienteId: alvo.clienteId ?? null,
    },
  })
  return codigo
}

/**
 * Guard para os endpoints públicos. `alvo` é o sessaoId OU clienteId que o
 * link diz representar. Retorna null se o pedido pode prosseguir, NextResponse
 * 401 se o token é obrigatório e falta/é inválido. Em modo transição
 * (LINK_TOKEN_OBRIGATORIO !== "true"), nunca bloqueia — apenas audita.
 */
export async function validarLinkToken(
  request: NextRequest,
  alvo: string,
  recurso: string,
  tokenBody?: string | null
): Promise<NextResponse | null> {
  const codigo = tokenBody ?? new URL(request.url).searchParams.get("t")
  const obrigatorio = process.env.LINK_TOKEN_OBRIGATORIO === "true"

  // `motivo` separa no audit log um link antigo sem token (esperado durante a
  // transição, desaparece sozinho) de um token que falhou. Entre estes, o caso
  // que interessa operacionalmente é "expirado": é uma cliente real com um link
  // de há mais de 7 dias, que ao ativar o enforcement passa a levar 401. Sem
  // esta distinção ficava tudo como "ausente" e a decisão de ativar era às cegas.
  let motivo: "ausente" | "desconhecido" | "outro_alvo" | "expirado" = "ausente"

  if (codigo) {
    const linkToken = await prisma.linkToken.findUnique({ where: { codigo } })
    if (!linkToken) {
      motivo = "desconhecido"
    } else if (linkToken.sessaoId !== alvo && linkToken.clienteId !== alvo) {
      motivo = "outro_alvo"
    } else if (linkToken.expiraEm <= new Date()) {
      motivo = "expirado"
    } else {
      return null
    }
  }

  if (obrigatorio) {
    auditar({
      quem: "publico",
      acao: "link_token.rejeitado",
      entidade: "Sessao",
      entidadeId: alvo,
      detalhe: { recurso, motivo },
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
    acao: motivo === "ausente" ? "link_token.ausente_transicao" : "link_token.invalido_transicao",
    entidade: "Sessao",
    entidadeId: alvo,
    detalhe: { recurso, motivo },
    ip: request.headers.get("x-forwarded-for"),
  })
  return null
}
