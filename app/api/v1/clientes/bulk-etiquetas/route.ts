import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validarApiKey, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { bulkEtiquetasSchema, validarBody } from "@/lib/validations"
import { auditar } from "@/lib/audit"

export async function POST(request: NextRequest) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const parseado = await validarBody(request, bulkEtiquetasSchema)
  if (!parseado.ok) return parseado.resposta

  const { clienteIds, etiquetaId, acao } = parseado.data

  try {
    const etiqueta = await prisma.etiqueta.findUnique({
      where: { id: etiquetaId },
      select: { id: true, nome: true },
    })
    if (!etiqueta) return respostaErro("Etiqueta não encontrada", "NOT_FOUND", 404)

    let afetados = 0

    if (acao === "aplicar") {
      // Upsert para cada cliente — ignorar duplicados
      for (const clienteId of clienteIds) {
        const existe = await prisma.clienteEtiqueta.findUnique({
          where: { clienteId_etiquetaId: { clienteId, etiquetaId } },
        })
        if (!existe) {
          await prisma.clienteEtiqueta.create({ data: { clienteId, etiquetaId } })
          auditar({
            quem: "api:bulk",
            acao: "etiqueta.adicionada",
            entidade: "Cliente",
            entidadeId: clienteId,
            detalhe: { etiquetaId, etiqueta: etiqueta.nome },
          })
          afetados++
        }
      }
    } else {
      // Remover
      const resultado = await prisma.clienteEtiqueta.deleteMany({
        where: { clienteId: { in: clienteIds }, etiquetaId },
      })
      afetados = resultado.count

      for (const clienteId of clienteIds) {
        auditar({
          quem: "api:bulk",
          acao: "etiqueta.removida",
          entidade: "Cliente",
          entidadeId: clienteId,
          detalhe: { etiquetaId, etiqueta: etiqueta.nome },
        })
      }
    }

    return respostaSucesso({ acao, afetados, etiquetaId })
  } catch (e) {
    console.error("[bulk-etiquetas]", e)
    return respostaErro("Erro interno", "INTERNAL_ERROR", 500)
  }
}
