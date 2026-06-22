import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ContextoUtilizador = {
  role: "admin" | "terapeuta";
  userId: string;
  username: string;
  isAdmin: boolean;
  // Filtro Prisma pronto para queries de clientes
  filtroCliente: Record<string, unknown>;
  // Filtro Prisma pronto para queries de sessões
  filtroSessao: Record<string, unknown>;
};

export async function getContextoUtilizador(): Promise<ContextoUtilizador> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const u = session.user as {
    id?: string;
    role?: string;
    username?: string;
  };

  const role = (u.role ?? "terapeuta") as "admin" | "terapeuta";
  const userId = u.id ?? "";
  const isAdmin = role === "admin";

  return {
    role,
    userId,
    username: u.username ?? "",
    isAdmin,
    // O cliente "pertence" a uma terapeuta via terapeutaPrincipalId.
    // Terapeuta só vê os seus; admin vê tudo (filtro aplicado via getFiltrosTerapeuta).
    filtroCliente: isAdmin ? {} : { terapeutaPrincipalId: userId },
    filtroSessao: isAdmin ? {} : { cliente: { terapeutaPrincipalId: userId } },
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
