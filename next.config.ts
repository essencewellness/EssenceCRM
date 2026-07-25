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

// org/project/authToken ficam por preencher de propósito — sem eles o
// plugin só salta o upload de source maps (build continua normal). Definir
// SENTRY_ORG/SENTRY_PROJECT/SENTRY_AUTH_TOKEN mais tarde ativa stack traces
// legíveis nos erros de produção em vez de código minificado.
export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
  disableLogger: true,
});
