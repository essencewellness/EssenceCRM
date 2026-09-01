// Partilhado entre app/(dashboard)/financeiro/page.tsx (Server Component) e
// RepassesCristina.tsx (Client Component) — tem de viver fora de qualquer
// ficheiro "use client", senão uma Server Component que o importe rebenta
// em runtime ("Attempted to call X() from the server but X is on the client").
export type RepasseRow = {
  id: string
  data: string
  servico: string | null
  valorPago: string | null
  // Quanto desta sessão é da Cristina. Null = o valorPago todo (sessão só
  // dela); numa massagem a dois é metade, porque a outra metade é da Bea.
  valorRepasse: string | null
  metodoPagamento: string | null
  cliente: { id: string; nome: string }
}

/** O que a Bea deve mesmo à Cristina por esta sessão. */
export function valorDevido(r: RepasseRow): number {
  if (r.valorRepasse !== null) return Number(r.valorRepasse)
  return r.valorPago ? Number(r.valorPago) : 0
}

// Partilhado entre sessões (pos-sessao.html) e vouchers (vouchers/actions.ts
// e financeiro/actions.ts, que têm CADA UM o seu próprio formulário de criar
// voucher). Só há um MBWay físico (é da Bea) — quando o dinheiro é da
// Cristina (terapeutaId explícito, ou terapeuta2Id numa venda "a dois") e
// foi pago por lá, fica na conta da Bea até ela entregar a parte da
// Cristina em mão.
export function calcularRepasse(params: {
  terapeutaId: string | null
  terapeuta2Id: string | null
  metodoPagamento: string | null
  valorPago: number
}): { repasseNecessario: boolean; valorRepasse: number | null } {
  const ehADois = !!params.terapeuta2Id
  // A única alternativa a "Beatriz (por omissão)" no seletor é a Cristina —
  // negócio só tem duas terapeutas — por isso qualquer terapeutaId explícito
  // já significa "é da Cristina".
  const ehCristina = !!params.terapeutaId || ehADois
  const ehMbway = params.metodoPagamento === "mbway_essence" || params.metodoPagamento === "mbway_beatriz"
  const repasseNecessario = ehCristina && ehMbway
  const valorRepasse = repasseNecessario && ehADois ? Math.round((params.valorPago / 2) * 100) / 100 : null
  return { repasseNecessario, valorRepasse }
}
