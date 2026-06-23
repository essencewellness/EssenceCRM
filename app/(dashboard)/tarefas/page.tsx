import { getContextoUtilizador, listarTerapeutas } from "@/lib/contexto-utilizador"
import { TarefasClient } from "./TarefasClient"

export default async function TarefasPage() {
  const ctx = await getContextoUtilizador()
  const terapeutas = ctx.isAdmin ? await listarTerapeutas() : []

  return (
    <TarefasClient
      isAdmin={ctx.isAdmin}
      terapeutas={terapeutas.map((t) => ({ id: t.id, name: t.name }))}
    />
  )
}
