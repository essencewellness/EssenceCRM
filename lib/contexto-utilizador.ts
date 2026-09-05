import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTerapeutaPrincipalPadraoId } from "@/lib/terapeuta-padrao";

export type ContextoUtilizador = {
  role: "admin" | "terapeuta";
  userId: string;
  username: string;
  nome: string;
  isAdmin: boolean;
  // Filtro Prisma pronto para queries de clientes
  filtroCliente: Record<string, unknown>;
  // Filtro Prisma pronto para queries de sessões
  filtroSessao: Record<string, unknown>;
  // Mensagens IA: decisão de negócio (2026-09-04) — NUNCA vão para o perfil
  // da Cristina, sejam quais forem os clientes dela. Só a Bea (terapeuta
  // principal por omissão, mesma convenção de lib/terapeuta-padrao.ts) e o
  // admin veem/aprovam a fila de mensagens — ao contrário de todas as
  // outras abas, que separam sempre por terapeutaPrincipalId do cliente.
  podeAprovarMensagens: boolean;
};

export async function getContextoUtilizador(): Promise<ContextoUtilizador> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const u = session.user as {
    id?: string;
    role?: string;
    username?: string;
    name?: string;
  };

  const role = (u.role ?? "terapeuta") as "admin" | "terapeuta";
  const userId = u.id ?? "";
  const isAdmin = role === "admin";

  const idBea = await getTerapeutaPrincipalPadraoId();

  return {
    role,
    userId,
    username: u.username ?? "",
    // Primeiro nome, para saudações ("Boa tarde, Cristina.") — nunca hard-code
    // "Bea", cada terapeuta/admin vê o seu próprio nome (bug real encontrado
    // 2026-09-01: a saudação do dashboard estava fixa em "Bea" para todos).
    nome: (u.name ?? u.username ?? "").trim().split(" ")[0] || "",
    isAdmin,
    // O cliente "pertence" a uma terapeuta via terapeutaPrincipalId.
    // Terapeuta só vê os seus; admin vê tudo (filtro aplicado via getFiltrosTerapeuta).
    filtroCliente: isAdmin ? {} : { terapeutaPrincipalId: userId },
    filtroSessao: isAdmin ? {} : { cliente: { terapeutaPrincipalId: userId } },
    podeAprovarMensagens: isAdmin || (!!idBea && userId === idBea),
  };
}

/**
 * Resolve os filtros de cliente/sessão tendo em conta:
 *  - terapeuta: forçado aos seus próprios clientes (ignora o parâmetro)
 *  - admin: opcionalmente filtra por uma terapeuta (?terapeuta=<id>), senão vê tudo
 *
 * Usar em todas as abas para um comportamento consistente.
 */
export async function getFiltrosTerapeuta(terapeutaParam?: string) {
  const ctx = await getContextoUtilizador();
  const alvo = ctx.isAdmin ? (terapeutaParam || null) : ctx.userId;

  const filtroCliente = alvo ? { terapeutaPrincipalId: alvo } : {};
  const filtroSessao = alvo ? { cliente: { terapeutaPrincipalId: alvo } } : {};

  return { ctx, alvo, filtroCliente, filtroSessao };
}

/** Lista de terapeutas activas (para o seletor/filtro de admin). */
export async function listarTerapeutas() {
  return prisma.user.findMany({
    where: { role: "terapeuta", ativo: true },
    select: { id: true, name: true, username: true },
    orderBy: { name: "asc" },
  });
}
