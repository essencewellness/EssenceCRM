// Cron mensal (Vercel Cron) — retenção de dados (RGPD: limitação da conservação).
// Versão conservadora, decidida em 2026-07-21: NÃO toca em dados de clientes.
//   1. Purga AuditLog com mais de 12 meses (contém IPs — dado pessoal)
//   2. Apaga PortalTokens expirados há mais de 30 dias
// A anonimização de clientes continua a ser exclusivamente manual (endpoint RGPD).
// Segurança: Vercel envia Authorization: Bearer <CRON_SECRET>; aceita também
// X-API-Key para disparo manual.
import { NextRequest } from "next/server"
import { timingSafeEqual } from "node:crypto"
import { prisma } from "@/lib/prisma"
import { validarApiKey, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { auditar } from "@/lib/audit"

function validarCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = request.headers.get("authorization") ?? ""
  const esperado = `Bearer ${secret}`
  const bufA = Buffer.from(header, "utf8")
  const bufB = Buffer.from(esperado, "utf8")
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}

export async function GET(request: NextRequest) {
  if (!validarCronSecret(request)) {
    const erro = validarApiKey(request)
    if (erro) return erro
  }

  try {
    const inicio = Date.now()

    const limiteAudit = new Date()
    limiteAudit.setMonth(limiteAudit.getMonth() - 12)
    const { count: auditApagados } = await prisma.auditLog.deleteMany({
      where: { criadoEm: { lt: limiteAudit } },
    })

    const limiteTokens = new Date()
    limiteTokens.setDate(limiteTokens.getDate() - 30)
    const { count: tokensApagados } = await prisma.portalToken.deleteMany({
      where: { expiraEm: { lt: limiteTokens } },
    })

    auditar({
      quem: "sistema",
      acao: "retencao.executada",
      detalhe: { auditApagados, tokensApagados, duracaoMs: Date.now() - inicio },
    })

    return respostaSucesso({ auditApagados, tokensApagados }, { duracaoMs: Date.now() - inicio })
  } catch (error) {
    console.error("GET /api/cron/retencao:", (error as Error).message)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
