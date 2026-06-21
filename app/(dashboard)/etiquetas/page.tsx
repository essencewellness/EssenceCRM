import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/page-header"
import { EtiquetasManager } from "./EtiquetasManager"

export const revalidate = 0

export default async function EtiquetasPage() {
  const etiquetas = await prisma.etiqueta.findMany({
    include: { _count: { select: { clientes: true } } },
    orderBy: [{ tipo: "asc" }, { nome: "asc" }],
  })

  const serialized = etiquetas.map(e => ({
    id:                 e.id,
    nome:               e.nome,
    cor:                e.cor,
    tipo:               e.tipo,
    bloqueiaAutomacoes: e.bloqueiaAutomacoes,
    _count:             { clientes: e._count.clientes },
  }))

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto" }}>
      <PageHeader
        titulo="Etiquetas"
        subtitulo={`${etiquetas.length} etiqueta${etiquetas.length !== 1 ? "s" : ""} no catálogo`}
      />
      <div
        className="anim-fade-up"
        style={{ backgroundColor: "#faf8f6", padding: "28px", borderRadius: "4px", border: "1px solid #ddd6c4" }}
      >
        <EtiquetasManager etiquetas={serialized} />
      </div>
    </div>
  )
}
