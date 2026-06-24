// Middleware edge-level: auth protection + CSP dinâmica com nonce por request.
// Com JWT strategy (Auth.js), não faz chamada à BD — só verifica o token.
// As rotas da API protegem-se per-handler via validarApiKey().
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

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

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { nextUrl } = req

  // Redirecionar para login se não autenticado (exceto na própria página de login)
  if (!isLoggedIn && nextUrl.pathname !== "/login") {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Nonce único por request — usado no CSP para substituir unsafe-inline
  // Next.js lê x-nonce automaticamente e aplica nos seus próprios <script> tags
  const nonce = crypto.randomUUID()
  const csp = buildCsp(nonce)

  const requestHeaders = new Headers(req.headers)
  requestHeaders.set("x-nonce", nonce)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })
  response.headers.set("Content-Security-Policy", csp)
  return response
})

export const config = {
  // Aplica a tudo exceto:
  // - assets estáticos (_next/static, _next/image)
  // - favicon
  // - formulários públicos em /forms/ (HTML estático, sem Next.js)
  // - API routes (auth per-handler, CSP irrelevante em JSON)
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|forms|api).*)",
  ],
}
