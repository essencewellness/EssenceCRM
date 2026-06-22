"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getContextoUtilizador } from "@/lib/contexto-utilizador";

async function exigirAdmin() {
  const ctx = await getContextoUtilizador();
  if (!ctx.isAdmin) throw new Error("Sem permissão");
  return ctx;
}

export async function criarUtilizador(dados: {
  username: string;
  nome: string;
  email: string;
  role: "admin" | "terapeuta";
  passwordTemporaria: string;
}): Promise<{ id: string }> {
  await exigirAdmin();

  const username = dados.username.trim().toLowerCase();
  if (!username || username.length < 3 || /\s/.test(username)) {
    throw new Error("Username inválido (mín. 3 caracteres, sem espaços)");
  }

  const [existeUsername, existeEmail] = await Promise.all([
    prisma.user.findUnique({ where: { username } }),
    prisma.user.findUnique({ where: { email: dados.email.trim().toLowerCase() } }),
  ]);
  if (existeUsername) throw new Error("Username já existe");
  if (existeEmail) throw new Error("Email já registado");

  const hash = await bcrypt.hash(dados.passwordTemporaria, 10);
  const user = await prisma.user.create({
    data: {
      username,
      name: dados.nome.trim(),
      email: dados.email.trim().toLowerCase(),
      password: hash,
      role: dados.role,
      precisaMudarPassword: true,
      ativo: true,
    },
  });

  revalidatePath("/configuracoes/utilizadores");
  return { id: user.id };
}

export async function atualizarUtilizador(id: string, dados: { nome?: string; email?: string }) {
  await exigirAdmin();

  await prisma.user.update({
    where: { id },
    data: {
      ...(dados.nome?.trim() ? { name: dados.nome.trim() } : {}),
      ...(dados.email?.trim() ? { email: dados.email.trim().toLowerCase() } : {}),
    },
  });

  revalidatePath("/configuracoes/utilizadores");
}

export async function redefinirPassword(id: string, novaPassword: string) {
  await exigirAdmin();

  if (!novaPassword || novaPassword.length < 8) {
    throw new Error("Password deve ter pelo menos 8 caracteres");
  }

  const hash = await bcrypt.hash(novaPassword, 10);
  await prisma.user.update({
    where: { id },
    data: { password: hash, precisaMudarPassword: true },
  });

  revalidatePath("/configuracoes/utilizadores");
}

export async function desativarUtilizador(id: string) {
  const ctx = await exigirAdmin();

  if (id === ctx.userId) throw new Error("Não pode desativar a sua própria conta");

  // Garantir que fica pelo menos 1 admin ativo
  const user = await prisma.user.findUnique({ where: { id } });
  if (user?.role === "admin") {
    const adminsAtivos = await prisma.user.count({ where: { role: "admin", ativo: true } });
    if (adminsAtivos <= 1) throw new Error("Tem de existir pelo menos um admin ativo");
  }

  await prisma.user.update({ where: { id }, data: { ativo: false } });
  revalidatePath("/configuracoes/utilizadores");
}

export async function ativarUtilizador(id: string) {
  await exigirAdmin();
  await prisma.user.update({ where: { id }, data: { ativo: true } });
  revalidatePath("/configuracoes/utilizadores");
}
