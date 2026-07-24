import { PrismaClient } from "@/lib/prisma-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaPool: Pool | undefined;
};

// Falha já no arranque com uma mensagem clara — sem isto, o pg tenta
// localhost:5432 silenciosamente e o erro real fica escondido atrás de
// um ECONNREFUSED sem contexto nenhum.
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL não está definida — impossível ligar à base de dados.");
}

const pool =
  globalForPrisma.prismaPool ??
  new Pool({
    connectionString: databaseUrl,
    // O endpoint da Neon já é o pooler (pgbouncer) — cada instância
    // serverless só precisa de poucas ligações próprias, não do
    // máximo de 10 por omissão do node-postgres.
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });

// pg.Pool é um EventEmitter — a Neon fecha ligações inativas do lado dela
// com regularidade, e sem este listener esse 'error' fica por apanhar e
// derruba o processo Node inteiro.
pool.on("error", (err) => {
  console.error("[prisma] erro na pool de ligações:", err.message);
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // disposeExternalPool: sem isto, prisma.$disconnect() não fecha
    // mesmo a pool — scripts que dependem de $disconnect() para o
    // processo terminar (sem process.exit explícito) ficam pendurados.
    adapter: new PrismaPg(pool, { disposeExternalPool: true }),
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaPool = pool;
}
