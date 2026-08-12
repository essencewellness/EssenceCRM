import { prisma } from "@/lib/prisma";

/**
 * Terapeuta a quem atribuir novos clientes quando a origem (Calendly, lead,
 * onboarding, upsert N8N) não indica uma terapeuta explícita. Sem isto,
 * `terapeutaPrincipalId` fica null e o cliente desaparece do dashboard de
 * quem não é admin — todas as vistas (clientes/sessões/pipeline) filtram
 * por esse campo (`lib/contexto-utilizador.ts`).
 *
 * `ID_TERAPEUTA_PADRAO` permite fixar isto explicitamente (recomendado em
 * produção); sem a variável, cai para a terapeuta ativa mais antiga.
 */
export async function getTerapeutaPrincipalPadraoId(): Promise<string | null> {
  const idFixo = process.env.ID_TERAPEUTA_PADRAO;
  if (idFixo) return idFixo;

  const terapeuta = await prisma.user.findFirst({
    where: { role: "terapeuta", ativo: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return terapeuta?.id ?? null;
}
