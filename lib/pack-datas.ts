// Data de compra / de pagamento de um pack, escolhida à mão (ex: registar hoje
// um pack comprado a 18/09). Sem ela, a data é o momento do registo.
//
// Guardada ao meio-dia UTC do dia escolhido: em Lisboa (UTC+0 no inverno,
// UTC+1 no verão) continua sempre nesse mesmo dia, e nunca cai na fronteira
// de um mês por causa do fuso horário — a receita do pack conta para o mês
// da COMPRA.

export type DataPack = { ok: true; data: Date | null } | { ok: false; erro: string }

export function interpretarDataPack(valor?: string | null, agora: Date = new Date()): DataPack {
  if (valor === undefined || valor === null || valor.trim() === "") return { ok: true, data: null }

  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor.trim())
  if (!m) return { ok: false, erro: "Data inválida" }

  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const data = new Date(Date.UTC(ano, mes - 1, dia, 12, 0, 0))
  // Datas impossíveis (30 de fevereiro) "rebolam" para o mês seguinte — rejeitar.
  if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) {
    return { ok: false, erro: "Data inválida" }
  }
  if (ano < 2020) return { ok: false, erro: "Data demasiado antiga" }

  // Uma compra não pode ser no futuro (margem de um dia para o fuso).
  const limite = new Date(agora.getTime() + 24 * 60 * 60 * 1000)
  if (data.getTime() > limite.getTime()) return { ok: false, erro: "A data não pode ser no futuro" }

  return { ok: true, data }
}
