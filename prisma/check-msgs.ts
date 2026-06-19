import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  const m = await p.mensagemIA.findMany({ select: { estado: true, canal: true, motivoGeracao: true }, orderBy: { geradaEm: "desc" } });
  m.forEach(x => console.log(x.estado.padEnd(10), "|", x.canal.padEnd(10), "|", (x.motivoGeracao ?? "—").slice(0, 60)));
  console.log("\nTotal:", m.length, "| Aprovadas:", m.filter(x => x.estado === "aprovada").length, "| Pendentes:", m.filter(x => x.estado === "pendente").length);
}
main().catch(console.error).finally(() => p.$disconnect());
