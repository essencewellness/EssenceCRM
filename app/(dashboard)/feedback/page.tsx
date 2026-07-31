import Link from "next/link"
import { MessageSquareHeart } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/page-header"
import { AnimatedSection } from "@/components/stagger"

export const revalidate = 30

const GOLD = "#b9a07a"
const SAGE = "#7a9e7e"
const TERRA = "#b06050"

const MOMENTO_PICO_LABELS: Record<string, string> = {
  Maos_ombros: "As mãos a soltarem a tensão",
  Calor: "O calor (cera/toalhas quentes)",
  Aroma: "O aroma dos óleos",
  Silencio: "O silêncio total",
  Tempo_para_mim: "Ter tempo só para mim",
}

const QUANDO_VOLTAR_LABELS: Record<string, string> = {
  "1_semana": "1 semana",
  "2_semanas": "2 semanas",
  "1_mes": "1 mês",
  ainda_nao_sei: "Ainda não sabe",
}

function segmentoDe(npsScore: number | null) {
  if (npsScore === null) return { label: "—", cor: "#9d9d9a" }
  if (npsScore >= 9) return { label: "Promotora", cor: SAGE }
  if (npsScore >= 7) return { label: "Passiva", cor: GOLD }
  return { label: "Detratora", cor: TERRA }
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(d)
}

export default async function FeedbackPage() {
  const feedbacks = await prisma.feedback.findMany({
    orderBy: { criadoEm: "desc" },
    take: 200,
    include: { cliente: { select: { id: true, nome: true } } },
  })

  const comNps = feedbacks.filter(f => f.npsScore !== null)
  const mediaNps = comNps.length > 0
    ? (comNps.reduce((soma, f) => soma + (f.npsScore ?? 0), 0) / comNps.length).toFixed(1)
    : "—"
  const promotoras = comNps.filter(f => (f.npsScore ?? 0) >= 9).length
  const passivas = comNps.filter(f => (f.npsScore ?? 0) >= 7 && (f.npsScore ?? 0) <= 8).length
  const detratoras = comNps.filter(f => (f.npsScore ?? 0) <= 6).length
  const pedidosContactoPendentes = feedbacks.filter(f => f.pedidoContactoMarcacao).length

  const contagemPico: Record<string, number> = {}
  for (const f of feedbacks) {
    if (f.momentoPico) contagemPico[f.momentoPico] = (contagemPico[f.momentoPico] ?? 0) + 1
  }
  const picoMaisComum = Object.entries(contagemPico).sort((a, b) => b[1] - a[1])[0]

  const stats = [
    { label: "NPS médio", valor: mediaNps, cor: GOLD },
    { label: "Promotoras", valor: promotoras, cor: SAGE },
    { label: "Passivas", valor: passivas, cor: GOLD },
    { label: "Detratoras", valor: detratoras, cor: TERRA },
    { label: "Pediram contacto", valor: pedidosContactoPendentes, cor: SAGE },
  ]

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
      <PageHeader
        titulo="Feedback"
        subtitulo={`${feedbacks.length} resposta${feedbacks.length !== 1 ? "s" : ""} recebida${feedbacks.length !== 1 ? "s" : ""}`}
      />

      {/* Resumo */}
      <AnimatedSection delay={0.25}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "20px" }}>
          {stats.map(s => (
            <div key={s.label} style={{ border: "1px solid rgba(212,184,134,0.16)", padding: "16px", background: "rgba(212,184,134,0.03)" }}>
              <div style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "26px", color: s.cor, marginBottom: "4px" }}>{s.valor}</div>
              <div style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--nuit-smoke)" }}>{s.label}</div>
            </div>
          ))}
        </div>
        {picoMaisComum && (
          <p style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px", color: "var(--nuit-smoke)", marginBottom: "24px" }}>
            Momento de mais alívio mais escolhido: <strong style={{ color: "var(--nuit-bone)" }}>{MOMENTO_PICO_LABELS[picoMaisComum[0]] ?? picoMaisComum[0]}</strong> ({picoMaisComum[1]}×)
          </p>
        )}
      </AnimatedSection>

      {/* Lista */}
      <AnimatedSection delay={0.35}>
        {feedbacks.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "72px 24px" }}>
            <div style={{ marginBottom: "16px", color: "rgba(185,160,122,0.45)", display: "flex" }}>
              <MessageSquareHeart size={22} />
            </div>
            <p style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontStyle: "italic", fontSize: "15px", color: "var(--nuit-smoke)" }}>
              Ainda sem feedback recebido
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {feedbacks.map(f => {
              const seg = segmentoDe(f.npsScore)
              const textoPrincipal = f.motivoRegresso || f.faltaParaDez || f.comentario || f.pontosMelhorar
              return (
                <div key={f.id} style={{ border: "1px solid rgba(212,184,134,0.12)", padding: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <Link href={`/clientes/${f.cliente.id}`} style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "14px", fontWeight: 700, color: "var(--nuit-bone)", textDecoration: "none" }}>
                        {f.cliente.nome}
                      </Link>
                      <span style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: seg.cor, border: `1px solid ${seg.cor}55`, padding: "2px 8px" }}>
                        {seg.label}{f.npsScore !== null ? ` · ${f.npsScore}/10` : ""}
                      </span>
                      {f.pedidoContactoMarcacao && (
                        <span style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: SAGE, background: "rgba(122,158,126,0.12)", padding: "2px 8px" }}>
                          ✦ Pediu contacto
                        </span>
                      )}
                    </div>
                    <span style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "11px", color: "var(--nuit-smoke)" }}>{formatDate(f.criadoEm)}</span>
                  </div>

                  {textoPrincipal && (
                    <p style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontStyle: "italic", fontSize: "14px", color: "var(--nuit-bone)", marginBottom: "8px", lineHeight: 1.5 }}>
                      &ldquo;{textoPrincipal}&rdquo;
                    </p>
                  )}

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", fontFamily: "var(--font-sans, sans-serif)", fontSize: "11.5px", color: "var(--nuit-smoke)" }}>
                    {f.quandoVoltar && <span>Quer voltar: {QUANDO_VOLTAR_LABELS[f.quandoVoltar] ?? f.quandoVoltar}</span>}
                    {f.interesseServico && <span>Interesse: {f.interesseServico}</span>}
                    {f.pedidoContactoMarcacao && (f.diaPreferido || f.horaPreferida) && (
                      <span>Prefere: {f.diaPreferido ?? "—"} {f.horaPreferida ?? ""}</span>
                    )}
                    {f.pontosPositivos && <span>Gostou: {f.pontosPositivos}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </AnimatedSection>
    </div>
  )
}
