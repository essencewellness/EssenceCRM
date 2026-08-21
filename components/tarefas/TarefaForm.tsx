"use client"
import { useState } from "react"
import { Plus } from "lucide-react"

interface TarefaFormProps {
  clienteId?: string
  onCreated?: () => void
  compact?: boolean
}

export function TarefaForm({ clienteId, onCreated, compact = false }: TarefaFormProps) {
  const [show, setShow] = useState(false)
  const [titulo, setTitulo] = useState("")
  const [tipo, setTipo] = useState("follow_up")
  const [prioridade, setPrioridade] = useState("normal")
  const [dataLimite, setDataLimite] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) return
    setLoading(true)
    try {
      await fetch("/api/v1/tarefas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": process.env.NEXT_PUBLIC_API_KEY ?? "",
        },
        body: JSON.stringify({
          titulo: titulo.trim(),
          tipo,
          prioridade,
          ...(clienteId ? { clienteId } : {}),
          ...(dataLimite ? { dataLimite } : {}),
        }),
      })
      setTitulo("")
      setDataLimite("")
      setShow(false)
      onCreated?.()
    } finally {
      setLoading(false)
    }
  }

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="flex items-center gap-1.5 text-sm text-[var(--nuit-bone-soft)] hover:text-[var(--nuit-champagne)] transition-colors cursor-pointer py-2"
      >
        <Plus className="w-4 h-4" />
        {compact ? "Nova tarefa" : "Adicionar tarefa..."}
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--nuit-overlay)] rounded-xl p-4 border border-[rgba(185,160,122,0.3)] shadow-sm space-y-3">
      <input
        autoFocus
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Título da tarefa..."
        className="w-full text-sm border-0 outline-none focus:ring-0 bg-transparent text-[var(--nuit-bone)] placeholder:text-[var(--nuit-bone-soft)]"
        onKeyDown={(e) => { if (e.key === "Escape") setShow(false) }}
      />
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className="text-xs border border-[rgba(212,184,134,0.16)] bg-[var(--nuit-midnight)] rounded-lg px-2 py-1 text-[var(--nuit-bone-soft)] focus:outline-none cursor-pointer"
        >
          <option value="follow_up">Follow-up</option>
          <option value="ligacao">Ligação</option>
          <option value="mensagem">Mensagem</option>
          <option value="nota">Nota</option>
          <option value="outro">Outro</option>
        </select>
        <select
          value={prioridade}
          onChange={(e) => setPrioridade(e.target.value)}
          className="text-xs border border-[rgba(212,184,134,0.16)] bg-[var(--nuit-midnight)] rounded-lg px-2 py-1 text-[var(--nuit-bone-soft)] focus:outline-none cursor-pointer"
        >
          <option value="baixa">Baixa</option>
          <option value="normal">Normal</option>
          <option value="alta">Alta</option>
          <option value="urgente">Urgente</option>
        </select>
        <input
          type="date"
          value={dataLimite}
          onChange={(e) => setDataLimite(e.target.value)}
          className="text-xs border border-[rgba(212,184,134,0.16)] bg-[var(--nuit-midnight)] rounded-lg px-2 py-1 text-[var(--nuit-bone-soft)] focus:outline-none cursor-pointer"
        />
        <div className="flex gap-2 ml-auto">
          <button
            type="button"
            onClick={() => setShow(false)}
            className="text-xs text-[var(--nuit-bone-soft)] hover:text-[var(--nuit-bone-soft)] cursor-pointer px-2 py-1"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!titulo.trim() || loading}
            className="text-xs font-medium bg-[var(--nuit-champagne-soft)] text-[var(--nuit-midnight)] rounded-lg px-3 py-1 hover:bg-[var(--nuit-champagne)] transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? "A criar..." : "Criar"}
          </button>
        </div>
      </div>
    </form>
  )
}
