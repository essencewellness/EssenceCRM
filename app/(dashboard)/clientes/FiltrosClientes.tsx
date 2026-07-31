"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState, useTransition } from "react"
import { X, Zap } from "lucide-react"
import { ESTADO_CRM_CONFIG, TIPO_ETIQUETA_LABELS } from "@/lib/etiquetas"
import { criarCampanhaFromFiltro } from "./actions"
import type { EstadoCliente } from "@/lib/prisma-client"

interface EtiquetaOpcao { id: string; nome: string; cor: string; tipo: string }
interface TemplateOpcao { id: string; nome: string; texto: string }

interface Props {
  todasEtiquetas: EtiquetaOpcao[]
  templates: TemplateOpcao[]
  totalResultados: number
  etiquetasFiltro: string[]
  estadosFiltro: string[]
  inativoFiltro: string
}

const INATIVIDADE_OPCOES = [
  { value: "",   label: "Qualquer" },
  { value: "30", label: "< 30 dias" },
  { value: "60", label: "30–60 dias" },
  { value: "90", label: "60–90 dias" },
  { value: "91", label: "90+ dias" },
]

const ESTADOS_OPCOES = Object.entries(ESTADO_CRM_CONFIG) as [EstadoCliente, typeof ESTADO_CRM_CONFIG[string]][]

export function FiltrosClientes({ todasEtiquetas, templates, totalResultados, etiquetasFiltro, estadosFiltro, inativoFiltro }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [modalCampanha, setModalCampanha] = useState(false)
  const [nomeCampanha, setNomeCampanha] = useState("")
  const [templateId, setTemplateId] = useState("")
  const [isPending, startTransition] = useTransition()
  const [resultado, setResultado] = useState<{ totalCriadas: number; totalExcluidas: number } | null>(null)

  const etiquetasModo = (searchParams.get("etiquetas_modo") ?? "or") as "and" | "or"
  const temFiltros = etiquetasFiltro.length > 0 || estadosFiltro.length > 0 || !!inativoFiltro

  function atualizar(novoParams: Record<string, string | string[]>) {
    const params = new URLSearchParams(searchParams.toString())
    // limpar antes
    params.delete("etiquetas")
    params.delete("estados")
    params.delete("inativo")
    params.delete("etiquetas_modo")
    // aplicar novos
    for (const [k, v] of Object.entries(novoParams)) {
      if (Array.isArray(v)) { v.forEach(val => params.append(k, val)) }
      else if (v) { params.set(k, v) }
    }
    router.push(`/clientes?${params.toString()}`)
  }

  function toggleEtiqueta(id: string) {
    const nova = etiquetasFiltro.includes(id)
      ? etiquetasFiltro.filter(e => e !== id)
      : [...etiquetasFiltro, id]
    atualizar({ etiquetas: nova, estados: estadosFiltro, inativo: inativoFiltro, etiquetas_modo: etiquetasModo })
  }

  function toggleEtiquetasModo() {
    const novoModo = etiquetasModo === "or" ? "and" : "or"
    atualizar({ etiquetas: etiquetasFiltro, estados: estadosFiltro, inativo: inativoFiltro, etiquetas_modo: novoModo })
  }

  function toggleEstado(estado: string) {
    const novos = estadosFiltro.includes(estado)
      ? estadosFiltro.filter(e => e !== estado)
      : [...estadosFiltro, estado]
    atualizar({ etiquetas: etiquetasFiltro, estados: novos, inativo: inativoFiltro })
  }

  function limparTudo() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("etiquetas"); params.delete("estados"); params.delete("inativo")
    router.push(`/clientes?${params.toString()}`)
  }

  async function handleCriarCampanha() {
    if (!nomeCampanha.trim() || !templateId) return
    startTransition(async () => {
      const r = await criarCampanhaFromFiltro({
        nome: nomeCampanha,
        templateId,
        etiquetaIds: etiquetasFiltro,
        estados: estadosFiltro.length > 0 ? estadosFiltro as EstadoCliente[] : undefined,
      })
      setResultado({ totalCriadas: r.totalCriadas, totalExcluidas: r.totalExcluidas })
    })
  }

  // Agrupar etiquetas por tipo
  const etiquetasPorTipo: Record<string, EtiquetaOpcao[]> = {}
  for (const e of todasEtiquetas) {
    if (!etiquetasPorTipo[e.tipo]) etiquetasPorTipo[e.tipo] = []
    etiquetasPorTipo[e.tipo].push(e)
  }

  return (
    <div style={{ marginBottom: "20px" }}>
      {/* Filtros de etiquetas */}
      {Object.entries(etiquetasPorTipo).map(([tipo, tags]) => (
        <div key={tipo} style={{ marginBottom: "10px" }}>
          <p style={{
            fontSize: "8.5px", fontWeight: 700, letterSpacing: "0.18em",
            textTransform: "uppercase", color: "#9d9d9a",
            fontFamily: "var(--font-sans, sans-serif)", marginBottom: "6px",
          }}>
            {TIPO_ETIQUETA_LABELS[tipo]}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {tags.map(tag => {
              const ativo = etiquetasFiltro.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  onClick={() => toggleEtiqueta(tag.id)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "5px",
                    padding: "4px 10px", borderRadius: "100px", cursor: "pointer",
                    fontSize: "11px", fontFamily: "var(--font-sans, sans-serif)", fontWeight: 500,
                    color: tag.cor,
                    backgroundColor: ativo ? `${tag.cor}20` : "transparent",
                    border: `1px solid ${ativo ? tag.cor : tag.cor + "55"}`,
                    transition: "all 150ms",
                  }}
                >
                  {tag.nome}
                  {ativo && <X size={10} />}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {/* Toggle AND/OR para etiquetas — só visível quando há 2+ etiquetas selecionadas */}
      {etiquetasFiltro.length >= 2 && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
          <span style={{ fontSize: "10px", color: "#9d9d9a", fontFamily: "var(--font-sans, sans-serif)" }}>
            Mostrar clientes com
          </span>
          <button
            onClick={toggleEtiquetasModo}
            style={{
              display: "inline-flex", alignItems: "center", gap: "4px",
              padding: "3px 10px", borderRadius: "100px", cursor: "pointer",
              fontSize: "10px", fontWeight: 700, fontFamily: "var(--font-sans, sans-serif)",
              letterSpacing: "0.08em",
              color: etiquetasModo === "and" ? "#ffffff" : "#7a9e7e",
              backgroundColor: etiquetasModo === "and" ? "#7a9e7e" : "transparent",
              border: "1px solid #7a9e7e",
              transition: "all 150ms",
            }}
          >
            {etiquetasModo === "or" ? "QUALQUER tag (OR)" : "TODAS as tags (AND)"}
          </button>
        </div>
      )}

      {/* Filtro de estado CRM */}
      <div style={{ marginBottom: "10px" }}>
        <p style={{
          fontSize: "8.5px", fontWeight: 700, letterSpacing: "0.18em",
          textTransform: "uppercase", color: "#9d9d9a",
          fontFamily: "var(--font-sans, sans-serif)", marginBottom: "6px",
        }}>Estado CRM</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {ESTADOS_OPCOES.map(([estado, cfg]) => {
            const ativo = estadosFiltro.includes(estado)
            return (
              <button
                key={estado}
                onClick={() => toggleEstado(estado)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "5px",
                  padding: "4px 10px", borderRadius: "100px", cursor: "pointer",
                  fontSize: "11px", fontFamily: "var(--font-sans, sans-serif)", fontWeight: 500,
                  color: cfg.cor,
                  backgroundColor: ativo ? cfg.bg : "transparent",
                  border: `1px solid ${ativo ? cfg.border : cfg.cor + "30"}`,
                  transition: "all 150ms",
                }}
              >
                {cfg.label}
                {ativo && <X size={10} />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Filtro de inactividade */}
      <div style={{ marginBottom: "14px" }}>
        <p style={{
          fontSize: "8.5px", fontWeight: 700, letterSpacing: "0.18em",
          textTransform: "uppercase", color: "#9d9d9a",
          fontFamily: "var(--font-sans, sans-serif)", marginBottom: "6px",
        }}>Inactividade</p>
        <div style={{ display: "flex", gap: "6px" }}>
          {INATIVIDADE_OPCOES.map(({ value, label }) => {
            const ativo = inativoFiltro === value
            return (
              <button
                key={value}
                onClick={() => atualizar({ etiquetas: etiquetasFiltro, estados: estadosFiltro, inativo: value })}
                style={{
                  padding: "4px 12px", borderRadius: "100px", cursor: "pointer",
                  fontSize: "11px", fontFamily: "var(--font-sans, sans-serif)", fontWeight: 500,
                  color: ativo ? "#b9a07a" : "#9d9d9a",
                  backgroundColor: ativo ? "rgba(185,160,122,0.10)" : "transparent",
                  border: `1px solid ${ativo ? "rgba(185,160,122,0.40)" : "rgba(157,157,154,0.25)"}`,
                  transition: "all 150ms",
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Barra de acções */}
      {temFiltros && (
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", backgroundColor: "rgba(185,160,122,0.06)", borderRadius: "6px", border: "1px solid rgba(185,160,122,0.20)" }}>
          <Zap size={13} color="#b9a07a" />
          <span style={{ fontSize: "12px", fontFamily: "var(--font-sans, sans-serif)", color: "var(--nuit-bone-soft)", flex: 1 }}>
            <strong style={{ color: "var(--nuit-bone)" }}>{totalResultados}</strong> cliente{totalResultados !== 1 ? "s" : ""} encontrada{totalResultados !== 1 ? "s" : ""}
          </span>
          <button
            onClick={() => setModalCampanha(true)}
            disabled={totalResultados === 0}
            style={{
              padding: "6px 14px", borderRadius: "4px", cursor: totalResultados > 0 ? "pointer" : "not-allowed",
              fontSize: "11px", fontFamily: "var(--font-sans, sans-serif)", fontWeight: 600,
              letterSpacing: "0.06em", textTransform: "uppercase",
              color: "#fff", backgroundColor: "#b9a07a", border: "none",
              opacity: totalResultados > 0 ? 1 : 0.5,
            }}
          >
            Criar campanha
          </button>
          <button
            onClick={limparTudo}
            style={{
              padding: "6px 10px", borderRadius: "4px", cursor: "pointer",
              fontSize: "11px", fontFamily: "var(--font-sans, sans-serif)",
              color: "var(--nuit-bone-soft)", backgroundColor: "transparent", border: "1px solid rgba(212,184,134,0.20)",
            }}
          >
            Limpar filtros
          </button>
        </div>
      )}

      {/* Modal de criação de campanha */}
      {modalCampanha && (
        <div style={{
          position: "fixed", inset: 0, backgroundColor: "rgba(22,26,38,0.5)",
          zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center",
        }}
          onClick={e => { if (e.target === e.currentTarget && !resultado) setModalCampanha(false) }}
        >
          <div style={{
            backgroundColor: "var(--nuit-overlay)", borderRadius: "8px", padding: "28px",
            width: "100%", maxWidth: "420px", boxShadow: "0 16px 48px rgba(14,17,25,0.50)",
            border: "1px solid rgba(212,184,134,0.16)",
          }}>
            {resultado ? (
              /* Estado de sucesso */
              <>
                <h3 style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "20px", color: "var(--nuit-bone)", marginBottom: "12px" }}>
                  Campanha criada!
                </h3>
                <p style={{ fontSize: "14px", color: "var(--nuit-bone-soft)", fontFamily: "var(--font-body, sans-serif)", marginBottom: "8px" }}>
                  <strong style={{ color: "var(--nuit-bone)" }}>{resultado.totalCriadas}</strong> mensagens criadas e aguardam aprovação.
                </p>
                {resultado.totalExcluidas > 0 && (
                  <p style={{ fontSize: "12px", color: "#b06050", fontFamily: "var(--font-sans, sans-serif)" }}>
                    ⚕ {resultado.totalExcluidas} cliente{resultado.totalExcluidas > 1 ? "s excluídas" : " excluída"} (restrição de saúde)
                  </p>
                )}
                <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                  <button
                    onClick={() => { setModalCampanha(false); setResultado(null); setNomeCampanha(""); setTemplateId("") }}
                    style={{ flex: 1, padding: "9px", borderRadius: "4px", fontSize: "13px", fontFamily: "var(--font-sans, sans-serif)", border: "1px solid rgba(212,184,134,0.20)", color: "var(--nuit-bone-soft)", cursor: "pointer", backgroundColor: "transparent" }}
                  >
                    Fechar
                  </button>
                  <a
                    href="/mensagens"
                    style={{ flex: 1, padding: "9px", borderRadius: "4px", fontSize: "13px", fontFamily: "var(--font-sans, sans-serif)", fontWeight: 600, border: "none", color: "#fff", backgroundColor: "#b9a07a", cursor: "pointer", textAlign: "center", textDecoration: "none" }}
                  >
                    Ver mensagens
                  </a>
                </div>
              </>
            ) : (
              /* Formulário */
              <>
                <h3 style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "20px", color: "var(--nuit-bone)", marginBottom: "18px" }}>
                  Nova Campanha WhatsApp
                </h3>

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#9d9d9a", fontFamily: "var(--font-sans, sans-serif)", display: "block", marginBottom: "6px" }}>
                    Nome da campanha
                  </label>
                  <input
                    value={nomeCampanha}
                    onChange={e => setNomeCampanha(e.target.value)}
                    placeholder="Ex.: Campanha Junho — Massagem de Casal"
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "4px", border: "1px solid rgba(212,184,134,0.22)", fontSize: "13px", fontFamily: "var(--font-sans, sans-serif)", color: "var(--nuit-bone)", backgroundColor: "var(--nuit-midnight)", outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#9d9d9a", fontFamily: "var(--font-sans, sans-serif)", display: "block", marginBottom: "6px" }}>
                    Template de mensagem
                  </label>
                  <select
                    value={templateId}
                    onChange={e => setTemplateId(e.target.value)}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "4px", border: "1px solid rgba(212,184,134,0.22)", fontSize: "13px", fontFamily: "var(--font-sans, sans-serif)", color: "var(--nuit-bone)", outline: "none", backgroundColor: "var(--nuit-midnight)" }}
                  >
                    <option value="">Seleccionar template…</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.nome}</option>
                    ))}
                  </select>
                </div>

                <p style={{ fontSize: "12px", color: "var(--nuit-bone-soft)", fontFamily: "var(--font-sans, sans-serif)", marginBottom: "18px" }}>
                  {totalResultados} cliente{totalResultados !== 1 ? "s" : ""} receberá{totalResultados !== 1 ? "m" : ""} esta mensagem (clientes com restrições de saúde serão excluídas automaticamente).
                </p>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={() => setModalCampanha(false)}
                    style={{ flex: 1, padding: "9px", borderRadius: "4px", fontSize: "13px", fontFamily: "var(--font-sans, sans-serif)", border: "1px solid rgba(212,184,134,0.20)", color: "var(--nuit-bone-soft)", cursor: "pointer", backgroundColor: "transparent" }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCriarCampanha}
                    disabled={!nomeCampanha.trim() || !templateId || isPending}
                    style={{ flex: 1, padding: "9px", borderRadius: "4px", fontSize: "13px", fontFamily: "var(--font-sans, sans-serif)", fontWeight: 600, border: "none", color: "#fff", backgroundColor: "#b9a07a", cursor: nomeCampanha.trim() && templateId ? "pointer" : "not-allowed", opacity: nomeCampanha.trim() && templateId ? 1 : 0.5 }}
                  >
                    {isPending ? "A criar…" : "Criar campanha"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
