// Endpoint público para a ficha de onboarding das clientes
// Sem autenticação — recebe dados do formulário HTML antes da primeira sessão
// Aceita clienteId + sessaoId quando o link é personalizado (sem precisar de email)
// Proteções: rate limit, Zod estrito, honeypot, registo de consentimento RGPD.
// fra1 = Frankfurt — mesmo datacenter que o n8n (Hetzner), evita bloqueio transatlântico
export const preferredRegion = "fra1"

import { NextRequest, NextResponse, after } from "next/server"
import { prisma } from "@/lib/prisma"
import { webhooks } from "@/lib/webhooks"
import { onboardingPublicSchema, onboardingQuerySchema, validarBody, validarQuery } from "@/lib/validations"
import { verificarRateLimit } from "@/lib/rate-limit"
import { auditar } from "@/lib/audit"
import { validarLinkToken } from "@/lib/link-token"
import { getTerapeutaPrincipalPadraoId } from "@/lib/terapeuta-padrao"
import { Prisma } from "@/lib/prisma-client"

// Versão do texto de consentimento mostrado no formulário (essence-forms.js,
// injetarAvisoRGPD). Incrementar sempre que o texto mudar — fica no audit log
// como prova de QUE declaração a cliente consentiu ao enviar.
const CONSENT_VERSAO = "v2-2026-07-21"

// Uso único (link personalizado): a cliente já preencheu esta ficha antes de
// uma sessão concreta. Sem GET aqui, essence-forms.js só descobria isto no
// fim do multi-step, ao tentar submeter — deixava preencher tudo para nada.
export async function GET(request: NextRequest) {
  const bloqueio = await verificarRateLimit(request, {
    recurso: "onboarding-get",
    limite: 60,
    janelaSeg: 3600,
  })
  if (bloqueio) return bloqueio

  const q = validarQuery(request.url, onboardingQuerySchema)
  if (!q.ok) return q.resposta
  const { sessaoId, t } = q.data

  const erroToken = await validarLinkToken(request, sessaoId, "onboarding-get", t)
  if (erroToken) return erroToken

  const sessao = await prisma.sessao.findFirst({
    where: { id: sessaoId, apagadoEm: null },
    select: { onboardingSubmetidoEm: true },
  })

  return NextResponse.json({ jaSubmetido: !!sessao?.onboardingSubmetidoEm })
}

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
    clienteId, sessaoId, t, nome, email, telefone, dataNascimento, comoNosConheceu,
    historicoCondicoesAlergias, historicoZonasTensao, historicoEstadoEmocional,
    notasPessoais, voucherCodigo, consentimentoSaude, aceitaMarketing, website,
  } = v.data

  // Honeypot preenchido = bot
  if (website) {
    return NextResponse.json({ ok: true })
  }

  // IDOR: quando o link identifica cliente/sessão, exige o mesmo token assinado
  // que os outros endpoints públicos (atribuir-sessao, pos-sessao, confirmar-sessao,
  // ficha-sessao) — caso contrário qualquer cuid adivinhado bastava para submeter
  // dados clínicos em nome de outra cliente. Sem clienteId/sessaoId (lead nova só
  // com nome+email) não há nada para proteger, tal como antes.
  const idAlvo = sessaoId ?? clienteId
  if (idAlvo) {
    const erroToken = await validarLinkToken(request, idAlvo, "onboarding", t)
    if (erroToken) return erroToken
  }

  // Uso único (link personalizado): já preencheu esta ficha antes de uma
  // sessão concreta — não regrava nada nem dispara o webhook outra vez. Um
  // duplo toque ou um retry de rede não pode substituir dados clínicos já
  // enviados por dados diferentes de uma segunda tentativa.
  if (sessaoId) {
    const sessaoAtual = await prisma.sessao.findFirst({
      where: { id: sessaoId, apagadoEm: null },
      select: { onboardingSubmetidoEm: true },
    })
    if (sessaoAtual?.onboardingSubmetidoEm) {
      return NextResponse.json({ ok: true, jaSubmetido: true })
    }
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
      try {
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
            terapeutaPrincipalId: await getTerapeutaPrincipalPadraoId(),
          },
        })
        created = true
      } catch (erroCriacao) {
        // Corrida rara: duas submissões da mesma cliente nova (duplo toque,
        // ou o mesmo link aberto em duas abas) passam as duas pelo "!cliente"
        // acima antes de qualquer uma gravar — email/telefone são @unique,
        // por isso a segunda create() rebenta aqui. Sem apanhar isto
        // especificamente, a pessoa via um erro 500 em vez do "ok" silencioso
        // que todo o resto deste endpoint dá de propósito (anti-enumeração).
        // A saída certa é a mesma dos outros casos de corrida no ficheiro:
        // ir buscar a cliente que a outra submissão acabou de criar e seguir
        // o fluxo normal com ela, em vez de falhar.
        if (erroCriacao instanceof Prisma.PrismaClientKnownRequestError && erroCriacao.code === "P2002") {
          cliente = email ? await prisma.cliente.findFirst({ where: { email, apagadoEm: null } }) : null
          if (!cliente) throw erroCriacao
        } else {
          throw erroCriacao
        }
      }
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
    // Só true se ESTA chamada venceu a corrida de "uso único" (ver abaixo) —
    // controla se o webhook onboarding.submetido dispara mais à frente.
    let ganhouUsoUnico = true
    if (sessaoId) {
      const sessaoEncontrada = await prisma.sessao.findFirst({
        where: { id: sessaoId, apagadoEm: null },
        select: { id: true, servico: true, data: true, hora: true, estado: true },
      })
      // Sessão cancelada não recebe snapshot clínico via link antigo (mas o
      // cliente continua a ser identificado/atualizado normalmente acima) —
      // `sessao` (usado no webhook abaixo) fica null nesse caso, mas a
      // marcação de "uso único" corre sempre que a sessão existe, cancelada
      // ou não: sem isto, o link de uma sessão cancelada nunca trancava e
      // podia ser reenviado sem fim, disparando o webhook a cada vez.
      sessao = sessaoEncontrada && sessaoEncontrada.estado !== "cancelada" ? sessaoEncontrada : null

      if (sessaoEncontrada) {
        // Uso único ATÓMICO: o pré-check lá em cima (linhas ~84-92) só evita
        // a maioria dos casos — entre ele e esta escrita ainda há uma janela
        // onde dois pedidos concorrentes passam os dois. O WHERE com
        // onboardingSubmetidoEm: null torna a transição atómica (mesmo
        // princípio já usado em confirmacao-envio): só um dos dois consegue
        // mesmo escrever (count=1); o outro vê count=0 e não dispara o
        // webhook outra vez.
        const escrita = await prisma.sessao.updateMany({
          where: { id: sessaoEncontrada.id, onboardingSubmetidoEm: null },
          data: {
            ...(sessao && consentimentoSaude ? {
              ...(historicoEstadoEmocional ? { fichaEstadoEmocional: historicoEstadoEmocional } : {}),
              ...(historicoZonasTensao ? { fichaZonasTensao: historicoZonasTensao } : {}),
              ...(notasPessoais ? { fichaFoco: notasPessoais } : {}),
              ...(historicoCondicoesAlergias ? { fichaCondicoesAlergias: historicoCondicoesAlergias } : {}),
            } : {}),
            // Marca a ficha como preenchida independentemente de
            // consentimentoSaude (que só controla se os dados clínicos são
            // gravados, não se a ficha foi enviada) — sem isto, uma cliente
            // que recuse os dados de saúde podia reabrir o link para sempre.
            onboardingSubmetidoEm: new Date(),
          },
        })
        ganhouUsoUnico = escrita.count > 0
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

    // Disparar webhook após resposta — after() garante execução mesmo em serverless.
    // Só dispara se esta chamada venceu mesmo a corrida de uso único — senão
    // é a segunda de duas submissões concorrentes a reenviar dados já enviados.
    after(async () => {
      if (!ganhouUsoUnico) return

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
