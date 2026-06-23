"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import { ClientesTable } from "@/components/clientes-table"

interface Etiqueta { id: string; nome: string; cor: string; tipo: string; bloqueiaAutomacoes: boolean }
interface ClienteRow {
  id: string
  nome: string
  telefone: string | null
  email: string | null
  ultimaSessao: string | null
  totalSessoes: number
  totalGasto: number
  estado: string
  etiquetas: { etiqueta: Etiqueta }[]
}

interface ClientesInfiniteListProps {
  initialClientes: ClienteRow[]
  initialCursor: string | null
  todasEtiquetas?: Etiqueta[]
  /** Query params to append on each "load more" fetch */
  queryString?: string
}

const PAGE_SIZE = 50

export function ClientesInfiniteList({
  initialClientes,
  initialCursor,
  todasEtiquetas = [],
  queryString = "",
}: ClientesInfiniteListProps) {
  const [clientes, setClientes] = useState<ClienteRow[]>(initialClientes)
  const [cursor, setCursor] = useState<string | null>(initialCursor)
  const [loading, setLoading] = useState(false)
  const [temMais, setTemMais] = useState(!!initialCursor)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const carregarMais = useCallback(async () => {
    if (!cursor || loading) return
    setLoading(true)
    try {
      const sep = queryString ? "&" : ""
      const url = `/api/v1/clientes?limit=${PAGE_SIZE}&cursor=${cursor}${queryString ? sep + queryString : ""}`
      const res = await fetch(url, { credentials: "include" })
      if (!res.ok) return
      const json = await res.json()
      const novos: ClienteRow[] = (json.data ?? []).map((c: Record<string, unknown>) => ({
        id: c.id as string,
        nome: c.nome as string,
        telefone: c.telefone as string | null,
        email: c.email as string | null,
        ultimaSessao: c.ultimaSessao as string | null,
        totalSessoes: c.totalSessoes as number,
        totalGasto: Number(c.totalGasto),
        estado: c.estado as string,
        etiquetas: (c.etiquetas as { etiqueta: Etiqueta }[]) ?? [],
      }))
      setClientes((prev) => [...prev, ...novos])
      const novoCursor = json.meta?.nextCursor ?? null
      setCursor(novoCursor)
      setTemMais(!!novoCursor)
    } finally {
      setLoading(false)
    }
  }, [cursor, loading, queryString])

  // IntersectionObserver para scroll infinito
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !temMais) return
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) carregarMais() },
      { rootMargin: "200px" }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [temMais, carregarMais])

  return (
    <div>
      <ClientesTable clientes={clientes} todasEtiquetas={todasEtiquetas} />

      {/* Sentinel para IntersectionObserver */}
      {temMais && <div ref={sentinelRef} className="h-1" />}

      {/* Loading skeleton */}
      {loading && (
        <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ height: "64px", backgroundColor: "rgba(212,184,134,0.05)", borderRadius: "2px", border: "1px solid rgba(212,184,134,0.08)", animation: "pulse 1.5s ease-in-out infinite" }} />
          ))}
        </div>
      )}

      {!temMais && clientes.length > 0 && (
        <p style={{ textAlign: "center", fontSize: "11px", fontFamily: "var(--font-sans, sans-serif)", color: "var(--nuit-smoke)", padding: "16px 0" }}>
          {clientes.length} cliente{clientes.length !== 1 ? "s" : ""} no total
        </p>
      )}
    </div>
  )
}
