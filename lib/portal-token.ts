import crypto from "crypto"
import { prisma } from "@/lib/prisma"

export function gerarToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

export async function criarTokenPortal(clienteId: string): Promise<{
  token: string
  expiraEm: Date
}> {
  const token = gerarToken()
  const expiraEm = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)

  await prisma.portalToken.upsert({
    where: { clienteId },
    create: { clienteId, token, expiraEm },
    update: { token, expiraEm, criadoEm: new Date() },
  })

  return { token, expiraEm }
}
