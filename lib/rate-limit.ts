// Rate limiting com dois níveis:
// 1. Upstash Redis (REST) quando UPSTASH_REDIS_REST_URL/TOKEN existem — partilhado
//    entre todas as instâncias serverless (o que conta em produção no Vercel).
// 2. Fallback em memória — suficiente em dev; em prod serve de proteção mínima
//    por instância até o Upstash estar configurado.
import { NextRequest, NextResponse } from "next/server"

const memoria = new Map<string, { count: number; reset: number }>()

function limparExpirados(agora: number) {
  if (memoria.size < 5000) return
  for (const [k, v] of memoria) if (agora > v.reset) memoria.delete(k)
}

async function incrementarUpstash(chave: string, janelaSeg: number): Promise<number | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null

  try {
    // Pipeline: INCR + EXPIRE NX numa só chamada
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", chave],
        ["EXPIRE", chave, String(janelaSeg), "NX"],
      ]),
      signal: AbortSignal.timeout(2000),
    })
    if (!res.ok) return null
    const data = (await res.json()) as Array<{ result: number }>
    return data[0]?.result ?? null
  } catch {
    return null // Upstash em baixo → cai para memória, nunca bloqueia o serviço
  }
}

export interface RateLimitOpts {
  /** identificador do recurso, ex: "lead", "login" */
  recurso: string
  /** máximo de pedidos na janela */
  limite: number
  /** janela em segundos */
  janelaSeg: number
}

/** Retorna null se permitido, NextResponse 429 se excedido. */
export async function verificarRateLimit(
  request: NextRequest,
  opts: RateLimitOpts,
  identidadeExtra?: string
): Promise<NextResponse | null> {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  const chave = `rl:${opts.recurso}:${identidadeExtra ?? ip}`

  // Tenta Upstash primeiro (estado partilhado entre instâncias)
  const countUpstash = await incrementarUpstash(chave, opts.janelaSeg)
  let excedeu: boolean

  if (countUpstash !== null) {
    excedeu = countUpstash > opts.limite
  } else {
    const agora = Date.now()
    limparExpirados(agora)
    const entrada = memoria.get(chave)
    if (!entrada || agora > entrada.reset) {
      memoria.set(chave, { count: 1, reset: agora + opts.janelaSeg * 1000 })
      excedeu = false
    } else {
      entrada.count++
      excedeu = entrada.count > opts.limite
    }
  }

  if (excedeu) {
    return NextResponse.json(
      { error: "Demasiados pedidos. Tenta novamente mais tarde.", code: "RATE_LIMIT" },
      { status: 429, headers: { "Retry-After": String(opts.janelaSeg) } }
    )
  }
  return null
}
