"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { atualizarPreferenciaFonte } from "./actions";

const GOLD = "var(--nuit-champagne)";

const NIVEIS: { valor: "baixo" | "medio" | "alto"; label: string; amostra: string }[] = [
  { valor: "baixo", label: "Baixo", amostra: "Aa" },
  { valor: "medio", label: "Médio", amostra: "Aa" },
  { valor: "alto", label: "Alto", amostra: "Aa" },
];

const AMOSTRA_ESCALA: Record<string, number> = { baixo: 1, medio: 1.14, alto: 1.28 };

interface PreferenciaFonteFormProps {
  nivelInicial: string;
}

export function PreferenciaFonteForm({ nivelInicial }: PreferenciaFonteFormProps) {
  const router = useRouter();
  const [nivel, setNivel] = useState(nivelInicial);
  const [isPending, startTransition] = useTransition();

  function escolher(valor: string) {
    if (valor === nivel || isPending) return;
    setNivel(valor);
    startTransition(async () => {
      await atualizarPreferenciaFonte(valor);
      router.refresh();
    });
  }

  const secaoStyle: React.CSSProperties = {
    backgroundColor: "#faf8f6",
    border: "1px solid #e0d8cc",
    borderRadius: "4px",
    padding: "24px",
    marginBottom: "20px",
  };

  const tituloSecao: React.CSSProperties = {
    fontFamily: "var(--font-heading, Georgia, serif)",
    fontSize: "15px", color: "var(--nuit-midnight)",
    fontWeight: 400, marginBottom: "8px",
  };

  return (
    <div style={secaoStyle}>
      <h2 style={tituloSecao}>Tamanho do Texto</h2>
      <p style={{
        fontFamily: "var(--font-sans, sans-serif)", fontSize: "12.5px",
        color: "#7a7266", lineHeight: 1.6, marginBottom: "18px",
      }}>
        Ajusta o tamanho de todo o CRM — texto, ícones e espaçamento. Útil no iPad, onde o ecrã é maior mas mais longe dos olhos.
      </p>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {NIVEIS.map(({ valor, label, amostra }) => {
          const ativo = nivel === valor;
          return (
            <button
              key={valor}
              type="button"
              onClick={() => escolher(valor)}
              disabled={isPending}
              aria-pressed={ativo}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
                minWidth: "84px", padding: "14px 16px",
                backgroundColor: ativo ? "rgba(212,184,134,0.14)" : "#ffffff",
                border: ativo ? `1.5px solid ${GOLD}` : "1px solid #e0d8cc",
                borderRadius: "6px", cursor: isPending ? "wait" : "pointer",
                transition: "border-color 160ms ease, background-color 160ms ease, transform 160ms ease",
                opacity: isPending && !ativo ? 0.5 : 1,
              }}
            >
              <span style={{
                fontFamily: "var(--font-heading, Georgia, serif)",
                fontSize: `${18 * AMOSTRA_ESCALA[valor]}px`,
                color: ativo ? "var(--nuit-midnight)" : "#4a463f",
                lineHeight: 1,
              }}>
                {amostra}
              </span>
              <span style={{
                fontFamily: "var(--font-sans, sans-serif)", fontSize: "10px", fontWeight: 700,
                letterSpacing: "0.14em", textTransform: "uppercase",
                color: ativo ? "var(--nuit-midnight)" : "#8a8478",
              }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {isPending && (
        <p style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "11px", color: "#a08a66", marginTop: "12px" }}>
          A aplicar…
        </p>
      )}
    </div>
  );
}
