import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";


async function main() {
  console.log("🔄 Migração de terapeutas — início");

  // 1. Criar ConfiguracaoNegocio singleton se não existir
  const config = await prisma.configuracaoNegocio.upsert({
    where: { id: "singleton" },
    create: {},
    update: {},
  });
  console.log("✅ ConfiguracaoNegocio singleton:", config.id);

  // 2. Garantir usernames para utilizadores existentes
  const utilizadores = await prisma.user.findMany();

  for (const u of utilizadores) {
    if (u.username) continue;

    let username: string | null = null;

    if (u.email?.includes("bea@") || u.name?.toLowerCase().includes("bea")) {
      username = "bea";
    } else if (u.email?.includes("cris@") || u.name?.toLowerCase().includes("cris")) {
      username = "cris";
    } else if (u.role === "admin" || u.email?.includes("admin") || u.email?.includes("geral@")) {
      username = "admin";
    } else {
      // Derivar username do email (parte antes do @)
      username = u.email?.split("@")[0]?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? null;
    }

    if (username) {
      // Verificar se username já está em uso por outro user
      const existente = await prisma.user.findUnique({ where: { username } });
      if (existente && existente.id !== u.id) {
        username = `${username}2`;
      }
      await prisma.user.update({ where: { id: u.id }, data: { username } });
      console.log(`✅ User ${u.email} → username: ${username}`);
    }
  }

  // 3. Criar utilizadora Cris se não existir
  const crisExistente = await prisma.user.findFirst({
    where: { OR: [{ username: "cris" }, { email: "cris@essencewellness.pt" }] },
  });

  if (!crisExistente) {
    const hash = await bcrypt.hash("essence2026", 10);
    await prisma.user.create({
      data: {
        username: "cris",
        name: "Cristina Martins",
        email: "cris@essencewellness.pt",
        password: hash,
        role: "terapeuta",
        precisaMudarPassword: true,
      },
    });
    console.log("✅ Utilizadora Cris criada");
  } else {
    console.log("ℹ️ Cris já existe");
  }

  // 4. Preencher terapeutaId nas sessões existentes
  const userBea = await prisma.user.findFirst({ where: { username: "bea" } });
  const userCris = await prisma.user.findFirst({ where: { username: "cris" } });

  if (userBea) {
    const result = await prisma.sessao.updateMany({
      where: { terapeuta: "bea", terapeutaId: null },
      data: { terapeutaId: userBea.id },
    });
    console.log(`✅ ${result.count} sessões atribuídas à Bea`);
  }

  if (userCris) {
    const result = await prisma.sessao.updateMany({
      where: { terapeuta: "cris", terapeutaId: null },
      data: { terapeutaId: userCris.id },
    });
    console.log(`✅ ${result.count} sessões atribuídas à Cris`);
  }

  const semTerapeuta = await prisma.sessao.count({ where: { terapeutaId: null } });
  console.log(`ℹ️ ${semTerapeuta} sessões sem terapeutaId (visíveis apenas ao admin)`);

  console.log("✅ Migração concluída");
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
