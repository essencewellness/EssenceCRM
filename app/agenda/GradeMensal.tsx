import type { SessaoGrade } from "./GradeHoraria"

const ESTADO_BORDA: Record<string, string> = {
  agendada: "var(--nuit-champagne-soft)",
  confirmada: "#8a9bb0",
  aguarda_terapeuta: "var(--nuit-champagne-soft)",
  realizada: "var(--nuit-sage)",
  cancelada: "var(--destructive)",
  falta: "var(--destructive)",
}

const DIAS_SEMANA = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"]

export function GradeMensal({ mesRef, dias }: {
  mesRef: Date
  dias: { data: Date; sessoes: SessaoGrade[] }[]
}) {
  const mesAtual = mesRef.getMonth()
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const semanas: typeof dias[] = []
  for (let i = 0; i < dias.length; i += 7) semanas.push(dias.slice(i, i + 7))

  return (
    <div style={{ borderRadius: "10px", overflow: "hidden", border: "1px solid var(--rule-soft)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", backgroundColor: "var(--nuit-overlay)" }}>
        {DIAS_SEMANA.map(d => (
          <div key={d} style={{
            textAlign: "center", padding: "8px 0",
            fontFamily: "var(--font-sans)", fontSize: "9px", fontWeight: 700,
            letterSpacing: "0.1em", color: "var(--nuit-bone-soft)",
            borderBottom: "1px solid var(--rule-soft)",
          }}>
            {d}
          </div>
        ))}
      </div>
      {semanas.map((semana, wi) => (
        <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {semana.map(({ data, sessoes }) => {
            const foraDoMes = data.getMonth() !== mesAtual
            const ehHoje = data.getTime() === hoje.getTime()
            const visiveis = sessoes.slice(0, 3)
            const resto = sessoes.length - visiveis.length
            return (
              <div key={data.toISOString()} style={{
                minHeight: "96px", padding: "6px", borderRight: "1px solid var(--rule-soft)",
                borderBottom: "1px solid var(--rule-soft)",
                backgroundColor: ehHoje ? "rgba(212,184,134,0.06)" : "transparent",
                opacity: foraDoMes ? 0.35 : 1,
              }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: "22px", height: "22px", borderRadius: "50%",
                  fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "12.5px",
                  color: ehHoje ? "var(--nuit-midnight)" : "var(--nuit-bone)",
                  backgroundColor: ehHoje ? "var(--nuit-champagne)" : "transparent",
                  marginBottom: "4px",
                }}>
                  {data.getDate()}
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  {visiveis.map(s => (
                    <a
                      key={s.id}
                      href={`/clientes/${s.clienteId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`${s.hora ?? ""} · ${s.clienteNome} · ${s.servico ?? ""}`}
                      style={{
                        display: "block", fontSize: "9px", fontFamily: "var(--font-sans)",
                        color: "var(--nuit-bone-soft)", textDecoration: "none",
                        borderLeft: `2px solid ${ESTADO_BORDA[s.estado] ?? "var(--nuit-bone-soft)"}`,
                        paddingLeft: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}
                    >
                      {s.hora} {s.clienteNome}
                    </a>
                  ))}
                  {resto > 0 && (
                    <span style={{ fontSize: "8.5px", fontFamily: "var(--font-sans)", color: "var(--nuit-champagne-soft)", paddingLeft: "4px" }}>
                      +{resto} mais
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
