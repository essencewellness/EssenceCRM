"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado");
  return session.user.id;
}

export async function atualizarPerfil(dados: { nome: string; email?: string }) {
  const userId = await getUserId();

  if (!dados.nome?.trim()) throw new Error("O nome não pode ser vazio");

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: dados.nome.trim(),
      ...(dados.email?.trim() ? { email: dados.email.trim().toLowerCase() } : {}),
    },
  });

  revalidatePath("/configuracoes/perfil");
}

export async function alterarPassword(dados: { passwordAtual: string; passwordNova: string; obrigatorio?: boolean }) {
  const userId = await getUserId();

  if (!dados.passwordNova || dados.passwordNova.length < 8) {
    throw new Error("A nova password deve ter pelo menos 8 caracteres");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.password) throw new Error("Utilizador sem password definida");

  // Troca obrigatória (após reset por admin ou conta nova): a sessão activa já
  // prova que a pessoa entrou com a password certa — não pedimos a password
  // atual outra vez (o formulário nem mostra esse campo neste fluxo).
  if (!dados.obrigatorio) {
    const valida = await bcrypt.compare(dados.passwordAtual, user.password);
    if (!valida) throw new Error("Password atual incorrecta");
  }

  const hash = await bcrypt.hash(dados.passwordNova, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hash, precisaMudarPassword: false },
  });

  revalidatePath("/configuracoes/perfil");
}

const NIVEIS_FONTE = ["baixo", "medio", "alto"] as const;

export async function atualizarPreferenciaFonte(nivel: string) {
  const userId = await getUserId();

  if (!NIVEIS_FONTE.includes(nivel as (typeof NIVEIS_FONTE)[number])) {
    throw new Error("Nível de fonte inválido");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { preferenciaFonte: nivel },
  });

  // A escala aplica-se a partir da sessão (JWT) — sem isto o dashboard só
  // refletia a mudança no próximo login, tal como o precisaMudarPassword
  // (mesma família de bug, ver nota acima em alterarPassword).
  revalidatePath("/", "layout");
}
