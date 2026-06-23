import { NextRequest, NextResponse } from "next/server"
import { timingSafeEqual } from "node:crypto"
import { auth } from "@/lib/auth"

// Comparação em tempo constante — evita timing attacks na descoberta da chave
function compararSeguro(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8")
  const bufB = Buffer.from(b, "utf8")
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

// Valida o header X-API-Key. Retorna null se autorizado, NextResponse de erro se não.
// FAIL-CLOSED: sem API_KEY_N8N configurada, o endpoint fica indisponível — nunca aberto.
export function validarApiKey(request: NextRequest): NextResponse | null {
  const apiKey = request.headers.get("X-API-Key")
  const chaveValida = process.env.API_KEY_N8N

  if (!chaveValida || chaveValida.length < 16) {
    console.error(
      "[api-auth] API_KEY_N8N ausente ou demasiado curta (<16 chars) — endpoint bloqueado"
    )
    return NextResponse.json(
      { error: "Serviço indisponível: autenticação da API não configurada.", code: "API_NAO_CONFIGURADA" },
      { status: 503 }
    )
  }

  if (!apiKey || !compararSeguro(apiKey, chaveValida)) {
    return NextResponse.json(
      { error: "Não autorizado. Header X-API-Key inválido ou ausente.", code: "API_KEY_INVALIDA" },
      { status: 401 }
    )
  }

  return null
}

// Aceita autenticação por API key (N8N) OU por sessão de utilizador (dashboard
// same-origin, que envia o cookie de sessão). Retorna null se autorizado.
// Usar em endpoints partilhados entre o N8N e o dashboard (ex: tarefas).
export async function validarApiKeyOuSessao(request: NextRequest): Promise<NextResponse | null> {
  const erroApiKey = validarApiKey(request)
  if (!erroApiKey) return null

  try {
    const session = await auth()
    if (session?.user) return null
  } catch {
    /* sem sessão — cai no erro da API key */
  }
  return erroApiKey
}

export function respostaErro(mensagem: string, code: string, status: number) {
  return NextResponse.json({ error: mensagem, code, status }, { status })
}

export function respostaSucesso(data: unknown, meta?: Record<string, unknown>) {
  return NextResponse.json({
    data,
    meta: { timestamp: new Date().toISOString(), ...meta },
  })
}
