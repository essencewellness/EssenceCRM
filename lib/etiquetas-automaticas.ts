// Motor de sugestão/aplicação automática das etiquetas que dão para calcular
// directamente a partir de dados estruturados já existentes — sem IA, sem
// interpretação de texto livre (isso continua a ser o WF09/Groq, que lê
// notas de sessão). Construído 2026-09-07 depois do /council decidir quais
// das 27 etiquetas propostas tinham sinal real por trás.
//
// Diferença deliberada face ao resto do sistema de mensagens: estas 7
// etiquetas são "propriedade do motor" — aplicadas e removidas
// automaticamente a cada corrida do cron, sem passar por aprovação da Bea
// (ao contrário de mensagens, que aprovação é sempre obrigatória). Isto é
// seguro porque (a) são só metadados internos, nunca tocam o cliente
// directamente, e (b) são 100% determinísticas a partir de números que já
// existem no CRM — mesmo espírito do motor de estados (lib/crm-estados.ts),
// que também recalcula sozinho sem revisão humana.
//
// Se a Bea aplicar manualmente uma destas 7 etiquetas a um cliente que não
// cumpre a regra, o próximo cron remove-a outra vez — não é um bug, é a
// definição: estas etiquetas SÃO o resultado da regra, não uma preferência
// dela. Etiquetas fora desta lista (saúde, preferência, campanha) nunca são
// tocadas por este motor.

export const NOMES_ETIQUETAS_AUTOMATICAS = [
  "Lead fria",
  "Onboarding (primeiros 30 dias)",
  "LTV alto",
  "Cross-buy alto",
  "Cross-buy moderado",
  "Promotora NPS",
  "Detratora NPS",
] as const

export type NomeEtiquetaAutomatica = typeof NOMES_ETIQUETAS_AUTOMATICAS[number]

// Limiares ajustáveis — documentados aqui, não espalhados pelo código.
const LEAD_FRIA_DIAS_MIN = 14        // lead sem nenhuma sessão há pelo menos 14 dias
const ONBOARDING_JANELA_DIAS = 30    // primeira sessão ainda "recente"
const LTV_ALTO_EUR = 400             // acima disto, cliente de alto valor acumulado
const CROSSBY_MODERADO_SESSOES_MIN = 2 // repete o mesmo serviço pelo menos 2x

export interface PerfilParaEtiquetas {
  estado: string
  criadoEm: Date
  totalSessoes: number
  totalGasto: number
  ultimaSessao: Date | null
  // npsScore do feedback mais recente (reflecte o sentimento actual, não o
  // histórico todo — uma cliente pode ter sido detratora e já ter mudado).
  npsScoreRecente: number | null
  // nomes base dos serviços realizados, já normalizados (ver normalizarServicoBase)
  categoriasServicoRealizado: string[]
}

/** Agrupa variantes do mesmo ritual (duração, "a dois", edições sazonais) numa única categoria. */
export function normalizarServicoBase(nomeServico: string): string {
  return nomeServico
    .replace(/\s*\([^)]*\)\s*$/, "")       // remove sufixo "(Dia da Mãe)" etc.
    .replace(/\s+\d+\s*min$/i, "")          // remove "90 min" / "60 min"
    .replace(/\s+a\s+(dois|duas)$/i, "")    // remove "a dois" / "a Duas"
    .trim()
}

/** Calcula quais das 7 etiquetas automáticas se aplicam a este cliente, agora. */
export function calcularEtiquetasAutomaticas(perfil: PerfilParaEtiquetas, agora: Date = new Date()): NomeEtiquetaAutomatica[] {
  const resultado: NomeEtiquetaAutomatica[] = []
  const diasDesde = (data: Date) => Math.floor((agora.getTime() - data.getTime()) / 86_400_000)

  // Lead fria: nunca teve sessão, estado ainda "lead", e já não é recente.
  if (perfil.estado === "lead" && perfil.totalSessoes === 0 && diasDesde(perfil.criadoEm) >= LEAD_FRIA_DIAS_MIN) {
    resultado.push("Lead fria")
  }

  // Onboarding: teve exactamente 1 sessão, e foi há pouco tempo — janela
  // crítica de reter ou perder para sempre.
  if (perfil.totalSessoes === 1 && perfil.ultimaSessao && diasDesde(perfil.ultimaSessao) <= ONBOARDING_JANELA_DIAS) {
    resultado.push("Onboarding (primeiros 30 dias)")
  }

  // LTV alto: valor acumulado acima do limiar, independente do estado CRM.
  if (perfil.totalGasto >= LTV_ALTO_EUR) {
    resultado.push("LTV alto")
  }

  // Cross-buy: quantas categorias distintas de ritual já experimentou.
  const categoriasUnicas = new Set(perfil.categoriasServicoRealizado)
  if (categoriasUnicas.size >= 2) {
    resultado.push("Cross-buy alto")
  } else if (categoriasUnicas.size === 1 && perfil.totalSessoes >= CROSSBY_MODERADO_SESSOES_MIN) {
    resultado.push("Cross-buy moderado")
  }

  // NPS: reflecte só o feedback mais recente, nunca o histórico acumulado.
  if (perfil.npsScoreRecente !== null) {
    if (perfil.npsScoreRecente >= 9) resultado.push("Promotora NPS")
    else if (perfil.npsScoreRecente <= 6) resultado.push("Detratora NPS")
  }

  return resultado
}
