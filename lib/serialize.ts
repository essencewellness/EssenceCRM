// Converte tipos Prisma não-serializáveis (Decimal) em números simples
// antes de atravessar a fronteira servidor → cliente ou sair na API JSON.
import type { Prisma } from "@/lib/prisma-client"

type DecimalLike = Prisma.Decimal | number | string | null | undefined

export function paraNumero(valor: DecimalLike): number {
  if (valor === null || valor === undefined) return 0
  return Number(valor)
}

/** Converte recursivamente todos os Decimal de um objeto em number. */
export function serializarDecimais<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) return obj.map(serializarDecimais) as T
  if (typeof obj === "object") {
    // Prisma.Decimal expõe toFixed + d (digits) — deteção segura sem instanceof
    const o = obj as Record<string, unknown>
    if (typeof (o as { toFixed?: unknown }).toFixed === "function" && "d" in o && "e" in o && "s" in o) {
      return Number(obj) as T
    }
    if (obj instanceof Date) return obj
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(o)) out[k] = serializarDecimais(v)
    return out as T
  }
  return obj
}
