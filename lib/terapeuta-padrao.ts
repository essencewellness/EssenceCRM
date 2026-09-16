import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/prisma-client";

/**
 * Terapeuta usada como valor inicial de `Cliente.terapeutaPrincipalId`
 * quando a origem (Calendly, lead, onboarding, upsert N8N) não indica uma
 * terapeuta explícita, e como fallback de `computarTerapeutaPrincipal`
 * para clientes sem nenhuma sessão realizada ainda.
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

/**
 * "Terapeuta principal" de um grupo de clientes, calculada ao vivo a partir
 * do histórico real de sessões — não é mais um campo fixo. Regra (decisão
 * do Nuno, 2026-09-16): quem tem mais sessões `realizada` com aquela
 * cliente específica; em empate, quem fez a primeira dessas sessões.
 * Cliente sem nenhuma sessão realizada → getTerapeutaPrincipalPadraoId().
 *
 * Uma única query agregada (CTE + window function), independente de quantos
 * clientes — nunca N+1 — para não pesar no consumo da Neon.
 */
export async function mapaTerapeutasPrincipais(clienteIds?: string[]): Promise<Map<string, string>> {
  if (clienteIds && clienteIds.length === 0) return new Map();

  const idPadrao = await getTerapeutaPrincipalPadraoId();
  const semTerapeutaAtiva = !idPadrao;

  // COALESCE(terapeutaId, idPadrao): Sessao.terapeutaId null é convenção
  // "da Bea por omissão" (ver prisma/schema.prisma, comentário do campo).
  // O COALESCE é resolvido numa CTE própria (sessoes) para só aparecer UMA
  // vez na query — repeti-lo em SELECT e GROUP BY parecia inofensivo, mas
  // cada `${idPadrao}` interpolado pelo template do Prisma vira um parâmetro
  // SQL distinto ($1, $2, ...), e o Postgres não os reconhece como a mesma
  // expressão para efeitos de GROUP BY (erro 42803 — GROUP BY por alias
  // também não resolve isto, testado e confirmado contra uma branch Neon
  // isolada). Agrupar por "terapeuta" como COLUNA real da CTE evita o
  // problema por completo.
  const linhas = clienteIds
    ? await prisma.$queryRaw<{ clienteId: string; terapeuta: string }[]>`
        WITH sessoes AS (
          SELECT "clienteId", COALESCE("terapeutaId", ${idPadrao}) AS terapeuta, data
          FROM "Sessao"
          WHERE estado = 'realizada' AND "clienteId" IN (${Prisma.join(clienteIds)})
        ), contagens AS (
          SELECT "clienteId", terapeuta, COUNT(*) AS total, MIN(data) AS primeira_data
          FROM sessoes
          GROUP BY "clienteId", terapeuta
        ), ranked AS (
          SELECT "clienteId", terapeuta,
                 ROW_NUMBER() OVER (PARTITION BY "clienteId" ORDER BY total DESC, primeira_data ASC) AS rn
          FROM contagens
        )
        SELECT "clienteId", terapeuta FROM ranked WHERE rn = 1
      `
    : semTerapeutaAtiva
      ? []
      : await prisma.$queryRaw<{ clienteId: string; terapeuta: string }[]>`
        WITH sessoes AS (
          SELECT "clienteId", COALESCE("terapeutaId", ${idPadrao}) AS terapeuta, data
          FROM "Sessao"
          WHERE estado = 'realizada' AND "clienteId" IS NOT NULL
        ), contagens AS (
          SELECT "clienteId", terapeuta, COUNT(*) AS total, MIN(data) AS primeira_data
          FROM sessoes
          GROUP BY "clienteId", terapeuta
        ), ranked AS (
          SELECT "clienteId", terapeuta,
                 ROW_NUMBER() OVER (PARTITION BY "clienteId" ORDER BY total DESC, primeira_data ASC) AS rn
          FROM contagens
        )
        SELECT "clienteId", terapeuta FROM ranked WHERE rn = 1
      `;

  return new Map(linhas.map((l) => [l.clienteId, l.terapeuta]));
}

/** Terapeuta principal de UM cliente — ver mapaTerapeutasPrincipais(). */
export async function computarTerapeutaPrincipal(clienteId: string): Promise<string | null> {
  const mapa = await mapaTerapeutasPrincipais([clienteId]);
  return mapa.get(clienteId) ?? (await getTerapeutaPrincipalPadraoId());
}
