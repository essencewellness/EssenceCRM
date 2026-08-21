import { prisma } from "@/lib/prisma";
import { getContextoUtilizador } from "@/lib/contexto-utilizador";
import { EtiquetasManager } from "@/app/(dashboard)/etiquetas/EtiquetasManager";

export default async function ConfigEtiquetasPage() {
  await getContextoUtilizador();

  const etiquetas = await prisma.etiqueta.findMany({
    orderBy: [{ tipo: "asc" }, { nome: "asc" }],
    include: { _count: { select: { clientes: true } } },
  });

  return (
    <div>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{
          fontFamily: "var(--font-heading, Georgia, serif)",
          fontSize: "20px", fontWeight: 400, color: "var(--nuit-midnight)",
          marginBottom: "6px",
        }}>
          Etiquetas
        </h1>
        <p style={{
          fontFamily: "var(--font-sans, sans-serif)",
          fontSize: "13px", color: "var(--nuit-bone-soft)", lineHeight: 1.6,
        }}>
          Organizar e classificar clientes com etiquetas personalizadas.
        </p>
      </div>
      <EtiquetasManager etiquetas={etiquetas} />
    </div>
  );
}
