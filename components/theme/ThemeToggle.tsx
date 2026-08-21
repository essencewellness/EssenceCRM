"use client"

import { Sun, Moon } from "lucide-react"
import { useTheme } from "./ThemeProvider"

// Interruptor segmentado (direção "C" escolhida entre 3 alternativas
// exploradas em artefacto — ver histórico) — mostra as duas opções lado a
// lado com um indicador a deslizar, em vez de um único ícone a alternar.
// Altura 44px: alvo de toque mínimo recomendado (achado da auditoria
// frontend-a11y — o botão circular anterior tinha só 28-30px).
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme()
  const claro = theme === "light"
  const altura = compact ? 40 : 44
  const largura = compact ? 60 : 64
  const raioOpcao = altura - 10

  return (
    <button
      type="button"
      role="switch"
      aria-checked={claro}
      onClick={toggleTheme}
      title={claro ? "Mudar para modo escuro" : "Mudar para modo claro"}
      aria-label={claro ? "Modo claro ativo — mudar para escuro" : "Modo escuro ativo — mudar para claro"}
      style={{
        position: "relative",
        display: "inline-flex", alignItems: "center",
        width: `${largura}px`, height: `${altura}px`,
        borderRadius: "100px", padding: "5px",
        background: "var(--nuit-overlay)",
        border: "1px solid rgba(212,184,134,0.16)",
        cursor: "pointer",
        flexShrink: 0,
      }}
      className="hover:opacity-85 transition-opacity"
    >
      {/* Indicador deslizante */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute", top: "5px", left: "5px",
          width: `${raioOpcao}px`, height: `${raioOpcao}px`,
          borderRadius: "100px",
          background: "var(--nuit-champagne)",
          transform: claro ? `translateX(${largura - raioOpcao - 10}px)` : "translateX(0)",
          transition: "transform 280ms cubic-bezier(0.22,0.61,0.36,1)",
        }}
      />
      {/* Ícones — sempre visíveis, o ativo fica com contraste total.
          "#161a26" fixo de propósito (não var(--nuit-midnight)): o ícone
          ativo fica sempre sobre o indicador champagne, que é um dourado
          médio nos dois modos — tinta escura lê-se bem nele em qualquer
          tema, ao contrário de --nuit-midnight, que fica claro no modo
          light (é o token do FUNDO, não uma cor de tinta fixa). */}
      <span style={{
        position: "relative", zIndex: 1, flex: 1,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: claro ? "#161a26" : "var(--nuit-smoke)",
      }}>
        <Sun size={compact ? 13 : 14} strokeWidth={2} />
      </span>
      <span style={{
        position: "relative", zIndex: 1, flex: 1,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: !claro ? "#161a26" : "var(--nuit-smoke)",
      }}>
        <Moon size={compact ? 12 : 13} strokeWidth={2} />
      </span>
    </button>
  )
}
