// Recebe eventos do Calendly (via N8N ou directamente):
//   invitee.created   → upsert cliente + cria sessão "agendada"
//   invitee.canceled  → marca sessão como "cancelada"
// Segurança: X-API-Key obrigatória + verificação opcional da assinatura
// nativa do Calendly (Calendly-Webhook-Signature) quando o signing key existe.
import { NextRequest } from "next/server"
import { createHmac, timingSafeEqual } from "node:crypto"
import { prisma } from "@/lib/prisma"
import { validarApiKey, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { auditar } from "@/lib/audit"
import { gerarLinkToken } from "@/lib/link-token"
import { getTerapeutaPrincipalPadraoId } from "@/lib/terapeuta-padrao"

// Formato Calendly: "t=1234567890,v1=abcdef..." — HMAC-SHA256 de `${t}.${rawBody}`
function verificarAssinaturaCalendly(rawBody: string, header: string | null): boolean {
  const signingKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY
  if (!signingKey) return true // não configurado → confia na X-API-Key (fluxo via N8N)
  if (!header) return false

  const partes = Object.fromEntries(
    header.split(",").map((p) => p.split("=") as [string, string])
  )
  const t = partes["t"]
  const v1 = partes["v1"]
  if (!t || !v1) return false

  // Rejeitar assinaturas com mais de 5 minutos (replay attack)
  const idade = Math.abs(Date.now() - Number(t) * 1000)
  if (Number.isNaN(idade) || idade > 5 * 60_000) return false

  const esperado = createHmac("sha256", signingKey).update(`${t}.${rawBody}`, "utf8").digest("hex")
  const bufA = Buffer.from(esperado, "utf8")
  const bufB = Buffer.from(v1, "utf8")
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}

export async function POST(request: NextRequest) {
  const erro = validarApiKey(request)
  if (erro) return erro

  try {
    const rawBody = await request.text()

    if (!verificarAssinaturaCalendly(rawBody, request.headers.get("Calendly-Webhook-Signature"))) {
      auditar({
        quem: "calendly",
        acao: "webhook.assinatura_invalida",
        ip: request.headers.get("x-forwarded-for"),
      })
      return respostaErro("Assinatura do webhook inválida", "ASSINATURA_INVALIDA", 401)
    }

    let body: Record<string, unknown>
    try {
      body = JSON.parse(rawBody)
    } catch {
      return respostaErro("Body JSON inválido", "JSON_INVALIDO", 400)
    }

    // Suporta payload nativo Calendly (invitee.created / invitee.canceled) ou simplificado do N8N
    const tipoEvento = String(body.event ?? body.kind ?? "invitee.created")
    const payload = (body.payload ?? body) as Record<string, unknown>
    const invitee = (payload.invitee ?? payload) as Record<string, unknown>
    const event = payload.event as Record<string, unknown> | undefined

    const nome = String(invitee.name ?? invitee.nome ?? "").trim().slice(0, 120)
    const email = String(invitee.email ?? "").trim().toLowerCase().slice(0, 254)
    const telefoneRaw = invitee.text_reminder_number ?? invitee.telefone ?? null
    const telefone = telefoneRaw ? String(telefoneRaw).trim().slice(0, 20) : null
    const dataEvento = String(event?.start_time ?? payload.data ?? new Date().toISOString())
    const nomeServicoRaw = event?.name ?? payload.servico ?? null
    const nomeServico = nomeServicoRaw ? String(nomeServicoRaw).slice(0, 120) : null
    // UUID do evento Calendly — idempotência (evita sessões duplicadas)
    const calendlyEventId = event?.uuid ? String(event.uuid).slice(0, 128) : null
    // URI completo do evento (ex: https://api.calendly.com/scheduled_events/UUID)
    const calendlyEventUri = event?.uri ? String(event.uri).slice(0, 300) : null

    // ── Cancelamento ──────────────────────────────────────────────────────────
    if (tipoEvento === "invitee.canceled") {
      if (!calendlyEventId && !calendlyEventUri) {
        return respostaErro("UUID ou URI do evento Calendly em falta", "CAMPO_OBRIGATORIO", 400)
      }

      const sessaoCancelada = await prisma.sessao.findFirst({
        where: {
          OR: [
            calendlyEventId ? { calendlyEventId } : {},
            calendlyEventUri ? { calendlyEventUri } : {},
          ].filter((o) => Object.keys(o).length > 0),
          estado: { notIn: ["cancelada"] },
        },
        select: { id: true, clienteId: true },
      })

      if (!sessaoCancelada) {
        // Sessão já cancelada ou não encontrada — idempotente
        return respostaSucesso({ ignorado: true, motivo: "sessao_nao_encontrada" })
      }

      await prisma.sessao.update({
        where: { id: sessaoCancelada.id },
        data: { estado: "cancelada" },
      })

      auditar({
        quem: "calendly",
        acao: "sessao.cancelada_calendly",
        entidade: "Sessao",
        entidadeId: sessaoCancelada.id,
      })

      return respostaSucesso({ sessaoId: sessaoCancelada.id, cancelada: true })
    }

    // ── Criação (invitee.created) ─────────────────────────────────────────────
    if (!nome || !email || !email.includes("@")) {
      return respostaErro("Campos 'name' e 'email' são obrigatórios", "CAMPO_OBRIGATORIO", 400)
    }
    if (Number.isNaN(Date.parse(dataEvento))) {
      return respostaErro("Data do evento inválida", "DATA_INVALIDA", 400)
    }

    // Idempotência: se já existe sessão com este UUID Calendly, ignorar silenciosamente
    if (calendlyEventId) {
      const sessaoExistente = await prisma.sessao.findUnique({ where: { calendlyEventId } })
      if (sessaoExistente) {
        auditar({ quem: "calendly", acao: "webhook.duplicado_ignorado", entidade: "Sessao", entidadeId: sessaoExistente.id })
        return respostaSucesso({ clienteId: sessaoExistente.clienteId, sessaoId: sessaoExistente.id, clienteCriado: false, duplicado: true })
      }
    }

    // Upsert por email
    let cliente = await prisma.cliente.findFirst({ where: { email, apagadoEm: null } })
    let clienteCriado = false

    // Blacklist silenciosa: ignorar sem notificar o cliente
    if (cliente?.estado === "blacklist") {
      auditar({ quem: "calendly", acao: "webhook.blacklist_ignorado", entidade: "Cliente", entidadeId: cliente.id })
      return respostaSucesso({ ignorado: true, motivo: "blacklist" })
    }

    if (!cliente) {
      cliente = await prisma.cliente.create({
        data: {
          nome,
          email,
          telefone,
          fonte: "calendly",
          comoNosConheceu: "calendly",
          estado: "novo",
          terapeutaPrincipalId: await getTerapeutaPrincipalPadraoId(),
        },
      })
      clienteCriado = true
    } else if (telefone && !cliente.telefone) {
      cliente = await prisma.cliente.update({
        where: { id: cliente.id },
        data: { telefone },
      })
    }

    const sessao = await prisma.sessao.create({
      data: {
        clienteId: cliente.id,
        data: new Date(dataEvento),
        servico: nomeServico,
        estado: "agendada",
        terapeuta: "bea",
        ...(calendlyEventId ? { calendlyEventId } : {}),
        ...(calendlyEventUri ? { calendlyEventUri } : {}),
      },
    })

    auditar({
      quem: "calendly",
      acao: clienteCriado ? "cliente.criado_calendly" : "sessao.agendada_calendly",
      entidade: "Sessao",
      entidadeId: sessao.id,
      detalhe: { clienteId: cliente.id },
    })

    return respostaSucesso({
      clienteId: cliente.id,
      sessaoId: sessao.id,
      clienteCriado,
      // Código curto para o N8N anexar aos links públicos (&t=<codigo>)
      linkToken: await gerarLinkToken({ sessaoId: sessao.id }),
    })
  } catch (error) {
    console.error("POST /api/v1/webhooks/calendly:", (error as Error).message)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
