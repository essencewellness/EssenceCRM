import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTerapeutaPrincipalPadraoId, mapaTerapeutasPrincipais } from "@/lib/terapeuta-padrao";

export type ContextoUtilizador = {
  role: "admin" | "terapeuta";
  userId: string;
  username: string;
  nome: string;
  isAdmin: boolean;
  // Mensagens IA: decisão de negócio (2026-09-04) — NUNCA vão para o perfil
  // da Cristina, sejam quais forem os clientes dela. Só a Bea (terapeuta
  // principal por omissão, mesma convenção de lib/terapeuta-padrao.ts) e o
  // admin veem/aprovam a fila de mensagens — a única aba que continua
  // restrita; todas as outras deixaram de o ser (ver getFiltrosTerapeuta).
  podeAprovarMensagens: boolean;
  // Atribuir tarefas a qualquer terapeuta (não só a si própria) — mesma
  // convenção de permissão que podeAprovarMensagens: admin ou a Bea
  // especificamente, nunca a Cristina.
  podeAtribuirTarefas: boolean;
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
    podeAprovarMensagens: isAdmin || (!!idBea && userId === idBea),
    podeAtribuirTarefas: isAdmin || (!!idBea && userId === idBea),
  };
}

/**
 * Decisão do Nuno (2026-09-16): sem isolamento entre terapeutas — a Bea e a
 * Cristina veem e podem gerir todos os clientes, tal como o admin, sempre
 * (Clientes, Sessões, Tarefas, Agenda, Leads, Dashboard). "terapeuta
 * principal" deixou de ser uma fronteira de acesso e passou a ser só uma
 * etiqueta informativa, calculada ao vivo a partir do histórico real de
 * sessões (ver lib/terapeuta-padrao.ts, mapaTerapeutasPrincipais).
 *
 * `?terapeuta=<id>` continua a existir como filtro de CONVENIÊNCIA opcional
 * (ex: "ver só os clientes onde a Beatriz é quem mais sessões faz"),
 * disponível a qualquer sessão, não só ao admin — nunca bloqueia acesso,
 * só estreita a lista mostrada.
 */
export async function getFiltrosTerapeuta(terapeutaParam?: string) {
  const ctx = await getContextoUtilizador();
  const alvo = terapeutaParam || null;

  let filtroCliente: Record<string, unknown> = {};
  let filtroSessao: Record<string, unknown> = {};

  if (alvo) {
    const mapa = await mapaTerapeutasPrincipais();
    const clienteIds = [...mapa.entries()].filter(([, t]) => t === alvo).map(([id]) => id);
    filtroCliente = { id: { in: clienteIds } };
    filtroSessao = { cliente: { id: { in: clienteIds } } };
  }

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
