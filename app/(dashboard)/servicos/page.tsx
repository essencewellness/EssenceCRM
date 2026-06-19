import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import ServicoForm from "./servico-form"

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
      <h1 style={{ fontFamily: "Georgia, serif", fontSize: "22px", color: "#3d2c1e", marginBottom: "8px" }}>
        Catálogo de Serviços
      </h1>
      <p style={{ color: "#8a7460", fontSize: "13px", marginBottom: "28px" }}>
        Gerir serviços, preços base e disponibilidade.
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "36px" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #ddd6c4" }}>
            {["Serviço", "Duração", "Preço Base", "Estado", ""].map(h => (
              <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: "11px", color: "#8a7460", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {servicos.map(s => (
            <tr key={s.id} style={{ borderBottom: "1px solid #f0ebe2", opacity: s.ativo ? 1 : 0.45 }}>
              <td style={{ padding: "10px 12px", fontSize: "14px", color: "#3d2c1e", fontWeight: 500 }}>{s.nome}</td>
              <td style={{ padding: "10px 12px", fontSize: "13px", color: "#6b5b4e" }}>{s.duracaoMinutos} min</td>
              <td style={{ padding: "10px 12px", fontSize: "13px", color: "#3d2c1e", fontWeight: 600 }}>€{Number(s.precoBase).toFixed(2)}</td>
              <td style={{ padding: "10px 12px" }}>
                <span style={{
                  fontSize: "11px", fontWeight: 600, padding: "3px 8px", borderRadius: "20px",
                  background: s.ativo ? "rgba(74,124,89,0.12)" : "rgba(160,100,80,0.1)",
                  color: s.ativo ? "#4a7c59" : "#a06450",
                }}>
                  {s.ativo ? "Ativo" : "Inativo"}
                </span>
              </td>
              <td style={{ padding: "10px 12px" }}>
                <form action={toggleServico.bind(null, s.id, !s.ativo)}>
                  <button type="submit" style={{
                    padding: "5px 12px", borderRadius: "8px", border: "none", fontWeight: 600,
                    fontSize: "12px", cursor: "pointer",
                    background: s.ativo ? "rgba(160,100,80,0.15)" : "rgba(74,124,89,0.15)",
                    color: s.ativo ? "#a06450" : "#4a7c59",
                  }}>
                    {s.ativo ? "Desativar" : "Ativar"}
                  </button>
                </form>
              </td>
            </tr>
          ))}
          {servicos.length === 0 && (
            <tr>
              <td colSpan={5} style={{ padding: "24px 12px", textAlign: "center", color: "#9a8a7a", fontSize: "13px" }}>
                Nenhum serviço registado ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <ServicoForm />
    </div>
  )
}
