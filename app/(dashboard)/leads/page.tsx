import Link from "next/link"
import { UserPlus } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/page-header"
import { AnimatedSection } from "@/components/stagger"
import { NovoLeadForm } from "./NovoLeadForm"

// Nota: sem isolamento por terapeuta (ao contrário de /clientes) de propósito
// — leads ainda não têm terapeutaPrincipalId atribuído (isso só acontece
// quando uma sessão é atribuída), por isso filtrar por terapeuta esconderia
// TODAS as leads de quem não for admin. É um "balcão" partilhado até
// alguém pegar no contacto.

export const revalidate = 30

const ORIGEM_LABELS: Record<string, string> = {
  indicacao: "Indicação",
  instagram: "Instagram",
  google: "Google",
  parceiro: "Parceiro",
  manual: "Manual",
  formulario: "Formulário",
}

function formatPhone(t: string | null) {
  if (!t) return "—"
  const d = t.replace(/\D/g, "")
  if (d.length === 9) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`
  return t
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short" }).format(d)
}

export default async function LeadsPage() {
  const leads = await prisma.cliente.findMany({
    where: { estado: "lead", apagadoEm: null },
    orderBy: { criadoEm: "desc" },
    take: 200,
    select: { id: true, nome: true, email: true, telefone: true, comoNosConheceu: true, criadoEm: true },
  })

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
            <p style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontStyle: "italic", fontSize: "15px", color: "var(--nuit-smoke)" }}>
              Nenhuma lead por agora
            </p>
          </div>
        ) : (
          <div style={{ border: "1px solid rgba(212,184,134,0.12)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(212,184,134,0.12)" }}>
                  {["Nome", "Telefone", "Email", "Origem", "Desde"].map((h) => (
                    <th key={h} style={{
                      padding: "11px 16px", textAlign: "left",
                      fontFamily: "var(--font-sans, sans-serif)", fontSize: "9.5px", fontWeight: 700,
                      letterSpacing: "0.16em", textTransform: "uppercase",
                      color: "var(--nuit-smoke)", backgroundColor: "rgba(212,184,134,0.06)",
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, idx) => (
                  <tr key={lead.id} style={{ borderBottom: idx < leads.length - 1 ? "1px solid rgba(212,184,134,0.10)" : "none" }}>
                    <td style={{ padding: "13px 16px" }}>
                      <Link href={`/clientes/${lead.id}`} style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "13px", fontWeight: 700, color: "var(--nuit-bone)", textDecoration: "none" }}>
                        {lead.nome}
                      </Link>
                    </td>
                    <td style={{ padding: "13px 16px", fontFamily: "var(--font-body, sans-serif)", fontSize: "13px", color: "var(--nuit-smoke)" }}>
                      {formatPhone(lead.telefone)}
                    </td>
                    <td style={{ padding: "13px 16px", fontFamily: "var(--font-body, sans-serif)", fontSize: "13px", color: "var(--nuit-smoke)" }}>
                      {lead.email ?? "—"}
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      {lead.comoNosConheceu ? (
                        <span style={{
                          padding: "3px 9px", fontSize: "9.5px", fontWeight: 600, letterSpacing: "0.08em",
                          textTransform: "uppercase", fontFamily: "var(--font-sans, sans-serif)",
                          color: "#b9a07a", border: "1px solid rgba(185,160,122,0.35)",
                        }}>
                          {ORIGEM_LABELS[lead.comoNosConheceu] ?? lead.comoNosConheceu}
                        </span>
                      ) : "—"}
                    </td>
                    <td style={{ padding: "13px 16px", fontFamily: "var(--font-body, sans-serif)", fontSize: "13px", color: "var(--nuit-smoke)" }}>
                      {formatDate(lead.criadoEm)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AnimatedSection>
    </div>
  )
}
