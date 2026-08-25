// Grelha horária estilo Google Calendar — dias em colunas, horas no eixo
// vertical, cada sessão desenhada como um bloco posicionado e dimensionado
// pela hora/duração reais. Sem interatividade própria (server component) —
// cada bloco é um <a> normal para o perfil do cliente.

const HORA_INICIO = 7
const HORA_FIM = 21
const PX_HORA = 56

const ESTADO_BG: Record<string, string> = {
  agendada: "rgba(185,160,122,0.22)",
  confirmada: "rgba(138,155,176,0.22)",
  aguarda_terapeuta: "rgba(185,160,122,0.22)",
  realizada: "rgba(160,169,150,0.22)",
  cancelada: "rgba(176,96,80,0.18)",
  falta: "rgba(176,96,80,0.18)",
}
const ESTADO_BORDA: Record<string, string> = {
  agendada: "var(--nuit-champagne-soft)",
  confirmada: "#8a9bb0",
  aguarda_terapeuta: "var(--nuit-champagne-soft)",
  realizada: "var(--nuit-sage)",
  cancelada: "var(--destructive)",
  falta: "var(--destructive)",
}

export interface SessaoGrade {
  id: string
  clienteId: string
  clienteNome: string
  servico: string | null
  hora: string | null
  duracao: number | null
  estado: string
}

function minutosDesdeMeiaNoite(hora: string): number {
  const [h, m] = hora.split(":").map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

export function GradeHoraria({ dias }: { dias: { data: Date; sessoes: SessaoGrade[] }[] }) {
  const horas = Array.from({ length: HORA_FIM - HORA_INICIO + 1 }, (_, i) => HORA_INICIO + i)
  const alturaTotal = (HORA_FIM - HORA_INICIO) * PX_HORA

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: `44px repeat(${dias.length}, minmax(120px, 1fr))`, minWidth: dias.length > 1 ? `${44 + dias.length * 120}px` : undefined }}>

        {/* Cabeçalho */}
        <div />
        {dias.map(({ data }) => {
          const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
          const ehHoje = data.getTime() === hoje.getTime()
          return (
            <div key={data.toISOString()} style={{ textAlign: "center", paddingBottom: "8px" }}>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--nuit-bone-soft)" }}>
                {data.toLocaleDateString("pt-PT", { weekday: "short" }).replace(".", "")}
              </p>
              <p style={{
                fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "18px",
                color: ehHoje ? "var(--nuit-midnight)" : "var(--nuit-bone)",
                backgroundColor: ehHoje ? "var(--nuit-champagne)" : "transparent",
                width: "30px", height: "30px", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center", margin: "2px auto 0",
              }}>
                {data.getDate()}
              </p>
            </div>
          )
        })}

        {/* Eixo de horas */}
        <div style={{ position: "relative", height: `${alturaTotal}px` }}>
          {horas.map(h => (
            <span key={h} style={{
              position: "absolute", top: `${(h - HORA_INICIO) * PX_HORA - 6}px`, right: "6px",
              fontFamily: "var(--font-sans)", fontSize: "9.5px", color: "var(--nuit-bone-soft)", opacity: 0.6,
            }}>
              {String(h).padStart(2, "0")}h
            </span>
          ))}
        </div>

        {/* Colunas por dia */}
        {dias.map(({ data, sessoes }) => (
          <div key={data.toISOString()} style={{
            position: "relative", height: `${alturaTotal}px`,
            borderLeft: "1px solid var(--rule-soft)",
          }}>
            {/* Linhas horizontais de hora */}
            {horas.map(h => (
              <div key={h} style={{
                position: "absolute", top: `${(h - HORA_INICIO) * PX_HORA}px`, left: 0, right: 0,
                borderTop: "1px solid var(--rule-soft)",
              }} />
            ))}

            {sessoes.map(s => {
              const minutos = s.hora ? minutosDesdeMeiaNoite(s.hora) : HORA_INICIO * 60
              const top = Math.max(0, (minutos - HORA_INICIO * 60) * (PX_HORA / 60))
              const altura = Math.max(22, (s.duracao ?? 60) * (PX_HORA / 60) - 2)
              const cor = ESTADO_BORDA[s.estado] ?? "var(--nuit-bone-soft)"
              return (
                <a
                  key={s.id}
                  href={`/clientes/${s.clienteId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`${s.hora ?? ""} · ${s.clienteNome} · ${s.servico ?? ""}`}
                  style={{
                    position: "absolute", top: `${top}px`, left: "3px", right: "3px", height: `${altura}px`,
                    backgroundColor: ESTADO_BG[s.estado] ?? "rgba(212,184,134,0.14)",
                    borderLeft: `3px solid ${cor}`,
                    borderRadius: "4px", padding: "3px 6px",
                    overflow: "hidden", textDecoration: "none",
                    display: "flex", flexDirection: "column", gap: "1px",
                  }}
                >
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: "9.5px", fontWeight: 700, color: "var(--nuit-bone)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {s.hora} {s.clienteNome}
                  </span>
                  {altura > 30 && (
                    <span style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "9px", color: "var(--nuit-bone-soft)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {s.servico ?? "—"}
                    </span>
                  )}
                </a>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
