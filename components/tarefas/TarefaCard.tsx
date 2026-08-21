"use client"
import { useState } from "react"
import { CheckSquare, X, Calendar, User } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

const PRIORIDADE_CLASSES: Record<string, string> = {
  urgente: "border-l-4 border-red-500",
  alta:    "border-l-4 border-orange-400",
  normal:  "border-l-4 border-[var(--nuit-champagne-soft)]",
  baixa:   "border-l-4 border-[var(--nuit-smoke-deep)]",
}

const PRIORIDADE_BADGE: Record<string, string> = {
  urgente: "bg-red-500/15 text-red-300",
  alta:    "bg-orange-500/15 text-orange-300",
  normal:  "bg-[rgba(185,160,122,0.15)] text-[var(--nuit-champagne)]",
  baixa:   "bg-[rgba(122,126,138,0.15)] text-[#9aa0ad]",
}

interface TarefaCardProps {
  tarefa: {
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
  onUpdate?: (id: string, dados: { estado?: string; titulo?: string; descricao?: string | null }) => Promise<void>
}

export function TarefaCard({ tarefa, onUpdate }: TarefaCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)

  const dataLimite = tarefa.dataLimite ? new Date(tarefa.dataLimite) : null
  const vencida = dataLimite && dataLimite < new Date() && tarefa.estado === "pendente"

  async function marcarConcluida() {
    if (!onUpdate) return
    setLoading(true)
    await onUpdate(tarefa.id, { estado: "concluida" })
    setLoading(false)
  }

  async function cancelar() {
    if (!onUpdate) return
    setLoading(true)
    await onUpdate(tarefa.id, { estado: "cancelada" })
    setLoading(false)
  }

  return (
    <div
      className={`bg-[var(--nuit-overlay)] rounded-xl p-4 shadow-sm border border-[rgba(212,184,134,0.12)] cursor-pointer transition-shadow hover:shadow-md ${PRIORIDADE_CLASSES[tarefa.prioridade] ?? "border-l-4 border-[var(--nuit-smoke-deep)]"}`}
      onClick={() => setExpanded((p) => !p)}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORIDADE_BADGE[tarefa.prioridade]}`}>
              {tarefa.prioridade}
            </span>
            <span className="font-medium text-sm text-[var(--nuit-bone)] truncate">{tarefa.titulo}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--nuit-bone-soft)] flex-wrap">
            {tarefa.cliente && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {tarefa.cliente.nome}
              </span>
            )}
            {dataLimite && (
              <span className={`flex items-center gap-1 ${vencida ? "text-red-500 font-medium" : ""}`}>
                <Calendar className="w-3 h-3" />
                {formatDistanceToNow(dataLimite, { addSuffix: true, locale: ptBR })}
              </span>
            )}
          </div>
        </div>
        {tarefa.estado === "pendente" && (
          <button
            onClick={(e) => { e.stopPropagation(); marcarConcluida() }}
            disabled={loading}
            className="text-[var(--nuit-smoke-deep)] hover:text-[#7a9e7e] transition-colors cursor-pointer shrink-0"
            title="Marcar como concluída"
          >
            <CheckSquare className="w-5 h-5" />
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-[rgba(212,184,134,0.1)]" onClick={(e) => e.stopPropagation()}>
          {tarefa.descricao && (
            <p className="text-sm text-[var(--nuit-bone-soft)] mb-3">{tarefa.descricao}</p>
          )}
          <div className="flex items-center gap-2 text-xs text-[var(--nuit-bone-soft)] mb-3">
            <span>Tipo: {tarefa.tipo.replace("_", " ")}</span>
            {tarefa.atribuida?.name && <span>· Atribuída a: {tarefa.atribuida.name}</span>}
          </div>
          {tarefa.estado !== "concluida" && tarefa.estado !== "cancelada" && (
            <div className="flex items-center gap-2">
              <button
                onClick={marcarConcluida}
                disabled={loading}
                className="flex items-center gap-1 text-xs font-medium text-[#7a9e7e] hover:text-[#9ab89e] cursor-pointer"
              >
                <CheckSquare className="w-3.5 h-3.5" /> Concluir
              </button>
              <button
                onClick={cancelar}
                disabled={loading}
                className="flex items-center gap-1 text-xs font-medium text-[var(--nuit-bone-soft)] hover:text-red-400 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Cancelar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
