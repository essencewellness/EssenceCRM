import { prisma } from "@/lib/prisma"
import { KpiCardPremium } from "@/components/kpi-card"
import { DashboardHeader, SessoesHojeCard, MensagensCard, ProximosDiasCard } from "@/components/dashboard-live"

export const revalidate = 30

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildDateRange() {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const amanha = new Date(hoje)
  amanha.setDate(amanha.getDate() + 1)
  const semanaFim = new Date(hoje)
  semanaFim.setDate(semanaFim.getDate() + 7)
  return { hoje, amanha, semanaFim }
}

function getSaudacao(): string {
  const hora = new Date().getHours()
  if (hora < 12) return "Bom dia"
  if (hora < 19) return "Boa tarde"
  return "Boa noite"
}

function getIniciais(nome: string): string {
  const partes = nome.trim().split(" ")
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

function formatarDiaSemana(data: Date): string {
  return new Intl.DateTimeFormat("pt-PT", { weekday: "long" }).format(data)
}

function formatarDataCurta(data: Date): string {
  return new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "short" }).format(data)
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const { hoje, amanha, semanaFim } = buildDateRange()

  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
  const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

  const ha30 = new Date(hoje); ha30.setDate(hoje.getDate() - 30)
  const ha60 = new Date(hoje); ha60.setDate(hoje.getDate() - 60)
  const ha90 = new Date(hoje); ha90.setDate(hoje.getDate() - 90)

  const [sessõesHoje, sessõesSemana, mensagensParaEnviar, totalClientesActivos,
         totalMensagensPendentes, ativosEsteMes, ativosMesAnterior, totalClientes, clientesEmRisco,
         inativas30a60, inativas61a90, inativasMais90, alertasSatisfacao] =
    await Promise.all([
      prisma.sessao.findMany({
        where: { data: { gte: hoje, lt: amanha } },
        include: { cliente: true },
        orderBy: { hora: "asc" },
      }),
      prisma.sessao.findMany({
        where: { data: { gte: amanha, lt: semanaFim } },
        include: { cliente: true },
        orderBy: [{ data: "asc" }, { hora: "asc" }],
      }),
      prisma.mensagemIA.findMany({
        where: { estado: "aprovada", enviadaEm: null },
        include: { cliente: { select: { nome: true, telefone: true } } },
        orderBy: { aprovadaEm: "asc" },
      }),
      prisma.cliente.count({
        where: { estado: { in: ["ativa_recente", "ativa_frequente", "vip_embaixadora"] } },
      }),
      prisma.mensagemIA.count({ where: { estado: "pendente" } }),
      prisma.cliente.count({ where: { ultimaSessao: { gte: inicioMes }, apagadoEm: null } }),
      prisma.cliente.count({ where: { ultimaSessao: { gte: inicioMesAnterior, lt: fimMesAnterior }, apagadoEm: null } }),
      prisma.cliente.count({ where: { apagadoEm: null } }),
      prisma.cliente.count({ where: { estado: { in: ["vip_em_risco", "reativacao"] }, apagadoEm: null } }),
      prisma.cliente.findMany({
        where: { ultimaSessao: { gte: ha60, lt: ha30 }, estado: { notIn: ["blacklist", "perdida"] }, apagadoEm: null },
        select: { id: true, nome: true, telefone: true, ultimaSessao: true },
        take: 5, orderBy: { ultimaSessao: "asc" },
      }),
      prisma.cliente.findMany({
        where: { ultimaSessao: { gte: ha90, lt: ha60 }, estado: { notIn: ["blacklist", "perdida"] }, apagadoEm: null },
        select: { id: true, nome: true, telefone: true, ultimaSessao: true },
        take: 5, orderBy: { ultimaSessao: "asc" },
      }),
      prisma.cliente.findMany({
        where: { ultimaSessao: { lt: ha90 }, estado: { notIn: ["blacklist", "perdida"] }, apagadoEm: null },
        select: { id: true, nome: true, telefone: true, ultimaSessao: true },
        take: 5, orderBy: { ultimaSessao: "asc" },
      }),
      prisma.sessao.findMany({
        where: { avaliacaoNota: { lte: 2, not: null }, apagadoEm: null },
        select: { id: true, data: true, avaliacaoNota: true, cliente: { select: { nome: true } } },
        orderBy: { avaliacaoRespondidaEm: "desc" },
        take: 5,
      }),
    ])

  const pctEsteMes = totalClientes > 0 ? Math.round((ativosEsteMes / totalClientes) * 100) : 0
  const pctMesAnterior = totalClientes > 0 ? Math.round((ativosMesAnterior / totalClientes) * 100) : 0
  const tendencia = pctEsteMes - pctMesAnterior

  const receitaSemana = [...sessõesHoje, ...sessõesSemana].reduce((acc, s) => acc + Number(s.preco ?? 0), 0)
  const saudacao = getSaudacao()

  // ── Serializar para client components ────────────────────────────────────

  const sessoesHojeRows = sessõesHoje.map(s => ({
    id: s.id,
    hora: s.hora,
    clienteId: s.clienteId,
    clienteNome: s.cliente.nome,
    clienteIniciais: getIniciais(s.cliente.nome),
    servico: s.servico,
    terapeuta: s.terapeuta,
    estado: s.estado,
  }))

  const mensagensRows = mensagensParaEnviar.map(m => ({
    id: m.id,
    clienteNome: m.cliente.nome,
    clienteIniciais: getIniciais(m.cliente.nome),
    canal: m.canal,
    preview: (() => {
      const txt = m.mensagemFinal ?? m.mensagemGerada ?? ""
      return txt.length > 80 ? txt.slice(0, 80) + "…" : txt || "—"
    })(),
  }))

  // Próximos 7 dias — só dias com sessões
  const dias7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(hoje)
    d.setDate(d.getDate() + 1 + i)
    return d
  })
  const porDia = new Map<string, typeof sessõesSemana>()
  for (const s of sessõesSemana) {
    const chave = s.data.toISOString().slice(0, 10)
    porDia.set(chave, [...(porDia.get(chave) ?? []), s])
  }
  const diasRows = dias7
    .filter(d => (porDia.get(d.toISOString().slice(0, 10)) ?? []).length > 0)
    .map(d => {
      const chave = d.toISOString().slice(0, 10)
      const sessoesDia = (porDia.get(chave) ?? []).sort((a, b) => (a.hora ?? "").localeCompare(b.hora ?? ""))
      return {
        chave,
        diaSemana: formatarDiaSemana(d),
        dataCurta: formatarDataCurta(d),
        sessoes: sessoesDia.map(s => ({
          id: s.id,
          hora: s.hora,
          clienteId: s.clienteId,
          clienteNome: s.cliente.nome,
          clienteIniciais: getIniciais(s.cliente.nome),
          servico: s.servico,
          terapeuta: s.terapeuta,
          estado: s.estado,
        })),
      }
    })

  return (
    <div style={{ maxWidth: "1024px", margin: "0 auto" }}>

      {/* ── Cabeçalho animado ── */}
      <DashboardHeader saudacao={saudacao} totalHoje={sessõesHoje.length} />

      {/* ── KPI Cards ── */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px", marginBottom: "36px" }}>
        <KpiCardPremium
          titulo="Clientes Activas"
          valor={totalClientesActivos}
          descricao="Ativas, frequentes e VIP"
          cor="gold"
          index={0}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>}
        />
        <KpiCardPremium
          titulo="Receita Semana"
          valor={Math.round(receitaSemana)}
          suffix=" €"
          descricao="Total acumulado"
          cor="green"
          index={1}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.25 7.756a4.5 4.5 0 1 0 0 8.488M7.5 10.5h5.25m-5.25 3h5.25M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>}
        />
        <KpiCardPremium
          titulo="Sessões Hoje"
          valor={sessõesHoje.length}
          descricao={sessõesHoje.length === 0 ? "Dia livre" : `${sessõesHoje.filter(s => s.estado === "confirmada").length} confirmada(s)`}
          cor="blue"
          index={2}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>}
        />
        <KpiCardPremium
          titulo="Mensagens Pendentes"
          valor={totalMensagensPendentes}
          descricao={totalMensagensPendentes === 0 ? "Tudo a dia" : "A aguardar aprovação"}
          cor={totalMensagensPendentes > 0 ? "red" : "gold"}
          index={3}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>}
        />
      </section>

      {/* ── Métricas de Recorrência ── */}
      <section style={{ marginBottom: "28px", padding: "20px 24px", background: "rgba(185,160,122,0.06)", borderRadius: "12px", border: "1px solid rgba(185,160,122,0.15)" }}>
        <h3 style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "13px", fontWeight: 600, color: "#8a7460", letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 14px" }}>Recorrência</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px" }}>
          <div>
            <p style={{ fontSize: "11px", color: "#9a8a7a", margin: "0 0 4px" }}>Ativas este mês</p>
            <p style={{ fontSize: "22px", fontWeight: 700, color: "#3d2c1e", margin: 0 }}>
              {pctEsteMes}%{" "}
              <span style={{ fontSize: "11px", fontWeight: 400, color: tendencia >= 0 ? "#4a7c59" : "#b44" }}>
                {tendencia >= 0 ? "▲" : "▼"} {Math.abs(tendencia)}pp vs mês anterior
              </span>
            </p>
          </div>
          <div>
            <p style={{ fontSize: "11px", color: "#9a8a7a", margin: "0 0 4px" }}>Clientes em risco</p>
            <p style={{ fontSize: "22px", fontWeight: 700, color: clientesEmRisco > 0 ? "#b44" : "#3d2c1e", margin: 0 }}>
              {clientesEmRisco}
              <span style={{ fontSize: "11px", fontWeight: 400, color: "#9a8a7a" }}> (VIP risco + reativação)</span>
            </p>
          </div>
          <div>
            <p style={{ fontSize: "11px", color: "#9a8a7a", margin: "0 0 4px" }}>Mensagens pendentes</p>
            <p style={{ fontSize: "22px", fontWeight: 700, color: totalMensagensPendentes > 0 ? "#b85c00" : "#3d2c1e", margin: 0 }}>
              {totalMensagensPendentes}
              <span style={{ fontSize: "11px", fontWeight: 400, color: "#9a8a7a" }}> a aprovar</span>
            </p>
          </div>
        </div>
      </section>

      {/* ── Sessões de Hoje ── */}
      <SessoesHojeCard sessoes={sessoesHojeRows} />

      {/* ── Mensagens a Enviar ── */}
      <MensagensCard mensagens={mensagensRows} />

      {/* ── Próximos 7 Dias ── */}
      <ProximosDiasCard
        dias={diasRows}
        totalSessoes={sessõesSemana.length}
        isHero={sessõesHoje.length === 0}
      />

      {/* ── Retenção — clientes inativas ── */}
      {(inativas30a60.length > 0 || inativas61a90.length > 0 || inativasMais90.length > 0) && (
        <section style={{ marginBottom: "28px" }}>
          <h3 style={{ fontSize: "13px", fontWeight: 600, color: "#8a7460", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "12px" }}>
            Clientes inativas
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px" }}>
            {[
              { label: "30–60 dias", clientes: inativas30a60, cor: "#b85c00" },
              { label: "61–90 dias", clientes: inativas61a90, cor: "#b44" },
              { label: "+90 dias", clientes: inativasMais90, cor: "#7a0000" },
            ].map(({ label, clientes, cor }) => (
              <div key={label} style={{ background: "#fff", border: "1px solid #e5ddd3", borderRadius: "10px", padding: "14px" }}>
                <p style={{ fontSize: "11px", color: cor, fontWeight: 600, marginBottom: "8px" }}>{label} ({clientes.length})</p>
                {clientes.length === 0 ? (
                  <p style={{ fontSize: "12px", color: "#9a8a7a" }}>Nenhuma</p>
                ) : (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "12px", color: "#3d2c1e" }}>
                    {clientes.map((c) => (
                      <li key={c.id} style={{ paddingBottom: "4px" }}>{c.nome}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Alertas de satisfação ── */}
      {alertasSatisfacao.length > 0 && (
        <section style={{ marginBottom: "28px" }}>
          <h3 style={{ fontSize: "13px", fontWeight: 600, color: "#b44", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "12px" }}>
            Alertas de satisfação ({alertasSatisfacao.length})
          </h3>
          <div style={{ background: "#fff8f7", border: "1px solid #f5d0cc", borderRadius: "10px", padding: "14px" }}>
            {alertasSatisfacao.map((s) => (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", paddingBottom: "6px", fontSize: "13px" }}>
                <span style={{ color: "#3d2c1e" }}>{s.cliente.nome}</span>
                <span style={{ color: "#b44", fontWeight: 700 }}>{"★".repeat(s.avaliacaoNota ?? 0)} ({s.avaliacaoNota}/5)</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Rodapé */}
      <footer style={{
        marginTop: "48px",
        borderTop: "1px solid #ddd6c4",
        paddingTop: "20px",
        textAlign: "center",
      }}>
        <p style={{
          fontFamily: "var(--font-heading, Georgia, serif)",
          fontStyle: "italic", fontSize: "11px",
          color: "rgba(185,160,122,0.45)",
        }}>
          Descubra a sua essência. Renove o seu bem-estar.
        </p>
      </footer>
    </div>
  )
}
