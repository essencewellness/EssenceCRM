import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function TemplatesPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const templates = await prisma.templateMensagem.findMany({
    orderBy: [{ tipo: "asc" }, { nome: "asc" }],
  })

  const porTipo = templates.reduce<Record<string, typeof templates>>(
    (acc, t) => {
      ;(acc[t.tipo] ??= []).push(t)
      return acc
    },
    {}
  )

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <h1 className="text-2xl font-semibold text-stone-800">Templates de Mensagem</h1>

      {Object.entries(porTipo).map(([tipo, lista]) => (
        <section key={tipo}>
          <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wide mb-3">
            {tipo}
          </h2>
          <div className="grid gap-3">
            {lista.map((t) => (
              <div
                key={t.id}
                className="bg-white border border-stone-200 rounded-xl p-5 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-stone-800">{t.nome}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      t.ativo
                        ? "bg-green-100 text-green-700"
                        : "bg-stone-100 text-stone-500"
                    }`}
                  >
                    {t.ativo ? "ativo" : "inativo"}
                  </span>
                </div>
                <p className="text-sm text-stone-600 whitespace-pre-wrap">{t.texto}</p>
                {t.variaveis.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {t.variaveis.map((v) => (
                      <span
                        key={v}
                        className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded font-mono"
                      >
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      {templates.length === 0 && (
        <p className="text-stone-400 text-sm">
          Nenhum template criado. Use a API para criar templates.
        </p>
      )}
    </div>
  )
}
