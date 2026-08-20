import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | null): string {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" })
}

export function formatDateTime(date: Date | string | null): string {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleString("pt-PT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

// Sempre mostra o indicativo — números guardados sem ele (formato legado,
// 9 dígitos) assumem Portugal (+351), o padrão do negócio.
export function formatPhone(phone: string | null): string {
  if (!phone) return "—"
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 9) return `+351 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  if (phone.trim().startsWith("+")) return phone
  return `+${digits}`
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", minimumFractionDigits: 0 }).format(value)
}

export function getInitials(name: string): string {
  const parts = name.trim().split(" ")
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Texto da coluna "Origem" (Cliente.comoNosConheceu) para quem entra no CRM
// por ter comprado um voucher. Truncado a 120 para caber no campo.
export function origemDoVoucher(codigo: string, beneficiario?: string | null) {
  const base = beneficiario?.trim()
    ? `Comprou voucher ${codigo} para ${beneficiario.trim()}`
    : `Comprou voucher ${codigo}`
  return base.slice(0, 120)
}

// Soma meses a uma data sem "transbordar" para o mês seguinte: 31/08 + 6
// meses dá 28/02, não 03/03 (o setMonth do JS transborda porque Fevereiro
// não tem dia 31). Usado na validade dos vouchers — 6 meses após a compra.
export function adicionarMeses(data: Date, meses: number): Date {
  const d = new Date(data)
  const diaOriginal = d.getDate()
  d.setMonth(d.getMonth() + meses)
  if (d.getDate() !== diaOriginal) d.setDate(0)
  return d
}

// ── Link do voucher que a cliente recebe ─────────────────────────────
// A página vive no site público (repo `essencewellness/website`, ficheiro
// site/vouchers/voucher.html) e recebe tudo por query string. O CRM só
// constrói o link — não duplica a página.
//
// `desc` é um parâmetro novo que o CRM envia sempre: a página tem
// descrições embutidas só para alguns serviços antigos, e o catálogo do
// CRM tem muitos mais. Enquanto a página não souber ler `desc`, ignora-o
// sem estragar nada (o resto do link continua igual).
export const BASE_LINK_VOUCHER = "https://essencewellnesspt.com/vouchers/voucher.html"

export interface DadosLinkVoucher {
  codigo: string
  servicoNome: string
  /** Quem oferece, como aparece no voucher. Pode ser vários nomes. */
  nomesNoVoucher?: string | null
  /** Fallback quando não há nomes próprios para o voucher. */
  compradorNome: string
  beneficiarioNome?: string | null
  mensagemVoucher?: string | null
  validade?: Date | string | null
  /** Descrição do serviço, vinda do catálogo do CRM. */
  descricaoServico?: string | null
}

/** Validade no formato dd/mm/aaaa que a página do voucher mostra tal e qual. */
function validadePtPT(valor: Date | string | null | undefined): string {
  if (!valor) return ""
  const d = valor instanceof Date ? valor : new Date(valor)
  if (Number.isNaN(d.getTime())) return ""
  const dia = String(d.getDate()).padStart(2, "0")
  const mes = String(d.getMonth() + 1).padStart(2, "0")
  return `${dia}/${mes}/${d.getFullYear()}`
}

export function linkDoVoucher(v: DadosLinkVoucher): string {
  const params = new URLSearchParams()
  params.set("de", (v.nomesNoVoucher?.trim() || v.compradorNome).trim())
  params.set("para", (v.beneficiarioNome?.trim() || "ti").trim())
  params.set("massagem", v.servicoNome)
  if (v.mensagemVoucher?.trim()) params.set("mensagem", v.mensagemVoucher.trim())
  params.set("codigo", v.codigo)
  const validade = validadePtPT(v.validade)
  if (validade) params.set("validade", validade)
  if (v.descricaoServico?.trim()) params.set("desc", v.descricaoServico.trim())
  return `${BASE_LINK_VOUCHER}?${params.toString()}`
}

// Link curto que se manda de verdade à cliente: crm.essencewellnesspt.com/v/<código>.
// A rota (app/v/[codigo]/route.ts) faz o lookup do voucher em tempo real e
// redireciona para o link completo acima — por isso este link nunca fica
// desatualizado: se o voucher for editado depois de enviado (nome, mensagem,
// validade...), quem voltar a clicar vê sempre a versão mais recente, sem
// ser preciso reenviar nada.
export function linkCurtoDoVoucher(codigo: string): string {
  return `https://crm.essencewellnesspt.com/v/${encodeURIComponent(codigo)}`
}
