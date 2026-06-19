// Endpoint público (sem autenticação) para formulários de captação
// Instagram bio, site, landingpage → lead entra no CRM automaticamente
// Proteções: rate limit (Upstash/memória), Zod estrito, honeypot anti-bot.
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { webhooks } from "@/lib/webhooks"
import { leadPublicSchema, validarBody } from "@/lib/validations"
import { verificarRateLimit } from "@/lib/rate-limit"
import { auditar } from "@/lib/audit"

export async function POST(request: NextRequest) {
  const bloqueio = await verificarRateLimit(request, {
    recurso: "lead",
    limite: 5,
    janelaSeg: 3600,
  })
  if (bloqueio) return bloqueio

  const v = await validarBody(request, leadPublicSchema)
  if (!v.ok) return v.resposta
  const { nome, email, telefone, servico_interesse, como_nos_conheceu, consentimento_marketing, website } = v.data

  // Honeypot preenchido = bot. Responder 200 falso para não dar pistas.
  if (website) {
    return NextResponse.json({ clienteId: "ok", created: false })
  }

  try {
    // Upsert por email — não criar leads duplicados
    let cliente = await prisma.cliente.findFirst({ where: { email, apagadoEm: null } })
    let created = false

    if (!cliente) {
      const aceita = consentimento_marketing ?? true
      cliente = await prisma.cliente.create({
        data: {
          nome,
          email,
          telefone: telefone ?? null,
          fonte: "formulario",
          comoNosConheceu: como_nos_conheceu ?? null,
          estado: "lead",
          aceitaMarketing: aceita,
          ...(aceita ? { consentimentoMarketingEm: new Date() } : {}),
        },
      })
      created = true

      auditar({
        quem: "publico",
        acao: "lead.criado",
        entidade: "Cliente",
        entidadeId: cliente.id,
        ip: request.headers.get("x-forwarded-for"),
      })

      void webhooks.leadCriado({
        clienteId: cliente.id,
        nomeCliente: cliente.nome,
        email: cliente.email,
        telefone: cliente.telefone,
        servicoInteresse: servico_interesse ?? undefined,
      })
    }

    return NextResponse.json({ clienteId: cliente.id, created })
  } catch (error) {
    console.error("POST /api/v1/public/lead:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
