import { prisma } from "@/lib/prisma";
import type { ConfiguracaoNegocio } from "@/lib/prisma-client";

let cache: ConfiguracaoNegocio | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

export async function getConfigNegocio(): Promise<ConfiguracaoNegocio> {
  const agora = Date.now();
  if (cache && agora < cacheExpiresAt) return cache;

  const config = await prisma.configuracaoNegocio.upsert({
    where: { id: "singleton" },
    create: {},
    update: {},
  });

  cache = config;
  cacheExpiresAt = agora + CACHE_TTL_MS;
  return config;
}

export function invalidarCacheConfigNegocio() {
  cache = null;
  cacheExpiresAt = 0;
}
