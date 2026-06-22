"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  LayoutDashboard, Users, CheckSquare,
  MessageSquare, Menu, X,
  Calendar, BarChart2, Settings, Shield, Star, Megaphone, FileText,
} from "lucide-react"

const MAIN_ITEMS = [
  { href: "/",          label: "Início",     icon: LayoutDashboard },
  { href: "/clientes",  label: "Clientes",   icon: Users },
  { href: "/tarefas",   label: "Tarefas",    icon: CheckSquare },
  { href: "/mensagens", label: "Mensagens",  icon: MessageSquare },
]

const ALL_ITEMS = [
  { href: "/sessoes",       label: "Sessões",       icon: Calendar },
  { href: "/pipeline",      label: "Pipeline",      icon: BarChart2 },
  { href: "/top-clientes",  label: "Top Clientes",  icon: Star },
  { href: "/campanhas",     label: "Campanhas",     icon: Megaphone },
  { href: "/templates",     label: "Templates",     icon: FileText },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
  { href: "/blacklist",     label: "Blacklist",     icon: Shield },
]

interface BottomNavProps {
  mensagensPendentes?: number
}

export function BottomNav({ mensagensPendentes = 0 }: BottomNavProps) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  function isActive(href: string) {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Overlay do menu */}
      {menuOpen && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.65)", zIndex: 40 }}
          className="lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Menu lateral deslizante */}
      {menuOpen && (
        <div
          className="lg:hidden"
          style={{
            position: "fixed", top: 0, bottom: 0, left: 0,
            width: "264px", zIndex: 50, display: "flex", flexDirection: "column",
            backgroundColor: "var(--nuit-deep)",
            borderRight: "1px solid rgba(212,184,134,0.12)",
          }}
        >
          {/* Header do menu */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "20px 16px",
            borderBottom: "1px solid rgba(212,184,134,0.10)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "28px", height: "28px",
                border: "1px solid rgba(212,184,134,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{
                  fontFamily: "var(--font-heading, serif)",
                  fontSize: "11px", color: "var(--nuit-champagne)",
                }}>EW</span>
              </div>
              <div>
                <div style={{
                  fontFamily: "var(--font-heading, serif)",
                  fontSize: "13px", color: "var(--nuit-bone)", lineHeight: 1.1,
                }}>Essence</div>
                <div style={{
                  fontFamily: "var(--font-sans, sans-serif)",
                  fontSize: "8px", color: "var(--nuit-champagne)",
                  letterSpacing: "0.32em", textTransform: "uppercase", marginTop: "2px",
                }}>Wellness · CRM</div>
              </div>
            </div>
            <button
              onClick={() => setMenuOpen(false)}
              style={{
                color: "var(--nuit-smoke)", background: "none", border: "none",
                cursor: "pointer", padding: "4px",
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Itens do menu */}
          <nav style={{ flex: 1, padding: "12px 0", overflowY: "auto" }}>
            {ALL_ITEMS.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    margin: "0 8px 2px", padding: "10px 12px",
                    textDecoration: "none",
                    borderLeft: active ? "2px solid var(--nuit-champagne)" : "2px solid transparent",
                    backgroundColor: active ? "rgba(212,184,134,0.08)" : "transparent",
                    paddingLeft: active ? "10px" : "12px",
                    transition: "background-color 150ms",
                  }}
                >
                  <Icon
                    size={15}
                    style={{
                      color: active ? "var(--nuit-champagne)" : "var(--nuit-smoke)",
                      strokeWidth: 1.5, flexShrink: 0,
                    }}
                  />
                  <span style={{
                    fontFamily: "var(--font-sans, sans-serif)",
                    fontSize: "13px",
                    fontWeight: active ? 500 : 400,
                    color: active ? "var(--nuit-bone)" : "var(--nuit-smoke)",
                  }}>
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </nav>
        </div>
      )}

      {/* Barra inferior */}
      <nav
        className="lg:hidden"
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 30,
          backgroundColor: "var(--nuit-deep)",
          borderTop: "1px solid rgba(212,184,134,0.12)",
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-around",
          padding: "0 8px", height: "60px",
        }}>
          {MAIN_ITEMS.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            const badge = item.href === "/mensagens" && mensagensPendentes > 0 ? mensagensPendentes : 0
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
                  padding: "6px 12px", textDecoration: "none",
                  color: active ? "var(--nuit-champagne)" : "var(--nuit-smoke-deep)",
                }}
              >
                <div style={{ position: "relative" }}>
                  <Icon size={20} style={{ strokeWidth: 1.5 }} />
                  {badge > 0 && (
                    <span style={{
                      position: "absolute", top: "-4px", right: "-6px",
                      width: "16px", height: "16px",
                      fontFamily: "var(--font-sans, sans-serif)",
                      fontSize: "8px", fontWeight: 700,
                      backgroundColor: "var(--nuit-champagne)",
                      color: "var(--nuit-midnight)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </div>
                <span style={{
                  fontFamily: "var(--font-sans, sans-serif)",
                  fontSize: "9px", fontWeight: active ? 500 : 400,
                  letterSpacing: "0.04em",
                }}>
                  {item.label}
                </span>
              </Link>
            )
          })}
          <button
            onClick={() => setMenuOpen(true)}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
              padding: "6px 12px", background: "none", border: "none",
              color: "var(--nuit-smoke-deep)", cursor: "pointer",
            }}
          >
            <Menu size={20} style={{ strokeWidth: 1.5 }} />
            <span style={{
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: "9px", fontWeight: 400, letterSpacing: "0.04em",
            }}>Menu</span>
          </button>
        </div>
      </nav>
    </>
  )
}
