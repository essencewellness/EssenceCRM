"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { X, Send } from "lucide-react"
import { formatPhone } from "@/lib/utils"
import { CampanhaSelecaoModal } from "@/components/clientes/CampanhaSelecaoModal"

interface TemplateOpcao { id: string; nome: string; texto: string }

interface LeadRow {
  id: string
  nome: string
  email: string | null
  telefone: string | null
  comoNosConheceu: string | null
  criadoEm: string
}

const ORIGEM_LABELS: Record<string, string> = {
  indicacao: "Indicação",
  instagram: "Instagram",
  google: "Google",
  parceiro: "Parceiro",
  manual: "Manual",
  formulario: "Formulário",
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short" }).format(new Date(iso))
}

export function LeadsTable({
  leads, templates, podeGerirCampanhas,
}: {
  leads: LeadRow[]
  templates: TemplateOpcao[]
  podeGerirCampanhas: boolean
}) {
  const router = useRouter()
  const [selecionados, setSelecionados] = useState<string[]>([])
  const [mostrarCampanhaModal, setMostrarCampanhaModal] = useState(false)

  const todosSelec = selecionados.length === leads.length && leads.length > 0

  function onToggle(id: string) {
    setSelecionados((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }
  function onToggleTodos() {
    setSelecionados(todosSelec ? [] : leads.map((l) => l.id))
  }

  return (
    <>
      <div style={{ border: "1px solid rgba(212,184,134,0.12)", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "540px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(212,184,134,0.12)" }}>
              {podeGerirCampanhas && (
                <th style={{ padding: "11px 16px", width: "40px", backgroundColor: "rgba(212,184,134,0.06)" }}>
                  <input
                    type="checkbox"
                    checked={todosSelec}
                    onChange={onToggleTodos}
                    className="cursor-pointer accent-[var(--nuit-champagne-soft)] w-4 h-4"
                  />
                </th>
              )}
              {["Nome", "Telefone", "Email", "Origem", "Desde"].map((h) => (
                <th key={h} style={{
                  padding: "11px 16px", textAlign: "left",
                  fontFamily: "var(--font-sans, sans-serif)", fontSize: "9.5px", fontWeight: 700,
                  letterSpacing: "0.16em", textTransform: "uppercase",
                  color: "var(--nuit-bone-soft)", backgroundColor: "rgba(212,184,134,0.06)",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.map((lead, idx) => {
              const isSelec = selecionados.includes(lead.id)
              return (
                <tr
                  key={lead.id}
                  style={{
                    borderBottom: idx < leads.length - 1 ? "1px solid rgba(212,184,134,0.10)" : "none",
                    backgroundColor: isSelec ? "rgba(185,160,122,0.10)" : undefined,
                  }}
                >
                  {podeGerirCampanhas && (
                    <td style={{ padding: "13px 16px", width: "40px" }} onClick={() => onToggle(lead.id)}>
                      <input
                        type="checkbox"
                        checked={isSelec}
                        onChange={() => onToggle(lead.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="cursor-pointer accent-[var(--nuit-champagne-soft)] w-4 h-4"
                      />
                    </td>
                  )}
                  <td style={{ padding: "13px 16px" }}>
                    <Link href={`/clientes/${lead.id}`} style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "13px", fontWeight: 700, color: "var(--nuit-bone)", textDecoration: "none" }}>
                      {lead.nome}
                    </Link>
                  </td>
                  <td style={{ padding: "13px 16px", fontFamily: "var(--font-body, sans-serif)", fontSize: "13px", color: "var(--nuit-bone-soft)" }}>
                    {formatPhone(lead.telefone)}
                  </td>
                  <td style={{ padding: "13px 16px", fontFamily: "var(--font-body, sans-serif)", fontSize: "13px", color: "var(--nuit-bone-soft)" }}>
                    {lead.email ?? "—"}
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    {lead.comoNosConheceu ? (
                      <span style={{
                        padding: "3px 9px", fontSize: "9.5px", fontWeight: 600, letterSpacing: "0.08em",
                        textTransform: "uppercase", fontFamily: "var(--font-sans, sans-serif)",
                        color: "var(--nuit-champagne-soft)", border: "1px solid rgba(185,160,122,0.35)",
                      }}>
                        {ORIGEM_LABELS[lead.comoNosConheceu] ?? lead.comoNosConheceu}
                      </span>
                    ) : "—"}
                  </td>
                  <td style={{ padding: "13px 16px", fontFamily: "var(--font-body, sans-serif)", fontSize: "13px", color: "var(--nuit-bone-soft)" }}>
                    {formatDate(lead.criadoEm)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {podeGerirCampanhas && selecionados.length > 0 && (
        <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 w-auto">
          <div style={{ backgroundColor: "var(--nuit-overlay)", border: "1px solid rgba(212,184,134,0.22)", boxShadow: "0 8px 32px rgba(14,17,25,0.50)", borderRadius: "16px" }} className="text-white px-5 py-3 flex items-center gap-3">
            <span className="text-sm font-medium">
              {selecionados.length} {selecionados.length === 1 ? "lead" : "leads"}
            </span>
            <div className="w-px h-5 bg-white/20" />
            <button
              onClick={() => setMostrarCampanhaModal(true)}
              className="flex items-center gap-1.5 text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              Criar campanha
            </button>
            <div className="w-px h-5 bg-white/20" />
            <button
              onClick={() => setSelecionados([])}
              className="text-white/70 hover:text-white cursor-pointer transition-colors"
              title="Cancelar seleção"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {mostrarCampanhaModal && (
        <CampanhaSelecaoModal
          clienteIds={selecionados}
          templates={templates}
          onClose={() => setMostrarCampanhaModal(false)}
          onSuccess={() => {
            setMostrarCampanhaModal(false)
            setSelecionados([])
            router.refresh()
          }}
        />
      )}
    </>
  )
}
