"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Users, UserPlus, Calendar, CheckSquare,
  MessageSquare, MessageSquareHeart, Megaphone, FileText,
  BarChart2, Star, Shield, Settings, ChevronRight, LogOut, Gift,
} from "lucide-react"
import { ThemeToggle } from "@/components/theme/ThemeToggle"

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  badge?: number
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const grupos: NavGroup[] = [
  {
    label: "Principal",
    items: [
      { href: "/",          label: "Dashboard",  icon: LayoutDashboard },
      { href: "/clientes",  label: "Clientes",   icon: Users },
      { href: "/leads",     label: "Leads",      icon: UserPlus },
      { href: "/sessoes",   label: "Sessões",    icon: Calendar },
      { href: "/tarefas",   label: "Tarefas",    icon: CheckSquare },
    ],
  },
  {
    label: "Comunicação",
    items: [
      { href: "/mensagens",  label: "Mensagens",  icon: MessageSquare },
      { href: "/campanhas",  label: "Campanhas",  icon: Megaphone },
      { href: "/templates",  label: "Templates",  icon: FileText },
    ],
  },
  {
    label: "Análise",
    items: [
      { href: "/pipeline",      label: "Pipeline",     icon: BarChart2 },
      { href: "/top-clientes",  label: "Top Clientes", icon: Star },
      { href: "/feedback",      label: "Feedback",     icon: MessageSquareHeart },
      { href: "/financeiro",    label: "Financeiro",   icon: BarChart2 },
      { href: "/vouchers",      label: "Vouchers",     icon: Gift },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/configuracoes", label: "Configurações", icon: Settings },
      { href: "/blacklist",     label: "Blacklist",     icon: Shield },
    ],
  },
]

interface SidebarProps {
  mensagensPendentes?: number
  logoutAction: () => Promise<void>
}

export function Sidebar({ mensagensPendentes = 0, logoutAction }: SidebarProps) {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  const gruposComBadge = grupos.map((g) => ({
    ...g,
    items: g.items.map((item) =>
      item.href === "/mensagens" && mensagensPendentes > 0
        ? { ...item, badge: mensagensPendentes }
        : item
    ),
  }))

  return (
    <aside style={{
      flexDirection: "column",
      width: "216px",
      minHeight: "100vh",
      backgroundColor: "var(--nuit-deep)",
      borderRight: "1px solid rgba(212,184,134,0.10)",
      flexShrink: 0,
    }}
    className="hidden lg:flex"
    >
      {/* Lockup */}
      <div style={{
        padding: "24px 20px 20px",
        borderBottom: "1px solid rgba(212,184,134,0.10)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "32px", height: "32px",
            border: "1px solid rgba(212,184,134,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{
              fontFamily: "var(--font-heading, serif)",
              fontSize: "13px", color: "var(--nuit-champagne)",
              letterSpacing: "-0.01em",
            }}>EW</span>
          </div>
          <div>
            <div style={{
              fontFamily: "var(--font-heading, serif)",
              fontSize: "14px", color: "var(--nuit-bone)",
              letterSpacing: "-0.005em", lineHeight: 1.1,
            }}>Essence</div>
            <div style={{
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: "9px", color: "var(--nuit-champagne)",
              letterSpacing: "0.32em", textTransform: "uppercase",
              fontWeight: 500, marginTop: "2px",
            }}>Wellness · CRM</div>
          </div>
        </div>
      </div>

      {/* Grupos de navegação */}
      <nav style={{ flex: 1, padding: "16px 0", overflowY: "auto" }}>
        {gruposComBadge.map((grupo) => (
          <div key={grupo.label} style={{ marginBottom: "24px" }}>
            <div style={{
              padding: "0 16px 8px",
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: "9px", fontWeight: 500,
              letterSpacing: "0.32em", textTransform: "uppercase",
              color: "var(--nuit-bone-soft)",
            }}>
              {grupo.label}
            </div>
            {grupo.items.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    margin: "0 8px 2px",
                    padding: "8px 12px",
                    textDecoration: "none",
                    transition: "background-color var(--dur-fast) var(--ease-out), border-color var(--dur-fast)",
                    ...(active ? {
                      backgroundColor: "rgba(212,184,134,0.08)",
                      borderLeft: "2px solid var(--nuit-champagne)",
                      paddingLeft: "10px",
                    } : {
                      borderLeft: "2px solid transparent",
                    }),
                  }}
                  className={!active ? "hover:bg-[rgba(212,184,134,0.05)]" : ""}
                >
                  <Icon
                    size={14}
                    style={{
                      color: active ? "var(--nuit-champagne)" : "var(--nuit-smoke)",
                      flexShrink: 0,
                      strokeWidth: 1.5,
                    }}
                  />
                  <span style={{
                    flex: 1,
                    fontFamily: "var(--font-sans, sans-serif)",
                    fontSize: "12.5px",
                    fontWeight: active ? 500 : 400,
                    color: active ? "var(--nuit-bone)" : "var(--nuit-bone-soft)",
                    letterSpacing: "0.01em",
                    transition: "color var(--dur-fast)",
                  }}>
                    {item.label}
                  </span>
                  {item.badge ? (
                    <span style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      minWidth: "18px", height: "18px", padding: "0 4px",
                      fontFamily: "var(--font-sans, sans-serif)",
                      fontSize: "9px", fontWeight: 600,
                      backgroundColor: "var(--nuit-champagne)",
                      color: "var(--nuit-midnight)",
                    }}>
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  ) : active ? (
                    <ChevronRight size={11} style={{ color: "var(--nuit-champagne-soft)", opacity: 0.7 }} />
                  ) : null}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Rodapé */}
      <div style={{
        padding: "12px 16px",
        borderTop: "1px solid rgba(212,184,134,0.10)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <p style={{
          fontFamily: "var(--font-sans, sans-serif)",
          fontSize: "9px", color: "var(--nuit-bone-soft)",
          letterSpacing: "0.18em", textTransform: "uppercase",
        }}>
          Essence Wellness · v1
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <ThemeToggle compact />
        <form action={logoutAction}>
          <button
            type="submit"
            title="Terminar sessão"
            aria-label="Terminar sessão"
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              background: "none", border: "none", cursor: "pointer",
              color: "var(--nuit-bone-soft)",
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: "11px", letterSpacing: "0.04em",
              padding: "4px 6px",
              transition: "color 150ms",
            }}
            className="hover:!text-[var(--nuit-bone-soft)]"
          >
            <LogOut size={12} strokeWidth={1.5} />
            Sair
          </button>
        </form>
        </div>
      </div>
    </aside>
  )
}
