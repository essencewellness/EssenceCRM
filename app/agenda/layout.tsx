import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { LayoutDashboard } from "lucide-react"
import { auth } from "@/lib/auth"

// Identidade própria de "Adicionar ao Ecrã Principal" — ícone e nome
// diferentes do CRM completo, para dar duas apps separadas no ecrã do
// iPad ligadas à mesma base de dados (pedido do Nuno, 2026-08-24).
export const metadata: Metadata = {
  title: "Agenda — Essence Wellness",
  appleWebApp: {
    title: "Agenda EW",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/icons/agenda-icon.png",
  },
}

export default async function AgendaLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const preferenciaFonte = (session.user as { preferenciaFonte?: string }).preferenciaFonte ?? "baixo"

  return (
    <div
      className="min-h-screen"
      data-font-scale={preferenciaFonte}
      style={{ backgroundColor: "var(--nuit-midnight)" }}
    >
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px", borderBottom: "1px solid var(--rule-soft)",
      }}>
        <span style={{
          fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "18px",
          color: "var(--nuit-bone)",
        }}>
          Agenda <span style={{ color: "var(--nuit-champagne-soft)" }}>· Essence Wellness</span>
        </span>
        <Link
          href="/"
          aria-label="Abrir o CRM completo"
          title="Abrir o CRM completo"
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            fontFamily: "var(--font-sans, sans-serif)", fontSize: "11px", fontWeight: 600,
            letterSpacing: "0.06em", textTransform: "uppercase",
            color: "var(--nuit-champagne-soft)", textDecoration: "none",
            padding: "8px 12px", borderRadius: "6px",
            border: "1px solid rgba(212,184,134,0.22)",
          }}
        >
          <LayoutDashboard size={14} />
          CRM
        </Link>
      </header>
      <main style={{ padding: "16px 20px 40px", maxWidth: "780px", margin: "0 auto" }}>
        {children}
      </main>
    </div>
  )
}
