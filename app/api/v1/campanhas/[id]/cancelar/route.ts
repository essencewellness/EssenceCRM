import { NextRequest } from "next/server"
import { validarApiKey, respostaSucesso, respostaErro } from "@/lib/api-auth"
import { cancelarCampanha, CampanhaError } from "@/lib/campanhas"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const erro = validarApiKey(request)
  if (erro) return erro

  const { id } = await params

  try {
    const resultado = await cancelarCampanha(id)
    return respostaSucesso(resultado)
  } catch (error) {
    if (error instanceof CampanhaError) {
      const status = error.codigo === "CAMPANHA_NAO_ENCONTRADA" ? 404 : 422
      return respostaErro(error.message, error.codigo, status)
    }
    console.error("PATCH /api/v1/campanhas/[id]/cancelar:", (error as Error).message)
    return respostaErro("Erro interno do servidor", "ERRO_INTERNO", 500)
  }
}
