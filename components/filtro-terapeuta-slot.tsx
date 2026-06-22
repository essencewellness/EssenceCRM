import { getContextoUtilizador, listarTerapeutas } from "@/lib/contexto-utilizador"
import { FiltroTerapeuta } from "./filtro-terapeuta"

/**
 * Slot servidor: renderiza o filtro de terapeuta APENAS para o admin.
 * Basta colocar <FiltroTerapeutaSlot /> no topo de qualquer aba.
 */
export async function FiltroTerapeutaSlot() {
  const ctx = await getContextoUtilizador()
  if (!ctx.isAdmin) return null

  const terapeutas = await listarTerapeutas()
  if (terapeutas.length === 0) return null

  return <FiltroTerapeuta terapeutas={terapeutas.map((t) => ({ id: t.id, name: t.name }))} />
}
