"use client"
import { useEffect, useState, useCallback } from "react"
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

const TIPO_CONFIG: Record<string, { icon: React.ElementType; cor: string; bgCor: string }> = {
  sessao_realizada:   { icon: Calendar,      cor: "text-emerald-600", bgCor: "bg-emerald-50" },
  sessao_agendada:    { icon: Clock,         cor: "text-blue-500",    bgCor: "bg-blue-50"    },
  mensagem_enviada:   { icon: MessageSquare, cor: "text-purple-500",  bgCor: "bg-purple-50"  },
  mensagem_pendente:  { icon: MessageSquare, cor: "text-orange-400",  bgCor: "bg-orange-50"  },
  estado_alterado:    { icon: ArrowRight,    cor: "text-amber-500",   bgCor: "bg-amber-50"   },
  tarefa_concluida:   { icon: CheckSquare,   cor: "text-teal-500",    bgCor: "bg-teal-50"    },
  etiqueta_adicionada:{ icon: Tag,           cor: "text-pink-500",    bgCor: "bg-pink-50"    },
  etiqueta_removida:  { icon: Tag,           cor: "text-gray-400",    bgCor: "bg-gray-50"    },
  audit:              { icon: RefreshCw,     cor: "text-gray-400",    bgCor: "bg-gray-50"    },
}

interface ClienteTimelineProps {
  clienteId: string
}

export function ClienteTimeline({ clienteId }: ClienteTimelineProps) {
  const [eventos, setEventos] = useState<EventoTimeline[]>([])
  const [loading, setLoading] = useState(true)
  const [expandido, setExpandido] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/clientes/${clienteId}/timeline?limite=50`, {
        headers: { "X-API-Key": process.env.NEXT_PUBLIC_API_KEY ?? "" },
      })
      if (res.ok) {
        const json = await res.json()
        setEventos(json.data ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [clienteId])

  useEffect(() => { carregar() }, [carregar])

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-2/3 bg-gray-100 rounded animate-pulse" />
              <div className="h-3 w-1/4 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (eventos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <Clock className="w-8 h-8 mb-2 opacity-30" />
        <p className="text-sm">Nenhuma atividade registada</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Linha vertical */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-100" />

      <div className="space-y-1">
        {eventos.map((evento) => {
          const cfg = TIPO_CONFIG[evento.tipo] ?? TIPO_CONFIG.audit
          const Icon = cfg.icon
          const aberto = expandido === evento.id
          const temDetalhe = evento.detalhe && Object.keys(evento.detalhe).length > 0

          return (
            <div
              key={evento.id}
              className="relative flex gap-3 pl-1 group"
            >
              {/* Ícone */}
              <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1.5 ${cfg.bgCor}`}>
                <Icon className={`w-3.5 h-3.5 ${cfg.cor}`} />
              </div>

              {/* Conteúdo */}
              <div
                className={`flex-1 min-w-0 py-2 px-3 rounded-xl transition-colors ${
                  temDetalhe ? "cursor-pointer hover:bg-gray-50" : ""
                }`}
                onClick={() => temDetalhe && setExpandido(aberto ? null : evento.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-[#064E3B] leading-snug">{evento.descricao}</p>
                  <span className="text-xs text-gray-400 shrink-0 mt-0.5">
                    {formatDistanceToNow(new Date(evento.criadoEm), { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
                {evento.autor && evento.autor !== "sistema" && (
                  <p className="text-xs text-gray-400 mt-0.5">{evento.autor}</p>
                )}

                {/* Expansível */}
                {aberto && evento.detalhe && (
                  <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-2 space-y-1">
                    {!!evento.detalhe.preview && (
                      <p className="italic">&ldquo;{String(evento.detalhe.preview)}&rdquo;</p>
                    )}
                    {!!evento.detalhe.hora && (
                      <p>Hora: {String(evento.detalhe.hora)}</p>
                    )}
                    {!!evento.detalhe.terapeuta && (
                      <p>Terapeuta: {String(evento.detalhe.terapeuta)}</p>
                    )}
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
