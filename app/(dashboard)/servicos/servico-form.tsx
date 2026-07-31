"use client"
import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { criarServico } from "./actions"

export default function ServicoForm() {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [aGuardar, setAGuardar] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro(null)
    setAGuardar(true)

    const result = await criarServico(new FormData(e.currentTarget))
    setAGuardar(false)

    if (result.erro) {
      setErro(result.erro)
    } else {
      formRef.current?.reset()
      router.refresh()
    }
  }

  const inputStyle: React.CSSProperties = {
    padding: "8px 12px", borderRadius: "8px",
    border: "1px solid rgba(212,184,134,0.22)",
    backgroundColor: "var(--nuit-midnight)",
    color: "var(--nuit-bone)",
    fontSize: "14px", width: "100%", boxSizing: "border-box",
    outline: "none",
  }

  return (
    <div style={{ background: "rgba(185,160,122,0.06)", borderRadius: "12px", padding: "20px 24px", border: "1px solid rgba(185,160,122,0.2)" }}>
      <h2 style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "15px", color: "var(--nuit-bone)", marginBottom: "16px" }}>Novo Serviço</h2>
      <form ref={formRef} onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: "12px", color: "var(--nuit-bone-soft)", display: "block", marginBottom: "4px" }}>Nome *</label>
          <input name="nome" style={inputStyle} required placeholder="Ex: Drenagem Linfática" />
        </div>
        <div>
          <label style={{ fontSize: "12px", color: "var(--nuit-bone-soft)", display: "block", marginBottom: "4px" }}>Preço Base (€) *</label>
          <input name="precoBase" style={inputStyle} type="number" step="0.01" min="0" required placeholder="40" />
        </div>
        <div>
          <label style={{ fontSize: "12px", color: "var(--nuit-bone-soft)", display: "block", marginBottom: "4px" }}>Duração (min)</label>
          <input name="duracaoMinutos" style={inputStyle} type="number" min="5" max="480" defaultValue="60" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ fontSize: "12px", color: "var(--nuit-bone-soft)", display: "block", marginBottom: "4px" }}>Descrição</label>
          <input name="descricao" style={inputStyle} placeholder="Breve descrição (opcional)" />
        </div>
        {erro && <p style={{ gridColumn: "1 / -1", color: "#b44", fontSize: "13px", margin: 0 }}>{erro}</p>}
        <div style={{ gridColumn: "1 / -1" }}>
          <button type="submit" disabled={aGuardar} style={{
            padding: "8px 16px", borderRadius: "8px", border: "none",
            background: "rgba(185,160,122,0.85)", color: "#fff", fontWeight: 600,
            fontSize: "13px", cursor: aGuardar ? "default" : "pointer", opacity: aGuardar ? 0.7 : 1,
          }}>
            {aGuardar ? "A guardar…" : "Criar Serviço"}
          </button>
        </div>
      </form>
    </div>
  )
}
