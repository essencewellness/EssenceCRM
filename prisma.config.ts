import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // process.env direto em vez do helper env() do Prisma 7 — esse helper
    // lança PrismaConfigEnvError se a variável não existir, o que torna
    // impossível o fallback com "??" (nunca é avaliado). Isto partia o CI,
    // que não tem DATABASE_URL configurada e só precisa de "prisma generate"
    // (lê o schema, não liga a nenhuma BD).
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  },
});
