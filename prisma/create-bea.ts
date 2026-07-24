import "dotenv/config";
import { prisma } from "@/lib/prisma";
import bcrypt from 'bcryptjs';


async function main() {
  const password = process.env.SETUP_PASSWORD;
  if (!password) {
    console.error("Erro: define SETUP_PASSWORD antes de correr este script.");
    console.error("Exemplo: $env:SETUP_PASSWORD='...'; npx tsx prisma/create-bea.ts");
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email: 'bea@essencewellness.pt' },
    update: { password: hash },
    create: {
      name: 'Beatriz',
      email: 'bea@essencewellness.pt',
      password: hash,
      role: 'terapeuta',
    },
  });
  console.log('Conta criada/atualizada:', user.email, '| role:', user.role);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
