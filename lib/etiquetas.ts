// Helpers para o sistema de etiquetas dinâmicas (Spec 005)

export const CORES_PALETA = [
  "#b9a07a", "#a0a996", "#7a9e7e", "#d4956b", "#b06050",
  "#6d7fcc", "#9b72cf", "#4d9ab0", "#c4704f", "#5e8e6e",
  "#9d9d9a", "#161a26",
]

export function calcularTagActividade(ultimaSessao: Date | string | null): {
  label: string; cor: string; dias: number | null
} {
  if (!ultimaSessao) return { label: "Sem sessões", cor: "#9d9d9a", dias: null }
  const dias = Math.floor((Date.now() - new Date(ultimaSessao).getTime()) / 86_400_000)
  if (dias <= 30)  return { label: `Ativa · ${dias}d`, cor: "#7a9e7e", dias }
  if (dias <= 60)  return { label: `Inativa · ${dias}d`, cor: "#d4956b", dias }
  if (dias <= 90)  return { label: `Inativa · ${dias}d`, cor: "#b06050", dias }
  return { label: `Inativa · ${dias}d`, cor: "#9d9d9a", dias }
}

export const TIPO_ETIQUETA_LABELS: Record<string, string> = {
  saude:       "Saúde",
  campanha:    "Campanha",
  preferencia: "Preferência",
  automatica:  "Automática",
  ciclo:       "Ciclo de vida",
  compra:      "Padrão de compra",
  experiencia: "Experiência",
  // persuasao/advocacia/winback: cortados em /council 2026-09-07 — zero
  // deteção, zero dado que os sustente hoje (referral "Miminho" não tem
  // campo próprio, psicografia sem validação, winback sem pergunta feita
  // ao cliente). Retomar só quando houver um campo real por trás.
}

export const ESTADO_CRM_CONFIG: Record<string, { label: string; cor: string; bg: string; border: string }> = {
  lead:            { label: "Lead",       cor: "#b9a07a", bg: "rgba(185,160,122,0.10)", border: "rgba(185,160,122,0.28)" },
  novo:            { label: "Nova",       cor: "#a0a996", bg: "rgba(160,169,150,0.12)", border: "rgba(160,169,150,0.28)" },
  ativa_recente:   { label: "Ativa",      cor: "#a0a996", bg: "rgba(160,169,150,0.12)", border: "rgba(160,169,150,0.28)" },
  ativa_frequente: { label: "Frequente",  cor: "#7a9e7e", bg: "rgba(122,158,126,0.10)", border: "rgba(122,158,126,0.28)" },
  vip_embaixadora: { label: "VIP ✦",      cor: "#b9a07a", bg: "rgba(185,160,122,0.13)", border: "rgba(185,160,122,0.35)" },
  vip_em_risco:    { label: "Em Risco",   cor: "#d4956b", bg: "rgba(212,149,107,0.10)", border: "rgba(212,149,107,0.28)" },
  reativacao:      { label: "Reativação", cor: "#b06050", bg: "rgba(176,96,80,0.08)",  border: "rgba(176,96,80,0.22)" },
  perdida:         { label: "Perdida",    cor: "#9d9d9a", bg: "rgba(157,157,154,0.10)", border: "rgba(157,157,154,0.22)" },
  blacklist:       { label: "Blacklist",  cor: "#b06050", bg: "rgba(176,96,80,0.12)",  border: "rgba(176,96,80,0.30)" },
}
