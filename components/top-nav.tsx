"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";

const navItems = [
  { label: "Dashboard",    href: "/" },
  { label: "Clientes",     href: "/clientes" },
  { label: "Mensagens IA", href: "/mensagens" },
  { label: "Top Clientes", href: "/top-clientes" },
];

interface TopNavProps {
  userName: string;
  userEmail: string;
  logoutAction: () => Promise<void>;
}

export function TopNav({ userName, userEmail, logoutAction }: TopNavProps) {
  const pathname = usePathname();
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        height: "60px",
        padding: "0 32px",
        backgroundColor: "#0e1119",
        borderBottom: "1px solid rgba(212,184,134,0.12)",
      }}
    >
      {/* ── Lockup canónico NUIT ── */}
      <Link
        href="/"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
          textDecoration: "none",
          flexShrink: 0,
          marginRight: "40px",
        }}
      >
        <Image
          src="/lotus.png"
          alt="Essence Wellness"
          width={28}
          height={28}
          style={{ objectFit: "contain", opacity: 0.92 }}
          priority
        />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "1px" }}>
          <span style={{
            fontFamily: "var(--font-heading, 'DM Serif Display', Georgia, serif)",
            fontSize: "17px",
            lineHeight: 1,
            color: "#ece6d6",
            letterSpacing: "-0.005em",
          }}>
            Essence
          </span>
          <span style={{
            fontFamily: "var(--font-heading, 'DM Serif Display', Georgia, serif)",
            fontSize: "10px",
            lineHeight: 1,
            color: "#d4b886",
          }}>
            Wellness
          </span>
        </div>
      </Link>

      {/* ── Divisor hairline ── */}
      <div style={{
        width: "1px",
        height: "20px",
        backgroundColor: "rgba(212,184,134,0.18)",
        marginRight: "32px",
        flexShrink: 0,
      }} />

      {/* ── Navegação canónica NUIT ── */}
      <nav style={{ display: "flex", alignItems: "center", gap: "4px", flex: 1 }}>
        {navItems.map(({ label, href }) => {
          const isActive = href === "/"
            ? pathname === "/"
            : pathname === href || pathname.startsWith(href + "/");

          return (
            <Link
              key={href}
              href={href}
              style={{
                fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                textDecoration: "none",
                padding: "6px 12px",
                color: isActive ? "#d4b886" : "#ece6d6",
                opacity: isActive ? 1 : 0.55,
                transition: "color 160ms ease, opacity 160ms ease",
                whiteSpace: "nowrap",
                position: "relative",
              }}
            >
              {label}
              {isActive && (
                <span style={{
                  position: "absolute",
                  bottom: "-1px",
                  left: "12px",
                  right: "12px",
                  height: "1px",
                  backgroundColor: "#d4b886",
                }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Utilizador + logout ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px", flexShrink: 0 }}>
        <div style={{
          width: "1px", height: "18px",
          backgroundColor: "rgba(212,184,134,0.15)",
        }} />

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "28px", height: "28px",
            borderRadius: "50%",
            border: "1px solid rgba(212,184,134,0.28)",
            backgroundColor: "rgba(212,184,134,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-sans, sans-serif)",
            fontSize: "10px", fontWeight: 600,
            letterSpacing: "0.04em",
            color: "#d4b886",
            flexShrink: 0,
          }}>
            {initials}
          </div>
          <span style={{
            fontFamily: "var(--font-sans, sans-serif)",
            fontSize: "12px",
            fontWeight: 500,
            color: "rgba(236,230,214,0.70)",
          }}>
            {userName.split(" ")[0]}
          </span>
        </div>

        <form action={logoutAction}>
          <button
            type="submit"
            title="Terminar sessão"
            aria-label="Terminar sessão"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px", height: "28px",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "rgba(236,230,214,0.30)",
              transition: "color 160ms ease",
              padding: 0,
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = "rgba(212,184,134,0.65)")}
            onMouseOut={(e) => (e.currentTarget.style.color = "rgba(236,230,214,0.30)")}
          >
            <LogOut size={13} />
          </button>
        </form>
      </div>
    </header>
  );
}
