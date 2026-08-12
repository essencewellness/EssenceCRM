import { redirect } from "next/navigation"
import { auth, signOut } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PageTransition } from "@/components/page-transition"
import { Sidebar } from "@/components/layout/Sidebar"
import { BottomNav } from "@/components/layout/BottomNav"
import { ToastProvider } from "@/components/ui/toast-nuit"

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

  // Contar mensagens pendentes para badge na sidebar
  const mensagensPendentes = await prisma.mensagemIA.count({
    where: { estado: "pendente" },
  })

  return (
    <ToastProvider>
      <div className="min-h-screen flex" style={{ backgroundColor: "var(--nuit-midnight)" }}>
        {/* Sidebar — visível em desktop */}
        <Sidebar mensagensPendentes={mensagensPendentes} logoutAction={logoutAction} />

        {/* Conteúdo principal */}
        <div className="flex-1 flex flex-col min-w-0">
          <main id="main-content" className="flex-1 overflow-auto pb-20 lg:pb-0">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>

        {/* Bottom nav — visível em mobile */}
        <BottomNav mensagensPendentes={mensagensPendentes} logoutAction={logoutAction} />
      </div>
    </ToastProvider>
  )
}
