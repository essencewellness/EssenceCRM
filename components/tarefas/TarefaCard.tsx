"use client"
import { useState } from "react"
import { CheckSquare, X, Calendar, User, Share2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Terapeuta {
  id: string
  name: string | null
}

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
  onUpdate?: (id: string, dados: { estado?: string; titulo?: string; descricao?: string | null; atribuidaA?: string | null }) => Promise<void>
  // Só não-vazio quando a sessão pode atribuir a qualquer terapeuta (admin
  // ou Bea, ver lib/contexto-utilizador.ts) — mostra o seletor "Partilhar
  // com" para passar a tarefa a outra pessoa. Sem esta lista, o cartão só
  // mostra a quem já está atribuída, sem forma de mudar.
  terapeutas?: Terapeuta[]
}

export function TarefaCard({ tarefa, onUpdate, terapeutas = [] }: TarefaCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [partilhando, setPartilhando] = useState(false)

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

  async function partilharCom(novaTerapeutaId: string) {
    if (!onUpdate || !novaTerapeutaId) return
    setLoading(true)
    await onUpdate(tarefa.id, { atribuidaA: novaTerapeutaId })
    setLoading(false)
    setPartilhando(false)
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
            className={`text-[var(--nuit-smoke-deep)] hover:text-[#7a9e7e] transition-colors shrink-0 ${loading ? "opacity-40 cursor-wait animate-pulse" : "cursor-pointer"}`}
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
          <div className="flex items-center gap-2 text-xs text-[var(--nuit-bone-soft)] mb-3 flex-wrap">
            <span>Tipo: {tarefa.tipo.replace("_", " ")}</span>
            {tarefa.atribuida?.name && <span>· Atribuída a: {tarefa.atribuida.name}</span>}
            {terapeutas.length > 0 && tarefa.estado !== "concluida" && tarefa.estado !== "cancelada" && (
              partilhando ? (
                <select
                  autoFocus
                  disabled={loading}
                  defaultValue=""
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => partilharCom(e.target.value)}
                  onBlur={() => setPartilhando(false)}
                  className="text-xs border border-[rgba(212,184,134,0.25)] bg-[var(--nuit-midnight)] rounded-md px-1.5 py-0.5 text-[var(--nuit-bone-soft)] focus:outline-none cursor-pointer"
                >
                  <option value="" disabled>Escolher pessoa…</option>
                  {terapeutas.filter((t) => t.id !== tarefa.atribuida?.id).map((t) => (
                    <option key={t.id} value={t.id}>{t.name ?? "—"}</option>
                  ))}
                </select>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); setPartilhando(true) }}
                  className="flex items-center gap-1 text-[var(--nuit-champagne-soft)] hover:text-[var(--nuit-champagne)] cursor-pointer"
                >
                  <Share2 className="w-3 h-3" /> Partilhar
                </button>
              )
            )}
          </div>
          {tarefa.estado !== "concluida" && tarefa.estado !== "cancelada" && (
            <div className="flex items-center gap-2">
              <button
                onClick={marcarConcluida}
                disabled={loading}
                className={`flex items-center gap-1 text-xs font-medium text-[#7a9e7e] hover:text-[#9ab89e] ${loading ? "opacity-40 cursor-wait" : "cursor-pointer"}`}
              >
                <CheckSquare className="w-3.5 h-3.5" /> {loading ? "A guardar…" : "Concluir"}
              </button>
              <button
                onClick={cancelar}
                disabled={loading}
                className={`flex items-center gap-1 text-xs font-medium text-[var(--nuit-bone-soft)] hover:text-red-400 ${loading ? "opacity-40 cursor-wait" : "cursor-pointer"}`}
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
