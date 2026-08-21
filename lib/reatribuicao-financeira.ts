// Cálculo partilhado de "quanto é que a Bea deveria ter no sheet dela" antes
// e depois de uma mudança de terapeuta(s) — usado tanto na reatribuição
// automática de vouchers (lib/sessoes.ts) como na correção manual pelo
// seletor de terapeuta editável (app/(dashboard)/clientes/[id]/actions.ts).
//
// Cobre o caso que o "eraIndividual" binário anterior não cobria: um voucher/
// sessão que muda entre individual e a dois AO MESMO TEMPO que a terapeuta
// muda (ex: voucher criado individual, mas a sessão real acaba por ser a
// dois) — nesse caso o valor da Bea não é só "sim/não", passa de 100% para
// 50% (ou vice-versa), e o binário antigo simplesmente não reagia.
export function calcularValorParaBea(
  valorTotal: number,
  ehADois: boolean,
  envolveBea: boolean
): number {
  if (!envolveBea) return 0
  return ehADois ? Math.round((valorTotal / 2) * 100) / 100 : valorTotal
}

export function calcularReatribuicaoBea(params: {
  valorTotal: number
  idBea: string | null
  terapeutaIdAntes: string | null
  terapeuta2IdAntes: string | null
  terapeutaIdDepois: string | null
  terapeuta2IdDepois: string | null
}): { valorAntes: number; valorDepois: number } {
  const { valorTotal, idBea, terapeutaIdAntes, terapeuta2IdAntes, terapeutaIdDepois, terapeuta2IdDepois } = params
  const ehADoisAntes = terapeuta2IdAntes !== null
  const ehADoisDepois = terapeuta2IdDepois !== null
  // null em terapeutaId = "é da Bea por omissão" (convenção do schema) — só
  // se aplica ao principal; a segunda terapeuta nunca é null por omissão.
  const envolveBeaAntes = terapeutaIdAntes === idBea || terapeutaIdAntes === null || terapeuta2IdAntes === idBea
  const envolveBeaDepois = terapeutaIdDepois === idBea || terapeutaIdDepois === null || terapeuta2IdDepois === idBea
  return {
    valorAntes: calcularValorParaBea(valorTotal, ehADoisAntes, envolveBeaAntes),
    valorDepois: calcularValorParaBea(valorTotal, ehADoisDepois, envolveBeaDepois),
  }
}
