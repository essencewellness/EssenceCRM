"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import {
  LayoutDashboard, Users, UserPlus, CheckSquare,
  MessageSquare, MessageSquareHeart, Menu, X,
  Calendar, CalendarDays, BarChart2, Settings, Shield, Star, Megaphone, FileText, LogOut, Gift,
} from "lucide-react"
import { ThemeToggle } from "@/components/theme/ThemeToggle"

const MAIN_ITEMS = [
  { href: "/",          label: "Início",     icon: LayoutDashboard },
  { href: "/clientes",  label: "Clientes",   icon: Users },
  { href: "/tarefas",   label: "Tarefas",    icon: CheckSquare },
  { href: "/mensagens", label: "Mensagens",  icon: MessageSquare },
]

const ALL_ITEMS = [
  { href: "/leads",         label: "Leads",         icon: UserPlus },
  { href: "/agenda",        label: "Agenda",        icon: CalendarDays },
  { href: "/feedback",      label: "Feedback",      icon: MessageSquareHeart },
  { href: "/sessoes",       label: "Sessões",       icon: Calendar },
  { href: "/pipeline",      label: "Pipeline",      icon: BarChart2 },
  { href: "/top-clientes",  label: "Top Clientes",  icon: Star },
  { href: "/financeiro",    label: "Financeiro",    icon: BarChart2 },
  { href: "/vouchers",      label: "Vouchers",      icon: Gift },
  { href: "/campanhas",     label: "Campanhas",     icon: Megaphone },
  { href: "/templates",     label: "Templates",     icon: FileText },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
  { href: "/blacklist",     label: "Blacklist",     icon: Shield },
]

interface BottomNavProps {
  mensagensPendentes?: number
  // Mensagens IA nunca aparece para a Cristina — só Bea/admin (ver
  // lib/contexto-utilizador.ts, decisão de negócio 2026-09-04).
  podeAprovarMensagens?: boolean
  // Tarefas em aberto (pendente/em_progresso) visíveis para esta sessão.
  tarefasAbertas?: number
  // Sessões/vouchers pagos por MBWay ainda não repassados à Cristina.
  repassesPendentes?: number
  logoutAction: () => Promise<void>
}

export function BottomNav({ mensagensPendentes = 0, podeAprovarMensagens = true, tarefasAbertas = 0, repassesPendentes = 0, logoutAction }: BottomNavProps) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const mainItems = podeAprovarMensagens ? MAIN_ITEMS : MAIN_ITEMS.filter((i) => i.href !== "/mensagens")
  const allItems = podeAprovarMensagens ? ALL_ITEMS : ALL_ITEMS.filter((i) => i.href !== "/mensagens")
  const badgesPorHref: Record<string, number> = {
    "/mensagens": mensagensPendentes,
    "/tarefas": tarefasAbertas,
    "/financeiro": repassesPendentes,
  }

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [menuOpen])

  function isActive(href: string) {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  return (
    <>
      <AnimatePresence>
      {/* Overlay do menu */}
      {menuOpen && (
        <motion.div
          key="menu-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.65)", zIndex: 40 }}
          className="lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Menu lateral deslizante — entra devagar, sai mais depressa */}
      {menuOpen && (
        <motion.div
          key="menu-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Menu de navegação"
          initial={{ x: "-100%" }}
          animate={{ x: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } }}
          exit={{ x: "-100%", transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } }}
          className="lg:hidden"
          style={{
            position: "fixed", top: 0, bottom: 0, left: 0,
            width: "264px", zIndex: 50, display: "flex", flexDirection: "column",
            backgroundColor: "var(--nuit-deep)",
            borderRight: "1px solid rgba(212,184,134,0.12)",
            boxShadow: "24px 0 80px rgba(0,0,0,0.35)",
            paddingTop: "var(--safe-top)",
            paddingBottom: "var(--safe-bottom)",
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
                  fontSize: "calc(11px * var(--ui-font-scale))", color: "var(--nuit-champagne)",
                }}>EW</span>
              </div>
              <div>
                <div style={{
                  fontFamily: "var(--font-heading, serif)",
                  fontSize: "calc(13px * var(--ui-font-scale))", color: "var(--nuit-bone)", lineHeight: 1.1,
                }}>Essence</div>
                <div style={{
                  fontFamily: "var(--font-sans, sans-serif)",
                  fontSize: "calc(8px * var(--ui-font-scale))", color: "var(--nuit-champagne)",
                  letterSpacing: "0.32em", textTransform: "uppercase", marginTop: "2px",
                }}>Wellness · CRM</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <ThemeToggle compact />
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Fechar menu"
                style={{
                  color: "var(--nuit-smoke)", background: "none", border: "none",
                  cursor: "pointer", padding: "4px",
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Itens do menu */}
          <nav style={{ flex: 1, padding: "12px 0", overflowY: "auto" }}>
            {allItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              const badge = badgesPorHref[item.href] ?? 0
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  data-active={active}
                  aria-current={active ? "page" : undefined}
                  style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    margin: "0 8px 2px", padding: "10px 12px",
                    textDecoration: "none",
                    boxShadow: active ? "inset 2px 0 0 0 var(--nuit-champagne)" : "inset 2px 0 0 0 transparent",
                    backgroundColor: active ? "rgba(212,184,134,0.08)" : "transparent",
                    transition: "background-color 150ms, box-shadow 150ms",
                  }}
                  className={`crm-nav-link ${!active ? "hover:bg-[rgba(212,184,134,0.05)]" : ""}`}
                >
                  <Icon
                    size={15}
                    style={{
                      color: active ? "var(--nuit-champagne)" : "var(--nuit-smoke)",
                      strokeWidth: 1.5, flexShrink: 0,
                    }}
                  />
                  <span style={{
                    flex: 1,
                    fontFamily: "var(--font-sans, sans-serif)",
                    fontSize: "calc(13px * var(--ui-font-scale))",
                    fontWeight: 460,
                    color: active ? "var(--nuit-bone)" : "var(--nuit-bone-soft)",
                  }}>
                    {item.label}
                  </span>
                  {badge > 0 && (
                    <span style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      minWidth: "18px", height: "18px", padding: "0 4px",
                      fontFamily: "var(--font-sans, sans-serif)",
                      fontSize: "calc(9px * var(--ui-font-scale))", fontWeight: 600,
                      backgroundColor: "var(--nuit-champagne)",
                      color: "var(--nuit-midnight)",
                    }}>
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Logout */}
          <div style={{
            padding: "12px 16px",
            borderTop: "1px solid rgba(212,184,134,0.10)",
          }}>
            <form action={logoutAction}>
              <button
                type="submit"
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  width: "100%", padding: "10px 12px",
                  background: "none", border: "none", cursor: "pointer",
                  boxShadow: "inset 2px 0 0 0 transparent",
                  transition: "background-color 150ms",
                }}
                className="hover:bg-[rgba(212,184,134,0.05)]"
              >
                <LogOut size={15} style={{ color: "var(--nuit-smoke)", strokeWidth: 1.5, flexShrink: 0 }} />
                <span style={{
                  fontFamily: "var(--font-sans, sans-serif)",
                  fontSize: "calc(13px * var(--ui-font-scale))", fontWeight: 400,
                  color: "var(--nuit-bone-soft)",
                }}>
                  Terminar sessão
                </span>
              </button>
            </form>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Barra inferior */}
      <nav
        className="lg:hidden"
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 30,
          backgroundColor: "var(--nuit-deep)",
          borderTop: "1px solid rgba(212,184,134,0.12)",
          boxShadow: "0 -18px 50px rgba(0,0,0,0.22)",
          paddingBottom: "var(--safe-bottom)",
          paddingLeft: "var(--safe-left)",
          paddingRight: "var(--safe-right)",
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-around",
          padding: "0 8px", height: "60px",
        }}>
          {mainItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            const badge = badgesPorHref[item.href] ?? 0
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
                  padding: "6px 12px", textDecoration: "none", position: "relative",
                  alignSelf: "stretch", justifyContent: "center",
                  color: active ? "var(--nuit-champagne)" : "var(--nuit-bone-soft)",
                  transition: "color var(--dur-med) var(--ease-out)",
                }}
              >
                {active && (
                  <motion.span
                    layoutId="bottomnav-active"
                    aria-hidden
                    transition={{ type: "spring", stiffness: 520, damping: 42 }}
                    style={{
                      position: "absolute", top: 0, left: "18%", right: "18%",
                      height: "2px", backgroundColor: "var(--nuit-champagne)",
                    }}
                  />
                )}
                <div style={{ position: "relative" }}>
                  <Icon size={20} style={{ strokeWidth: 1.5 }} />
                  {badge > 0 && (
                    <span style={{
                      position: "absolute", top: "-4px", right: "-6px",
                      width: "16px", height: "16px",
                      fontFamily: "var(--font-sans, sans-serif)",
                      fontSize: "calc(8px * var(--ui-font-scale))", fontWeight: 700,
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
                  fontSize: "calc(9px * var(--ui-font-scale))", fontWeight: 460,
                  letterSpacing: "0.04em",
                }}>
                  {item.label}
                </span>
              </Link>
            )
          })}
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menu"
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
              padding: "6px 12px", background: "none", border: "none",
              color: "var(--nuit-bone-soft)", cursor: "pointer",
            }}
          >
            <Menu size={20} style={{ strokeWidth: 1.5 }} />
            <span style={{
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: "calc(9px * var(--ui-font-scale))", fontWeight: 400, letterSpacing: "0.04em",
            }}>Menu</span>
          </button>
        </div>
      </nav>
    </>
  )
}
