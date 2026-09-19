"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "motion/react"
import {
  LayoutDashboard, Users, UserPlus, Calendar, CalendarDays, CheckSquare,
  MessageSquare, MessageSquareHeart, Megaphone, FileText,
  BarChart2, Star, Shield, Settings, ChevronRight, LogOut, Gift,
  Sun, Moon,
} from "lucide-react"
import { useTheme } from "@/components/theme/ThemeProvider"

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
      { href: "/agenda",    label: "Agenda",     icon: CalendarDays },
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
  // Mensagens IA nunca aparece para a Cristina — só Bea/admin (ver
  // lib/contexto-utilizador.ts, decisão de negócio 2026-09-04).
  podeAprovarMensagens?: boolean
  // Tarefas em aberto (pendente/em_progresso) visíveis para esta sessão —
  // mesmo isolamento por terapeuta que já existe em GET /api/v1/tarefas.
  tarefasAbertas?: number
  // Sessões/vouchers pagos por MBWay que ainda não foram repassados à
  // Cristina (ver lib/repasses.ts) — dinheiro dela na conta da Bea.
  repassesPendentes?: number
  logoutAction: () => Promise<void>
}

export function Sidebar({ mensagensPendentes = 0, podeAprovarMensagens = true, tarefasAbertas = 0, repassesPendentes = 0, logoutAction }: SidebarProps) {
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const claro = theme === "light"

  function isActive(href: string) {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  const badgesPorHref: Record<string, number> = {
    "/mensagens": mensagensPendentes,
    "/tarefas": tarefasAbertas,
    "/financeiro": repassesPendentes,
  }

  const gruposComBadge = grupos.map((g) => ({
    ...g,
    items: g.items
      .filter((item) => item.href !== "/mensagens" || podeAprovarMensagens)
      .map((item) =>
        (badgesPorHref[item.href] ?? 0) > 0
          ? { ...item, badge: badgesPorHref[item.href] }
          : item
      ),
  }))

  return (
    <aside style={{
      flexDirection: "column",
      width: "216px",
      height: "var(--app-vh)",
      position: "sticky",
      top: 0,
      backgroundColor: "var(--nuit-deep)",
      borderRight: "1px solid var(--sidebar-border)",
      boxShadow: "inset -1px 0 0 rgba(255,255,255,0.02)",
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
              fontSize: "calc(13px * var(--ui-font-scale))", color: "var(--nuit-champagne)",
              letterSpacing: "-0.01em",
            }}>EW</span>
          </div>
          <div>
            <div style={{
              fontFamily: "var(--font-heading, serif)",
              fontSize: "calc(14px * var(--ui-font-scale))", color: "var(--nuit-bone)",
              letterSpacing: "-0.005em", lineHeight: 1.1,
            }}>Essence</div>
            <div style={{
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: "calc(9px * var(--ui-font-scale))", color: "var(--nuit-champagne)",
              letterSpacing: "0.32em", textTransform: "uppercase",
              fontWeight: 500, marginTop: "2px",
            }}>Wellness · CRM</div>
          </div>
        </div>
      </div>

      {/* Grupos de navegação */}
      <nav className="nuit-scrollbar" style={{ flex: 1, padding: "16px 0", overflowY: "auto" }}>
        {gruposComBadge.map((grupo) => (
          <div key={grupo.label} style={{ marginBottom: "24px" }}>
            <div style={{
              padding: "0 16px 8px",
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: "calc(9px * var(--ui-font-scale))", fontWeight: 500,
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
                  data-active={active}
                  aria-current={active ? "page" : undefined}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    margin: "0 8px 2px",
                    // Padding fixo em ambos os estados — a marcação de activo usa
                    // box-shadow (não consome espaço de layout, ao contrário de
                    // border-left), por isso o texto nunca muda de posição ao
                    // selecionar. Antes o borderLeft 0→2px exigia compensar com
                    // paddingLeft 12px→10px, e essa troca instantânea (sem
                    // transição suave) é que fazia o texto "saltar" — reportado
                    // pelo Nuno 2026-08-29.
                    padding: "8px 12px",
                    textDecoration: "none",
                    position: "relative",
                    isolation: "isolate",
                    transition: "background-color var(--dur-med) var(--ease-out), transform var(--dur-med) var(--ease-out)",
                    transform: active ? "translateX(1px)" : "translateX(0)",
                  }}
                  className={`crm-nav-link ${!active ? "hover:bg-[rgba(212,184,134,0.05)]" : ""}`}
                >
                  {/* Marcador activo partilhado (layoutId): desliza de um item
                      para o seguinte em vez de apagar num e acender noutro.
                      Continua sem consumir espaço de layout (inset box-shadow),
                      por isso o texto nunca salta — ver nota de 2026-08-29. */}
                  {active && (
                    <motion.span
                      layoutId="sidebar-active"
                      aria-hidden
                      transition={{ type: "spring", stiffness: 520, damping: 42 }}
                      style={{
                        position: "absolute", inset: 0, zIndex: -1,
                        backgroundColor: "rgba(212,184,134,0.08)",
                        boxShadow: "inset 2px 0 0 0 var(--nuit-champagne)",
                        pointerEvents: "none",
                      }}
                    />
                  )}
                  <Icon
                    size={14}
                    style={{
                      color: active ? "var(--nuit-champagne)" : "var(--nuit-smoke)",
                      flexShrink: 0,
                      strokeWidth: 1.5,
                      transition: "color var(--dur-med) var(--ease-out), transform var(--dur-med) var(--ease-out)",
                      transform: active ? "scale(1.08)" : "scale(1)",
                    }}
                  />
                  <span style={{
                    flex: 1,
                    fontFamily: "var(--font-sans, sans-serif)",
                    fontSize: "calc(12.5px * var(--ui-font-scale))",
                    // Peso fixo (não varia com o estado activo) — antes o
                    // font-weight saltava 400→500 instantaneamente ao mudar
                    // de página, o que não anima de forma fiável entre
                    // browsers e é a causa real do texto parecer "desalinhado"
                    // durante a troca. A distinção activo/inactivo já fica
                    // clara só pela cor, que essa sim transita suavemente.
                    fontWeight: 460,
                    color: active ? "var(--nuit-bone)" : "var(--nuit-bone-soft)",
                    letterSpacing: "0.01em",
                    transition: "color var(--dur-med) var(--ease-out)",
                  }}>
                    {item.label}
                  </span>
                  {item.badge ? (
                    <span style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      minWidth: "18px", height: "18px", padding: "0 4px",
                      fontFamily: "var(--font-sans, sans-serif)",
                      fontSize: "calc(9px * var(--ui-font-scale))", fontWeight: 600,
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

        {/* Tema + Sair — linhas com o mesmo visual das abas de navegação
            (pedido do Nuno, 2026-08-22: a barra de rodapé separada ficava
            "horrorosa" com o scroll próprio do nav; isto une tudo numa só
            lista, sem uma faixa fixa à parte). */}
        <div style={{ marginBottom: "8px" }}>
          <button
            type="button"
            role="switch"
            aria-checked={claro}
            aria-label={claro ? "Mudar para modo escuro" : "Mudar para modo claro"}
            onClick={toggleTheme}
            title={claro ? "Mudar para modo escuro" : "Mudar para modo claro"}
            style={{
              display: "flex", alignItems: "center", gap: "10px", width: "calc(100% - 16px)",
              margin: "0 8px 2px", padding: "8px 12px",
              background: "none", border: "none", borderLeft: "2px solid transparent",
              cursor: "pointer", textAlign: "left",
            }}
            className="hover:bg-[rgba(212,184,134,0.05)]"
          >
            {claro
              ? <Sun size={14} style={{ color: "var(--nuit-smoke)", flexShrink: 0, strokeWidth: 1.5 }} />
              : <Moon size={14} style={{ color: "var(--nuit-smoke)", flexShrink: 0, strokeWidth: 1.5 }} />}
            <span style={{
              flex: 1, fontFamily: "var(--font-sans, sans-serif)", fontSize: "calc(12.5px * var(--ui-font-scale))",
              fontWeight: 400, color: "var(--nuit-bone-soft)", letterSpacing: "0.01em",
            }}>
              {claro ? "Modo claro" : "Modo escuro"}
            </span>
          </button>

          <form action={logoutAction}>
            <button
              type="submit"
              title="Terminar sessão"
              style={{
                display: "flex", alignItems: "center", gap: "10px", width: "calc(100% - 16px)",
                margin: "0 8px 2px", padding: "8px 12px",
                background: "none", border: "none", borderLeft: "2px solid transparent",
                cursor: "pointer", textAlign: "left",
              }}
              className="hover:bg-[rgba(212,184,134,0.05)]"
            >
              <LogOut size={14} style={{ color: "var(--nuit-smoke)", flexShrink: 0, strokeWidth: 1.5 }} />
              <span style={{
                flex: 1, fontFamily: "var(--font-sans, sans-serif)", fontSize: "calc(12.5px * var(--ui-font-scale))",
                fontWeight: 400, color: "var(--nuit-bone-soft)", letterSpacing: "0.01em",
              }}>
                Sair
              </span>
            </button>
          </form>
        </div>
      </nav>
    </aside>
  )
}
