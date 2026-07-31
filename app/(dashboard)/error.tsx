"use client"

import { useEffect } from "react"
import Link from "next/link"
import * as Sentry from "@sentry/nextjs"

// Error boundary do grupo (dashboard). Ao contrário de app/error.tsx, este
// só substitui o conteúdo da página — o DashboardLayout à volta (Sidebar +
// BottomNav) continua montado, para a Bea nunca perder a navegação quando
// uma página interna (clientes, mensagens, etc.) rebenta.
export default function DashboardErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[error-boundary/dashboard]", error)
    Sentry.captureException(error)
  }, [error])

  return (
    <div style={{ maxWidth: "640px", margin: "80px auto", padding: "0 24px" }}>
      <div
        className="p-8 text-center"
        style={{
          backgroundColor: "var(--nuit-overlay)",
          border: "1px solid rgba(212,184,134,0.16)",
          borderRadius: "4px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.40), 0 2px 6px rgba(0,0,0,0.25)",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
            fontSize: "9px",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--nuit-champagne-soft)",
            fontWeight: 500,
            marginBottom: "14px",
          }}
        >
          Esta página
        </p>

        <h1
          style={{
            fontFamily: "var(--font-heading, 'DM Serif Display', Georgia, serif)",
            color: "var(--nuit-bone)",
            fontSize: "22px",
            marginBottom: "10px",
            letterSpacing: "-0.005em",
          }}
        >
          Ocorreu um erro
        </h1>

        <p
          style={{
            fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
            color: "var(--nuit-bone-soft)",
            fontSize: "13px",
            lineHeight: 1.6,
            marginBottom: "28px",
          }}
        >
          Não foi possível carregar esta secção. Tenta novamente — se o
          problema persistir, avisa o Nuno com a referência abaixo.
        </p>

        {error.digest && (
          <p
            style={{
              fontFamily: "var(--font-sans, monospace)",
              color: "var(--nuit-bone-soft)",
              fontSize: "10px",
              marginBottom: "24px",
              wordBreak: "break-all",
            }}
          >
            Referência: {error.digest}
          </p>
        )}

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="cursor-pointer"
            style={{
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: "11px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontWeight: 500,
              color: "var(--nuit-midnight)",
              backgroundColor: "var(--nuit-champagne)",
              border: "none",
              borderRadius: "2px",
              padding: "10px 20px",
            }}
          >
            Tentar novamente
          </button>

          <Link
            href="/"
            className="link-action"
            style={{
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: "11px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontWeight: 500,
              color: "var(--nuit-bone-soft)",
              padding: "10px 12px",
            }}
          >
            Voltar ao dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
