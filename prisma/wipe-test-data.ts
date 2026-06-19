// Remove APENAS os dados de teste do CRM — preserva os logins
// (User/Account/Session/VerificationToken) e o catálogo de serviços.
//
// Pensado para a transição de clientes-teste → clientes reais: corre isto para
// limpar a demo sem perder as contas de acesso, e depois importa os reais (que
// passam a derivar as métricas das sessões via lib/metricas).
//
// Correr:  DATABASE_URL="<url>" npx tsx prisma/wipe-test-data.ts
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 A remover dados de teste do CRM (logins preservados)…\n");

  const contagens = {
    mensagens: await prisma.mensagemIA.count(),
    sessoes: await prisma.sessao.count(),
    clientes: await prisma.cliente.count(),
    campanhas: await prisma.campanha.count(),
  };

  // Ordem inversa de dependências
  await prisma.auditLog.deleteMany();
  await prisma.mensagemIA.deleteMany();
  await prisma.observacao.deleteMany();
  await prisma.portalToken.deleteMany();
  await prisma.campanha.deleteMany();
  await prisma.clienteEtiqueta.deleteMany();
  await prisma.pack.deleteMany();
  await prisma.precoPersonalizado.deleteMany();
  await prisma.sessao.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.etiqueta.deleteMany();

  console.log("✅ Dados de teste removidos:");
  console.log(`   ${contagens.clientes} clientes · ${contagens.sessoes} sessões · ${contagens.mensagens} mensagens · ${contagens.campanhas} campanhas`);
  console.log("   Preservados: logins (User/Account/Session) + catálogo (Servico) + templates.");
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
