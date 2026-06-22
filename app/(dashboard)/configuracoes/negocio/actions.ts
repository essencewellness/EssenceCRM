"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { invalidarCacheConfigNegocio } from "@/lib/config-negocio";
import { getContextoUtilizador } from "@/lib/contexto-utilizador";

export async function guardarConfigNegocio(dados: {
  nomeNegocio: string;
  emailContacto: string;
  whatsappPrincipal: string;
  assinaturaAutomatica: string;
  assinaturaReferral: string;
  horarioAbertura: string;
  horarioFecho: string;
}) {
  const ctx = await getContextoUtilizador();
  if (!ctx.isAdmin) throw new Error("Sem permissão");

  if (!dados.nomeNegocio.trim()) throw new Error("O nome do negócio é obrigatório");

  await prisma.configuracaoNegocio.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      ...dados,
    },
    update: dados,
  });

  invalidarCacheConfigNegocio();
  revalidatePath("/configuracoes/negocio");
}

export async function guardarConfigAutomacoes(dados: {
  diasReativacao: number;
  quietHoraInicio: string;
  quietHoraFim: string;
  maxMensagensDia: number;
}) {
  const ctx = await getContextoUtilizador();
  if (!ctx.isAdmin) throw new Error("Sem permissão");

  if (dados.diasReativacao < 1 || dados.diasReativacao > 365) {
    throw new Error("Dias de reativação deve estar entre 1 e 365");
  }
  if (dados.maxMensagensDia < 1 || dados.maxMensagensDia > 200) {
    throw new Error("Máximo de mensagens/dia deve estar entre 1 e 200");
  }

  await prisma.configuracaoNegocio.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...dados },
    update: dados,
  });

  invalidarCacheConfigNegocio();
  revalidatePath("/configuracoes/negocio");
}
