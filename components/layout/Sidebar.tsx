"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Users, Calendar, CheckSquare,
  MessageSquare, Megaphone, FileText,
  BarChart2, Star, Shield,
  Settings, ChevronRight,
} from "lucide-react"
import Image from "next/image"

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
    label: "PRINCIPAL",
    items: [
      { href: "/",          label: "Dashboard",  icon: LayoutDashboard },
      { href: "/clientes",  label: "Clientes",   icon: Users },
      { href: "/sessoes",   label: "Sessões",     icon: Calendar },
      { href: "/tarefas",   label: "Tarefas",    icon: CheckSquare },
    ],
  },
  {
    label: "COMUNICAÇÃO",
    items: [
      { href: "/mensagens",  label: "Mensagens",  icon: MessageSquare },
      { href: "/campanhas",  label: "Campanhas",  icon: Megaphone },
      { href: "/templates",  label: "Templates",  icon: FileText },
    ],
  },
  {
    label: "ANÁLISE",
    items: [
      { href: "/pipeline",      label: "Pipeline",     icon: BarChart2 },
      { href: "/top-clientes",  label: "Top Clientes", icon: Star },
    ],
  },
  {
    label: "CONFIGURAÇÕES",
    items: [
      { href: "/configuracoes", label: "Configurações", icon: Settings },
      { href: "/blacklist",     label: "Blacklist",     icon: Shield },
    ],
  },
]

interface SidebarProps {
  mensagensPendentes?: number
}

export function Sidebar({ mensagensPendentes = 0 }: SidebarProps) {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  // Inject badge into mensagens
  const gruposComBadge = grupos.map((g) => ({
    ...g,
    items: g.items.map((item) =>
      item.href === "/mensagens" && mensagensPendentes > 0
        ? { ...item, badge: mensagensPendentes }
        : item
    ),
  }))

  return (
    <aside className="hidden lg:flex flex-col w-56 min-h-screen bg-white border-r border-gray-100 shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">EW</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-[#064E3B]">Essence</div>
            <div className="text-xs text-gray-400">Wellness CRM</div>
          </div>
        </div>
      </div>

      {/* Grupos de navegação */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {gruposComBadge.map((grupo) => (
          <div key={grupo.label} className="mb-4">
            <div className="px-4 py-1 text-[10px] font-semibold tracking-widest text-gray-400">
              {grupo.label}
            </div>
            {grupo.items.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 mx-2 px-3 py-2 rounded-lg text-sm transition-all group ${
                    active
                      ? "bg-emerald-50 text-emerald-700 font-medium"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? "text-emerald-600" : "text-gray-400 group-hover:text-gray-600"}`} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge ? (
                    <span className="flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-emerald-600 text-white rounded-full">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  ) : active ? (
                    <ChevronRight className="w-3 h-3 text-emerald-400" />
                  ) : null}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Rodapé */}
      <div className="px-4 py-3 border-t border-gray-100">
        <p className="text-[10px] text-gray-300 text-center">Essence Wellness · CRM v1</p>
      </div>
    </aside>
  )
}
