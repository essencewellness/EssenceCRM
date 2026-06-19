import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

// Rotas que NÃO exigem sessão de dashboard:
// - /login e /api/auth: fluxo de autenticação
// - /api/v1: protegida por X-API-Key nos próprios handlers (fail-closed em lib/api-auth.ts)
// - /forms: formulários públicos (onboarding/pós-sessão) servidos de /public
const PREFIXOS_PUBLICOS = ["/login", "/api/auth", "/api/v1", "/forms"]

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PREFIXOS_PUBLICOS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
  })

  if (!token) {
    const loginUrl = new URL("/login", req.url)
    if (pathname !== "/") loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.png$|.*\\.html$).*)"],
}
