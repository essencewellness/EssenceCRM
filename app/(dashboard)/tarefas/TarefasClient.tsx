"use client"
import { useState, useCallback, useEffect } from "react"
import { List, Kanban, Filter, CheckSquare, UserRound } from "lucide-react"
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

interface Terapeuta {
  id: string
  name: string | null
}

const ESTADOS = ["pendente", "em_progresso", "concluida", "cancelada"]
const PRIORIDADES = ["baixa", "normal", "alta", "urgente"]
const TIPOS = ["follow_up", "ligacao", "mensagem", "nota", "outro"]

export function TarefasClient({ isAdmin, terapeutas }: { isAdmin: boolean; terapeutas: Terapeuta[] }) {
  const [vista, setVista] = useState<"lista" | "kanban">("lista")
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState("")
  const [filtroPrioridade, setFiltroPrioridade] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("")
  const [filtroTerapeuta, setFiltroTerapeuta] = useState("")
  const [mostrarFiltros, setMostrarFiltros] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filtroEstado) params.set("estado", filtroEstado)
    if (filtroPrioridade) params.set("prioridade", filtroPrioridade)
    if (filtroTipo) params.set("tipo", filtroTipo)
    if (filtroTerapeuta) params.set("terapeuta", filtroTerapeuta)
    params.set("limit", "300")
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
  }, [filtroEstado, filtroPrioridade, filtroTipo, filtroTerapeuta])

  useEffect(() => { carregar() }, [carregar])

  const tarefasAtivas = tarefas.filter(
    (t) => t.estado === "pendente" || t.estado === "em_progresso"
  )
  const vencidas = tarefasAtivas.filter(
    (t) => t.dataLimite && new Date(t.dataLimite) < new Date()
  ).length

  const GOLD = "#b9a07a"
  const chip = (label: string, value: string) => {
    const active = filtroTerapeuta === value
    return (
      <button
        key={value || "todos"}
        onClick={() => setFiltroTerapeuta(value)}
        style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          height: "30px", padding: "0 12px", borderRadius: "100px",
          fontSize: "11px", fontWeight: 600,
          fontFamily: "var(--font-sans, sans-serif)",
          color: active ? GOLD : "#7a7e8a",
          backgroundColor: active ? "rgba(185,160,122,0.10)" : "transparent",
          border: active ? "1px solid rgba(185,160,122,0.35)" : "1px solid rgba(122,126,138,0.22)",
          cursor: "pointer", transition: "all 150ms",
        }}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#ece6d6]">Tarefas</h1>
          <p className="text-sm text-[#7a7e8a] mt-0.5">
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
                ? "border-[rgba(185,160,122,0.4)] bg-[rgba(185,160,122,0.1)] text-[#d4b886]"
                : "border-[rgba(212,184,134,0.16)] text-[#d8d2c2] hover:bg-[rgba(212,184,134,0.06)]"
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtros
          </button>
          <div className="flex items-center border border-[rgba(212,184,134,0.16)] rounded-lg overflow-hidden">
            <button
              onClick={() => setVista("lista")}
              className={`p-2 transition-colors cursor-pointer ${
                vista === "lista" ? "bg-[rgba(185,160,122,0.1)] text-[#d4b886]" : "text-[#7a7e8a] hover:bg-[rgba(212,184,134,0.06)]"
              }`}
              title="Vista em lista"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setVista("kanban")}
              className={`p-2 transition-colors cursor-pointer ${
                vista === "kanban" ? "bg-[rgba(185,160,122,0.1)] text-[#d4b886]" : "text-[#7a7e8a] hover:bg-[rgba(212,184,134,0.06)]"
              }`}
              title="Vista kanban"
            >
              <Kanban className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filtro de admin: Todas / Beatriz / Cristina */}
      {isAdmin && terapeutas.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: "5px",
            fontFamily: "var(--font-sans, sans-serif)", fontSize: "9px", fontWeight: 700,
            letterSpacing: "0.18em", color: "#9d9d9a", textTransform: "uppercase", marginRight: "2px",
          }}>
            <UserRound size={12} /> Terapeuta
          </span>
          {chip("Todas", "")}
          {terapeutas.map((t) => chip(t.name ?? "—", t.id))}
        </div>
      )}

      {/* Filtros */}
      {mostrarFiltros && (
        <div className="bg-[#1f2433] rounded-xl p-4 border border-[rgba(212,184,134,0.16)] shadow-sm mb-6 flex flex-wrap gap-3">
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="text-sm border border-[rgba(212,184,134,0.16)] bg-[#161a26] rounded-lg px-3 py-1.5 text-[#d8d2c2] focus:outline-none cursor-pointer"
          >
            <option value="">Todos os estados</option>
            {ESTADOS.map((e) => <option key={e} value={e}>{e.replace("_", " ")}</option>)}
          </select>
          <select
            value={filtroPrioridade}
            onChange={(e) => setFiltroPrioridade(e.target.value)}
            className="text-sm border border-[rgba(212,184,134,0.16)] bg-[#161a26] rounded-lg px-3 py-1.5 text-[#d8d2c2] focus:outline-none cursor-pointer"
          >
            <option value="">Todas as prioridades</option>
            {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="text-sm border border-[rgba(212,184,134,0.16)] bg-[#161a26] rounded-lg px-3 py-1.5 text-[#d8d2c2] focus:outline-none cursor-pointer"
          >
            <option value="">Todos os tipos</option>
            {TIPOS.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
          </select>
          {(filtroEstado || filtroPrioridade || filtroTipo) && (
            <button
              onClick={() => { setFiltroEstado(""); setFiltroPrioridade(""); setFiltroTipo("") }}
              className="text-sm text-[#7a7e8a] hover:text-[#d8d2c2] cursor-pointer"
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
            <div key={i} className="h-20 bg-[#1f2433] rounded-xl animate-pulse" />
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
