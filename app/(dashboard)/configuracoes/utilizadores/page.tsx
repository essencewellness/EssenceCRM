import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getContextoUtilizador } from "@/lib/contexto-utilizador";
import { UtilizadoresManager } from "./UtilizadoresManager";

export default async function UtilizadoresPage() {
  const ctx = await getContextoUtilizador();
  if (!ctx.isAdmin) redirect("/configuracoes/perfil");

  const utilizadores = await prisma.user.findMany({
    select: { id: true, username: true, name: true, email: true, role: true, ativo: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{
          fontFamily: "var(--font-heading, Georgia, serif)",
          fontSize: "20px", fontWeight: 400, color: "#161a26",
          marginBottom: "6px",
        }}>
          Utilizadores
        </h1>
        <p style={{
          fontFamily: "var(--font-sans, sans-serif)",
          fontSize: "13px", color: "#7a7e8a", lineHeight: 1.6,
        }}>
          Gerir contas de acesso ao CRM.
        </p>
      </div>

      <UtilizadoresManager utilizadores={utilizadores} />
    </div>
  );
}
