import { getContextoUtilizador, listarTerapeutas } from "@/lib/contexto-utilizador"
import { TarefasClient } from "./TarefasClient"

export default async function TarefasPage() {
  const ctx = await getContextoUtilizador()
  // Filtro "por terapeuta" (chips no topo) continua só para admin. A lista
  // de terapeutas para o seletor "Atribuir a" no formulário de criar tarefa
  // já vai também para a Bea — ver lib/contexto-utilizador.ts.
  const precisaTerapeutas = ctx.isAdmin || ctx.podeAtribuirTarefas
  const terapeutas = precisaTerapeutas ? await listarTerapeutas() : []

  return (
    <TarefasClient
      isAdmin={ctx.isAdmin}
      podeAtribuirTarefas={ctx.podeAtribuirTarefas}
      terapeutas={terapeutas.map((t) => ({ id: t.id, name: t.name }))}
    />
  )
}
