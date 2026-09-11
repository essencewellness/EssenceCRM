import { UserPlus } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/page-header"
import { AnimatedSection } from "@/components/stagger"
import { getContextoUtilizador } from "@/lib/contexto-utilizador"
import { NovoLeadForm } from "./NovoLeadForm"
import { LeadsTable } from "./LeadsTable"

// Nota: sem isolamento por terapeuta (ao contrário de /clientes) de propósito
// — leads ainda não têm terapeutaPrincipalId atribuído (isso só acontece
// quando uma sessão é atribuída), por isso filtrar por terapeuta esconderia
// TODAS as leads de quem não for admin. É um "balcão" partilhado até
// alguém pegar no contacto.

export const revalidate = 30

export default async function LeadsPage() {
  const ctx = await getContextoUtilizador()

  const [leads, templates] = await Promise.all([
    prisma.cliente.findMany({
      where: { estado: "lead", apagadoEm: null },
      orderBy: { criadoEm: "desc" },
      take: 200,
      select: { id: true, nome: true, email: true, telefone: true, comoNosConheceu: true, criadoEm: true },
    }),
    // Campanhas para leads usam os mesmos templates de /clientes — mesma
    // fila de aprovação, mesmo motor (criarCampanhaFromFiltro já aceita
    // qualquer estado via clienteIds, leads incluídas, sem alterações).
    ctx.podeAprovarMensagens
      ? prisma.templateMensagem.findMany({
          where: { ativo: true },
          select: { id: true, nome: true, texto: true },
          orderBy: { nome: "asc" },
        })
      : Promise.resolve([]),
  ])

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
      <PageHeader
        titulo="Leads"
        subtitulo={`${leads.length} pessoa${leads.length !== 1 ? "s" : ""} que ainda não fez nenhuma sessão`}
        badge={<NovoLeadForm />}
      />

      <AnimatedSection delay={0.3}>
        {leads.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "72px 24px" }}>
            <div style={{ marginBottom: "16px", color: "rgba(185,160,122,0.45)", display: "flex" }}>
              <UserPlus size={22} />
            </div>
            <p style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontStyle: "italic", fontSize: "15px", color: "var(--nuit-bone-soft)" }}>
              Nenhuma lead por agora
            </p>
          </div>
        ) : (
          <LeadsTable
            leads={leads.map(l => ({ ...l, criadoEm: l.criadoEm.toISOString() }))}
            templates={templates}
            podeGerirCampanhas={ctx.podeAprovarMensagens}
          />
        )}
      </AnimatedSection>
    </div>
  )
}
