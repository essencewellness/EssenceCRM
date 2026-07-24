import "dotenv/config";
import { prisma } from "@/lib/prisma";
const p = prisma;
async function main() {
  const m = await p.mensagemIA.findMany({ select: { estado: true, canal: true, motivoGeracao: true }, orderBy: { geradaEm: "desc" } });
  m.forEach(x => console.log(x.estado.padEnd(10), "|", x.canal.padEnd(10), "|", (x.motivoGeracao ?? "—").slice(0, 60)));
  console.log("\nTotal:", m.length, "| Aprovadas:", m.filter(x => x.estado === "aprovada").length, "| Pendentes:", m.filter(x => x.estado === "pendente").length);
}
main().catch(console.error).finally(() => p.$disconnect());
