// Dispara eventos do CRM para o N8N de forma assíncrona (fire-and-forget).
// Nunca bloqueia a resposta ao utilizador. Retry automático 3x com timeout 5s.
// Cada pedido vai assinado com HMAC-SHA256 do body (header X-Assinatura),
// para o N8N poder verificar que veio mesmo do CRM.
import { createHmac } from "node:crypto"

function assinarPayload(body: string, secret: string): string {
  return "sha256=" + createHmac("sha256", secret).update(body, "utf8").digest("hex")
}

async function dispararWebhook(evento: string, payload: object): Promise<void> {
  const chaveEnv = `WEBHOOK_N8N_${evento.toUpperCase().replace(/\./g, "_")}`
  // trim + remoção de BOM: variáveis de ambiente coladas de ficheiros Windows
  // por vezes trazem um caractere invisível (U+FEFF) que faz o fetch() falhar
  // com "Failed to parse URL" sem qualquer pista no erro.
  const url = process.env[chaveEnv]?.trim().replace(/^﻿/, "")
  if (!url) return // webhook não configurado — silencioso

  const secret = process.env.WEBHOOK_SECRET ?? ""
  const body = JSON.stringify({ evento, payload, timestamp: new Date().toISOString() })

  console.log(`[webhooks] a disparar ${evento} → ${url}`)
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Assinatura": secret ? assinarPayload(body, secret) : "",
          "X-Evento": evento,
        },
        body,
        signal: AbortSignal.timeout(5000),
      })
      if (res.ok) {
        console.log(`[webhooks] ${evento} enviado com sucesso (tentativa ${tentativa + 1})`)
        return
      }
      console.error(`[webhooks] ${evento} HTTP ${res.status} (tentativa ${tentativa + 1})`)
    } catch (err) {
      console.error(`[webhooks] ${evento} erro tentativa ${tentativa + 1}:`, (err as Error).message)
    }
    // backoff simples entre tentativas (1s, 2s)
    if (tentativa < 2) await new Promise((r) => setTimeout(r, (tentativa + 1) * 1000))
  }
  console.error(`[webhooks] falharam 3 tentativas para ${evento}`)
}

export const webhooks = {
  mensagemAprovada: (payload: {
    mensagemId: string
    clienteId: string
    telefone?: string | null
    mensagemFinal: string
    canal: string
  }) => dispararWebhook("mensagem.aprovada", payload),

  sessaoRealizada: (payload: {
    sessaoId: string
    clienteId: string
    preco?: number | null
    servico?: string | null
    terapeuta: string
  }) => dispararWebhook("sessao.realizada", payload),

  clienteEstadoAlterado: (payload: {
    clienteId: string
    nomeCliente: string
    estadoAnterior: string
    estadoNovo: string
  }) => dispararWebhook("cliente.estado_alterado", payload),

  leadCriado: (payload: {
    clienteId: string
    nomeCliente: string
    email?: string | null
    telefone?: string | null
    servicoInteresse?: string
  }) => dispararWebhook("lead.criado", payload),

  onboardingSubmetido: (payload: {
    clienteId: string
    sessaoId?: string | null
    nomeCliente: string
    email?: string | null
    telefone?: string | null
    servico?: string | null
    sessaoData?: string | null
    sessaoHora?: string | null
    estadoEmocional?: string | null
    zonasTensao?: string | null
    condicoesAlergias?: string | null
    objetivo?: string | null
    voucherCodigo?: string | null
    // Nota: o n8n busca o perfil completo (fichaClinica, histórico, notas, tarefas,
    // mensagens) diretamente via GET /api/v1/clientes/{clienteId} — não é preciso
    // duplicar esses dados aqui.
  }) => dispararWebhook("onboarding.submetido", payload),

  servicoCriado: (payload: {
    servicoId: string
    nome: string
    precoBase: string
    duracaoMinutos: number
  }) => dispararWebhook("servico.criado", payload),

  packAtualizado: (payload: {
    packId: string
    clienteId: string
    servicoNome: string
    sessoesUsadas: number
    totalSessoes: number
    ativo: boolean
  }) => dispararWebhook("pack.atualizado", payload),

  pedidoRemarcacao: (payload: {
    clienteId: string
    mensagem: string
    preferencia?: string
  }) => dispararWebhook("cliente.pedido_remarcacao", payload),

  feedbackRecebido: (payload: {
    feedbackId: string
    clienteId: string
    sessaoId?: string | null
    rating: number
    encaminhadoGoogle: boolean
  }) => dispararWebhook("feedback.recebido", payload),

  feedbackNegativo: (payload: {
    feedbackId: string
    clienteId: string
    nomeCliente: string
    sessaoId?: string | null
    rating: number
    pontosMelhorar?: string | null
    comentario?: string | null
  }) => dispararWebhook("feedback.negativo", payload),
}
