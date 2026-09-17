"use client"

import { useEffect } from "react"
import * as Sentry from "@sentry/nextjs"

// Só dispara se o PRÓPRIO root layout (app/layout.tsx) rebentar — app/error.tsx
// e app/(dashboard)/error.tsx cobrem tudo dentro do layout normal. Como o
// layout em si já não está de pé, este ficheiro tem de definir <html>/<body>
// próprios (é a única exceção nas regras do App Router).
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  useEffect(() => {
    console.error("[error-boundary/global]", error)
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="pt">
      <body style={{ backgroundColor: "var(--nuit-midnight)", color: "var(--nuit-bone)", fontFamily: "sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "calc(9px * var(--ui-font-scale))", letterSpacing: "0.32em", textTransform: "uppercase", color: "var(--nuit-champagne)", marginBottom: "14px" }}>
              Essence Wellness · CRM
            </p>
            <h1 style={{ fontSize: "calc(22px * var(--ui-font-scale))", marginBottom: "10px" }}>Ocorreu um erro grave</h1>
            <p style={{ fontSize: "calc(13px * var(--ui-font-scale))", color: "var(--nuit-bone-soft)", marginBottom: "20px" }}>
              A aplicação encontrou um problema inesperado. Recarrega a página.
            </p>
            {error.digest && (
              <p style={{ fontSize: "calc(10px * var(--ui-font-scale))", color: "var(--nuit-bone-soft)", wordBreak: "break-all" }}>
                Referência: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  )
}
