"use client"
import { useState } from "react"
import { Tag, X, Plus, Trash2, Send } from "lucide-react"
import { BulkDeleteModal } from "@/components/clientes/BulkDeleteModal"
import { CampanhaSelecaoModal } from "@/components/clientes/CampanhaSelecaoModal"

interface Etiqueta {
  id: string
  nome: string
  cor: string
}

interface TemplateOpcao { id: string; nome: string; texto: string }

interface BulkActionsBarProps {
  selecionados: string[]
  etiquetas: Etiqueta[]
  templates?: TemplateOpcao[]
  podeGerirCampanhas?: boolean
  onClear: () => void
  onRefresh: () => void
}

export function BulkActionsBar({ selecionados, etiquetas, templates = [], podeGerirCampanhas = false, onClear, onRefresh }: BulkActionsBarProps) {
  const [loading, setLoading] = useState(false)
  const [mostrarEtiquetas, setMostrarEtiquetas] = useState(false)
  const [acaoEtiqueta, setAcaoEtiqueta] = useState<"aplicar" | "remover">("aplicar")
  const [mostrarDeleteModal, setMostrarDeleteModal] = useState(false)
  const [mostrarCampanhaModal, setMostrarCampanhaModal] = useState(false)

  if (selecionados.length === 0) return null

  async function executarBulkEtiqueta(etiquetaId: string) {
    setLoading(true)
    try {
      await fetch("/api/v1/clientes/bulk-etiquetas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      <div style={{ backgroundColor: "var(--nuit-overlay)", border: "1px solid rgba(212,184,134,0.22)", boxShadow: "0 8px 32px rgba(14,17,25,0.50)", borderRadius: "16px" }} className="text-white px-5 py-3 flex items-center gap-3">
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

        {podeGerirCampanhas && (
          <>
            <div className="w-px h-5 bg-white/20" />
            <button
              onClick={() => setMostrarCampanhaModal(true)}
              className="flex items-center gap-1.5 text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              Criar campanha
            </button>
          </>
        )}

        <div className="w-px h-5 bg-white/20" />

        {/* Eliminar selecionados */}
        <button
          onClick={() => setMostrarDeleteModal(true)}
          style={{ color: "var(--destructive)" }}
          className="flex items-center gap-1.5 text-sm bg-[rgba(176,96,80,0.10)] hover:bg-[rgba(176,96,80,0.20)] px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Eliminar selecionados
        </button>

        <div className="w-px h-5 bg-white/20" />

        <button
          onClick={onClear}
          className="text-white/70 hover:text-white cursor-pointer transition-colors"
          title="Cancelar seleção"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {mostrarDeleteModal && (
        <BulkDeleteModal
          clienteIds={selecionados}
          onClose={() => setMostrarDeleteModal(false)}
          onSuccess={() => {
            setMostrarDeleteModal(false)
            onClear()
            onRefresh()
          }}
        />
      )}

      {mostrarCampanhaModal && (
        <CampanhaSelecaoModal
          clienteIds={selecionados}
          templates={templates}
          onClose={() => setMostrarCampanhaModal(false)}
          onSuccess={() => {
            setMostrarCampanhaModal(false)
            onClear()
            onRefresh()
          }}
        />
      )}
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
      <div style={{ backgroundColor: "var(--nuit-overlay)", border: "1px solid rgba(212,184,134,0.30)", boxShadow: "0 12px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.30)" }} className="absolute bottom-full mb-2 left-0 z-20 rounded-xl py-1 min-w-44">
        {etiquetas.length === 0 && (
          <p style={{ color: "var(--nuit-bone-soft)" }} className="text-xs px-3 py-2">Nenhuma etiqueta</p>
        )}
        {etiquetas.map((e) => (
          <button
            key={e.id}
            onClick={() => onSelect(e.id)}
            disabled={loading}
            style={{ color: "var(--nuit-bone)" }}
            className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm hover:bg-[rgba(212,184,134,0.06)] cursor-pointer transition-colors"
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
