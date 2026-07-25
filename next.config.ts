import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// CSP gerida dinamicamente com nonce pelo middleware.ts (um nonce por request).
// Aqui ficam apenas os headers estáticos que não precisam de nonce.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// CSP para os formulários HTML estáticos em /forms — não podem receber nonce
// (são servidos tal e qual de public/), por isso permitem inline scripts mas
// bloqueiam qualquer origem externa além das fontes Google que os forms usam.
const cspForms = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/forms/:path*",
        headers: [{ key: "Content-Security-Policy", value: cspForms }],
      },
    ];
  },
};

// authToken fica por preencher de propósito (é um segredo, não vai no
// código) — sem ele o plugin só salta o upload de source maps (build
// continua normal). Definir SENTRY_AUTH_TOKEN como variável de ambiente
// (local + Vercel) ativa stack traces legíveis nos erros de produção em
// vez de código minificado. Gera-se em sentry.io → Settings → Auth Tokens.
export default withSentryConfig(nextConfig, {
  org: "essence-wellness-massages",
  project: "essence-crm",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  disableLogger: true,
});
