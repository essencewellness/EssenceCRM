"use client"
import { useState } from "react"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core"
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { TarefaCard } from "./TarefaCard"
import { TarefaForm } from "./TarefaForm"

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

const COLUNAS = [
  { id: "pendente",     label: "Pendente" },
  { id: "em_progresso", label: "Em Progresso" },
  { id: "concluida",    label: "Concluída" },
]

function SortableTarefa({ tarefa, onUpdate }: { tarefa: Tarefa; onUpdate: (id: string, d: object) => Promise<void> }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tarefa.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TarefaCard tarefa={tarefa} onUpdate={onUpdate} />
    </div>
  )
}

function KanbanColuna({
  id, label, tarefas, onUpdate, clienteId, onRefresh,
}: {
  id: string; label: string; tarefas: Tarefa[]
  onUpdate: (id: string, d: object) => Promise<void>
  clienteId?: string
  onRefresh?: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={`bg-[#0e1119] rounded-xl p-4 min-h-64 border border-[rgba(212,184,134,0.1)] transition-all ${isOver ? "ring-2 ring-[#b9a07a]/40 bg-[rgba(185,160,122,0.05)]" : ""}`}
    >
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[#7a7e8a] mb-3">
        {label} ({tarefas.length})
      </h3>
      <SortableContext items={tarefas.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {tarefas.map((t) => (
            <SortableTarefa key={t.id} tarefa={t} onUpdate={onUpdate} />
          ))}
        </div>
      </SortableContext>
      {id === "pendente" && (
        <div className="mt-3">
          <TarefaForm clienteId={clienteId} onCreated={onRefresh} compact />
        </div>
      )}
    </div>
  )
}

interface TarefasKanbanProps {
  tarefas: Tarefa[]
  clienteId?: string
  onRefresh?: () => void
}

export function TarefasKanban({ tarefas, clienteId, onRefresh }: TarefasKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const tarefasPorEstado = COLUNAS.reduce(
    (acc, col) => {
      acc[col.id] = tarefas.filter((t) => t.estado === col.id)
      return acc
    },
    {} as Record<string, Tarefa[]>
  )

  const activeTarefa = activeId ? tarefas.find((t) => t.id === activeId) : null

  async function handleUpdate(id: string, dados: object) {
    await fetch(`/api/v1/tarefas/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.NEXT_PUBLIC_API_KEY ?? "",
      },
      body: JSON.stringify(dados),
    })
    onRefresh?.()
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return
    const novoEstado = COLUNAS.find((c) => c.id === over.id)?.id
    if (!novoEstado) return
    const tarefaAtiva = tarefas.find((t) => t.id === active.id)
    if (!tarefaAtiva || tarefaAtiva.estado === novoEstado) return
    await handleUpdate(String(active.id), { estado: novoEstado })
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUNAS.map((col) => (
          <KanbanColuna
            key={col.id}
            id={col.id}
            label={col.label}
            tarefas={tarefasPorEstado[col.id] ?? []}
            onUpdate={handleUpdate}
            clienteId={clienteId}
            onRefresh={onRefresh}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTarefa && <TarefaCard tarefa={activeTarefa} />}
      </DragOverlay>
    </DndContext>
  )
}
