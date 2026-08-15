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
