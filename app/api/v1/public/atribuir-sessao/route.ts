// Endpoint público para a Bea atribuir terapeuta/preço/nota a uma sessão recém-criada
// pelo Calendly. Sem autenticação — pensado para ser aberto a partir de um link
// enviado por WhatsApp (pode ser no telemóvel, fora de uma sessão do dashboard).
// Protegido só pelo sessaoId (cuid impossível de adivinhar) + rate limit.

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { atribuirSessaoQuerySchema, atribuirSessaoSchema, validarBody, validarQuery } from "@/lib/validations"
import { verificarRateLimit } from "@/lib/rate-limit"
import { auditar } from "@/lib/audit"
import { validarLinkToken } from "@/lib/link-token"

export async function GET(request: NextRequest) {
  const bloqueio = await verificarRateLimit(request, {
    recurso: "atribuir-sessao-get",
    limite: 60,
    janelaSeg: 3600,
  })
  if (bloqueio) return bloqueio

  const q = validarQuery(request.url, atribuirSessaoQuerySchema)
  if (!q.ok) return q.resposta
  const { sessaoId, t } = q.data

  const erroToken = await validarLinkToken(request, sessaoId, "atribuir-sessao-get", t)
  if (erroToken) return erroToken

  const sessao = await prisma.sessao.findFirst({
    where: { id: sessaoId, apagadoEm: null },
    select: {
      id: true, servico: true, data: true, hora: true, duracao: true, preco: true,
      clienteId: true, atribuicaoSubmetidaEm: true, terapeutaId: true,
      cliente: {
        select: {
          nome: true, telefone: true, totalSessoes: true, criadoEm: true,
          terapeutaPrincipal: { select: { id: true, name: true } },
        },
      },
    },
  })
  if (!sessao) {
    return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 })
  }
  // Cliente foi apagada depois desta sessão existir (sessão "fantasma",
  // preservada só para o histórico financeiro) — este formulário público
  // não faz sentido nesse caso, ninguém deveria ter um link para isto.
  if (!sessao.cliente) {
    return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 })
  }
  // Sabido não-nulo pelo guard acima (a FK só é null quando cliente é
  // null) — evita repetir o "!" em cada uso a seguir.
  const clienteId = sessao.clienteId as string

  // Uso único: já foi submetido por este formulário — não há nada para
  // preencher outra vez. O terapeutaHabitual serve só para mostrar quem
  // ficou atribuída, sem repetir todas as queries pesadas do caso normal.
  if (sessao.atribuicaoSubmetidaEm) {
    const terapeutaAtual = sessao.terapeutaId
      ? await prisma.user.findFirst({ where: { id: sessao.terapeutaId }, select: { name: true } })
      : null
    return NextResponse.json({
      jaSubmetido: true,
      cliente: { nome: sessao.cliente.nome },
      sessao: { servico: sessao.servico, data: sessao.data, hora: sessao.hora },
      terapeutaAtribuida: terapeutaAtual?.name ?? null,
    })
  }

  const [terapeutas, servicoCatalogo, sessoesAnteriores, notas, historico] = await Promise.all([
    prisma.user.findMany({
      where: { ativo: true, role: "terapeuta" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    sessao.servico
      ? prisma.servico.findFirst({ where: { nome: sessao.servico }, select: { precoBase: true } })
      : null,
    prisma.sessao.count({
      where: { clienteId, apagadoEm: null, id: { not: sessao.id } },
    }),
    prisma.observacao.findMany({
      where: { clienteId },
      select: { texto: true, autor: true, criadoEm: true },
      orderBy: { criadoEm: "desc" },
      take: 5,
    }),
    // Últimas sessões da cliente — quem atribui vê logo o "caminho" dela
    // (que serviços costuma pedir, com quem costuma ficar) antes de decidir
    // a terapeuta desta marcação, em vez de decidir às cegas.
    prisma.sessao.findMany({
      where: { clienteId, apagadoEm: null, id: { not: sessao.id }, estado: { not: "cancelada" } },
      select: {
        data: true, servico: true, estado: true,
        // O nome oficial da terapeuta (via FK) em vez do texto livre
        // "terapeuta" — esse campo tem valores antigos inconsistentes
        // ("beatriz" minúsculas vs "Beatriz Leão"), consoante por onde a
        // sessão passou ao longo do tempo. O relacionamento está sempre
        // certo e atualizado; o texto livre só serve de fallback para
        // sessões sem terapeutaId nenhum.
        terapeuta: true,
        user: { select: { name: true } },
      },
      orderBy: { data: "desc" },
      take: 5,
    }),
  ])

  return NextResponse.json({
    cliente: {
      nome: sessao.cliente.nome,
      telefone: sessao.cliente.telefone,
      primeiraVisita: sessoesAnteriores === 0,
      totalSessoesAnteriores: sessoesAnteriores,
      terapeutaHabitual: sessao.cliente.terapeutaPrincipal,
    },
    sessao: {
      servico: sessao.servico, data: sessao.data, hora: sessao.hora, duracao: sessao.duracao,
      precoAtual: sessao.preco,
    },
    precoBase: servicoCatalogo?.precoBase ?? sessao.preco ?? null,
    terapeutas,
    notas,
    historico: historico.map((s) => ({
      data: s.data,
      servico: s.servico,
      estado: s.estado,
      terapeuta: s.user?.name ?? s.terapeuta,
    })),
  })
}

export async function POST(request: NextRequest) {
  const bloqueio = await verificarRateLimit(request, {
    recurso: "atribuir-sessao",
    limite: 20,
    janelaSeg: 3600,
  })
  if (bloqueio) return bloqueio

  const v = await validarBody(request, atribuirSessaoSchema)
  if (!v.ok) return v.resposta
  const { sessaoId, t, terapeutaId, terapeuta2Id, preco, nota, website } = v.data

  // Honeypot preenchido = bot
  if (website) {
    return NextResponse.json({ ok: true })
  }

  const erroToken = await validarLinkToken(request, sessaoId, "atribuir-sessao-post", t)
  if (erroToken) return erroToken

  try {
    const sessao = await prisma.sessao.findFirst({
      where: { id: sessaoId, apagadoEm: null },
      select: {
        id: true, clienteId: true, estado: true, atribuicaoSubmetidaEm: true,
        cliente: { select: { terapeutaPrincipalId: true } },
      },
    })
    if (!sessao) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 })
    }
    if (!sessao.cliente) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 })
    }
    const clienteId = sessao.clienteId as string

    // Sessão cancelada não deve receber atribuição de terapeuta/preço via link antigo
    if (sessao.estado === "cancelada") {
      return NextResponse.json({ ok: true, jaAtualizada: false })
    }

    // Uso único: já foi submetido antes. Devolve sucesso sem regravar nada —
    // um duplo toque ou um retry de rede (resposta perdida, form reenviado)
    // não pode falhar à cliente nem sobrepor o que já ficou certo.
    if (sessao.atribuicaoSubmetidaEm) {
      return NextResponse.json({ ok: true, jaSubmetido: true })
    }

    const terapeuta = await prisma.user.findFirst({
      where: { id: terapeutaId, ativo: true, role: "terapeuta" },
      select: { id: true, name: true },
    })
    if (!terapeuta) {
      return NextResponse.json({ error: "Terapeuta inválida" }, { status: 400 })
    }

    // Segunda terapeuta (massagem a dois) — validada só se vier preenchida.
    // Tem de ser diferente da primeira: as duas ao mesmo tempo não faz
    // sentido serem a mesma pessoa.
    let terapeuta2: { id: string; name: string | null } | null = null
    if (terapeuta2Id) {
      if (terapeuta2Id === terapeutaId) {
        return NextResponse.json({ error: "As duas terapeutas têm de ser diferentes" }, { status: 400 })
      }
      terapeuta2 = await prisma.user.findFirst({
        where: { id: terapeuta2Id, ativo: true, role: "terapeuta" },
        select: { id: true, name: true },
      })
      if (!terapeuta2) {
        return NextResponse.json({ error: "Segunda terapeuta inválida" }, { status: 400 })
      }
    }

    const nomeTerapeuta = terapeuta.name ?? "terapeuta"

    // Uso único ATÓMICO: o pré-check em cima (linha ~138) ainda deixa uma
    // janela entre dois pedidos concorrentes (dois separadores abertos, ou
    // um duplo toque) — os dois podem lê-lo como "por submeter" antes de
    // qualquer um escrever. O WHERE com atribuicaoSubmetidaEm: null garante
    // que só um consegue mesmo gravar; é importante aqui em particular
    // porque isto decide de quem é o dinheiro — dois pedidos concorrentes
    // com terapeutas diferentes não podem os dois "ganhar".
    const escrita = await prisma.sessao.updateMany({
      where: { id: sessao.id, atribuicaoSubmetidaEm: null },
      data: {
        terapeutaId: terapeuta.id,
        terapeuta: nomeTerapeuta,
        terapeuta2Id: terapeuta2?.id ?? null,
        preco,
        atribuicaoSubmetidaEm: new Date(),
      },
    })
    if (escrita.count === 0) {
      return NextResponse.json({ ok: true, jaSubmetido: true })
    }

    // Se a cliente ainda não tem terapeuta principal, esta atribuição define-a
    if (!sessao.cliente.terapeutaPrincipalId) {
      await prisma.cliente.update({
        where: { id: clienteId },
        data: { terapeutaPrincipalId: terapeuta.id },
      })
    }

    // Só chega aqui na primeira submissão (uso único, ver acima). A
    // deduplicação da nota fica de qualquer forma — cobre o caso de dois
    // separadores abertos ao mesmo tempo a submeter em paralelo, antes de
    // qualquer um marcar atribuicaoSubmetidaEm.
    let notaCriada = false
    if (nota) {
      const duplicada = await prisma.observacao.findFirst({
        where: {
          clienteId,
          texto: nota,
          criadoEm: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        select: { id: true },
      })
      if (!duplicada) {
        await prisma.observacao.create({
          data: {
            clienteId,
            texto: nota,
            autor: nomeTerapeuta,
          },
        })
        notaCriada = true
      }
    }

    auditar({
      quem: "publico",
      acao: "atribuir_sessao.submetido",
      entidade: "Sessao",
      entidadeId: sessao.id,
      detalhe: { terapeutaId: terapeuta.id, terapeuta2Id: terapeuta2?.id ?? null, preco, temNota: !!nota, notaCriada },
      ip: request.headers.get("x-forwarded-for"),
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("POST /api/v1/public/atribuir-sessao:", (error as Error).message)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
