import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getContextoUtilizador } from "@/lib/contexto-utilizador";
import ServicoForm from "@/app/(dashboard)/servicos/servico-form";

export const revalidate = 0;

async function toggleServico(id: string, ativo: boolean) {
  "use server";
  await prisma.servico.update({ where: { id }, data: { ativo } });
  revalidatePath("/configuracoes/servicos");
  revalidatePath("/servicos");
}

export default async function ConfigServicosPage() {
  await getContextoUtilizador();

  const servicos = await prisma.servico.findMany({
    orderBy: { criadoEm: "asc" },
  });

  return (
    <div>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{
          fontFamily: "var(--font-heading, Georgia, serif)",
          fontSize: "20px", fontWeight: 400, color: "#161a26",
          marginBottom: "6px",
        }}>
          Catálogo de Serviços
        </h1>
        <p style={{
          fontFamily: "var(--font-sans, sans-serif)",
          fontSize: "13px", color: "var(--nuit-bone-soft)", lineHeight: 1.6,
        }}>
          Gerir serviços, preços base e disponibilidade.
        </p>
      </div>

      <div style={{ maxWidth: "640px" }}>
        <div style={{
          backgroundColor: "#faf8f6",
          border: "1px solid #e0d8cc",
          borderRadius: "4px",
          overflow: "hidden",
          marginBottom: "24px",
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e8e2d9" }}>
                {["Serviço", "Duração", "Preço", "Estado", ""].map(h => (
                  <th key={h} style={{
                    textAlign: "left", padding: "10px 16px",
                    fontSize: "9px", color: "#9d9d9a",
                    textTransform: "uppercase", letterSpacing: "0.2em",
                    fontFamily: "var(--font-sans, sans-serif)", fontWeight: 600,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {servicos.map(s => (
                <tr key={s.id} style={{ borderBottom: "1px solid #f2ede6", opacity: s.ativo ? 1 : 0.5 }}>
                  <td style={{ padding: "12px 16px", fontFamily: "var(--font-sans)", fontSize: "13px", fontWeight: 500, color: "#161a26" }}>{s.nome}</td>
                  <td style={{ padding: "12px 16px", fontFamily: "var(--font-sans)", fontSize: "13px", color: "var(--nuit-bone-soft)" }}>{s.duracaoMinutos} min</td>
                  <td style={{ padding: "12px 16px", fontFamily: "var(--font-sans)", fontSize: "13px", fontWeight: 600, color: "#161a26" }}>€{Number(s.precoBase).toFixed(0)}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "20px",
                      fontFamily: "var(--font-sans)", letterSpacing: "0.06em",
                      background: s.ativo ? "rgba(122,158,126,0.12)" : "rgba(176,96,80,0.10)",
                      color: s.ativo ? "#7a9e7e" : "#b06050",
                    }}>
                      {s.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <form action={toggleServico.bind(null, s.id, !s.ativo)}>
                      <button type="submit" style={{
                        padding: "4px 10px", borderRadius: "3px", border: "none",
                        fontFamily: "var(--font-sans)", fontWeight: 600,
                        fontSize: "11px", cursor: "pointer",
                        background: s.ativo ? "rgba(176,96,80,0.10)" : "rgba(122,158,126,0.12)",
                        color: s.ativo ? "#b06050" : "#7a9e7e",
                      }}>
                        {s.ativo ? "Desativar" : "Ativar"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {servicos.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: "28px 16px", textAlign: "center", fontFamily: "var(--font-sans)", color: "#9d9d9a", fontSize: "13px" }}>
                    Nenhum serviço registado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <ServicoForm />
      </div>
    </div>
  );
}
