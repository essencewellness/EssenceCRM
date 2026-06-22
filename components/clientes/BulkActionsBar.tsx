"use client"
import { useState } from "react"
import { Tag, X, Plus } from "lucide-react"

interface Etiqueta {
  id: string
  nome: string
  cor: string
}

interface BulkActionsBarProps {
  selecionados: string[]
  etiquetas: Etiqueta[]
  onClear: () => void
  onRefresh: () => void
}

export function BulkActionsBar({ selecionados, etiquetas, onClear, onRefresh }: BulkActionsBarProps) {
  const [loading, setLoading] = useState(false)
  const [mostrarEtiquetas, setMostrarEtiquetas] = useState(false)
  const [acaoEtiqueta, setAcaoEtiqueta] = useState<"aplicar" | "remover">("aplicar")

  if (selecionados.length === 0) return null

  async function executarBulkEtiqueta(etiquetaId: string) {
    setLoading(true)
    try {
      await fetch("/api/v1/clientes/bulk-etiquetas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": process.env.NEXT_PUBLIC_API_KEY ?? "",
        },
        body: JSON.stringify({ clienteIds: selecionados, etiquetaId, acao: acaoEtiqueta }),
      })
      setMostrarEtiquetas(false)
      onClear()
      onRefresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 w-auto">
      <div className="bg-[#064E3B] text-white rounded-2xl shadow-xl px-5 py-3 flex items-center gap-3">
        <span className="text-sm font-medium">
          {selecionados.length} {selecionados.length === 1 ? "cliente" : "clientes"}
        </span>

        <div className="w-px h-5 bg-white/20" />

        {/* Aplicar tag */}
        <div className="relative">
          <button
            onClick={() => { setAcaoEtiqueta("aplicar"); setMostrarEtiquetas((p) => !p) }}
            className="flex items-center gap-1.5 text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Aplicar tag
          </button>
          {mostrarEtiquetas && acaoEtiqueta === "aplicar" && (
            <EtiquetasDropdown
              etiquetas={etiquetas}
              onSelect={executarBulkEtiqueta}
              loading={loading}
              onClose={() => setMostrarEtiquetas(false)}
            />
          )}
        </div>

        {/* Remover tag */}
        <div className="relative">
          <button
            onClick={() => { setAcaoEtiqueta("remover"); setMostrarEtiquetas((p) => !p) }}
            className="flex items-center gap-1.5 text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <Tag className="w-3.5 h-3.5" />
            Remover tag
          </button>
          {mostrarEtiquetas && acaoEtiqueta === "remover" && (
            <EtiquetasDropdown
              etiquetas={etiquetas}
              onSelect={executarBulkEtiqueta}
              loading={loading}
              onClose={() => setMostrarEtiquetas(false)}
            />
          )}
        </div>

        <div className="w-px h-5 bg-white/20" />

        <button
          onClick={onClear}
          className="text-white/70 hover:text-white cursor-pointer transition-colors"
          title="Cancelar seleção"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function EtiquetasDropdown({
  etiquetas, onSelect, loading, onClose,
}: {
  etiquetas: Etiqueta[]
  onSelect: (id: string) => void
  loading: boolean
  onClose: () => void
}) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute bottom-full mb-2 left-0 z-20 bg-white rounded-xl shadow-xl border border-gray-100 py-1 min-w-44">
        {etiquetas.length === 0 && (
          <p className="text-xs text-gray-400 px-3 py-2">Nenhuma etiqueta</p>
        )}
        {etiquetas.map((e) => (
          <button
            key={e.id}
            onClick={() => onSelect(e.id)}
            disabled={loading}
            className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: e.cor }}
            />
            {e.nome}
          </button>
        ))}
      </div>
    </>
  )
}
