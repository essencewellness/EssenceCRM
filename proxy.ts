import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import { isSecureCookieEnv } from "@/lib/env"

// Rotas que NÃO exigem sessão de dashboard:
// - /login e /api/auth: fluxo de autenticação
// - /api/v1: protegida por X-API-Key nos próprios handlers (fail-closed em lib/api-auth.ts)
// - /forms: formulários públicos (onboarding/pós-sessão) servidos de /public
const PREFIXOS_PUBLICOS = ["/login", "/api/auth", "/api/v1", "/forms"]

function buildCsp(nonce: string): string {
  const dev = process.env.NODE_ENV !== "production"
  return [
    "default-src 'self'",
    // strict-dynamic: scripts com nonce podem carregar outros scripts dinamicamente
    // (necessário para hidratação Next.js); unsafe-eval só em dev (HMR)
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ")
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const ehPublico = PREFIXOS_PUBLICOS.some((p) => pathname.startsWith(p))

  if (!ehPublico) {
    const token = await getToken({
      req,
      secret: process.env.AUTH_SECRET,
      secureCookie: isSecureCookieEnv(),
    })

    if (!token) {
      const loginUrl = new URL("/login", req.url)
      if (pathname !== "/") loginUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // API e formulários estáticos não recebem CSP com nonce aqui:
  // a API devolve JSON; os /forms têm CSP própria no next.config.ts
  if (pathname.startsWith("/api") || pathname.startsWith("/forms")) {
    return NextResponse.next()
  }

  // Nonce único por request — CSP sem unsafe-inline em produção.
  // Aplica-se a TODAS as páginas Next (dashboard e /login).
  const nonce = crypto.randomUUID()
  const csp = buildCsp(nonce)

  const requestHeaders = new Headers(req.headers)
  requestHeaders.set("x-nonce", nonce)
  // O Next lê o nonce do header CSP do REQUEST para o aplicar aos scripts
  // que ele próprio injeta — sem isto, strict-dynamic bloqueava a hidratação.
  requestHeaders.set("Content-Security-Policy", csp)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })
  response.headers.set("Content-Security-Policy", csp)
  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.png$|.*\\.html$).*)"],
}
