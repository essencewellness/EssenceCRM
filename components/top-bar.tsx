"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";

const routeLabels: Record<string, string> = {
  "/":             "Dashboard",
  "/clientes":     "Clientes",
  "/mensagens":    "Mensagens IA",
  "/top-clientes": "Top Clientes",
  "/blacklist":    "Blacklist",
};

function getPageTitle(pathname: string): string {
  if (routeLabels[pathname]) return routeLabels[pathname];
  for (const [route, label] of Object.entries(routeLabels)) {
    if (route !== "/" && pathname.startsWith(route + "/")) {
      return label;
    }
  }
  return "Essence CRM";
}

function formatDatePT(date: Date): string {
  return date.toLocaleDateString("pt-PT", {
    weekday: "long", day: "numeric",
    month: "long", year: "numeric",
  });
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function TopBar() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const [hoje, setHoje] = useState<{ label: string; iso: string } | null>(null);

  useEffect(() => {
    const now = new Date();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHoje({
      label: capitalize(formatDatePT(now)),
      iso: now.toISOString().split("T")[0],
    });
  }, []);

  return (
    <header
      className="sticky top-0 z-30 flex h-14 items-center justify-between px-8"
      style={{
        backgroundColor: "rgba(237,231,227,0.92)",
        backdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(217,217,214,0.6)",
      }}
    >
      {/* Linha dourada de progresso no topo */}
      <motion.div
        key={pathname}
        initial={{ scaleX: 0, opacity: 1 }}
        animate={{ scaleX: 1, opacity: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute", top: 0, left: 0, right: 0,
          height: "1.5px",
          background: "linear-gradient(to right, transparent, var(--nuit-champagne-soft), transparent)",
          transformOrigin: "left",
          pointerEvents: "none",
        }}
      />

      {/* Título com AnimatePresence — muda quando a rota muda */}
      <AnimatePresence mode="wait">
        <motion.h1
          key={title}
          initial={{ opacity: 0, y: -6, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: 6, filter: "blur(4px)" }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: "var(--font-heading, Georgia, serif)",
            fontSize: "16px", fontWeight: 400,
            color: "var(--nuit-midnight)", letterSpacing: "0.01em",
          }}
        >
          {title}
        </motion.h1>
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex items-center gap-3"
      >
        {/* Linha dourada decorativa */}
        <div style={{
          width: "24px", height: "1px",
          background: "linear-gradient(to right, transparent, rgba(185,160,122,0.5))",
        }} />
        <time
          dateTime={hoje?.iso ?? ""}
          style={{
            fontFamily: "var(--font-sans, sans-serif)",
            fontSize: "11px", color: "#9d9d9a",
            letterSpacing: "0.04em", fontStyle: "italic",
          }}
        >
          {hoje?.label ?? ""}
        </time>
      </motion.div>
    </header>
  );
}
