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
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Menu lateral deslizante */}
      {menuOpen && (
        <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl z-50 lg:hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
                <span className="text-white font-bold text-xs">EW</span>
              </div>
              <span className="font-semibold text-[#064E3B] text-sm">Essence Wellness</span>
            </div>
            <button
              onClick={() => setMenuOpen(false)}
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="flex-1 py-4 overflow-y-auto">
            {ALL_ITEMS.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    active
                      ? "bg-emerald-50 text-emerald-700 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? "text-emerald-600" : "text-gray-400"}`} />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      )}

      {/* Barra inferior */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-white border-t border-gray-100 safe-area-inset-bottom">
        <div className="flex items-center justify-around px-2 h-16">
          {MAIN_ITEMS.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            const badge = item.href === "/mensagens" && mensagensPendentes > 0 ? mensagensPendentes : 0
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors ${
                  active ? "text-emerald-600" : "text-gray-400"
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-1.5 w-4 h-4 text-[9px] font-bold bg-emerald-600 text-white rounded-full flex items-center justify-center">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            )
          })}
          <button
            onClick={() => setMenuOpen(true)}
            className="flex flex-col items-center gap-1 px-3 py-1.5 text-gray-400 cursor-pointer"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] font-medium">Menu</span>
          </button>
        </div>
      </nav>
    </>
  )
}
