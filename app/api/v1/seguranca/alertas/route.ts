// SIEM lite (spec-009, Fase 2, item 14) — resumo de sinais de segurança para o
// N8N ler a cada 15 min e mandar WhatsApp à equipa quando há algo fora do normal.
// Reutiliza o AuditLog que já existe — sem ferramenta externa nova.
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKey, respostaSucesso, respostaErro } from "@/lib/api-auth"

const JANELA_CONTAGEM_MIN = 60 // limite de eventos repetidos: última hora
const JANELA_CRITICOS_MIN = 20 // eventos críticos: um pouco mais que o intervalo do cron (15 min), para não perder nenhum entre execuções
const LIMITE_LOGIN_FALHADO = 10
const LIMITE_ASSINATURA_INVALIDA = 10

export async function GET(request: NextRequest) {
  const erro = validarApiKey(request)
  if (erro) return erro

  try {
    const desdeContagem = new Date(Date.now() - JANELA_CONTAGEM_MIN * 60_000)
    const desdeCriticos = new Date(Date.now() - JANELA_CRITICOS_MIN * 60_000)

    const [loginFalhado, assinaturaInvalida, eventosCriticos] = await Promise.all([
      prisma.auditLog.count({
        where: { acao: "login.falhado", criadoEm: { gte: desdeContagem } },
      }),
      prisma.auditLog.count({
        where: { acao: "webhook.assinatura_invalida", criadoEm: { gte: desdeContagem } },
      }),
      prisma.auditLog.findMany({
        where: {
          acao: { in: ["rgpd.anonimizacao", "cliente.apagado_definitivo"] },
          criadoEm: { gte: desdeCriticos },
        },
        orderBy: { criadoEm: "desc" },
        select: { acao: true, quem: true, entidadeId: true, criadoEm: true },
        take: 50,
      }),
    ])

    const loginExcedido = loginFalhado > LIMITE_LOGIN_FALHADO
    const assinaturaExcedida = assinaturaInvalida > LIMITE_ASSINATURA_INVALIDA
    const alertar = loginExcedido || assinaturaExcedida || eventosCriticos.length > 0

    const linhas: string[] = []
    if (loginExcedido) {
      linhas.push(`⚠️ ${loginFalhado} logins falhados na última hora (limite: ${LIMITE_LOGIN_FALHADO}).`)
    }
    if (assinaturaExcedida) {
      linhas.push(`⚠️ ${assinaturaInvalida} assinaturas de webhook inválidas na última hora (limite: ${LIMITE_ASSINATURA_INVALIDA}).`)
    }
    for (const evento of eventosCriticos) {
      const rotulo = evento.acao === "rgpd.anonimizacao" ? "Anonimização RGPD" : "Cliente apagado definitivamente"
      linhas.push(`🔴 ${rotulo} — por ${evento.quem}, cliente ${evento.entidadeId ?? "?"}, às ${evento.criadoEm.toISOString()}.`)
    }

    const mensagem = alertar
      ? `*Alerta de segurança — Essence Wellness CRM*\n\n${linhas.join("\n")}`
      : null

    return respostaSucesso({
      janela: { contagemMinutos: JANELA_CONTAGEM_MIN, criticosMinutos: JANELA_CRITICOS_MIN },
      loginFalhado: { contagem: loginFalhado, limiteExcedido: loginExcedido },
      webhookAssinaturaInvalida: { contagem: assinaturaInvalida, limiteExcedido: assinaturaExcedida },
      eventosCriticos,
      alertar,
      mensagem,
    })
  } catch (error) {
    console.error("GET /api/v1/seguranca/alertas:", (error as Error).message)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
