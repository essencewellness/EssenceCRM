"use client"
import { useCallback } from "react"
import { CheckSquare } from "lucide-react"
import { TarefaCard } from "./TarefaCard"
import { TarefaForm } from "./TarefaForm"
import { EmptyState } from "@/components/ui/EmptyState"

type Tarefa = {
  id: string
  titulo: string
  descricao?: string | null
  dataLimite?: string | Date | null
  estado: string
  prioridade: string
  tipo: string
  cliente?: { id: string; nome: string } | null
  atribuida?: { id: string; name?: string | null } | null
}

interface TarefasListaProps {
  tarefas: Tarefa[]
  showClienteLink?: boolean
  onRefresh?: () => void
  clienteId?: string
}

function agrupar(tarefas: Tarefa[]) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const amanha = new Date(hoje)
  amanha.setDate(amanha.getDate() + 1)
  const semanaFim = new Date(hoje)
  semanaFim.setDate(semanaFim.getDate() + 7)

  const grupos: Record<string, Tarefa[]> = {
    vencidas: [],
    hoje: [],
    semana: [],
    depois: [],
    semprazo: [],
  }

  for (const t of tarefas) {
    if (t.estado !== "pendente" && t.estado !== "em_progresso") continue
    if (!t.dataLimite) { grupos.semprazo.push(t); continue }
    const d = new Date(t.dataLimite)
    d.setHours(0, 0, 0, 0)
    if (d < hoje) { grupos.vencidas.push(t); continue }
    if (d < amanha) { grupos.hoje.push(t); continue }
    if (d <= semanaFim) { grupos.semana.push(t); continue }
    grupos.depois.push(t)
  }
  return grupos
}

const GRUPO_META = {
  vencidas: { label: "Vencidas", cor: "#b06050" },
  hoje:     { label: "Hoje", cor: "#d4956b" },
  semana:   { label: "Esta semana", cor: "#b9a07a" },
  depois:   { label: "Mais tarde", cor: "var(--nuit-bone-soft)" },
  semprazo: { label: "Sem prazo", cor: "var(--nuit-bone-soft)" },
}

export function TarefasLista({ tarefas, onRefresh, clienteId }: TarefasListaProps) {
  const grupos = agrupar(tarefas)

  const handleUpdate = useCallback(
    async (id: string, dados: object) => {
      await fetch(`/api/v1/tarefas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      })
      onRefresh?.()
    },
    [onRefresh]
  )

  const total = tarefas.filter((t) => t.estado === "pendente" || t.estado === "em_progresso").length

  if (total === 0 && tarefas.length === 0) {
    return (
      <div className="space-y-4">
        <TarefaForm clienteId={clienteId} onCreated={onRefresh} />
        <EmptyState
          icon={CheckSquare}
          title="Sem tarefas"
          description="Cria a primeira tarefa de follow-up."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <TarefaForm clienteId={clienteId} onCreated={onRefresh} />
      {Object.entries(grupos).map(([key, itens]) => {
        if (itens.length === 0) return null
        const meta = GRUPO_META[key as keyof typeof GRUPO_META]
        return (
          <div key={key}>
            <h3 style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "8px", color: meta.cor, fontFamily: "var(--font-sans, sans-serif)" }}>
              {meta.label} ({itens.length})
            </h3>
            <div className="space-y-2">
              {itens.map((t) => (
                <TarefaCard key={t.id} tarefa={t} onUpdate={handleUpdate} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
