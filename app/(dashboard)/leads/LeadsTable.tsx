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
  referencia: "Indicação",
  instagram: "Instagram",
  google: "Google",
  parceiro: "Parceiro",
  manual: "Manual",
  formulario: "Formulário",
}

// "Como nos conheceu" é texto livre (ex: "Comprou voucher EWD2026-07 para
// bg", "Formulário Drenagem") — agrupar por padrão em vez de filtrar pelo
// valor exato, senão cada compra de voucher vira o seu próprio filtro
// (código único) e a lista de origens nunca mais pára de crescer.
function origemGrupo(comoNosConheceu: string | null): { chave: string; label: string } {
  if (!comoNosConheceu) return { chave: "sem-origem", label: "Sem origem" }
  const raw = comoNosConheceu.trim()
  if (/^comprou voucher/i.test(raw)) return { chave: "voucher", label: "Voucher" }
  if (/^formul[aá]rio/i.test(raw)) return { chave: "formulario", label: "Formulário" }
  const chaveConhecida = raw.toLowerCase()
  if (ORIGEM_LABELS[chaveConhecida]) return { chave: chaveConhecida, label: ORIGEM_LABELS[chaveConhecida] }
  return { chave: chaveConhecida, label: raw.charAt(0).toUpperCase() + raw.slice(1) }
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
  const [filtroOrigem, setFiltroOrigem] = useState<string | null>(null)

  // Chips de origem construídos a partir dos dados reais (nunca uma lista
  // fixa) — cada grupo mostra quantas leads tem, para se ver logo qual vale
  // a pena usar numa campanha.
  const origens = (() => {
    const contagem = new Map<string, { label: string; total: number }>()
    for (const l of leads) {
      const { chave, label } = origemGrupo(l.comoNosConheceu)
      const atual = contagem.get(chave)
      contagem.set(chave, { label, total: (atual?.total ?? 0) + 1 })
    }
    return Array.from(contagem.entries())
      .map(([chave, v]) => ({ chave, ...v }))
      .sort((a, b) => b.total - a.total)
  })()

  const leadsFiltradas = filtroOrigem
    ? leads.filter((l) => origemGrupo(l.comoNosConheceu).chave === filtroOrigem)
    : leads

  const todosSelec = selecionados.length === leadsFiltradas.length && leadsFiltradas.length > 0

  function onToggle(id: string) {
    setSelecionados((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }
  function onToggleTodos() {
    setSelecionados(todosSelec ? [] : leadsFiltradas.map((l) => l.id))
  }
  function onFiltrarOrigem(chave: string) {
    setFiltroOrigem((atual) => (atual === chave ? null : chave))
    setSelecionados([])
  }

  return (
    <>
      {origens.length > 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "14px" }}>
          <button
            type="button"
            onClick={() => { setFiltroOrigem(null); setSelecionados([]) }}
            style={{
              padding: "6px 13px", borderRadius: "100px", cursor: "pointer",
              fontFamily: "var(--font-sans, sans-serif)", fontSize: "calc(11.5px * var(--ui-font-scale))", fontWeight: 600,
              border: `1px solid ${filtroOrigem === null ? "var(--nuit-champagne)" : "rgba(185,160,122,0.3)"}`,
              backgroundColor: filtroOrigem === null ? "rgba(212,184,134,0.14)" : "transparent",
              color: filtroOrigem === null ? "var(--nuit-champagne)" : "var(--nuit-bone-soft)",
            }}
          >
            Todas · {leads.length}
          </button>
          {origens.map(({ chave, label, total }) => (
            <button
              key={chave}
              type="button"
              onClick={() => onFiltrarOrigem(chave)}
              style={{
                padding: "6px 13px", borderRadius: "100px", cursor: "pointer",
                fontFamily: "var(--font-sans, sans-serif)", fontSize: "calc(11.5px * var(--ui-font-scale))", fontWeight: 600,
                border: `1px solid ${filtroOrigem === chave ? "var(--nuit-champagne)" : "rgba(185,160,122,0.3)"}`,
                backgroundColor: filtroOrigem === chave ? "rgba(212,184,134,0.14)" : "transparent",
                color: filtroOrigem === chave ? "var(--nuit-champagne)" : "var(--nuit-bone-soft)",
              }}
            >
              {label} · {total}
            </button>
          ))}
        </div>
      )}

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
                  fontFamily: "var(--font-sans, sans-serif)", fontSize: "calc(9.5px * var(--ui-font-scale))", fontWeight: 700,
                  letterSpacing: "0.16em", textTransform: "uppercase",
                  color: "var(--nuit-bone-soft)", backgroundColor: "rgba(212,184,134,0.06)",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leadsFiltradas.map((lead, idx) => {
              const isSelec = selecionados.includes(lead.id)
              return (
                <tr
                  key={lead.id}
                  style={{
                    borderBottom: idx < leadsFiltradas.length - 1 ? "1px solid rgba(212,184,134,0.10)" : "none",
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
                    <Link href={`/clientes/${lead.id}`} style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "calc(13px * var(--ui-font-scale))", fontWeight: 700, color: "var(--nuit-bone)", textDecoration: "none" }}>
                      {lead.nome}
                    </Link>
                  </td>
                  <td style={{ padding: "13px 16px", fontFamily: "var(--font-body, sans-serif)", fontSize: "calc(13px * var(--ui-font-scale))", color: "var(--nuit-bone-soft)" }}>
                    {formatPhone(lead.telefone)}
                  </td>
                  <td style={{ padding: "13px 16px", fontFamily: "var(--font-body, sans-serif)", fontSize: "calc(13px * var(--ui-font-scale))", color: "var(--nuit-bone-soft)" }}>
                    {lead.email ?? "—"}
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    {lead.comoNosConheceu ? (
                      <span style={{
                        padding: "3px 9px", fontSize: "calc(9.5px * var(--ui-font-scale))", fontWeight: 600, letterSpacing: "0.08em",
                        textTransform: "uppercase", fontFamily: "var(--font-sans, sans-serif)",
                        color: "var(--nuit-champagne-soft)", border: "1px solid rgba(185,160,122,0.35)",
                      }}>
                        {ORIGEM_LABELS[lead.comoNosConheceu] ?? lead.comoNosConheceu}
                      </span>
                    ) : "—"}
                  </td>
                  <td style={{ padding: "13px 16px", fontFamily: "var(--font-body, sans-serif)", fontSize: "calc(13px * var(--ui-font-scale))", color: "var(--nuit-bone-soft)" }}>
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
