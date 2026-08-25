import Link from "next/link"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { getFiltrosTerapeuta } from "@/lib/contexto-utilizador"
import { formatCurrency } from "@/lib/utils"
import { GradeHoraria, type SessaoGrade } from "./GradeHoraria"
import type { Prisma } from "@/lib/prisma-client"

type Vista = "dia" | "semana" | "mes"

const GOLD = "var(--nuit-champagne)"
const CREAM = "var(--nuit-bone)"
const SOFT = "var(--nuit-bone-soft)"
const BORDER = "var(--rule-soft)"

function inicioDoDia(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

// Segunda-feira como início da semana (convenção PT)
function inicioDaSemana(d: Date) {
  const x = inicioDoDia(d)
  const diaSemana = x.getDay() // 0=domingo
  const deslocamento = diaSemana === 0 ? -6 : 1 - diaSemana
  x.setDate(x.getDate() + deslocamento)
  return x
}

function calcularIntervalo(vista: Vista, dataRef: Date): { inicio: Date; fim: Date; label: string } {
  if (vista === "dia") {
    const inicio = inicioDoDia(dataRef)
    const fim = new Date(inicio); fim.setDate(fim.getDate() + 1)
    return { inicio, fim, label: inicio.toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" }) }
  }
  if (vista === "semana") {
    const inicio = inicioDaSemana(dataRef)
    const fim = new Date(inicio); fim.setDate(fim.getDate() + 7)
    const fimVisivel = new Date(fim); fimVisivel.setDate(fimVisivel.getDate() - 1)
    const label = `${inicio.toLocaleDateString("pt-PT", { day: "numeric", month: "short" })} – ${fimVisivel.toLocaleDateString("pt-PT", { day: "numeric", month: "short" })}`
    return { inicio, fim, label }
  }
  const inicio = new Date(dataRef.getFullYear(), dataRef.getMonth(), 1)
  const fim = new Date(dataRef.getFullYear(), dataRef.getMonth() + 1, 1)
  return { inicio, fim, label: inicio.toLocaleDateString("pt-PT", { month: "long", year: "numeric" }) }
}

function deslocarData(vista: Vista, dataRef: Date, direcao: 1 | -1): Date {
  const x = new Date(dataRef)
  if (vista === "dia") x.setDate(x.getDate() + direcao)
  else if (vista === "semana") x.setDate(x.getDate() + 7 * direcao)
  else x.setMonth(x.getMonth() + direcao)
  return x
}

function fmtDataParam(d: Date) {
  return d.toISOString().slice(0, 10)
}

const ESTADO_COR: Record<string, string> = {
  agendada: "var(--nuit-champagne-soft)",
  confirmada: "#8a9bb0",
  aguarda_terapeuta: "var(--nuit-champagne-soft)",
  realizada: "var(--nuit-sage)",
  cancelada: "var(--destructive)",
  falta: "var(--destructive)",
}
const ESTADO_LABEL: Record<string, string> = {
  agendada: "Agendada", confirmada: "Confirmada", aguarda_terapeuta: "Aguarda terapeuta",
  realizada: "Realizada", cancelada: "Cancelada", falta: "Falta",
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; data?: string }>
}) {
  const { vista: vistaParam, data: dataParam } = await searchParams
  const vista: Vista = vistaParam === "dia" || vistaParam === "mes" ? vistaParam : "semana"
  const dataRef = dataParam && /^\d{4}-\d{2}-\d{2}$/.test(dataParam) ? new Date(dataParam + "T00:00:00") : inicioDoDia(new Date())

  const { inicio, fim, label } = calcularIntervalo(vista, dataRef)
  const anterior = deslocarData(vista, dataRef, -1)
  const seguinte = deslocarData(vista, dataRef, 1)

  // Mesma regra do Financeiro: a receita/agenda pertence a quem REALMENTE
  // faz a sessão (Sessao.terapeutaId/terapeuta2Id), não à terapeuta
  // "habitual" do cliente (cliente.terapeutaPrincipalId) — ver A9-Financeiro.
  const { alvo } = await getFiltrosTerapeuta()
  const filtroTerapeuta: Prisma.SessaoWhereInput = alvo ? { OR: [{ terapeutaId: alvo }, { terapeuta2Id: alvo }] } : {}

  const sessoes = await prisma.sessao.findMany({
    where: {
      apagadoEm: null,
      data: { gte: inicio, lt: fim },
      estado: { notIn: ["cancelada"] },
      ...filtroTerapeuta,
    },
    include: { cliente: { select: { nome: true, telefone: true } } },
    orderBy: { data: "asc" },
  })

  // Agrupar por dia
  const porDia = new Map<string, typeof sessoes>()
  for (const s of sessoes) {
    const chave = s.data.toISOString().slice(0, 10)
    if (!porDia.has(chave)) porDia.set(chave, [])
    porDia.get(chave)!.push(s)
  }
  const dias = [...porDia.entries()].sort(([a], [b]) => a.localeCompare(b))

  // Previsão de faturação: soma do preço das sessões ainda por acontecer
  // (agendada/confirmada/aguarda_terapeuta) — sessões já "realizada" contam
  // como confirmado, não previsão; "falta"/"cancelada" não contam nada.
  const previsto = sessoes
    .filter(s => ["agendada", "confirmada", "aguarda_terapeuta"].includes(s.estado))
    .reduce((soma, s) => soma + Number(s.preco ?? 0), 0)
  const realizado = sessoes
    .filter(s => s.estado === "realizada")
    .reduce((soma, s) => soma + Number(s.preco ?? 0), 0)

  const linkBase = (v: Vista, d: Date) => `/agenda?vista=${v}&data=${fmtDataParam(d)}`

  // Dados para a grelha horária (vistas dia/semana) — um dia por coluna
  const diasGrelha = vista === "mes" ? [] : Array.from(
    { length: vista === "dia" ? 1 : 7 },
    (_, i) => {
      const dataCol = new Date(inicio); dataCol.setDate(dataCol.getDate() + i)
      const chave = dataCol.toISOString().slice(0, 10)
      const sessoesDoDia: SessaoGrade[] = (porDia.get(chave) ?? []).map(s => ({
        id: s.id, clienteId: s.clienteId, clienteNome: s.cliente.nome,
        servico: s.servico, hora: s.hora, duracao: s.duracao, estado: s.estado,
      }))
      return { data: dataCol, sessoes: sessoesDoDia }
    },
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* Seletor de vista */}
      <div style={{ display: "flex", gap: "6px" }}>
        {(["dia", "semana", "mes"] as Vista[]).map(v => (
          <Link
            key={v}
            href={linkBase(v, dataRef)}
            style={{
              padding: "7px 16px", borderRadius: "100px",
              fontFamily: "var(--font-sans, sans-serif)", fontSize: "11px", fontWeight: 600,
              letterSpacing: "0.04em", textTransform: "capitalize", textDecoration: "none",
              backgroundColor: vista === v ? GOLD : "transparent",
              color: vista === v ? "var(--nuit-midnight)" : SOFT,
              border: `1px solid ${vista === v ? GOLD : "rgba(212,184,134,0.22)"}`,
            }}
          >
            {v}
          </Link>
        ))}
      </div>

      {/* Navegador de período */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href={linkBase(vista, anterior)} aria-label="Período anterior" style={{ color: SOFT, padding: "6px" }}>
          <ChevronLeft size={20} />
        </Link>
        <span style={{
          fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "17px",
          color: CREAM, textTransform: "capitalize", textAlign: "center",
        }}>
          {label}
        </span>
        <Link href={linkBase(vista, seguinte)} aria-label="Período seguinte" style={{ color: SOFT, padding: "6px" }}>
          <ChevronRight size={20} />
        </Link>
      </div>

      {/* Previsão de faturação */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px",
      }}>
        <div style={{ backgroundColor: "var(--nuit-overlay)", border: `1px solid ${BORDER}`, borderRadius: "8px", padding: "14px 16px" }}>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: SOFT, marginBottom: "6px" }}>
            Previsto
          </p>
          <p style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "22px", color: GOLD }}>
            {formatCurrency(previsto)}
          </p>
        </div>
        <div style={{ backgroundColor: "var(--nuit-overlay)", border: `1px solid ${BORDER}`, borderRadius: "8px", padding: "14px 16px" }}>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: SOFT, marginBottom: "6px" }}>
            Já realizado
          </p>
          <p style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "22px", color: "var(--nuit-sage)" }}>
            {formatCurrency(realizado)}
          </p>
        </div>
      </div>
      <p style={{ fontFamily: "var(--font-sans)", fontSize: "10.5px", color: SOFT, opacity: 0.7, marginTop: "-10px" }}>
        "Previsto" soma sessões agendadas/confirmadas ainda por acontecer neste período — não é dinheiro recebido, é o que está marcado.
      </p>

      {/* Grelha horária (dia/semana) ou lista por dia (mês) */}
      {vista !== "mes" ? (
        <GradeHoraria dias={diasGrelha} />
      ) : dias.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "48px 20px", color: SOFT, textAlign: "center", gap: "10px",
        }}>
          <CalendarIcon size={26} style={{ opacity: 0.3 }} />
          <p style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontStyle: "italic", fontSize: "14px" }}>
            Nada marcado neste período
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {dias.map(([chave, sessoesDia]) => (
            <div key={chave}>
              <p style={{
                fontFamily: "var(--font-sans)", fontSize: "10px", fontWeight: 700,
                letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--nuit-champagne-soft)",
                marginBottom: "8px",
              }}>
                {new Date(chave + "T00:00:00").toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "short" })}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {sessoesDia.map(s => (
                  // Abre o perfil do cliente no CRM completo numa aba/janela nova
                  // — não há forma de uma página web "lançar" outra app instalada
                  // no ecrã principal do iPad; isto é o mais próximo possível
                  // (o sistema decide se reaproveita uma aba do CRM já aberta ou
                  // abre Safari numa nova).
                  <a
                    key={s.id}
                    href={`/clientes/${s.clienteId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="row-hover"
                    style={{
                      display: "flex", alignItems: "center", gap: "12px",
                      backgroundColor: "var(--nuit-overlay)", border: `1px solid ${BORDER}`,
                      borderRadius: "8px", padding: "10px 14px",
                      textDecoration: "none", cursor: "pointer",
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-sans)", fontSize: "12px", fontWeight: 600, color: CREAM, minWidth: "44px" }}>
                      {s.hora ?? "—"}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "13px", color: CREAM, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.cliente.nome}
                      </p>
                      <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "11.5px", color: SOFT }}>
                        {s.servico ?? "Serviço por confirmar"}
                      </p>
                    </div>
                    <span style={{
                      fontFamily: "var(--font-sans)", fontSize: "9.5px", fontWeight: 600,
                      letterSpacing: "0.04em", textTransform: "uppercase",
                      color: ESTADO_COR[s.estado] ?? SOFT, flexShrink: 0,
                    }}>
                      {ESTADO_LABEL[s.estado] ?? s.estado}
                    </span>
                    <span style={{ fontFamily: "var(--font-sans)", fontSize: "12.5px", fontWeight: 600, color: GOLD, flexShrink: 0, minWidth: "48px", textAlign: "right" }}>
                      {formatCurrency(Number(s.preco ?? 0))}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
