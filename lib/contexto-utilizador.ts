import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

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
    filtroCliente: isAdmin
      ? {}
      : { sessoes: { some: { terapeutaId: userId } } },
    filtroSessao: isAdmin
      ? {}
      : { terapeutaId: userId },
  };
}
