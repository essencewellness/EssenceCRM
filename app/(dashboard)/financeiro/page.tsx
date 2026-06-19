import { prisma } from "@/lib/prisma"
import { serializarDecimais } from "@/lib/serialize"

function mesAtual(): { inicio: Date; fim: Date; label: string } {
  const now = new Date()
  const inicio = new Date(now.getFullYear(), now.getMonth(), 1)
  const fim = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const label = inicio.toLocaleDateString("pt-PT", { month: "long", year: "numeric" })
  return { inicio, fim, label }
}

export default async function FinanceiroPage() {
  const { inicio, fim, label } = mesAtual()

  const sessoes = await prisma.sessao.findMany({
    where: { data: { gte: inicio, lt: fim }, apagadoEm: null },
    select: {
      id: true,
      estadoPagamento: true,
      valorPago: true,
      metodoPagamento: true,
      preco: true,
      data: true,
      servico: true,
      estado: true,
      cliente: { select: { id: true, nome: true, telefone: true } },
    },
    orderBy: { data: "desc" },
  })

  const dados = serializarDecimais(sessoes) as typeof sessoes

  let receitaTotal = 0
  const porMetodo: Record<string, number> = { dinheiro: 0, mbway: 0, transferencia: 0, voucher: 0 }
  const porEstado: Record<string, number> = { pendente: 0, pago: 0, parcial: 0, isento: 0 }

  for (const s of dados) {
    const ep = s.estadoPagamento as string
    porEstado[ep] = (porEstado[ep] ?? 0) + 1
    if (s.estadoPagamento === "pago" && s.valorPago) {
      const v = Number(s.valorPago)
      receitaTotal += v
      const m = s.metodoPagamento as string | null
      if (m && m in porMetodo) porMetodo[m]! += v
    }
  }

  const pendentes = dados.filter(
    (s) => s.estadoPagamento === "pendente" && s.estado === "realizada"
  )

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Financeiro — {label}</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Receita cobrada" valor={`€${receitaTotal.toFixed(2)}`} destaque />
        <KpiCard label="Sessões pagas" valor={String(porEstado["pago"] ?? 0)} />
        <KpiCard label="Por cobrar" valor={String(porEstado["pendente"] ?? 0)} aviso={!!pendentes.length} />
        <KpiCard label="Isentas" valor={String(porEstado["isento"] ?? 0)} />
      </div>

      {/* Por método de pagamento */}
      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Por método de pagamento</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(porMetodo).map(([metodo, valor]) => (
            <div key={metodo} className="bg-white border rounded-lg p-4">
              <div className="text-sm text-gray-500 capitalize">{metodo}</div>
              <div className="text-xl font-bold text-gray-900">€{valor.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Sessões por cobrar */}
      {pendentes.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">
            Por cobrar ({pendentes.length})
          </h2>
          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-left">Serviço</th>
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendentes.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{s.cliente.nome}</td>
                    <td className="px-4 py-3 text-gray-600">{s.servico ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(s.data).toLocaleDateString("pt-PT")}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {s.preco ? `€${Number(s.preco).toFixed(2)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Todas as sessões do mês */}
      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">
          Todas as sessões do mês ({dados.length})
        </h2>
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">Serviço</th>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-left">Pagamento</th>
                <th className="px-4 py-3 text-right">Valor pago</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dados.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{s.cliente.nome}</td>
                  <td className="px-4 py-3 text-gray-600">{s.servico ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(s.data).toLocaleDateString("pt-PT")}
                  </td>
                  <td className="px-4 py-3">
                    <EstadoBadge estado={s.estadoPagamento as string} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {s.valorPago ? `€${Number(s.valorPago).toFixed(2)}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function KpiCard({
  label,
  valor,
  destaque = false,
  aviso = false,
}: {
  label: string
  valor: string
  destaque?: boolean
  aviso?: boolean
}) {
  return (
    <div
      className={`rounded-lg p-4 border ${
        destaque ? "bg-emerald-50 border-emerald-200" : aviso ? "bg-amber-50 border-amber-200" : "bg-white"
      }`}
    >
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`text-2xl font-bold ${destaque ? "text-emerald-700" : aviso ? "text-amber-700" : "text-gray-900"}`}>
        {valor}
      </div>
    </div>
  )
}

function EstadoBadge({ estado }: { estado: string }) {
  const cores: Record<string, string> = {
    pago: "bg-green-100 text-green-800",
    pendente: "bg-amber-100 text-amber-800",
    parcial: "bg-blue-100 text-blue-800",
    isento: "bg-gray-100 text-gray-600",
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${cores[estado] ?? "bg-gray-100 text-gray-600"}`}>
      {estado}
    </span>
  )
}
