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
