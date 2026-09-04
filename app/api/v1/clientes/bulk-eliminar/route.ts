import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKeyAdminOuSessao, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { bulkEliminarSchema, validarBody } from "@/lib/validations"
import { verificarRateLimit } from "@/lib/rate-limit"
import { auditar } from "@/lib/audit"

// Apagamento DEFINITIVO em massa (hard delete). Mesma lógica de eliminarCliente()
// em app/(dashboard)/clientes/[id]/actions.ts, aplicada a vários clientes de
// uma vez — sessões e packs ficam preservados como "fantasma" no financeiro
// por omissão (2026-09-04), nunca apagados em cascata só por o contacto ser
// apagado. Mensagens, etiquetas, observações, preços e portal token
// continuam em cascata (sem valor financeiro a preservar).
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

  const { clienteIds, apagarTudoDefinitivamente } = parseado.data

  try {
    // Busca todos os clientes pedidos com a contagem de sessões e packs —
    // ignora silenciosamente ids que não existem (não bloqueia os restantes)
    const clientes = await prisma.cliente.findMany({
      where: { id: { in: clienteIds } },
      select: { id: true, nome: true, _count: { select: { sessoes: true, packs: true } } },
    })

    // Eliminação sequencial (não $transaction em array): até 500 clientes
    // por pedido (limite do schema Zod), cada um pode ter sessões/packs a
    // arquivar — uma transação única com 500 destes arriscaria exceder o
    // timeout por omissão do Prisma (5s) e falhar tudo de uma vez. Em vez
    // disso, cada eliminação corre isolada: uma falha pontual (erro
    // transitório de ligação, constraint) não trava as restantes, e a
    // resposta devolve sucessos e falhas separadamente em vez de um 500
    // genérico que esconde quantos foram mesmo apagados.
    const falhas: { id: string; nome: string; erro: string }[] = []
    let apagados = 0
    let sessoesArquivadas = 0
    let packsArquivados = 0

    for (const cliente of clientes) {
      try {
        if (apagarTudoDefinitivamente) {
          await prisma.sessao.deleteMany({ where: { clienteId: cliente.id } })
          await prisma.pack.deleteMany({ where: { clienteId: cliente.id } })
        } else {
          // Arquiva os nomes ANTES de apagar o cliente — onDelete: SetNull
          // no schema orfaniza sessões/packs automaticamente a seguir,
          // preservando a receita no /financeiro como "Cliente eliminada".
          if (cliente._count.sessoes > 0) {
            await prisma.sessao.updateMany({
              where: { clienteId: cliente.id },
              data: { clienteNomeArquivado: cliente.nome },
            })
            sessoesArquivadas += cliente._count.sessoes
          }
          if (cliente._count.packs > 0) {
            await prisma.pack.updateMany({
              where: { clienteId: cliente.id },
              data: { clienteNomeArquivado: cliente.nome },
            })
            packsArquivados += cliente._count.packs
          }
        }

        await prisma.cliente.delete({ where: { id: cliente.id } })

        auditar({
          quem: "api:bulk",
          acao: "cliente.apagado_definitivo",
          entidade: "Cliente",
          entidadeId: cliente.id,
          detalhe: {
            nome: cliente.nome,
            sessoes: cliente._count.sessoes,
            packs: cliente._count.packs,
            apagadoDefinitivamente: apagarTudoDefinitivamente,
          },
        })
        apagados++
      } catch (erroCliente) {
        console.error("[bulk-eliminar] falha ao apagar cliente", cliente.id, (erroCliente as Error).message)
        falhas.push({ id: cliente.id, nome: cliente.nome, erro: (erroCliente as Error).message })
      }
    }

    return respostaSucesso({ apagados, falhas, sessoesArquivadas, packsArquivados })
  } catch (e) {
    console.error("[bulk-eliminar]", (e as Error).message)
    return respostaErro("Erro interno", "INTERNAL_ERROR", 500)
  }
}
