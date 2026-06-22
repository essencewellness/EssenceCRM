"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

const GOLD = "#d4b886";
const CREAM = "#ece6d6";

const tabsAdmin = [
  { href: "/configuracoes/perfil",       label: "O Meu Perfil" },
  { href: "/configuracoes/etiquetas",    label: "Etiquetas" },
  { href: "/configuracoes/templates",    label: "Templates" },
  { href: "/configuracoes/servicos",     label: "Serviços" },
  { href: "/configuracoes/negocio",      label: "Negócio" },
  { href: "/configuracoes/utilizadores", label: "Utilizadores" },
  { href: "/configuracoes/integracoes",  label: "Integrações" },
];

const tabsTerapeuta = [
  { href: "/configuracoes/perfil", label: "O Meu Perfil" },
];

export default function ConfiguracoesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role ?? "terapeuta";
  const tabs = role === "admin" ? tabsAdmin : tabsTerapeuta;

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", paddingTop: "8px" }}>
      {/* Cabeçalho */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{
          fontFamily: "var(--font-heading, Georgia, serif)",
          fontSize: "22px",
          color: "#161a26",
          fontWeight: 400,
          letterSpacing: "-0.01em",
          marginBottom: "4px",
        }}>
          Configurações
        </h1>
        <p style={{
          fontFamily: "var(--font-sans, sans-serif)",
          fontSize: "13px",
          color: "#9d9d9a",
        }}>
          Gere as preferências e definições do CRM
        </p>
      </div>

      {/* Tabs de navegação */}
      <div style={{
        display: "flex",
        gap: "4px",
        marginBottom: "24px",
        borderBottom: "1px solid #e8e2d9",
        paddingBottom: "0",
        flexWrap: "wrap",
      }}>
        {tabs.map(({ href, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              style={{
                fontFamily: "var(--font-sans, sans-serif)",
                fontSize: "13px",
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "#161a26" : "#9d9d9a",
                padding: "8px 14px",
                borderBottom: isActive ? `2px solid ${GOLD}` : "2px solid transparent",
                textDecoration: "none",
                transition: "color 150ms, border-color 150ms",
                marginBottom: "-1px",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {/* Conteúdo da tab activa */}
      <div>{children}</div>
    </div>
  );
}
