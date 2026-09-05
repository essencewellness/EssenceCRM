import { redirect } from "next/navigation"
import { auth, signOut } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PageTransition } from "@/components/page-transition"
import { Sidebar } from "@/components/layout/Sidebar"
import { BottomNav } from "@/components/layout/BottomNav"
import { ToastProvider } from "@/components/ui/toast-nuit"
import { getContextoUtilizador } from "@/lib/contexto-utilizador"

async function logoutAction() {
  "use server"
  await signOut({ redirectTo: "/login" })
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  // A obrigatoriedade de troca de password (precisaMudarPassword) já é
  // aplicada em proxy.ts, antes de chegar aqui — feito lá para poder excluir
  // /configuracoes/perfil do redirect (senão entra em loop consigo mesma).

  // Mensagens IA nunca aparece para a Cristina — só Bea/admin (decisão de
  // negócio 2026-09-04, ver lib/contexto-utilizador.ts). Sem permissão, nem
  // sequer se conta o badge — evita qualquer fuga de "há X pendentes".
  const ctx = await getContextoUtilizador()
  const mensagensPendentes = ctx.podeAprovarMensagens
    ? await prisma.mensagemIA.count({ where: { estado: "pendente" } })
    : 0

  const preferenciaFonte = (session.user as { preferenciaFonte?: string }).preferenciaFonte ?? "baixo"

  return (
    <ToastProvider>
      <div
        className="min-h-screen flex"
        data-font-scale={preferenciaFonte}
        style={{ backgroundColor: "var(--nuit-midnight)" }}
      >
        {/* Sidebar — visível em desktop */}
        <Sidebar mensagensPendentes={mensagensPendentes} podeAprovarMensagens={ctx.podeAprovarMensagens} logoutAction={logoutAction} />

        {/* Conteúdo principal */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 h-screen">
          <main id="main-content" className="flex-1 overflow-auto pb-20 lg:pb-0 px-4 sm:px-6 lg:px-8 pt-4 lg:pt-6">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>

        {/* Bottom nav — visível em mobile */}
        <BottomNav mensagensPendentes={mensagensPendentes} podeAprovarMensagens={ctx.podeAprovarMensagens} logoutAction={logoutAction} />
      </div>
    </ToastProvider>
  )
}
