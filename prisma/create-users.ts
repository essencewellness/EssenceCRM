import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const UTILIZADORES = [
  { name: "Nuno",     email: "nuno@essencewellness.pt",     role: "admin" },
  { name: "Beatriz",  email: "beatriz@essencewellness.pt",  role: "terapeuta" },
  { name: "Cristina", email: "cristina@essencewellness.pt", role: "terapeuta" },
];

async function main() {
  const password = process.env.SETUP_PASSWORD;
  if (!password) {
    console.error("Erro: define a variável SETUP_PASSWORD antes de correr este script.");
    console.error("Exemplo: $env:SETUP_PASSWORD='...'; npx tsx prisma/create-users.ts");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);

  for (const u of UTILIZADORES) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, password: hash, role: u.role },
      create: { name: u.name, email: u.email, password: hash, role: u.role },
    });
    console.log(`✓ ${(user.name ?? "").padEnd(10)} ${user.email}  [${user.role}]`);
  }

  console.log("\nTodos os utilizadores criados/atualizados com sucesso.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
