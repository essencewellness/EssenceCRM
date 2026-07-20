"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

// Atualiza os dados da página periodicamente sem recarregar (router.refresh()
// volta a correr os Server Components e busca dados frescos à BD, preservando
// scroll e estado local). Não renderiza nada.
export function AutoRefresh({ intervalMs = 20_000 }: { intervalMs?: number }) {
  const router = useRouter()

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs)
    return () => clearInterval(id)
  }, [router, intervalMs])

  return null
}
