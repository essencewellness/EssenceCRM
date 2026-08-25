"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { atualizarObservacoesSessao, atualizarCampoSessao, atualizarTerapeutaSessao, eliminarSessao } from "./actions"
import { InlineEditField } from "@/components/clientes/InlineEditField"
import { CalendarDays, CheckCircle2, Clock, XCircle, X, Star, MessageSquare, FileText, Trash2, AlertTriangle, MapPin, Sparkles } from "lucide-react"
import { formatDate, formatCurrency } from "@/lib/utils"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

type Sessao = {
  id: string
  data: Date | string
  hora: string | null
  duracao: number | null
  servico: string | null
  preco: number | null
  terapeuta: string | null
  terapeutaId: string | null
  terapeuta2Id: string | null
  estadoEmocional: string | null
  resumoSessao: string | null
  notasPosSessao: string | null
  linkDocumento: string | null
  estado: string
  aromaSessao: string | null
  dataRecomendadaRegresso: Date | string | null
  criadoEm: Date | string
  // Ficha preenchida pela cliente no onboarding desta sessão
  fichaEstadoEmocional: string | null
  fichaZonasTensao: string | null
  fichaFoco: string | null
  fichaCondicoesAlergias: string | null
  // Ficha clínica gerada por IA (Groq) para a terapeuta, 24h antes da sessão
  briefingJson: unknown
}

function safeUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  try {
    const { protocol } = new URL(url)
    if (protocol === "https:" || protocol === "http:") return url
  } catch {}
  return undefined
}

// pos-sessao.html grava dois campos separados (observações clínicas +
// observações pessoais) concatenados num único notasPosSessao, com a parte
// pessoal prefixada "Pessoal: ". Separa-os de volta só para leitura — editar
// continua a ser o campo único combinado, não há coluna nova no schema.
function separarNotas(texto: string): { clinicas: string | null; pessoais: string | null } {
  const marcador = "Pessoal: "
  const partes = texto.split(new RegExp(`\\n\\n(?=${marcador})`))
  let clinicas: string | null = null
  let pessoais: string | null = null
  for (const parte of partes) {
    if (parte.startsWith(marcador)) pessoais = parte.slice(marcador.length)
    else if (parte.trim()) clinicas = parte
  }
  return { clinicas, pessoais }
}

// Consolida tudo o que a terapeuta registou num único bloco de leitura
// rápida, no topo do modal — sem IA, é só o texto que ela própria escreveu,
// organizado. Antes ficava espalhado por 4 caixas separadas e a caixa
// "Notas para a Próxima Sessão" misturava observações privadas com a
// recomendação, sem distinção nenhuma.
function ResumoSessaoBlock({ sessao }: { sessao: Sessao }) {
  const { clinicas, pessoais } = sessao.notasPosSessao ? separarNotas(sessao.notasPosSessao) : { clinicas: null, pessoais: null }
  const temCabecalho = Boolean(sessao.estadoEmocional || sessao.aromaSessao)
  const temConteudo = temCabecalho || sessao.resumoSessao || clinicas || pessoais
  if (!temConteudo) return null

  const separadorAroma = sessao.aromaSessao?.indexOf(" — ") ?? -1
  const aromaTipo = separadorAroma === -1 ? sessao.aromaSessao : sessao.aromaSessao?.slice(0, separadorAroma)
  const aromaDetalhe = separadorAroma === -1 ? null : sessao.aromaSessao?.slice(separadorAroma + 3)

  return (
    <div style={{
      borderRadius: "10px", border: "1px solid rgba(185,160,122,0.3)",
      padding: "18px", marginBottom: "20px",
      backgroundColor: "rgba(185,160,122,0.06)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
        <FileText size={13} color="var(--nuit-champagne-soft)" />
        <span style={{
          fontFamily: "var(--font-sans, sans-serif)", fontSize: "10px", fontWeight: 700,
          letterSpacing: "0.16em", color: "var(--nuit-champagne-soft)", textTransform: "uppercase",
        }}>
          Resumo da Sessão
        </span>
      </div>

      {temCabecalho && (
        <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--nuit-bone-soft)", margin: "0 0 12px", lineHeight: 1.6 }}>
          {sessao.estadoEmocional && <>Chegou <strong style={{ color: "var(--nuit-bone)", fontWeight: 600 }}>{sessao.estadoEmocional}</strong>. </>}
          {aromaTipo && <>Aroma: <strong style={{ color: "var(--nuit-bone)", fontWeight: 600 }}>{aromaTipo}</strong>{aromaDetalhe ? ` (${aromaDetalhe})` : ""}.</>}
        </p>
      )}

      {sessao.resumoSessao && (
        <p style={{
          fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--nuit-bone-soft)",
          lineHeight: 1.75, whiteSpace: "pre-wrap",
          margin: clinicas || pessoais ? "0 0 14px" : 0,
        }}>
          {sessao.resumoSessao}
        </p>
      )}

      {clinicas && (
        <p style={{
          fontFamily: "var(--font-body)", fontSize: "13.5px", color: "var(--nuit-bone-soft)",
          lineHeight: 1.7, whiteSpace: "pre-wrap",
          margin: pessoais ? "0 0 10px" : 0,
        }}>
          <strong style={{ color: "var(--nuit-champagne-soft)", fontWeight: 600 }}>Clínico: </strong>{clinicas}
        </p>
      )}

      {pessoais && (
        <p style={{
          fontFamily: "var(--font-body)", fontSize: "12.5px", color: "var(--nuit-bone-soft)",
          lineHeight: 1.7, whiteSpace: "pre-wrap", fontStyle: "italic", margin: 0,
        }}>
          <strong style={{ fontStyle: "normal", fontWeight: 600 }}>Pessoal: </strong>{pessoais}
        </p>
      )}
    </div>
  )
}

// pos-sessao.html grava o aroma como "Tipo — detalhe livre" (ex: "Mistura —
// Usei também óleo de amêndoas doces…"). Guardado como está, sem mudar o
// schema — só separado visualmente aqui, tipo em destaque e o detalhe por
// baixo, mais pequeno, em vez de tudo espremido numa linha cortada.
function formatarAroma(texto: string) {
  const separador = texto.indexOf(" — ")
  if (separador === -1) return texto
  const tipo = texto.slice(0, separador)
  const detalhe = texto.slice(separador + 3)
  return (
    <>
      {tipo}
      <div style={{
        fontSize: "11.5px", color: "var(--nuit-bone-soft)", marginTop: "3px",
        whiteSpace: "pre-wrap", lineHeight: 1.5, fontStyle: "normal",
      }}>
        {detalhe}
      </div>
    </>
  )
}

function SessaoEstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
    realizada:  { label: "Realizada",  color: "var(--nuit-sage)", bg: "rgba(160,169,150,0.12)", Icon: CheckCircle2 },
    agendada:   { label: "Agendada",   color: "var(--nuit-champagne-soft)", bg: "rgba(185,160,122,0.10)", Icon: Clock },
    confirmada: { label: "Confirmada", color: "#8a9bb0", bg: "rgba(138,155,176,0.12)", Icon: CheckCircle2 },
    cancelada:  { label: "Cancelada",  color: "var(--destructive)", bg: "rgba(176,96,80,0.08)",   Icon: XCircle },
    concluida:  { label: "Concluída",  color: "var(--nuit-bone-soft)", bg: "rgba(157,157,154,0.10)", Icon: CheckCircle2 },
    falta:      { label: "Falta",      color: "var(--destructive)", bg: "rgba(176,96,80,0.08)",   Icon: XCircle },
  }
  const cfg = map[estado] ?? { label: estado, color: "var(--nuit-bone-soft)", bg: "rgba(157,157,154,0.10)", Icon: Clock }
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "5px",
      padding: "3px 9px", borderRadius: "100px",
      fontSize: "10px", fontWeight: 600,
      fontFamily: "var(--font-sans, sans-serif)",
      color: cfg.color, backgroundColor: cfg.bg,
      border: `1px solid ${cfg.color}30`,
    }}>
      <cfg.Icon size={10} />
      {cfg.label}
    </span>
  )
}

function DetailItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p style={{
        fontFamily: "var(--font-sans, sans-serif)",
        fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em",
        color: "var(--nuit-bone-soft)", textTransform: "uppercase", marginBottom: "4px",
      }}>
        {label}
      </p>
      <p style={{
        fontFamily: "var(--font-body, sans-serif)",
        fontSize: "13px", color: "var(--nuit-bone)",
      }}>
        {value ?? "—"}
      </p>
    </div>
  )
}

// Mesmo visual do antigo DetailBlock, mas editável — usado para resumo/notas
function EditableDetailBlock({ title, icon: Icon, value, color, placeholder, onSave }: {
  title: string
  icon: React.ElementType
  value: string | null
  color: string
  placeholder: string
  onSave: (v: string | number | boolean | null) => Promise<{ ok: true } | { ok: false; erro: string }>
}) {
  return (
    <div style={{
      borderRadius: "10px",
      border: "1px solid rgba(212,184,134,0.16)", padding: "16px",
      marginBottom: "12px",
      backgroundColor: color + "06",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
        <div style={{
          width: "26px", height: "26px", borderRadius: "7px",
          backgroundColor: color + "14",
          border: `1px solid ${color}28`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={13} color={color} />
        </div>
        <span style={{
          fontFamily: "var(--font-sans, sans-serif)",
          fontSize: "11px", fontWeight: 600, color: "var(--nuit-bone)",
          letterSpacing: "0.02em",
        }}>
          {title}
        </span>
      </div>
      <InlineEditField
        label={title}
        hideLabel
        type="textarea"
        value={value}
        placeholder={placeholder}
        valueStyle={{ fontSize: "13px", color: "var(--nuit-bone-soft)", lineHeight: 1.7 }}
        onSave={onSave}
      />
    </div>
  )
}

interface MapaCorporalItem {
  zona?: string
  motivo?: string
  abordagem?: string
  prioridade?: string
}

interface BriefingTerapeuta {
  tipo_cliente?: string
  contagem_visitas?: number
  alertas?: string | null
  resumo_cliente?: string | null
  objetivo_sessao?: string | null
  continuidade_sessao_anterior?: string | null
  mapa_corporal?: MapaCorporalItem[]
  recomendacoes?: string[]
  nota_proxima_visita?: string | null
}

function FichaTerapeutaSection({ briefingJson }: { briefingJson: unknown }) {
  if (!briefingJson || typeof briefingJson !== "object") return null
  const b = briefingJson as BriefingTerapeuta

  const temConteudo = Boolean(
    b.resumo_cliente || b.objetivo_sessao || b.continuidade_sessao_anterior || b.alertas
    || b.nota_proxima_visita || b.mapa_corporal?.length || b.recomendacoes?.length
  )
  if (!temConteudo) return null

  const rotulo = { fontFamily: "var(--font-sans, sans-serif)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", color: "var(--nuit-bone-soft)", textTransform: "uppercase" as const, marginBottom: "10px" }

  return (
    <div style={{
      borderRadius: "10px", border: "1px solid rgba(185,160,122,0.25)",
      padding: "18px", marginBottom: "20px",
      backgroundColor: "rgba(185,160,122,0.04)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        <Sparkles size={13} color="var(--nuit-champagne-soft)" />
        <p style={{ ...rotulo, marginBottom: 0, color: "var(--nuit-champagne-soft)" }}>Ficha da terapeuta (gerada por IA)</p>
        {b.tipo_cliente && (
          <span style={{ marginLeft: "auto", fontSize: "10px", fontWeight: 600, color: "var(--nuit-bone-soft)", fontFamily: "var(--font-sans)" }}>
            {b.tipo_cliente}{b.contagem_visitas ? ` · ${b.contagem_visitas}ª visita` : ""}
          </span>
        )}
      </div>

      {b.alertas && (
        <div style={{
          borderLeft: "2px solid var(--destructive)", backgroundColor: "rgba(176,96,80,0.08)",
          color: "var(--destructive)", padding: "12px 14px", fontSize: "13px", lineHeight: 1.6,
          marginBottom: "16px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px", fontFamily: "var(--font-sans)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            <AlertTriangle size={12} /> Alertas de segurança
          </div>
          {b.alertas}
        </div>
      )}

      {b.resumo_cliente && <div style={{ marginBottom: "14px" }}><DetailItem label="Resumo da cliente" value={b.resumo_cliente} /></div>}
      {b.objetivo_sessao && <div style={{ marginBottom: "14px" }}><DetailItem label="Objetivo da sessão" value={b.objetivo_sessao} /></div>}
      {b.continuidade_sessao_anterior && <div style={{ marginBottom: "14px" }}><DetailItem label="Continuidade com sessão anterior" value={b.continuidade_sessao_anterior} /></div>}

      {Array.isArray(b.mapa_corporal) && b.mapa_corporal.length > 0 && (
        <div style={{ marginBottom: "14px" }}>
          <p style={rotulo}>Mapa corporal de foco</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {b.mapa_corporal.map((z, i) => (
              <div key={i} style={{ backgroundColor: "var(--nuit-deep)", border: "1px solid rgba(212,184,134,0.14)", borderRadius: "8px", padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                  <MapPin size={11} color="var(--nuit-champagne-soft)" />
                  <span style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "13.5px", color: "var(--nuit-bone)" }}>{z.zona}</span>
                </div>
                {(z.prioridade || z.motivo) && (
                  <div style={{ fontSize: "11px", color: "var(--nuit-bone-soft)", marginBottom: "4px" }}>
                    {z.prioridade && <strong style={{ color: "var(--nuit-champagne-soft)" }}>{z.prioridade}</strong>}
                    {z.prioridade && z.motivo ? " · " : ""}
                    {z.motivo}
                  </div>
                )}
                {z.abordagem && <div style={{ fontSize: "12.5px", color: "var(--nuit-bone-soft)" }}>{z.abordagem}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {Array.isArray(b.recomendacoes) && b.recomendacoes.length > 0 && (
        <div style={{ marginBottom: "14px" }}>
          <p style={rotulo}>Recomendações</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {b.recomendacoes.map((r, i) => (
              <div key={i} style={{ display: "flex", gap: "8px", fontSize: "12.5px", color: "var(--nuit-bone-soft)", lineHeight: 1.6 }}>
                <span style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontStyle: "italic", color: "var(--nuit-champagne-soft)", flexShrink: 0 }}>{i + 1}.</span>
                <span>{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {b.nota_proxima_visita && (
        <div>
          <p style={rotulo}>Nota para próxima visita</p>
          <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "13px", color: "var(--nuit-bone-soft)", fontStyle: "italic", lineHeight: 1.6 }}>
            {b.nota_proxima_visita}
          </p>
        </div>
      )}
    </div>
  )
}

// Agrega as sessões "realizada" por nome de serviço, para dar à Bea uma
// leitura rápida de que serviços a cliente costuma escolher — sem isto,
// só dava para perceber o padrão lendo a tabela linha a linha.
function HistoricoServicos({ sessoes }: { sessoes: Sessao[] }) {
  const contagens = new Map<string, number>()
  for (const s of sessoes) {
    if (s.estado !== "realizada") continue
    const nome = s.servico?.trim() || "Sem serviço"
    contagens.set(nome, (contagens.get(nome) ?? 0) + 1)
  }
  if (contagens.size === 0) return null

  const ordenado = [...contagens.entries()].sort((a, b) => b[1] - a[1])

  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: "8px",
      marginBottom: "16px",
    }}>
      {ordenado.map(([nome, contagem]) => (
        <div
          key={nome}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "6px 12px", borderRadius: "100px",
            backgroundColor: "rgba(212,184,134,0.08)",
            border: "1px solid rgba(212,184,134,0.22)",
          }}
        >
          <span style={{ fontFamily: "var(--font-body)", fontSize: "12.5px", color: "var(--nuit-bone)" }}>
            {nome}
          </span>
          <span style={{
            fontFamily: "var(--font-sans)", fontSize: "11px", fontWeight: 700,
            color: "var(--nuit-champagne-soft)",
            backgroundColor: "rgba(212,184,134,0.16)",
            borderRadius: "100px", padding: "1px 7px",
          }}>
            {contagem}×
          </span>
        </div>
      ))}
    </div>
  )
}

const ESTADOS_SESSAO = [
  { value: "agendada",   label: "Agendada",   cor: "var(--nuit-champagne-soft)" },
  { value: "confirmada", label: "Confirmada", cor: "#8a9bb0" },
  { value: "realizada",  label: "Realizada",  cor: "var(--nuit-sage)" },
  { value: "cancelada",  label: "Cancelada",  cor: "var(--destructive)" },
  { value: "falta",      label: "Falta",      cor: "var(--destructive)" },
]

interface Props {
  sessoes: Sessao[]
  clienteId: string
  terapeutas: { id: string; nome: string }[]
}

export function SessoesTab({ sessoes, clienteId, terapeutas }: Props) {
  const [sessaoAberta, setSessaoAberta] = useState<Sessao | null>(null)
  const [isPending, startTransition] = useTransition()
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const focoAnteriorRef = useRef<HTMLElement | null>(null)

  // Foco entra no modal ao abrir e volta para a linha da tabela que o abriu
  // ao fechar — sem isto, utilizadoras de teclado/leitor de ecrã perdem a
  // posição na página (ver skill ecc-frontend-a11y).
  useEffect(() => {
    if (sessaoAberta) {
      focoAnteriorRef.current = document.activeElement as HTMLElement
      dialogRef.current?.focus()
    } else {
      focoAnteriorRef.current?.focus()
    }
  }, [sessaoAberta])

  function fecharDrawer() {
    setSessaoAberta(null)
    setConfirmarEliminar(false)
  }

  function apagarSessao() {
    if (!sessaoAberta) return
    const id = sessaoAberta.id
    startTransition(async () => {
      await eliminarSessao(id, clienteId)
      setSessaoAberta(null)
      setConfirmarEliminar(false)
    })
  }

  function mudarEstado(novoEstado: string) {
    if (!sessaoAberta || novoEstado === sessaoAberta.estado) return
    const atualizada = { ...sessaoAberta, estado: novoEstado }
    setSessaoAberta(atualizada)
    startTransition(async () => {
      await atualizarObservacoesSessao(sessaoAberta.id, clienteId, { estado: novoEstado as "agendada" | "confirmada" | "realizada" | "cancelada" | "falta" })
    })
  }

  // Terapeuta e 2ª terapeuta viajam juntas numa única chamada ao servidor
  // (atualizarTerapeutaSessao recebe as duas de cada vez, para nunca gravar
  // uma sem saber o estado atual da outra) — por isso, ao contrário dos
  // outros InlineEditField, aqui é preciso manter sessaoAberta sincronizada
  // manualmente entre uma chamada e a seguinte (mesmo princípio de
  // mudarEstado acima), senão o segundo campo enviava o valor antigo do
  // primeiro se os dois fossem mudados em seguida sem recarregar a página.
  async function mudarTerapeuta(novoTerapeutaId: string) {
    if (!sessaoAberta) return { ok: false as const, erro: "Sem sessão aberta" }
    const anterior = sessaoAberta
    setSessaoAberta({ ...anterior, terapeutaId: novoTerapeutaId || null })
    const res = await atualizarTerapeutaSessao(anterior.id, clienteId, novoTerapeutaId, anterior.terapeuta2Id)
    if (!res.ok) setSessaoAberta(anterior)
    return res
  }

  async function mudarTerapeuta2(novoTerapeuta2Id: string) {
    if (!sessaoAberta) return { ok: false as const, erro: "Sem sessão aberta" }
    const anterior = sessaoAberta
    const valor = novoTerapeuta2Id || null
    setSessaoAberta({ ...anterior, terapeuta2Id: valor })
    const res = await atualizarTerapeutaSessao(anterior.id, clienteId, anterior.terapeutaId ?? "", valor)
    if (!res.ok) setSessaoAberta(anterior)
    return res
  }

  if (sessoes.length === 0) {
    return (
      <div style={{
        backgroundColor: "var(--nuit-overlay)", borderRadius: "10px",
        border: "1px solid rgba(212,184,134,0.16)", overflow: "hidden",
        boxShadow: "0 1px 3px rgba(22,26,38,0.04)",
      }}>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "52px",
        }}>
          <CalendarDays size={32} color="rgba(212,184,134,0.16)" style={{ marginBottom: "12px" }} />
          <p style={{
            fontFamily: "var(--font-heading, Georgia, serif)",
            fontStyle: "italic", fontSize: "14px", color: "var(--nuit-bone-soft)",
          }}>
            Nenhuma sessão registada
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <HistoricoServicos sessoes={sessoes} />

      <div style={{
        backgroundColor: "var(--nuit-overlay)", borderRadius: "10px",
        border: "1px solid rgba(212,184,134,0.16)", overflow: "hidden",
        boxShadow: "0 1px 3px rgba(22,26,38,0.04)",
      }}>
        <Table>
          <TableHeader>
            <TableRow style={{ borderColor: "rgba(212,184,134,0.16)", backgroundColor: "rgba(212,184,134,0.06)" }}>
              {["Data", "Hora", "Serviço", "Terapeuta", "Preço", "Estado"].map(h => (
                <TableHead key={h} style={{
                  fontFamily: "var(--font-sans, sans-serif)",
                  fontSize: "9px", fontWeight: 700, letterSpacing: "0.16em",
                  color: "var(--nuit-bone-soft)", textTransform: "uppercase",
                }}>
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessoes.map((sessao) => (
              <TableRow
                key={sessao.id}
                style={{ borderColor: "rgba(212,184,134,0.1)" }}
                className="row-hover"
                tabIndex={0}
                role="button"
                onClick={() => setSessaoAberta(sessao)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    setSessaoAberta(sessao)
                  }
                }}
              >
                <TableCell style={{ fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: 700, color: "var(--nuit-bone)" }}>
                  {formatDate(sessao.data as Date)}
                </TableCell>
                <TableCell style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--nuit-bone-soft)" }}>
                  {sessao.hora ?? "—"}
                </TableCell>
                <TableCell style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--nuit-bone)" }}>
                  {sessao.servico ?? "—"}
                </TableCell>
                <TableCell style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--nuit-bone-soft)", textTransform: "capitalize" }}>
                  {sessao.terapeuta ?? "Por atribuir"}
                </TableCell>
                <TableCell style={{ fontFamily: "var(--font-sans)", fontSize: "13px", fontWeight: 600, color: "var(--nuit-champagne-soft)", textAlign: "right" }}>
                  {formatCurrency(sessao.preco ?? 0)}
                </TableCell>
                <TableCell>
                  <SessaoEstadoBadge estado={sessao.estado} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Modal de detalhe */}
      {sessaoAberta && typeof document !== "undefined" && createPortal(
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            backgroundColor: "rgba(14,17,25,0.78)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "24px",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) fecharDrawer() }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sessao-drawer-titulo"
            tabIndex={-1}
            onKeyDown={(e) => { if (e.key === "Escape") fecharDrawer() }}
            className="nuit-scrollbar"
            style={{
              backgroundColor: "var(--nuit-deep)",
              width: "100%", maxWidth: "960px",
              maxHeight: "88vh", overflowY: "auto",
              borderRadius: "14px",
              border: "1px solid rgba(212,184,134,0.16)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
              display: "flex", flexDirection: "column",
              outline: "none",
            }}
          >
            {/* Cabeçalho do modal */}
            <div style={{
              padding: "28px 28px 20px",
              backgroundColor: "var(--nuit-overlay)",
              borderBottom: "1px solid rgba(212,184,134,0.16)",
              borderRadius: "14px 14px 0 0",
              position: "sticky", top: 0, zIndex: 1,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <select
                      value={sessaoAberta.estado}
                      onChange={(e) => mudarEstado(e.target.value)}
                      disabled={isPending}
                      aria-label="Estado da sessão"
                      style={{
                        fontSize: "16px", fontFamily: "var(--font-sans, sans-serif)",
                        fontWeight: 600, letterSpacing: "0.02em",
                        padding: "3px 8px", borderRadius: "6px",
                        backgroundColor: "rgba(212,184,134,0.08)",
                        border: "1px solid rgba(212,184,134,0.22)",
                        color: "var(--nuit-bone)", cursor: "pointer",
                        opacity: isPending ? 0.5 : 1,
                      }}
                    >
                      {ESTADOS_SESSAO.map(e => (
                        <option
                          key={e.value} value={e.value}
                          style={{ backgroundColor: "var(--nuit-deep, #0E1119)", color: "var(--nuit-bone, #ECE6D6)" }}
                        >
                          {e.label}
                        </option>
                      ))}
                    </select>
                    {isPending && (
                      <span style={{ fontSize: "10px", color: "var(--nuit-bone-soft)", fontFamily: "var(--font-sans)" }}>
                        A guardar…
                      </span>
                    )}
                  </div>
                  <div id="sessao-drawer-titulo" style={{ marginBottom: "4px" }}>
                    <InlineEditField
                      label="Serviço"
                      hideLabel
                      value={sessaoAberta.servico}
                      placeholder="Sessão"
                      valueStyle={{
                        fontFamily: "var(--font-heading, Georgia, serif)",
                        fontSize: "22px", fontWeight: 400, color: "var(--nuit-bone)",
                      }}
                      onSave={(v) => atualizarCampoSessao(sessaoAberta.id, clienteId, "servico", v)}
                    />
                  </div>
                  <p style={{
                    fontFamily: "var(--font-body, sans-serif)",
                    fontSize: "13px", color: "var(--nuit-bone-soft)",
                  }}>
                    {formatDate(sessaoAberta.data as Date)}
                    {sessaoAberta.hora ? ` · ${sessaoAberta.hora}` : ""}
                    {sessaoAberta.duracao ? ` · ${sessaoAberta.duracao} min` : ""}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                  {!confirmarEliminar ? (
                    <button
                      onClick={() => setConfirmarEliminar(true)}
                      aria-label="Eliminar sessão"
                      title="Eliminar sessão"
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "var(--destructive)", padding: "4px", opacity: 0.7,
                        transition: "opacity 0.15s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                      onMouseLeave={e => (e.currentTarget.style.opacity = "0.7")}
                    >
                      <Trash2 size={16} />
                    </button>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "11px", color: "var(--destructive)", fontFamily: "var(--font-sans)", fontWeight: 600 }}>
                        Eliminar?
                      </span>
                      <button
                        onClick={apagarSessao}
                        disabled={isPending}
                        style={{
                          padding: "4px 10px", fontSize: "10px", fontWeight: 700,
                          fontFamily: "var(--font-sans)", letterSpacing: "0.08em",
                          background: "var(--destructive)", color: "#fff", border: "none",
                          borderRadius: "4px", cursor: "pointer",
                          opacity: isPending ? 0.5 : 1,
                        }}
                      >
                        Sim
                      </button>
                      <button
                        onClick={() => setConfirmarEliminar(false)}
                        style={{
                          padding: "4px 10px", fontSize: "10px", fontWeight: 600,
                          fontFamily: "var(--font-sans)", letterSpacing: "0.08em",
                          background: "transparent", color: "var(--nuit-bone-soft)",
                          border: "1px solid rgba(212,184,134,0.22)", borderRadius: "4px",
                          cursor: "pointer",
                        }}
                      >
                        Não
                      </button>
                    </div>
                  )}
                  <button
                    onClick={fecharDrawer}
                    aria-label="Fechar detalhe da sessão"
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--nuit-bone-soft)", padding: "4px",
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Corpo: duas colunas — dados operacionais à esquerda, texto clínico à direita */}
            <div style={{ padding: "24px 28px", flex: 1, display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "flex-start" }}>

              {/* Coluna operacional */}
              <div style={{ flex: "1 1 260px", minWidth: "240px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px",
                  backgroundColor: "var(--nuit-overlay)",
                  borderRadius: "10px", border: "1px solid rgba(212,184,134,0.16)",
                  padding: "18px",
                }}>
                  <InlineEditField
                    label="Terapeuta"
                    type="select"
                    value={sessaoAberta.terapeutaId ?? ""}
                    options={[
                      ...(sessaoAberta.terapeutaId ? [] : [{ value: "", label: "Por atribuir" }]),
                      ...terapeutas.map((t) => ({ value: t.id, label: t.nome })),
                    ]}
                    onSave={(v) => mudarTerapeuta(v as string)}
                  />
                  <InlineEditField
                    label="2ª Terapeuta (massagem a dois)"
                    type="select"
                    value={sessaoAberta.terapeuta2Id ?? ""}
                    readOnly={!sessaoAberta.terapeutaId}
                    options={[
                      { value: "", label: "Nenhuma (sessão individual)" },
                      ...terapeutas.filter((t) => t.id !== sessaoAberta.terapeutaId).map((t) => ({ value: t.id, label: t.nome })),
                    ]}
                    onSave={(v) => mudarTerapeuta2(v as string)}
                  />
                  <InlineEditField
                    label="Preço"
                    type="currency"
                    value={sessaoAberta.preco}
                    onSave={(v) => atualizarCampoSessao(sessaoAberta.id, clienteId, "preco", v)}
                  />
                  <InlineEditField
                    label="Data"
                    type="date"
                    value={new Date(sessaoAberta.data).toISOString().split("T")[0]}
                    onSave={(v) => atualizarCampoSessao(sessaoAberta.id, clienteId, "data", v)}
                  />
                  <InlineEditField
                    label="Hora"
                    type="time"
                    value={sessaoAberta.hora}
                    placeholder="Adicionar hora"
                    onSave={(v) => atualizarCampoSessao(sessaoAberta.id, clienteId, "hora", v)}
                  />
                  <InlineEditField
                    label="Duração (min)"
                    type="number"
                    value={sessaoAberta.duracao}
                    placeholder="Adicionar duração"
                    onSave={(v) => atualizarCampoSessao(sessaoAberta.id, clienteId, "duracao", v)}
                  />
                  <div style={{ gridColumn: "1 / -1" }}>
                    <InlineEditField
                      label="Aroma"
                      value={sessaoAberta.aromaSessao}
                      placeholder="Adicionar aroma"
                      renderDisplay={formatarAroma}
                      onSave={(v) => atualizarCampoSessao(sessaoAberta.id, clienteId, "aromaSessao", v)}
                    />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <InlineEditField
                      label="Regresso Recomendado"
                      type="date"
                      value={sessaoAberta.dataRecomendadaRegresso ? new Date(sessaoAberta.dataRecomendadaRegresso).toISOString().split("T")[0] : null}
                      placeholder="Adicionar data"
                      onSave={(v) => atualizarCampoSessao(sessaoAberta.id, clienteId, "dataRecomendadaRegresso", v)}
                    />
                  </div>
                </div>

                {/* Link documento */}
                {safeUrl(sessaoAberta.linkDocumento) && (
                  <a
                    href={safeUrl(sessaoAberta.linkDocumento)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "6px",
                      padding: "9px 16px", borderRadius: "8px",
                      backgroundColor: "rgba(185,160,122,0.08)",
                      border: "1px solid rgba(185,160,122,0.25)",
                      fontSize: "12px", fontWeight: 600, color: "var(--nuit-champagne-soft)",
                      textDecoration: "none",
                      fontFamily: "var(--font-sans)",
                      width: "fit-content",
                    }}
                  >
                    <FileText size={13} />
                    Ver documento
                  </a>
                )}
              </div>

              {/* Coluna clínica */}
              <div style={{ flex: "2 1 380px", minWidth: "280px" }}>

                {/* Resumo consolidado — tudo o que a terapeuta registou, num só lugar */}
                <ResumoSessaoBlock sessao={sessaoAberta} />

                {/* Ficha da terapeuta gerada por IA (Groq), mesma fonte da ficha-sessao.html */}
                <FichaTerapeutaSection briefingJson={sessaoAberta.briefingJson} />

                {/* Ficha da cliente (preenchida no onboarding) */}
                {(sessaoAberta.fichaEstadoEmocional || sessaoAberta.fichaZonasTensao || sessaoAberta.fichaFoco || sessaoAberta.fichaCondicoesAlergias) && (
                  <div style={{
                    borderRadius: "10px", border: "1px solid rgba(185,160,122,0.25)",
                    padding: "16px", marginBottom: "20px",
                    backgroundColor: "rgba(185,160,122,0.04)",
                  }}>
                    <p style={{
                      fontFamily: "var(--font-sans)", fontSize: "9px", fontWeight: 700,
                      letterSpacing: "0.18em", color: "var(--nuit-champagne-soft)", textTransform: "uppercase",
                      marginBottom: "14px",
                    }}>
                      Ficha preenchida pela cliente
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {sessaoAberta.fichaEstadoEmocional && <DetailItem label="Estado emocional / mente" value={sessaoAberta.fichaEstadoEmocional} />}
                      {sessaoAberta.fichaZonasTensao && <DetailItem label="Zonas de tensão" value={sessaoAberta.fichaZonasTensao} />}
                      {sessaoAberta.fichaCondicoesAlergias && <DetailItem label="Condições / alergias" value={sessaoAberta.fichaCondicoesAlergias} />}
                      {sessaoAberta.fichaFoco && <DetailItem label="Foco / objetivo da sessão" value={sessaoAberta.fichaFoco} />}
                    </div>
                  </div>
                )}

                {/* Observações da terapeuta (edição — o texto já aparece consolidado acima) */}
                <EditableDetailBlock
                  title="Observações da Terapeuta"
                  icon={MessageSquare}
                  value={sessaoAberta.resumoSessao}
                  color="var(--nuit-sage)"
                  placeholder="Adicionar observações"
                  onSave={(v) => atualizarCampoSessao(sessaoAberta.id, clienteId, "resumoSessao", v)}
                />

                {/* Observações clínicas + pessoais (edição — campo único combinado, ver ResumoSessaoBlock para a leitura separada) */}
                <EditableDetailBlock
                  title="Observações Clínicas & Pessoais"
                  icon={Star}
                  value={sessaoAberta.notasPosSessao}
                  color="var(--nuit-champagne-soft)"
                  placeholder="Adicionar notas"
                  onSave={(v) => atualizarCampoSessao(sessaoAberta.id, clienteId, "notasPosSessao", v)}
                />
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
