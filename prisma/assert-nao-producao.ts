// Guard de segurança para scripts que apagam dados (deleteMany/delete).
// Sem isto, copiar a DATABASE_URL errada do histórico da shell durante uma
// migração ou sessão de testes apaga clientes reais sem hipótese de undo —
// ver auditoria de pré-produção, 2026-08-12.
export function assertNaoProducao(scriptName: string): void {
  const url = process.env.DATABASE_URL ?? "";
  const pareceProducao = url.includes("neon.tech");

  if (pareceProducao && process.env.CONFIRMAR_PRODUCAO !== "sim") {
    console.error(`\n🛑 ${scriptName} recusa-se a correr.`);
    console.error("A DATABASE_URL atual parece apontar para a Neon de produção:");
    console.error(`   ${url.replace(/:[^:@]+@/, ":***@")}`);
    console.error("\nEste script apaga dados. Se tens mesmo a certeza de que queres correr");
    console.error("isto contra produção, define CONFIRMAR_PRODUCAO=sim explicitamente:");
    console.error(`   $env:CONFIRMAR_PRODUCAO='sim'; npx tsx prisma/${scriptName}\n`);
    process.exit(1);
  }
}
