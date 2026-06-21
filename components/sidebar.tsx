"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { LayoutDashboard, Users, MessageSquare, Trophy, ShieldAlert, LogOut, CreditCard, FileText, Send, Package, Tag } from "lucide-react";

const GOLD = "#d4b886";
const CREAM = "#ece6d6";

const navItems = [
  { label: "Dashboard",     href: "/",             icon: LayoutDashboard },
  { label: "Clientes",      href: "/clientes",     icon: Users },
  { label: "Mensagens IA",  href: "/mensagens",    icon: MessageSquare },
  { label: "Top Clientes",  href: "/top-clientes", icon: Trophy },
  { label: "Financeiro",    href: "/financeiro",   icon: CreditCard },
  { label: "Serviços",      href: "/servicos",     icon: Package },
  { label: "Templates",     href: "/templates",    icon: FileText },
  { label: "Campanhas",     href: "/campanhas",    icon: Send },
  { label: "Etiquetas",     href: "/etiquetas",    icon: Tag },
];

interface SidebarProps {
  userName: string;
  userEmail: string;
  logoutAction: () => Promise<void>;
}

export function Sidebar({ userName, userEmail, logoutAction }: SidebarProps) {
  const pathname = usePathname();
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-y-0 left-0 z-40 flex flex-col"
      style={{ width: "260px", backgroundColor: "#0e1119" }}
    >
      {/* ── Logo ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center gap-3.5 px-6 py-7"
        style={{ borderBottom: `1px solid rgba(212,184,134,0.15)` }}
      >
        {/* Lotus SVG com glow */}
        <div style={{ position: "relative" }}>
          <motion.div
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute", inset: "-8px",
              borderRadius: "50%",
              background: `radial-gradient(circle, rgba(212,184,134,0.15) 0%, transparent 70%)`,
              pointerEvents: "none",
            }}
          />
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
            <path
              d="M13 22 C13 22 8.5 17 8.5 12 C8.5 8.4 10.5 6.5 13 6.5 C15.5 6.5 17.5 8.4 17.5 12 C17.5 17 13 22 13 22Z"
              stroke={GOLD} strokeWidth="1.1" fill={`${GOLD}18`}
            />
            <path
              d="M5.5 19.5 C5.5 19.5 3.5 14.5 5.5 10.5 C7 7.5 9.5 7.5 10.5 9.5 C11.5 11.5 9.5 15 8.5 17 C7.5 18.5 5.5 19.5 5.5 19.5Z"
              stroke={GOLD} strokeWidth="0.9" fill={`${GOLD}0e`}
            />
            <path
              d="M20.5 19.5 C20.5 19.5 22.5 14.5 20.5 10.5 C19 7.5 16.5 7.5 15.5 9.5 C14.5 11.5 16.5 15 17.5 17 C18.5 18.5 20.5 19.5 20.5 19.5Z"
              stroke={GOLD} strokeWidth="0.9" fill={`${GOLD}0e`}
            />
            <line x1="13" y1="22" x2="13" y2="25.5" stroke={GOLD} strokeWidth="0.8" strokeOpacity="0.4" />
            <path d="M8 25.5 C8 25.5 10 23.5 13 23.5 C16 23.5 18 25.5 18 25.5"
              stroke={GOLD} strokeWidth="0.7" strokeOpacity="0.3" strokeLinecap="round" />
          </svg>
        </div>

        <div>
          <p style={{
            fontFamily: "var(--font-heading, Georgia, serif)",
            color: CREAM, fontSize: "15px",
            letterSpacing: "0.08em", fontWeight: 400, lineHeight: 1,
          }}>
            ESSENCE
          </p>
          <p style={{
            fontFamily: "var(--font-sans, sans-serif)",
            color: GOLD, fontSize: "8.5px",
            letterSpacing: "0.22em", fontWeight: 600, marginTop: "4px",
          }}>
            WELLNESS · CRM
          </p>
        </div>
      </motion.div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-4 py-6 space-y-0.5">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            fontFamily: "var(--font-sans, sans-serif)",
            color: `rgba(212,184,134,0.38)`,
            fontSize: "8px", fontWeight: 700,
            letterSpacing: "0.28em",
            padding: "0 8px 10px",
          }}
        >
          NAVEGAÇÃO
        </motion.p>

        {navItems.map(({ label, href, icon: Icon }, i) => {
          const isActive =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(href + "/");

          return (
            <motion.div
              key={href}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
              style={{ position: "relative" }}
            >
              {/* Background pill animado com layoutId */}
              {isActive && (
                <motion.div
                  layoutId="nav-active-bg"
                  style={{
                    position: "absolute", inset: 0,
                    borderRadius: "8px",
                    backgroundColor: "rgba(212,184,134,0.09)",
                    border: "1px solid rgba(212,184,134,0.15)",
                  }}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}

              {/* Barra lateral esquerda */}
              {isActive && (
                <motion.div
                  layoutId="nav-active-bar"
                  style={{
                    position: "absolute", left: 0,
                    top: "20%", bottom: "20%",
                    width: "2px", borderRadius: "2px",
                    backgroundColor: GOLD,
                    boxShadow: `0 0 8px rgba(212,184,134,0.5)`,
                  }}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}

              <Link
                href={href}
                className="relative flex items-center gap-3 rounded-lg py-2.5 pr-3 transition-all duration-200 group"
                style={{
                  fontFamily: "var(--font-sans, sans-serif)",
                  fontSize: "13px",
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? GOLD : `rgba(237,231,227,0.45)`,
                  paddingLeft: "12px",
                  letterSpacing: "0.02em",
                  textDecoration: "none",
                }}
              >
                <motion.span
                  whileHover={{ scale: 1.15, rotate: isActive ? 0 : 5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  style={{ display: "flex", flexShrink: 0 }}
                >
                  <Icon
                    size={15}
                    style={{ color: isActive ? GOLD : `rgba(237,231,227,0.28)` }}
                    className="transition-colors duration-200 group-hover:text-[#b9a07a]/60"
                  />
                </motion.span>

                <span className="transition-colors duration-200 group-hover:text-[rgba(237,231,227,0.7)]">
                  {label}
                </span>

                {/* Shimmer on hover (não activo) */}
                {!isActive && (
                  <motion.div
                    whileHover={{ opacity: 1 }}
                    initial={{ opacity: 0 }}
                    style={{
                      position: "absolute", inset: 0,
                      borderRadius: "8px",
                      backgroundColor: "rgba(237,231,227,0.03)",
                      pointerEvents: "none",
                    }}
                  />
                )}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* ── Hidden blacklist link ── */}
      <div className="flex justify-end px-5 pb-2">
        <Link
          href="/blacklist"
          title=""
          style={{
            opacity: pathname === "/blacklist" ? 0.55 : 0.08,
            transition: "opacity 200ms",
          }}
          className="hover:!opacity-35 p-1.5 rounded"
        >
          <ShieldAlert size={11} color={GOLD} />
        </Link>
      </div>

      {/* ── Tagline ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="px-6 pb-4"
      >
        <p style={{
          fontFamily: "var(--font-heading, Georgia, serif)",
          fontStyle: "italic",
          color: `rgba(212,184,134,0.22)`,
          fontSize: "10px",
          letterSpacing: "0.03em",
          lineHeight: 1.5,
        }}>
          &ldquo;A Essência do Cuidado.&rdquo;
        </p>
      </motion.div>

      {/* ── User block ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="px-4 py-4"
        style={{ borderTop: `1px solid rgba(212,184,134,0.12)` }}
      >
        <div className="flex items-center gap-3 px-2 py-2">
          <motion.div
            whileHover={{ scale: 1.08 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs cursor-default"
            style={{
              backgroundColor: `rgba(212,184,134,0.10)`,
              color: GOLD,
              border: `1px solid rgba(212,184,134,0.28)`,
              fontFamily: "var(--font-sans, sans-serif)",
              fontWeight: 600,
              letterSpacing: "0.06em",
              boxShadow: "0 0 0 0 rgba(212,184,134,0)",
            }}
          >
            {initials}
          </motion.div>
          <div className="min-w-0 flex-1">
            <p className="truncate" style={{
              fontFamily: "var(--font-sans, sans-serif)",
              fontWeight: 500, fontSize: "13px", color: CREAM,
            }}>
              {userName}
            </p>
            <p className="truncate" style={{
              fontFamily: "var(--font-body, sans-serif)",
              fontSize: "11px",
              color: `rgba(237,231,227,0.32)`,
            }}>
              {userEmail}
            </p>
          </div>
          <form action={logoutAction}>
            <motion.button
              type="submit"
              whileHover={{ scale: 1.15, color: "rgba(212,184,134,0.7)" }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              title="Terminar sessão"
              aria-label="Terminar sessão"
              className="rounded p-1.5 cursor-pointer"
              style={{ color: `rgba(237,231,227,0.22)` }}
            >
              <LogOut size={13} />
            </motion.button>
          </form>
        </div>
      </motion.div>
    </motion.aside>
  );
}
