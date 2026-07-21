import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKeyAdminOuSessao, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { bulkEliminarSchema, validarBody } from "@/lib/validations"
import { verificarRateLimit } from "@/lib/rate-limit"
import { auditar } from "@/lib/audit"

// Apagamento DEFINITIVO em massa (hard delete). Mesma lógica de eliminarCliente()
// em app/(dashboard)/clientes/[id]/actions.ts, aplicada a vários clientes de uma vez.
// A cascata do schema remove sessões, mensagens, etiquetas, observações, etc.
// Restrito: sessão de dashboard ou API_KEY_ADMIN — a chave N8N não chega.
export async function POST(request: NextRequest) {
  const erro = await validarApiKeyAdminOuSessao(request)
  if (erro) return erro

  const bloqueio = await verificarRateLimit(request, {
    recurso: "bulk-eliminar",
    limite: 5,
    janelaSeg: 3600,
  })
  if (bloqueio) return bloqueio

  const parseado = await validarBody(request, bulkEliminarSchema)
  if (!parseado.ok) return parseado.resposta

  const { clienteIds, apagarSessoes } = parseado.data

  try {
    // Busca todos os clientes pedidos com a contagem de sessões — ignora
    // silenciosamente ids que não existem (não bloqueia os restantes)
    const clientes = await prisma.cliente.findMany({
      where: { id: { in: clienteIds } },
      select: { id: true, nome: true, _count: { select: { sessoes: true } } },
    })

    const clientesComSessoes = clientes.filter((c) => c._count.sessoes > 0)

    // Se há clientes com sessões e não foi confirmado apagá-las, bloquear
    // (a cascata removê-las-ia) — devolve a lista para o frontend confirmar
    if (clientesComSessoes.length > 0 && !apagarSessoes) {
      return respostaSucesso({
        bloqueado: true,
        clientesComSessoes: clientesComSessoes.map((c) => ({
          id: c.id,
          nome: c.nome,
          sessoes: c._count.sessoes,
        })),
      })
    }

    let apagados = 0
    for (const cliente of clientes) {
      await prisma.cliente.delete({ where: { id: cliente.id } })

      auditar({
        quem: "api:bulk",
        acao: "cliente.apagado_definitivo",
        entidade: "Cliente",
        entidadeId: cliente.id,
        detalhe: { nome: cliente.nome, sessoesApagadas: cliente._count.sessoes },
      })
      apagados++
    }

    return respostaSucesso({ apagados, bloqueado: false })
  } catch (e) {
    console.error("[bulk-eliminar]", (e as Error).message)
    return respostaErro("Erro interno", "INTERNAL_ERROR", 500)
  }
}
