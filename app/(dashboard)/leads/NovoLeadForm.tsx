"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { UserPlus, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { criarLeadManual } from "./actions"

const GOLD = "#b9a07a"

export function NovoLeadForm() {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [telefone, setTelefone] = useState("")
  const [origem, setOrigem] = useState("")
  const [erro, setErro] = useState<string | null>(null)
  const [aGuardar, setAGuardar] = useState(false)

  async function submeter() {
    setErro(null)
    setAGuardar(true)
    try {
      const resultado = await criarLeadManual({ nome, email, telefone, comoNosConheceu: origem })
      if (!resultado.ok) {
        setErro(resultado.erro)
        return
      }
      setNome(""); setEmail(""); setTelefone(""); setOrigem("")
      setAberto(false)
      router.refresh()
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setAGuardar(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        style={{
          display: "inline-flex", alignItems: "center", gap: "8px",
          height: "38px", padding: "0 16px",
          fontFamily: "var(--font-sans, sans-serif)", fontSize: "11px", fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase",
          color: "#161a26", backgroundColor: GOLD, border: `1px solid ${GOLD}`,
          cursor: "pointer",
        }}
      >
        <UserPlus size={14} />
        Adicionar Lead
      </button>

      <AnimatePresence>
        {aberto && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 60, backgroundColor: "rgba(14,17,25,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
            onClick={() => !aGuardar && setAberto(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              style={{ width: "100%", maxWidth: "420px", backgroundColor: "#161a26", border: "1px solid rgba(212,184,134,0.20)", borderRadius: "2px", padding: "24px" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
                <h2 style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "18px", color: "#ece6d6" }}>Adicionar lead</h2>
                <button onClick={() => setAberto(false)} style={{ color: "#7a7e8a", cursor: "pointer" }}><X size={16} /></button>
              </div>

              <p style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "11px", color: "var(--nuit-bone-soft)", marginBottom: "18px", lineHeight: 1.6 }}>
                Para quando alguém pergunta pelo WhatsApp/Instagram e depois não diz mais nada — guarda o contacto na mesma.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <label style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--nuit-bone-soft)" }}>
                  Nome *
                  <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da pessoa" style={inputStyle} />
                </label>
                <label style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--nuit-bone-soft)" }}>
                  Telefone
                  <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="+351 9XX XXX XXX" style={inputStyle} />
                </label>
                <label style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--nuit-bone-soft)" }}>
                  Email
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" style={inputStyle} />
                </label>
                <label style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--nuit-bone-soft)" }}>
                  Como chegou até nós
                  <Input value={origem} onChange={(e) => setOrigem(e.target.value)} placeholder="ex: Instagram, perguntou no balcão…" style={inputStyle} />
                </label>
              </div>

              {erro && (
                <p style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "11px", color: "#b06050", marginTop: "12px" }}>{erro}</p>
              )}

              <button
                onClick={submeter}
                disabled={aGuardar || !nome.trim()}
                style={{
                  marginTop: "20px", width: "100%", height: "40px",
                  fontFamily: "var(--font-sans, sans-serif)", fontSize: "11px", fontWeight: 700,
                  letterSpacing: "0.16em", textTransform: "uppercase",
                  color: "#161a26", backgroundColor: GOLD, border: "none",
                  opacity: aGuardar || !nome.trim() ? 0.5 : 1,
                  cursor: aGuardar || !nome.trim() ? "not-allowed" : "pointer",
                }}
              >
                {aGuardar ? "A guardar…" : "Guardar lead"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

const inputStyle: React.CSSProperties = {
  marginTop: "6px", backgroundColor: "var(--nuit-deep)",
  border: "1px solid rgba(212,184,134,0.20)", color: "var(--nuit-bone)",
  fontSize: "13px", fontFamily: "var(--font-body, sans-serif)",
  borderRadius: "0px", height: "38px", boxShadow: "none",
}
