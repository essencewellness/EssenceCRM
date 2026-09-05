// Motor de deteção de conversão — MensagemIA.converteu nunca foi calculado
// por nada no sistema (só era escrito se um PATCH externo mandasse o valor
// explícito, o que na prática nunca acontecia). Esta função pura decide,
// para uma mensagem já enviada, se o cliente "converteu" — reservou uma
// nova sessão ou comprou um pack depois de a receber — dentro de uma
// janela de N dias. Corre em lote a partir do cron de estados (ver
// app/api/cron/estados/route.ts), mesmo espírito de calcularEstado() em
// lib/crm-estados.ts.
export interface RegistoPosMensagem {
  criadoEm: Date
}

export interface ResultadoDeteccaoConversao {
  converteu: boolean
  convertidoEm: Date | null
}

/**
 * @param enviadaEm quando a mensagem foi enviada
 * @param sessoesEPacksCriados sessões/packs do cliente criados a qualquer momento — a função filtra os posteriores a `enviadaEm`
 * @param janelaDias tamanho da janela de decisão. Dentro da janela e sem sinal → `null` (ainda não decidir). Fora da janela e sem sinal → `false`.
 */
export function detectarConversao(
  enviadaEm: Date,
  sessoesEPacksCriados: RegistoPosMensagem[],
  hoje = new Date(),
  janelaDias = 14
): ResultadoDeteccaoConversao | null {
  const posteriores = sessoesEPacksCriados
    .filter((r) => r.criadoEm.getTime() > enviadaEm.getTime())
    .sort((a, b) => a.criadoEm.getTime() - b.criadoEm.getTime())

  if (posteriores.length > 0) {
    return { converteu: true, convertidoEm: posteriores[0].criadoEm }
  }

  const diasDesdeEnvio = Math.floor((hoje.getTime() - enviadaEm.getTime()) / 86_400_000)
  if (diasDesdeEnvio < janelaDias) return null // ainda dentro da janela — decidir mais tarde

  return { converteu: false, convertidoEm: null }
}
