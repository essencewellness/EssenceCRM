"use server"

import { revalidatePath } from "next/cache"
import { getContextoUtilizador } from "@/lib/contexto-utilizador"
import { cancelarCampanha, CampanhaError } from "@/lib/campanhas"

/**
 * Só quem pode aprovar mensagens (Bea/admin, ver lib/contexto-utilizador.ts)
 * pode cancelar uma campanha — mesma regra de quem gere o envio em massa.
 */
export async function cancelarCampanhaAction(id: string) {
  const ctx = await getContextoUtilizador()
  if (!ctx.podeAprovarMensagens) throw new Error("Sem permissão para gerir campanhas.")

  try {
    const resultado = await cancelarCampanha(id)
    revalidatePath("/campanhas")
    return resultado
  } catch (error) {
    if (error instanceof CampanhaError) throw new Error(error.message)
    throw error
  }
}
