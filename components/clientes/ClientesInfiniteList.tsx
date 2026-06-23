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
      const res = await fetch(url, {
        headers: { "X-API-Key": process.env.NEXT_PUBLIC_API_KEY ?? "" },
      })
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
        <div className="mt-2 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-50 rounded animate-pulse" />
          ))}
        </div>
      )}

      {!temMais && clientes.length > 0 && (
        <p className="text-center text-xs text-gray-400 py-4">
          {clientes.length} cliente{clientes.length !== 1 ? "s" : ""} no total
        </p>
      )}
    </div>
  )
}
