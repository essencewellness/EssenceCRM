"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const GOLD = "var(--nuit-champagne)";

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

export function ConfiguracoesNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const tabs = isAdmin ? tabsAdmin : tabsTerapeuta;

  return (
    <div style={{
      display: "flex",
      gap: "4px",
      marginBottom: "24px",
      borderBottom: "1px solid #e8e2d9",
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
              color: isActive ? "var(--nuit-midnight)" : "#9d9d9a",
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
  );
}
