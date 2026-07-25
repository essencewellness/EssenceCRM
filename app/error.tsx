"use client"

import { useEffect } from "react"
import Link from "next/link"
import * as Sentry from "@sentry/nextjs"

// Error boundary de root (App Router). Apanha qualquer erro não tratado
// nas páginas fora do grupo (dashboard) — ex: /login — e evita o ecrã
// em branco "esta página não carregou". Não define <html>/<body>: o
// root layout continua a renderizar por cima (isso só é preciso em
// app/global-error.tsx).
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[error-boundary/root]", error)
    Sentry.captureException(error)
  }, [error])

  return (
    <main
      className="min-h-screen flex items-center justify-center relative px-6"
      style={{ backgroundColor: "#161a26" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 90% 70% at 50% -20%, #0e1119 0%, transparent 65%)",
        }}
      />

      <div
        className="relative w-full max-w-sm p-8 text-center"
        style={{
          backgroundColor: "#1f2433",
          border: "1px solid rgba(212,184,134,0.16)",
          borderRadius: "4px",
          boxShadow: "0 30px 60px rgba(0,0,0,0.55), 0 10px 20px rgba(0,0,0,0.30)",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
            fontSize: "9px",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "#d4b886",
            fontWeight: 500,
            marginBottom: "14px",
          }}
        >
          Essence Wellness · CRM
        </p>

        <h1
          style={{
            fontFamily: "var(--font-heading, 'DM Serif Display', Georgia, serif)",
            color: "#ece6d6",
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
            color: "var(--nuit-smoke)",
            fontSize: "13px",
            lineHeight: 1.6,
            marginBottom: "28px",
          }}
        >
          Algo correu mal ao carregar esta página. Podes tentar novamente ou
          voltar ao início.
        </p>

        {error.digest && (
          <p
            style={{
              fontFamily: "var(--font-sans, monospace)",
              color: "var(--nuit-smoke-deep)",
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
              color: "#161a26",
              backgroundColor: "#d4b886",
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
              color: "var(--nuit-smoke)",
              padding: "10px 12px",
            }}
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </main>
  )
}
