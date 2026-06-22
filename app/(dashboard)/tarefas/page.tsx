"use client"
import { useState, useCallback, useEffect } from "react"
import { List, Kanban, Plus, Filter, CheckSquare } from "lucide-react"
import { TarefasLista } from "@/components/tarefas/TarefasLista"
import { TarefasKanban } from "@/components/tarefas/TarefasKanban"
import { EmptyState } from "@/components/ui/EmptyState"

type Tarefa = {
  id: string
  titulo: string
  descricao?: string | null
  dataLimite?: string | null
  estado: string
  prioridade: string
  tipo: string
  cliente?: { id: string; nome: string } | null
  atribuida?: { id: string; name?: string | null } | null
}

const ESTADOS = ["pendente", "em_progresso", "concluida", "cancelada"]
const PRIORIDADES = ["baixa", "normal", "alta", "urgente"]
const TIPOS = ["follow_up", "ligacao", "mensagem", "nota", "outro"]

export default function TarefasPage() {
  const [vista, setVista] = useState<"lista" | "kanban">("lista")
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState("")
  const [filtroPrioridade, setFiltroPrioridade] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("")
  const [mostrarFiltros, setMostrarFiltros] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filtroEstado) params.set("estado", filtroEstado)
    if (filtroPrioridade) params.set("prioridade", filtroPrioridade)
    if (filtroTipo) params.set("tipo", filtroTipo)
    params.set("limite", "100")
    try {
      const res = await fetch(`/api/v1/tarefas?${params}`, {
        headers: { "X-API-Key": process.env.NEXT_PUBLIC_API_KEY ?? "" },
      })
      if (res.ok) {
        const json = await res.json()
        setTarefas(json.data ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [filtroEstado, filtroPrioridade, filtroTipo])

  useEffect(() => { carregar() }, [carregar])

  const tarefasAtivas = tarefas.filter(
    (t) => t.estado === "pendente" || t.estado === "em_progresso"
  )
  const vencidas = tarefasAtivas.filter(
    (t) => t.dataLimite && new Date(t.dataLimite) < new Date()
  ).length

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#064E3B]">Tarefas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {tarefasAtivas.length} ativa{tarefasAtivas.length !== 1 ? "s" : ""}
            {vencidas > 0 && (
              <span className="ml-2 text-red-500 font-medium">
                · {vencidas} vencida{vencidas !== 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMostrarFiltros((p) => !p)}
            className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
              mostrarFiltros
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtros
          </button>
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setVista("lista")}
              className={`p-2 transition-colors cursor-pointer ${
                vista === "lista" ? "bg-emerald-50 text-emerald-600" : "text-gray-400 hover:bg-gray-50"
              }`}
              title="Vista em lista"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setVista("kanban")}
              className={`p-2 transition-colors cursor-pointer ${
                vista === "kanban" ? "bg-emerald-50 text-emerald-600" : "text-gray-400 hover:bg-gray-50"
              }`}
              title="Vista kanban"
            >
              <Kanban className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      {mostrarFiltros && (
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm mb-6 flex flex-wrap gap-3">
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 focus:outline-none cursor-pointer"
          >
            <option value="">Todos os estados</option>
            {ESTADOS.map((e) => <option key={e} value={e}>{e.replace("_", " ")}</option>)}
          </select>
          <select
            value={filtroPrioridade}
            onChange={(e) => setFiltroPrioridade(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 focus:outline-none cursor-pointer"
          >
            <option value="">Todas as prioridades</option>
            {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 focus:outline-none cursor-pointer"
          >
            <option value="">Todos os tipos</option>
            {TIPOS.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
          </select>
          {(filtroEstado || filtroPrioridade || filtroTipo) && (
            <button
              onClick={() => { setFiltroEstado(""); setFiltroPrioridade(""); setFiltroTipo("") }}
              className="text-sm text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* Conteúdo */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : tarefas.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="Nenhuma tarefa encontrada"
          description={filtroEstado || filtroPrioridade || filtroTipo ? "Experimenta limpar os filtros para ver todas as tarefas." : "Cria a tua primeira tarefa para começar a organizar o trabalho."}
          action={filtroEstado || filtroPrioridade || filtroTipo ? { label: "Limpar filtros", onClick: () => { setFiltroEstado(""); setFiltroPrioridade(""); setFiltroTipo("") } } : undefined}
        />
      ) : vista === "lista" ? (
        <TarefasLista tarefas={tarefas} onRefresh={carregar} />
      ) : (
        <TarefasKanban tarefas={tarefas} onRefresh={carregar} />
      )}
    </div>
  )
}
