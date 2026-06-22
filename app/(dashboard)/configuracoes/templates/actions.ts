"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getContextoUtilizador } from "@/lib/contexto-utilizador";

async function exigirAdmin() {
  const ctx = await getContextoUtilizador();
  if (!ctx.isAdmin) throw new Error("Sem permissão");
  return ctx;
}

export async function criarTemplate(dados: {
  nome: string;
  tipo: string;
  texto: string;
  variaveis?: string[];
}) {
  await exigirAdmin();

  if (!dados.nome.trim()) throw new Error("O nome é obrigatório");
  if (!dados.texto.trim()) throw new Error("O texto é obrigatório");

  await prisma.templateMensagem.create({
    data: {
      nome: dados.nome.trim(),
      tipo: dados.tipo,
      texto: dados.texto.trim(),
      variaveis: dados.variaveis ?? [],
      ativo: true,
    },
  });

  revalidatePath("/configuracoes/templates");
}

export async function atualizarTemplate(
  id: string,
  dados: { nome?: string; texto?: string; ativo?: boolean }
) {
  await exigirAdmin();

  await prisma.templateMensagem.update({
    where: { id },
    data: {
      ...(dados.nome?.trim() ? { nome: dados.nome.trim() } : {}),
      ...(dados.texto?.trim() ? { texto: dados.texto.trim() } : {}),
      ...(dados.ativo !== undefined ? { ativo: dados.ativo } : {}),
    },
  });

  revalidatePath("/configuracoes/templates");
}

export async function apagarTemplate(id: string) {
  await exigirAdmin();
  await prisma.templateMensagem.delete({ where: { id } });
  revalidatePath("/configuracoes/templates");
}
