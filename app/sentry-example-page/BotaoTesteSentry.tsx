"use client"

export function BotaoTesteSentry() {
  return (
    <button
      type="button"
      onClick={() => {
        throw new Error("Erro de teste do Sentry — disparado manualmente em /sentry-example-page")
      }}
      style={{
        fontFamily: "sans-serif",
        fontSize: "11px",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        fontWeight: 500,
        color: "#161a26",
        backgroundColor: "#d4b886",
        border: "none",
        borderRadius: "2px",
        padding: "12px 24px",
        cursor: "pointer",
        marginTop: "8px",
      }}
    >
      Disparar erro de teste
    </button>
  )
}
