import { redirect } from "next/navigation"
import { auth, signOut } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PageTransition } from "@/components/page-transition"
import { Sidebar } from "@/components/layout/Sidebar"
import { BottomNav } from "@/components/layout/BottomNav"
import { ToastProvider } from "@/components/ui/toast-nuit"
import { getContextoUtilizador } from "@/lib/contexto-utilizador"

export const dynamic = "force-dynamic"

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
  //
  // Corre em paralelo (esta layout re-executa a cada navegação, force-dynamic):
  // só a contagem de mensagens depende do contexto, as restantes não — antes
  // eram 4 idas à Neon em série, agora 2 em profundidade (pool max = 5).
  const ctxPromise = getContextoUtilizador()
  const mensagensPromise = ctxPromise.then((c) =>
    c.podeAprovarMensagens
      ? prisma.mensagemIA.count({ where: { estado: "pendente" } })
      : 0
  )

  // Sem isolamento entre terapeutas (decisão do Nuno, 2026-09-16) — o badge
  // conta todas as tarefas abertas, tal como a página /tarefas já as mostra
  // todas a qualquer sessão autenticada.
  // Dinheiro da Bea (MBWay) por repassar à Cristina — sessões e vouchers,
  // mesma regra de lib/repasses.ts já usada em /financeiro.
  const [ctx, mensagensPendentes, tarefasAbertas, sessoesPorRepassar, vouchersPorRepassar] =
    await Promise.all([
      ctxPromise,
      mensagensPromise,
      prisma.tarefa.count({ where: { estado: { in: ["pendente", "em_progresso"] } } }),
      prisma.sessao.count({ where: { repasseNecessario: true, repasseFeito: false, apagadoEm: null, packId: null } }),
      prisma.giftCard.count({ where: { repasseNecessario: true, repasseFeito: false } }),
    ])
  const repassesPendentes = sessoesPorRepassar + vouchersPorRepassar

  // Tamanho de texto já é aplicado no <html> (app/layout.tsx) — chega por
  // herança normal de CSS a tudo, incluindo os painéis que abrem via
  // createPortal para document.body (fora desta div).
  return (
    <ToastProvider>
      <div
        className="crm-shell flex"
        style={{ backgroundColor: "var(--nuit-midnight)" }}
      >
        {/* Sidebar — visível em desktop */}
        <Sidebar
          mensagensPendentes={mensagensPendentes}
          podeAprovarMensagens={ctx.podeAprovarMensagens}
          tarefasAbertas={tarefasAbertas}
          repassesPendentes={repassesPendentes}
          logoutAction={logoutAction}
        />

        {/* Conteúdo principal */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0" style={{ height: "var(--app-vh)" }}>
          <main id="main-content" className="crm-main flex-1 overflow-auto pb-20 lg:pb-0 px-4 sm:px-6 lg:px-8 pt-4 lg:pt-6">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>

        {/* Bottom nav — visível em mobile */}
        <BottomNav
          mensagensPendentes={mensagensPendentes}
          podeAprovarMensagens={ctx.podeAprovarMensagens}
          tarefasAbertas={tarefasAbertas}
          repassesPendentes={repassesPendentes}
          logoutAction={logoutAction}
        />
      </div>
    </ToastProvider>
  )
}
