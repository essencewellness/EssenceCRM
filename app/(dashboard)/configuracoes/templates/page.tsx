import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getContextoUtilizador } from "@/lib/contexto-utilizador";
import { TemplatesManager } from "./TemplatesManager";

export default async function ConfigTemplatesPage() {
  const ctx = await getContextoUtilizador();
  if (!ctx.isAdmin) redirect("/configuracoes/perfil");

  const templates = await prisma.templateMensagem.findMany({
    orderBy: [{ tipo: "asc" }, { nome: "asc" }],
  });

  return (
    <div>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{
          fontFamily: "var(--font-heading, Georgia, serif)",
          fontSize: "20px", fontWeight: 400, color: "var(--nuit-bone)",
          marginBottom: "6px",
        }}>
          Templates de Mensagem
        </h1>
        <p style={{
          fontFamily: "var(--font-sans, sans-serif)",
          fontSize: "13px", color: "var(--nuit-bone-soft)", lineHeight: 1.6,
        }}>
          Textos reutilizáveis para comunicação automática com clientes.
        </p>
      </div>

      <TemplatesManager templates={templates} />
    </div>
  );
}
