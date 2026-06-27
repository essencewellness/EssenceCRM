"use client"

import Link from "next/link"
import { useState } from "react"
import { motion } from "motion/react"
import { calcularTagActividade } from "@/lib/etiquetas"
import { BulkActionsBar } from "@/components/clientes/BulkActionsBar"

interface Etiqueta { id: string; nome: string; cor: string; tipo: string; bloqueiaAutomacoes: boolean }
interface ClienteRow {
  id: string
  nome: string
  telefone: string | null
  email: string | null
  ultimaSessao: string | null
  totalSessoes: number
  proximaSessaoData: string | null
  totalGasto: number
  estado: string
  etiquetas: { etiqueta: Etiqueta }[]
}

function getInitials(nome: string) {
  const p = nome.trim().split(" ")
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase()
  return (p[0][0] + p[p.length - 1][0]).toUpperCase()
}

function formatPhone(t: string | null) {
  if (!t) return "—"
  const d = t.replace(/\D/g, "")
  if (d.length === 9) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`
  return t
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", minimumFractionDigits: 0 }).format(v)
}

const estadoMap: Record<string, { label: string; color: string; bg: string; border: string }> = {
  lead:            { label: "Lead",       color: "#b9a07a", bg: "transparent",             border: "rgba(185,160,122,0.45)" },
  novo:            { label: "Nova",       color: "#a0a996", bg: "transparent",             border: "rgba(160,169,150,0.45)" },
  ativa_recente:   { label: "Ativa",      color: "#a0a996", bg: "transparent",             border: "rgba(160,169,150,0.45)" },
  ativa_frequente: { label: "Frequente",  color: "#7a9e7e", bg: "rgba(122,158,126,0.08)", border: "rgba(122,158,126,0.40)" },
  vip_embaixadora: { label: "VIP",        color: "#161a26", bg: "#d4b886",                 border: "#d4b886" },
  vip_em_risco:    { label: "Em Risco",   color: "#d4956b", bg: "transparent",             border: "rgba(212,149,107,0.50)" },
  reativacao:      { label: "Reativação", color: "#b06050", bg: "transparent",             border: "rgba(176,96,80,0.45)" },
  perdida:         { label: "Perdida",    color: "#9499a6", bg: "transparent",             border: "rgba(122,126,138,0.35)" },
  blacklist:       { label: "Blacklist",  color: "#ece6d6", bg: "rgba(22,26,38,0.75)",    border: "rgba(22,26,38,0.60)" },
}

const HEADERS = [
  { label: "Cliente",     align: "left"   as const },
  { label: "Telefone",    align: "left"   as const },
  { label: "Email",       align: "left"   as const },
  { label: "Actividade",  align: "left"   as const },
  { label: "Sessões Concluídas",  align: "center" as const },
  { label: "Total Gasto", align: "center" as const },
  { label: "Estado",      align: "center" as const },
]

interface ClientesTableProps {
  clientes: ClienteRow[]
  selecionados: string[]
  onToggle: (id: string) => void
  onToggleTodos: () => void
}

function ClientesTableFragment({ clientes, selecionados, onToggle, onToggleTodos }: ClientesTableProps) {
  if (clientes.length === 0) return null
  const todosSelec = selecionados.length === clientes.length && clientes.length > 0

  return (
    <>
      <thead>
        <tr style={{ borderBottom: "1px solid rgba(212,184,134,0.12)" }}>
          <th style={{ padding: "11px 16px", width: "40px", backgroundColor: "rgba(212,184,134,0.06)" }}>
            <input
              type="checkbox"
              checked={todosSelec}
              onChange={onToggleTodos}
              className="cursor-pointer accent-[#b9a07a] w-4 h-4"
            />
          </th>
          {HEADERS.map(({ label, align }) => (
            <th key={label} style={{
              padding: "11px 16px",
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.16em",
              color: "var(--nuit-smoke)", textTransform: "uppercase",
              textAlign: align,
              backgroundColor: "rgba(212,184,134,0.06)",
            }}>
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {clientes.map((cliente, idx) => {
          const cfg = estadoMap[cliente.estado] ?? { label: cliente.estado, color: "#9d9d9a", bg: "rgba(157,157,154,0.10)", border: "rgba(157,157,154,0.22)" }
          const tagsSaude = cliente.etiquetas.filter(e => e.etiqueta.tipo === "saude")
          const actividade = cliente.ultimaSessao
            ? calcularTagActividade(cliente.ultimaSessao)
            : cliente.proximaSessaoData
              ? { label: "Agendada", cor: "#b9a07a", dias: null }
              : { label: "Sem sessões", cor: "#9d9d9a", dias: null }
          const isSelec = selecionados.includes(cliente.id)

          return (
            <motion.tr
              key={cliente.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, delay: idx * 0.04, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{
                backgroundColor: isSelec ? "rgba(185,160,122,0.12)" : "rgba(212,184,134,0.06)",
                boxShadow: "inset 3px 0 0 rgba(185,160,122,0.5)",
              }}
              style={{
                borderBottom: idx < clientes.length - 1 ? "1px solid rgba(212,184,134,0.10)" : "none",
                transition: "background-color 150ms ease",
                cursor: "pointer",
                backgroundColor: isSelec ? "rgba(185,160,122,0.10)" : undefined,
              }}
            >
              <td
                style={{ padding: "14px 16px", width: "40px" }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(cliente.id) }}
              >
                <input
                  type="checkbox"
                  checked={isSelec}
                  onChange={() => onToggle(cliente.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="cursor-pointer accent-[#b9a07a] w-4 h-4"
                />
              </td>
              <td style={{ padding: "14px 16px" }}>
                <Link href={`/clientes/${cliente.id}`} style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}>
                  <div style={{
                    width: "34px", height: "34px", borderRadius: "50%", flexShrink: 0,
                    backgroundColor: "rgba(185,160,122,0.10)", border: "1px solid rgba(185,160,122,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--font-sans, sans-serif)", fontSize: "11px", fontWeight: 700, color: "#b9a07a",
                  }}>
                    {getInitials(cliente.nome)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "14px", fontWeight: 700, color: "var(--nuit-bone)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {cliente.nome}
                    </p>
                    {tagsSaude.length > 0 && (
                      <div style={{ display: "flex", gap: "4px", marginTop: "3px", flexWrap: "wrap" }}>
                        {tagsSaude.slice(0, 2).map(({ etiqueta }) => (
                          <span key={etiqueta.id} style={{
                            padding: "2px 6px", borderRadius: "0",
                            fontSize: "8.5px", fontWeight: 500, letterSpacing: "0.18em",
                            textTransform: "uppercase", fontFamily: "var(--font-sans, sans-serif)",
                            color: etiqueta.cor, border: `1px solid ${etiqueta.cor}55`, backgroundColor: "transparent",
                          }}>
                            {etiqueta.nome}
                          </span>
                        ))}
                        {tagsSaude.length > 2 && (
                          <span style={{ fontSize: "8.5px", color: "#9d9d9a", fontFamily: "var(--font-sans, sans-serif)", padding: "2px 4px" }}>
                            +{tagsSaude.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              </td>
              <td style={{ padding: "14px 16px" }}>
                <Link href={`/clientes/${cliente.id}`} style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "13px", color: "var(--nuit-smoke)", textDecoration: "none" }}>
                  {formatPhone(cliente.telefone)}
                </Link>
              </td>
              <td style={{ padding: "14px 16px" }}>
                <Link href={`/clientes/${cliente.id}`} style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "13px", color: "#6d6d6d", textDecoration: "none", display: "block", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {cliente.email ?? "—"}
                </Link>
              </td>
              <td style={{ padding: "14px 16px" }}>
                <Link href={`/clientes/${cliente.id}`} style={{ textDecoration: "none" }}>
                  <span style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "11px", fontWeight: 600, color: actividade.cor, letterSpacing: "0.02em" }}>
                    {actividade.label}
                  </span>
                </Link>
              </td>
              <td style={{ padding: "14px 16px", textAlign: "center" }}>
                <Link href={`/clientes/${cliente.id}`} style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "14px", fontWeight: 600, color: "var(--nuit-bone)", textDecoration: "none" }}>
                  {cliente.totalSessoes}
                </Link>
              </td>
              <td style={{ padding: "14px 16px", textAlign: "center" }}>
                <Link href={`/clientes/${cliente.id}`} style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "14px", fontWeight: 600, color: "#b9a07a", textDecoration: "none" }}>
                  {formatCurrency(cliente.totalGasto)}
                </Link>
              </td>
              <td style={{ padding: "14px 16px", textAlign: "center" }}>
                <Link href={`/clientes/${cliente.id}`} style={{ textDecoration: "none" }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center",
                    padding: "4px 9px", borderRadius: "0",
                    fontSize: "9.5px", fontWeight: 500, letterSpacing: "0.32em",
                    textTransform: "uppercase", fontFamily: "var(--font-sans, sans-serif)",
                    color: cfg.color, backgroundColor: cfg.bg, border: `1px solid ${cfg.border}`,
                  }}>
                    {cfg.label}
                  </span>
                </Link>
              </td>
            </motion.tr>
          )
        })}
      </tbody>
    </>
  )
}

export function ClientesTable({ clientes, todasEtiquetas = [] }: { clientes: ClienteRow[]; todasEtiquetas?: Etiqueta[] }) {
  const [selecionados, setSelecionados] = useState<string[]>([])

  function toggleCliente(id: string) {
    setSelecionados((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function toggleTodos() {
    setSelecionados((prev) => prev.length === clientes.length ? [] : clientes.map(c => c.id))
  }

  if (clientes.length === 0) return null

  return (
    <>
      <table style={{
        width: "100%", borderCollapse: "collapse",
        backgroundColor: "var(--nuit-overlay)", borderRadius: "2px",
        border: "1px solid rgba(212,184,134,0.16)",
        overflow: "hidden",
      }}>
        <ClientesTableFragment
          clientes={clientes}
          selecionados={selecionados}
          onToggle={toggleCliente}
          onToggleTodos={toggleTodos}
        />
      </table>
      <BulkActionsBar
        selecionados={selecionados}
        etiquetas={todasEtiquetas}
        onClear={() => setSelecionados([])}
        onRefresh={() => {}}
      />
    </>
  )
}
