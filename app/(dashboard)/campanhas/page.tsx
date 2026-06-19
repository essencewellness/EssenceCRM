import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const ESTADO_COR: Record<string, string> = {
  ativa:      "bg-green-100 text-green-700",
  cancelada:  "bg-red-100 text-red-700",
  concluida:  "bg-stone-100 text-stone-600",
}

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

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold text-stone-800">Campanhas</h1>

      {campanhas.length === 0 && (
        <p className="text-stone-400 text-sm">Nenhuma campanha criada ainda.</p>
      )}

      <div className="grid gap-4">
        {campanhas.map((c) => {
          const seg = c.segmento as { tipo: string; valor?: string }
          const progressoPct =
            c.totalEnviado + c.totalFalhado > 0
              ? Math.round(
                  ((c.totalEnviado + c.totalFalhado) / c._count.mensagens) * 100
                )
              : 0

          return (
            <div
              key={c.id}
              className="bg-white border border-stone-200 rounded-xl p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-stone-800">{c.nome}</p>
                  <p className="text-sm text-stone-500">
                    Template: {c.template.nome} · Segmento: {seg.tipo}
                    {seg.valor ? ` (${seg.valor})` : ""}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${ESTADO_COR[c.estado] ?? "bg-stone-100 text-stone-500"}`}
                >
                  {c.estado}
                </span>
              </div>

              <div className="flex items-center gap-6 text-sm text-stone-600">
                <span>Total: {c._count.mensagens}</span>
                <span className="text-green-700">Enviadas: {c.totalEnviado}</span>
                <span className="text-red-600">Falhadas: {c.totalFalhado}</span>
                <span className="text-stone-400 ml-auto">
                  {new Date(c.criadaEm).toLocaleDateString("pt-PT")}
                </span>
              </div>

              {c._count.mensagens > 0 && (
                <div className="w-full bg-stone-100 rounded-full h-1.5">
                  <div
                    className="bg-green-500 h-1.5 rounded-full"
                    style={{ width: `${progressoPct}%` }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
