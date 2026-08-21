"use client"
import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  Calendar, MessageSquare, Tag, ArrowRight,
  CheckSquare, RefreshCw, Clock,
} from "lucide-react"

interface EventoTimeline {
  id: string
  tipo: string
  descricao: string
  detalhe?: Record<string, unknown>
  autor?: string | null
  criadoEm: string
}

const TIPO_CONFIG: Record<string, { icon: React.ElementType; cor: string; bg: string; iconColor: string }> = {
  sessao_realizada:   { icon: Calendar,      cor: "var(--nuit-bone)",     bg: "rgba(122,158,126,0.12)",   iconColor: "#7a9e7e" },
  sessao_agendada:    { icon: Clock,         cor: "var(--nuit-bone-soft)",bg: "rgba(185,160,122,0.10)",   iconColor: "var(--nuit-champagne-soft)" },
  mensagem_enviada:   { icon: MessageSquare, cor: "var(--nuit-bone-soft)",bg: "rgba(160,169,150,0.12)",   iconColor: "var(--nuit-sage)" },
  mensagem_pendente:  { icon: MessageSquare, cor: "var(--nuit-bone-soft)",    bg: "rgba(185,160,122,0.08)",   iconColor: "var(--nuit-champagne-soft)" },
  estado_alterado:    { icon: ArrowRight,    cor: "var(--nuit-bone-soft)",bg: "rgba(212,149,107,0.10)",   iconColor: "#d4956b" },
  tarefa_concluida:   { icon: CheckSquare,   cor: "var(--nuit-bone-soft)",bg: "rgba(122,158,126,0.10)",   iconColor: "#7a9e7e" },
  etiqueta_adicionada:{ icon: Tag,           cor: "var(--nuit-bone-soft)",bg: "rgba(185,160,122,0.10)",   iconColor: "var(--nuit-champagne-soft)" },
  etiqueta_removida:  { icon: Tag,           cor: "var(--nuit-bone-soft)",    bg: "rgba(157,157,154,0.10)",   iconColor: "#9d9d9a" },
  audit:              { icon: RefreshCw,     cor: "var(--nuit-bone-soft)",    bg: "rgba(157,157,154,0.08)",   iconColor: "#9d9d9a" },
}

interface ClienteTimelineProps {
  eventos: EventoTimeline[]
}

export function ClienteTimeline({ eventos }: ClienteTimelineProps) {
  const [expandido, setExpandido] = useState<string | null>(null)

  if (eventos.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 0" }}>
        <Clock style={{ width: "32px", height: "32px", color: "rgba(212,184,134,0.20)", marginBottom: "10px" }} />
        <p style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontStyle: "italic", fontSize: "14px", color: "var(--nuit-bone-soft)" }}>
          Nenhuma atividade registada
        </p>
      </div>
    )
  }

  return (
    <div style={{ position: "relative" }}>
      {/* Linha vertical */}
      <div style={{ position: "absolute", left: "13px", top: "8px", bottom: "8px", width: "1px", backgroundColor: "rgba(212,184,134,0.12)" }} />

      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {eventos.map((evento) => {
          const cfg = TIPO_CONFIG[evento.tipo] ?? TIPO_CONFIG.audit
          const Icon = cfg.icon
          const aberto = expandido === evento.id
          const temDetalhe = evento.detalhe && Object.keys(evento.detalhe).length > 0

          return (
            <div key={evento.id} style={{ position: "relative", display: "flex", gap: "12px", paddingLeft: "2px" }}>
              {/* Ícone */}
              <div style={{
                position: "relative", zIndex: 1,
                width: "26px", height: "26px", borderRadius: "50%",
                flexShrink: 0, marginTop: "8px",
                display: "flex", alignItems: "center", justifyContent: "center",
                backgroundColor: cfg.bg,
              }}>
                <Icon style={{ width: "13px", height: "13px", color: cfg.iconColor }} />
              </div>

              {/* Conteúdo */}
              <div
                style={{
                  flex: 1, minWidth: 0, padding: "8px 12px", borderRadius: "6px",
                  transition: "background-color 120ms",
                  cursor: temDetalhe ? "pointer" : "default",
                  backgroundColor: aberto ? "rgba(212,184,134,0.04)" : "transparent",
                }}
                onClick={() => temDetalhe && setExpandido(aberto ? null : evento.id)}
                className={temDetalhe ? "hover:bg-[rgba(212,184,134,0.04)]" : ""}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                  <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "13px", color: cfg.cor, lineHeight: 1.5 }}>
                    {evento.descricao}
                  </p>
                  <span style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "10px", color: "var(--nuit-bone-soft)", flexShrink: 0, marginTop: "2px" }}>
                    {formatDistanceToNow(new Date(evento.criadoEm), { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
                {evento.autor && evento.autor !== "sistema" && (
                  <p style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "10px", color: "var(--nuit-bone-soft)", marginTop: "2px" }}>
                    {evento.autor}
                  </p>
                )}
                {aberto && evento.detalhe && (
                  <div style={{ marginTop: "8px", fontSize: "11px", fontFamily: "var(--font-body, sans-serif)", color: "var(--nuit-bone-soft)", backgroundColor: "rgba(212,184,134,0.06)", borderRadius: "4px", padding: "8px 10px", display: "flex", flexDirection: "column", gap: "3px" }}>
                    {!!evento.detalhe.preview && <p style={{ fontStyle: "italic" }}>&ldquo;{String(evento.detalhe.preview)}&rdquo;</p>}
                    {!!evento.detalhe.hora && <p>Hora: {String(evento.detalhe.hora)}</p>}
                    {!!evento.detalhe.terapeuta && <p>Terapeuta: {String(evento.detalhe.terapeuta)}</p>}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
