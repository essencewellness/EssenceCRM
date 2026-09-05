// Cálculo de "dias desde a última sessão" — extraído porque a mesma conta
// estava duplicada em lib/crm-estados.ts e em clientes/actions.ts (encontrado
// na auditoria de 2026-09-05). Usado também pelos novos filtros de
// candidatos ao check-in de continuidade.
export function diasDesdeUltimaSessao(ultimaSessao: Date | null, hoje = new Date()): number | null {
  if (!ultimaSessao) return null
  return Math.floor((hoje.getTime() - ultimaSessao.getTime()) / 86_400_000)
}
