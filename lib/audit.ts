// Trilho de auditoria — quem fez o quê, quando, a que entidade.
// Fire-and-forget: nunca bloqueia nem rebenta a operação principal.
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

export interface EventoAuditoria {
  quem: string // email do utilizador, "api:n8n", "publico", ou "sistema"
  acao: string // ex: "login.falhado", "cliente.atualizado", "mensagem.aprovada"
  entidade?: string
  entidadeId?: string
  detalhe?: Prisma.InputJsonValue
  ip?: string | null
}

export function auditar(evento: EventoAuditoria): void {
  prisma.auditLog
    .create({
      data: {
        quem: evento.quem,
        acao: evento.acao,
        entidade: evento.entidade ?? null,
        entidadeId: evento.entidadeId ?? null,
        detalhe: evento.detalhe ?? undefined,
        ip: evento.ip ?? null,
      },
    })
    .catch((e) => console.error("[audit] falha ao registar:", (e as Error).message ?? String(e)))
}

/** Conta logins falhados recentes para um email (proteção brute-force). */
export async function loginsFalhadosRecentes(email: string, minutos = 15): Promise<number> {
  const desde = new Date(Date.now() - minutos * 60_000)
  return prisma.auditLog.count({
    where: {
      acao: "login.falhado",
      quem: email.toLowerCase(),
      criadoEm: { gte: desde },
    },
  })
}

/** Conta logins falhados recentes por IP (proteção brute-force multi-conta). */
export async function loginsFalhadosPorIp(ip: string, minutos = 15): Promise<number> {
  const desde = new Date(Date.now() - minutos * 60_000)
  return prisma.auditLog.count({
    where: {
      acao: "login.falhado",
      ip,
      criadoEm: { gte: desde },
    },
  })
}
