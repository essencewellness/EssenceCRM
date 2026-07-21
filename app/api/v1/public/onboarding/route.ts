// Endpoint público para a ficha de onboarding das clientes
// Sem autenticação — recebe dados do formulário HTML antes da primeira sessão
// Aceita clienteId + sessaoId quando o link é personalizado (sem precisar de email)
// Proteções: rate limit, Zod estrito, honeypot, registo de consentimento RGPD.
// fra1 = Frankfurt — mesmo datacenter que o n8n (Hetzner), evita bloqueio transatlântico
export const preferredRegion = "fra1"

import { NextRequest, NextResponse, after } from "next/server"
import { prisma } from "@/lib/prisma"
import { webhooks } from "@/lib/webhooks"
import { onboardingPublicSchema, validarBody } from "@/lib/validations"
import { verificarRateLimit } from "@/lib/rate-limit"
import { auditar } from "@/lib/audit"

// Versão do texto de consentimento mostrado no formulário (essence-forms.js,
// injetarAvisoRGPD). Incrementar sempre que o texto mudar — fica no audit log
// como prova de QUE declaração a cliente consentiu ao enviar.
const CONSENT_VERSAO = "v2-2026-07-21"

export async function POST(request: NextRequest) {
  const bloqueio = await verificarRateLimit(request, {
    recurso: "onboarding",
    limite: 30,
    janelaSeg: 3600,
  })
  if (bloqueio) return bloqueio

  const v = await validarBody(request, onboardingPublicSchema)
  if (!v.ok) return v.resposta
  const {
    clienteId, sessaoId, nome, email, telefone, dataNascimento, comoNosConheceu,
    historicoCondicoesAlergias, historicoZonasTensao, historicoEstadoEmocional,
    notasPessoais, voucherCodigo, consentimentoSaude, aceitaMarketing, website,
  } = v.data

  // Honeypot preenchido = bot
  if (website) {
    return NextResponse.json({ ok: true })
  }

  try {
    // Resolução do cliente: por ID direto (link personalizado) ou por email (fallback)
    let cliente = null
    let created = false

    if (clienteId) {
      cliente = await prisma.cliente.findFirst({ where: { id: clienteId, apagadoEm: null } })
    }

    if (!cliente && email) {
      cliente = await prisma.cliente.findFirst({ where: { email, apagadoEm: null } })
    }

    // Blacklist: rejeitar silenciosamente sem revelar o motivo
    if (cliente?.estado === "blacklist") {
      return NextResponse.json({ ok: true })
    }

    if (!cliente) {
      if (!nome || !email) {
        return NextResponse.json(
          { error: "Sem clienteId válido nem email — não foi possível identificar a cliente." },
          { status: 400 }
        )
      }
      cliente = await prisma.cliente.create({
        data: {
          nome,
          email,
          telefone: telefone ?? null,
          dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
          fonte: "formulario",
          comoNosConheceu: comoNosConheceu ?? null,
          estado: "novo",
          aceitaMarketing: aceitaMarketing ?? true,
          ...(aceitaMarketing === false ? {} : { consentimentoMarketingEm: new Date() }),
        },
      })
      created = true
    }

    // Atualizar dados de identidade + consentimento de dados de saúde (RGPD Art. 9)
    await prisma.cliente.update({
      where: { id: cliente.id },
      data: {
        ...(nome && !cliente.nome ? { nome } : {}),
        ...(telefone && !cliente.telefone ? { telefone } : {}),
        ...(dataNascimento && !cliente.dataNascimento
          ? { dataNascimento: new Date(dataNascimento) }
          : {}),
        ...(comoNosConheceu && !cliente.comoNosConheceu ? { comoNosConheceu } : {}),
        ...(consentimentoSaude ? { consentimentoSaudeEm: new Date() } : {}),
        // Dados permanentes no cliente (não mudam sessão a sessão)
        ...(consentimentoSaude && historicoCondicoesAlergias ? { historicoCondicoesAlergias } : {}),
        ...(typeof aceitaMarketing === "boolean"
          ? {
              aceitaMarketing,
              ...(aceitaMarketing ? { consentimentoMarketingEm: new Date() } : {}),
            }
          : {}),
      },
    })

    // Gravar dados específicos desta sessão na Sessao (snapshot do dia)
    let sessao = null
    if (sessaoId) {
      sessao = await prisma.sessao.findFirst({
        where: { id: sessaoId, apagadoEm: null },
        select: { id: true, servico: true, data: true, hora: true },
      })
      if (sessao && consentimentoSaude) {
        await prisma.sessao.update({
          where: { id: sessao.id },
          data: {
            ...(historicoEstadoEmocional ? { fichaEstadoEmocional: historicoEstadoEmocional } : {}),
            ...(historicoZonasTensao ? { fichaZonasTensao: historicoZonasTensao } : {}),
            ...(notasPessoais ? { fichaFoco: notasPessoais } : {}),
            ...(historicoCondicoesAlergias ? { fichaCondicoesAlergias: historicoCondicoesAlergias } : {}),
          },
        })
      }
    }

    auditar({
      quem: "publico",
      acao: "onboarding.submetido",
      entidade: "Cliente",
      entidadeId: cliente.id,
      detalhe: { consentimentoSaude: !!consentimentoSaude, temVoucher: !!voucherCodigo, consentVersao: CONSENT_VERSAO },
      ip: request.headers.get("x-forwarded-for"),
    })

    // Disparar webhook após resposta — after() garante execução mesmo em serverless
    after(async () => {
      await webhooks.onboardingSubmetido({
        clienteId: cliente.id,
        sessaoId: sessaoId ?? null,
        nomeCliente: cliente.nome,
        email: cliente.email,
        telefone: cliente.telefone,
        servico: sessao?.servico ?? null,
        sessaoData: sessao?.data?.toISOString() ?? null,
        sessaoHora: sessao?.hora ?? null,
        estadoEmocional: historicoEstadoEmocional ?? null,
        zonasTensao: historicoZonasTensao ?? null,
        condicoesAlergias: historicoCondicoesAlergias ?? null,
        objetivo: notasPessoais ?? null,
        voucherCodigo: voucherCodigo ?? null,
      })

      if (created) {
        await webhooks.leadCriado({
          clienteId: cliente.id,
          nomeCliente: cliente.nome,
          email: cliente.email,
          telefone: cliente.telefone,
          servicoInteresse: "onboarding",
        })
      }
    })

    // Resposta uniforme: não revelar se o email já era cliente (anti-enumeração).
    // Os IDs reais seguem no webhook onboarding.submetido para o N8N.
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("POST /api/v1/public/onboarding:", (error as Error).message)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
