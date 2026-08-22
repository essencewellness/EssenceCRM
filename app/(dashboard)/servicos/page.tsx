import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import ServicoForm from "./servico-form"
import { NomeServico } from "@/components/NomeServico"

export const revalidate = 0

async function toggleServico(id: string, ativo: boolean) {
  "use server"
  await prisma.servico.update({ where: { id }, data: { ativo } })
  revalidatePath("/servicos")
}

export default async function ServicosPage() {
  const servicos = await prisma.servico.findMany({
    orderBy: { criadoEm: "asc" },
  })

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto" }}>
      <h1 style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "22px", color: "var(--nuit-bone)", marginBottom: "8px" }}>
        Catálogo de Serviços
      </h1>
      <p style={{ color: "var(--nuit-bone-soft)", fontSize: "13px", marginBottom: "28px" }}>
        Gerir serviços, preços base e disponibilidade.
      </p>

      <div style={{ overflowX: "auto", marginBottom: "36px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "480px" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(212,184,134,0.16)" }}>
            {["Serviço", "Duração", "Preço Base", "Estado", ""].map(h => (
              <th key={h} style={{
                textAlign: "left", padding: "8px 12px", fontSize: "11px",
                color: "var(--nuit-bone-soft)", textTransform: "uppercase",
                letterSpacing: "0.08em", backgroundColor: "rgba(212,184,134,0.06)",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {servicos.map(s => (
            <tr key={s.id} style={{ borderBottom: "1px solid rgba(212,184,134,0.10)", opacity: s.ativo ? 1 : 0.45 }}>
              <td style={{ padding: "10px 12px", fontSize: "14px", color: "var(--nuit-bone)", fontWeight: 500 }}><NomeServico nome={s.nome} /></td>
              <td style={{ padding: "10px 12px", fontSize: "13px", color: "var(--nuit-bone-soft)" }}>{s.duracaoMinutos} min</td>
              <td style={{ padding: "10px 12px", fontSize: "13px", color: "var(--nuit-champagne-soft)", fontWeight: 600 }}>€{Number(s.precoBase).toFixed(2)}</td>
              <td style={{ padding: "10px 12px" }}>
                <span style={{
                  fontSize: "11px", fontWeight: 600, padding: "3px 8px", borderRadius: "20px",
                  background: s.ativo ? "rgba(122,158,126,0.12)" : "rgba(176,96,80,0.10)",
                  color: s.ativo ? "#7a9e7e" : "var(--destructive)",
                }}>
                  {s.ativo ? "Ativo" : "Inativo"}
                </span>
              </td>
              <td style={{ padding: "10px 12px" }}>
                <form action={toggleServico.bind(null, s.id, !s.ativo)}>
                  <button type="submit" style={{
                    padding: "5px 12px", borderRadius: "8px",
                    border: `1px solid ${s.ativo ? "rgba(176,96,80,0.30)" : "rgba(122,158,126,0.30)"}`,
                    fontWeight: 600, fontSize: "12px", cursor: "pointer",
                    background: "transparent",
                    color: s.ativo ? "var(--destructive)" : "#7a9e7e",
                  }}>
                    {s.ativo ? "Desativar" : "Ativar"}
                  </button>
                </form>
              </td>
            </tr>
          ))}
          {servicos.length === 0 && (
            <tr>
              <td colSpan={5} style={{ padding: "24px 12px", textAlign: "center", color: "var(--nuit-bone-soft)", fontSize: "13px" }}>
                Nenhum serviço registado ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

      <ServicoForm />
    </div>
  )
}
