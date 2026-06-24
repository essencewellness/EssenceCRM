import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/page-header"
import { CampanhasClient } from "./CampanhasClient"

export const dynamic = "force-dynamic"

export default async function CampanhasPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const campanhas = await prisma.campanha.findMany({
    include: {
      template: { select: { nome: true, tipo: true } },
      _count: { select: { mensagens: true } },
    },
    orderBy: { criadaEm: "desc" },
    take: 50,
  })

  const campanhasDTO = campanhas.map(c => ({
    id: c.id,
    nome: c.nome,
    estado: c.estado,
    segmento: c.segmento as { tipo: string; valor?: string },
    templateNome: c.template.nome,
    totalMensagens: c._count.mensagens,
    totalEnviado: c.totalEnviado,
    totalFalhado: c.totalFalhado,
    criadaEm: c.criadaEm.toLocaleDateString("pt-PT"),
  }))

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto" }}>
      <PageHeader titulo="Campanhas" subtitulo={`${campanhas.length} campanha${campanhas.length !== 1 ? "s" : ""}`} />
      <CampanhasClient campanhas={campanhasDTO} />
    </div>
  )
}
