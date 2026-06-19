// Recalcula as métricas (totalSessoes, totalGasto, ultimaSessao) de TODOS os
// clientes a partir das suas sessões realizadas — a fonte única de verdade.
//
// Útil agora (corrigir dados desalinhados) e na importação de clientes reais,
// onde os totais devem ser derivados das sessões em vez de escritos à mão.
//
// Correr:  DATABASE_URL="<url>" npx tsx prisma/recalcular-metricas.ts
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { recalcularMetricasCliente } from "../lib/metricas";

const prisma = new PrismaClient();

async function main() {
  const clientes = await prisma.cliente.findMany({
    where: { apagadoEm: null },
    select: { id: true, nome: true },
    orderBy: { nome: "asc" },
  });

  console.log(`A recalcular métricas de ${clientes.length} clientes…\n`);

  for (const c of clientes) {
    const m = await recalcularMetricasCliente(prisma, c.id);
    console.log(
      `  ${c.nome.padEnd(28)} ${String(m.totalSessoes).padStart(2)} sessões · €${m.totalGasto.toFixed(2).padStart(7)}`
    );
  }

  console.log(`\n✅ Métricas recalculadas para ${clientes.length} clientes.`);
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
