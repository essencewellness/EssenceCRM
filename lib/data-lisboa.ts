// Fronteiras de dia ("hoje", "amanhã") sempre em hora de Lisboa, nunca UTC —
// extraído de app/api/v1/sessoes/route.ts (2026-09-07) para deixar de estar
// duplicado. Servidores Vercel correm em UTC por omissão; sem isto, "hoje"
// à meia-noite UTC fica 1h desfasado da meia-noite real de Lisboa em
// horário de verão (mesma causa raiz do bug de fuso horário corrigido em
// lib/utils.ts — ver CLAUDE.md).

/** Devolve o intervalo [início do dia, fim do dia] em UTC para o fuso de Lisboa.
 * offsetDias=0 → hoje; offsetDias=1 → amanhã; etc.
 * Usa o truque de parsing locale para converter sem bibliotecas externas. */
export function inicioFimDiaLisboa(offsetDias = 0): { gte: Date; lt: Date } {
  const utcNow = new Date()
  // Interpretar a hora atual como "string Lisboa" e re-parsear como UTC local do servidor
  const lisboaNow = new Date(utcNow.toLocaleString("en-US", { timeZone: "Europe/Lisbon" }))
  // offsetMs = Lisboa_timestamp - UTC_timestamp (positivo se Lisboa está à frente de UTC)
  const offsetMs = lisboaNow.getTime() - utcNow.getTime()
  // Meia-noite Lisboa do dia alvo (em "pseudo-UTC" do parser)
  const meiaNoiteLisboa = new Date(lisboaNow)
  meiaNoiteLisboa.setHours(0, 0, 0, 0)
  meiaNoiteLisboa.setDate(meiaNoiteLisboa.getDate() + offsetDias)
  // Converter de volta para UTC real
  const gte = new Date(meiaNoiteLisboa.getTime() - offsetMs)
  const lt = new Date(gte.getTime() + 24 * 60 * 60 * 1000)
  return { gte, lt }
}

/** Trunca um instante real qualquer (ex: um timestamp já gravado na BD, ou
 * uma data escolhida pela utilizadora num seletor) para a meia-noite de
 * Lisboa do dia calendário de Lisboa a que esse instante pertence —
 * generaliza inicioFimDiaLisboa (que só sabe "hoje") para qualquer data.
 * Idempotente: chamar outra vez sobre um instante que já é meia-noite de
 * Lisboa devolve o mesmo instante, sem o corromper — importante porque o
 * resultado costuma voltar a passar por aqui (ex: navegação dia-a-dia). */
export function inicioDiaLisboaDe(instante: Date): Date {
  const pseudo = new Date(instante.toLocaleString("en-US", { timeZone: "Europe/Lisbon" }))
  const offsetMs = pseudo.getTime() - instante.getTime()
  const meiaNoitePseudo = new Date(pseudo)
  meiaNoitePseudo.setHours(0, 0, 0, 0)
  return new Date(meiaNoitePseudo.getTime() - offsetMs)
}

/** Hora e minuto actuais em Lisboa (relógio de parede) — correcto mesmo
 * quando o processo corre noutro fuso (Vercel = UTC por omissão). Usado
 * para coisas como a linha de "hora actual" numa grelha de calendário. */
export function horaMinutoAtualLisboa(): { hora: number; minuto: number } {
  const pseudo = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Lisbon" }))
  return { hora: pseudo.getHours(), minuto: pseudo.getMinutes() }
}
