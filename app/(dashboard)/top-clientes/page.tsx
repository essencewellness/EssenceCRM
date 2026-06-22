import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";
import { Users, TrendingUp, Crown, AlertTriangle, Star, MessageCircle, Mail } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { AnimatedProgress } from "@/components/animated-progress";
import { getContextoUtilizador } from "@/lib/contexto-utilizador";
import type { Prisma } from "@prisma/client";

export const revalidate = 30

// ── Helpers ────────────────────────────────────────────────────────────────────

function AvatarCliente({ nome, posicao, cor }: { nome: string; posicao?: number; cor?: string }) {
  const medalColors = ["#b9a07a", "#9d9d9a", "#b06050"];
  return (
    <div style={{ position: "relative" }}>
      <div style={{
        width: "38px", height: "38px", borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-sans, sans-serif)",
        fontSize: "12px", fontWeight: 700,
        backgroundColor: cor ? cor + "18" : "rgba(185,160,122,0.10)",
        color: cor ?? "#b9a07a",
        border: `1.5px solid ${cor ? cor + "30" : "rgba(185,160,122,0.28)"}`,
      }}>
        {getInitials(nome)}
      </div>
      {posicao !== undefined && posicao <= 3 && (
        <span style={{
          position: "absolute", top: "-6px", right: "-6px",
          width: "16px", height: "16px", borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "8px", fontWeight: 800,
          fontFamily: "var(--font-sans, sans-serif)",
          backgroundColor: medalColors[posicao - 1] ?? "#9d9d9a",
          color: posicao === 1 ? "#161a26" : "#ffffff",
        }}>
          {posicao}
        </span>
      )}
    </div>
  );
}

function diasDesdeUltimaSessao(data: Date | null): number {
  if (!data) return 9999;
  const diff = Date.now() - new Date(data).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function CanalIcon({ canal }: { canal: string | null }) {
  if (!canal) return null;
  const isWhatsApp = canal.toLowerCase().includes("whatsapp");
  const isEmail = canal.toLowerCase().includes("email");
  if (isWhatsApp) return (
    <span style={{ display: "flex", alignItems: "center", gap: "3px", fontFamily: "var(--font-sans, sans-serif)", fontSize: "10px", color: "#9d9d9a" }}>
      <MessageCircle size={10} color="#a0a996" />
      WhatsApp
    </span>
  );
  if (isEmail) return (
    <span style={{ display: "flex", alignItems: "center", gap: "3px", fontFamily: "var(--font-sans, sans-serif)", fontSize: "10px", color: "#6d6d6d" }}>
      <Mail size={10} color="#a0a996" />
      Email
    </span>
  );
  return (
    <span style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "10px", color: "#9d9d9a" }}>
      {canal}
    </span>
  );
}

function EstadoBadgeMini({ estado }: { estado: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    lead:            { label: "Lead",       color: "#b9a07a", bg: "rgba(185,160,122,0.10)" },
    novo:            { label: "Nova",       color: "#a0a996", bg: "rgba(160,169,150,0.12)" },
    ativa_recente:   { label: "Ativa",      color: "#a0a996", bg: "rgba(160,169,150,0.12)" },
    ativa_frequente: { label: "Frequente",  color: "#7a9e7e", bg: "rgba(122,158,126,0.10)" },
    vip_embaixadora: { label: "VIP",        color: "#161a26", bg: "#d4b886" },
    vip_em_risco:    { label: "Em Risco",   color: "#d4956b", bg: "rgba(212,149,107,0.10)" },
    reativacao:      { label: "Reativação", color: "#b06050", bg: "rgba(176,96,80,0.08)"  },
    perdida:         { label: "Perdida",    color: "#9d9d9a", bg: "rgba(157,157,154,0.10)" },
    blacklist:       { label: "Blacklist",  color: "#b06050", bg: "rgba(176,96,80,0.12)"  },
  };
  const cfg = map[estado] ?? { label: estado, color: "#9d9d9a", bg: "rgba(157,157,154,0.10)" };
  return (
    <span style={{
      padding: "3px 8px", borderRadius: "0px",
      fontSize: "9px", fontWeight: 500, letterSpacing: "0.28em", textTransform: "uppercase",
      fontFamily: "var(--font-sans, sans-serif)", color: cfg.color, backgroundColor: cfg.bg,
      border: cfg.bg === "#d4b886" ? "none" : `1px solid ${cfg.color}44`,
    }}>
      {cfg.label}
    </span>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

const clienteSelect = {
  id: true, nome: true, telefone: true, email: true, estado: true,
  totalSessoes: true, totalGasto: true, ultimaSessao: true,
  historicoAromasPreferidos: true, historicoCondicoesAlergias: true,
  notasPessoais: true, canalPreferido: true, dataNascimento: true,
  etiquetas: { include: { etiqueta: true } },
} as const;

export default async function TopClientesPage({ searchParams }: PageProps) {
  const { tab = "valor" } = await searchParams;
  const ctx = await getContextoUtilizador();
  const filtroCliente = ctx.filtroCliente as Prisma.ClienteWhereInput;

  const agora = new Date();

  const [clientesPorValor, clientesPorSessoes, clientesEmRisco, resumo] = await Promise.all([
    prisma.cliente.findMany({
      where: { totalGasto: { gt: 0 }, ...filtroCliente },
      select: clienteSelect,
      orderBy: { totalGasto: "desc" },
      take: 50,
    }),
    prisma.cliente.findMany({
      where: { totalSessoes: { gt: 0 }, ...filtroCliente },
      select: clienteSelect,
      orderBy: { totalSessoes: "desc" },
      take: 50,
    }),
    prisma.cliente.findMany({
      where: { estado: { in: ["vip_em_risco", "reativacao"] }, ...filtroCliente },
      select: clienteSelect,
      orderBy: { ultimaSessao: "asc" },
    }),
    prisma.cliente.aggregate({
      where: filtroCliente,
      _count: { id: true },
      _avg: { totalGasto: true },
      _max: { totalGasto: true },
    }),
  ]);

  const clienteTop = clientesPorValor[0];
  const mediaGasto = Number(resumo._avg.totalGasto ?? 0);
  const maxGasto = Number(resumo._max.totalGasto ?? 0);

  const tabs = [
    { key: "valor", label: "Por Valor", icon: TrendingUp },
    { key: "sessoes", label: "Por Sessões", icon: Star },
    { key: "risco", label: "Em Risco", icon: AlertTriangle },
  ];

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>

      {/* Header animado */}
      <PageHeader
        titulo="Top Clientes"
        subtitulo="Identifica as tuas clientes mais valiosas e as que precisam de atenção."
      />

      {/* Stat cards — scale in com stagger */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", marginBottom: "28px" }}>
        {[
          { label: "Total Clientes", value: resumo._count.id, desc: "clientes registadas", icon: <Users size={16} color="#a0a996" />, delay: "0.28s" },
          { label: "Média Gasto",    value: formatCurrency(mediaGasto), desc: "por cliente",        icon: <TrendingUp size={16} color="#b9a07a" />, delay: "0.38s" },
          { label: "Cliente Top",    value: clienteTop?.nome ?? "—", desc: clienteTop ? formatCurrency(Number(clienteTop.totalGasto)) : "sem dados", icon: <Crown size={16} color="#b9a07a" />, delay: "0.48s" },
        ].map(({ label, value, desc, icon, delay }) => (
          <div
            key={label}
            className="anim-scale-in"
            style={{
              backgroundColor: "var(--nuit-overlay)", borderRadius: "2px",
              border: "1px solid rgba(212,184,134,0.16)", padding: "20px",
              animationDelay: delay,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <span style={{
                fontFamily: "var(--font-sans, sans-serif)",
                fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.18em",
                color: "#9d9d9a", textTransform: "uppercase",
              }}>{label}</span>
              {icon}
            </div>
            <p style={{
              fontFamily: "var(--font-heading, Georgia, serif)",
              fontSize: "26px", fontWeight: 400, color: "var(--nuit-bone)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{value}</p>
            <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "11px", color: "#9d9d9a", marginTop: "4px" }}>{desc}</p>
          </div>
        ))}
      </div>

      {/* Tabs — fade down */}
      <div
        className="anim-fade-down"
        style={{
          display: "flex", gap: "0",
          backgroundColor: "var(--nuit-overlay)",
          border: "1px solid rgba(212,184,134,0.16)", borderRadius: "0px",
          marginBottom: "20px",
          animationDelay: "0.5s",
        }}
      >
        {tabs.map(({ key, label, icon: Icon }) => (
          <a
            key={key}
            href={`?tab=${key}`}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              padding: "10px 12px", borderRadius: "0px",
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: "9.5px", fontWeight: 500, letterSpacing: "0.22em", textTransform: "uppercase",
              color: tab === key ? "#b9a07a" : "#9d9d9a",
              backgroundColor: tab === key ? "rgba(185,160,122,0.07)" : "transparent",
              borderBottom: tab === key ? "1px solid #b9a07a" : "1px solid transparent",
              borderTop: "none", borderLeft: "none", borderRight: "none",
              textDecoration: "none", transition: "all 150ms",
            }}
          >
            <Icon size={13} />
            {label}
          </a>
        ))}
      </div>

      {/* Tab: Por valor */}
      {tab === "valor" && (
        <div
          className="anim-fade-up"
          style={{
            backgroundColor: "var(--nuit-overlay)", borderRadius: "2px",
            border: "1px solid rgba(212,184,134,0.16)", overflow: "hidden",
            animationDelay: "0.55s",
          }}
        >
          {clientesPorValor.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "52px" }}>
              <TrendingUp size={32} color="#ddd6c4" style={{ marginBottom: "12px" }} />
              <p style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontStyle: "italic", fontSize: "14px", color: "#9d9d9a" }}>
                Ainda não há dados de faturação.
              </p>
            </div>
          ) : (
            <div>
              {clientesPorValor.map((cliente, i) => {
                const primEtiqueta = cliente.etiquetas[0]?.etiqueta;
                const pct = maxGasto > 0 ? (Number(cliente.totalGasto) / maxGasto) * 100 : 0;
                const progressColor = i === 0 ? "#b9a07a" : i < 3 ? "#a0a996" : "#ddd6c4";
                const dias = diasDesdeUltimaSessao(cliente.ultimaSessao);
                const aromas = cliente.historicoAromasPreferidos;
                const aromasTrunc = aromas && aromas.length > 60 ? aromas.slice(0, 60) + "…" : aromas;
                // Top 3 entram com scale, resto com fadeUp stagger
                const animClass = i < 3 ? "anim-scale-in" : "anim-fade-up";
                const delay = i < 3 ? `${0.6 + i * 0.1}s` : `${0.65 + i * 0.04}s`;
                return (
                  <Link
                    key={cliente.id}
                    href={`/clientes/${cliente.id}`}
                    style={{ textDecoration: "none", display: "block" }}
                  >
                    <div
                      className={`${animClass} hover:bg-[rgba(212,184,134,0.06)]`}
                      style={{
                        padding: "14px 20px",
                        borderBottom: i < clientesPorValor.length - 1 ? "1px solid rgba(212,184,134,0.08)" : "none",
                        backgroundColor: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                        transition: "background-color 120ms",
                        animationDelay: delay,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        <AvatarCliente nome={cliente.nome} posicao={i + 1} cor={primEtiqueta?.cor} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                            <span style={{ fontFamily: "var(--font-body, sans-serif)", fontWeight: 700, fontSize: "14px", color: "var(--nuit-bone)" }}>
                              {cliente.nome}
                            </span>
                            <EstadoBadgeMini estado={cliente.estado} />
                            {cliente.etiquetas.slice(0, 2).map(({ etiqueta }) => (
                              <span key={etiqueta.id} style={{ padding: "1px 7px", borderRadius: "100px", fontSize: "9px", fontWeight: 600, fontFamily: "var(--font-sans, sans-serif)", color: etiqueta.cor, backgroundColor: etiqueta.cor + "18", border: `1px solid ${etiqueta.cor}30` }}>
                                {etiqueta.nome}
                              </span>
                            ))}
                          </div>
                          <AnimatedProgress
                            value={pct}
                            color={progressColor}
                            delay={0.6 + i * 0.05}
                          />
                        </div>
                        <div style={{ flexShrink: 0, textAlign: "right" }}>
                          <p style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "15px", fontWeight: 700, color: "var(--nuit-bone)" }}>{formatCurrency(Number(cliente.totalGasto))}</p>
                          <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "11px", color: "var(--nuit-smoke)" }}>{cliente.totalSessoes} sess.</p>
                        </div>
                        <div style={{ flexShrink: 0, textAlign: "right", minWidth: "90px" }}>
                          <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "10px", color: "var(--nuit-smoke-deep)" }}>última sessão</p>
                          <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "11px", color: "var(--nuit-smoke)" }}>{formatDate(cliente.ultimaSessao)}</p>
                        </div>
                        <span style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "11px", color: "var(--nuit-champagne)", display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                          Ver perfil →
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "8px", paddingLeft: "52px", flexWrap: "wrap" }}>
                        {cliente.canalPreferido && <CanalIcon canal={cliente.canalPreferido} />}
                        {dias !== 9999 && <span style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "10px", color: "var(--nuit-smoke)" }}>{dias === 0 ? "sessão hoje" : `há ${dias} dias`}</span>}
                        {aromasTrunc && <span style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "10px", color: "var(--nuit-smoke)" }}>{aromasTrunc}</span>}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Por sessões */}
      {tab === "sessoes" && (
        <div
          className="anim-fade-up"
          style={{
            backgroundColor: "var(--nuit-overlay)", borderRadius: "2px",
            border: "1px solid rgba(212,184,134,0.16)", overflow: "hidden",
            animationDelay: "0.55s",
          }}
        >
          {clientesPorSessoes.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "52px" }}>
              <Star size={32} color="#ddd6c4" style={{ marginBottom: "12px" }} />
              <p style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontStyle: "italic", fontSize: "14px", color: "#9d9d9a" }}>
                Ainda não há sessões registadas.
              </p>
            </div>
          ) : (
            <div>
              {clientesPorSessoes.map((cliente, i) => {
                const primEtiqueta = cliente.etiquetas[0]?.etiqueta;
                const maxSessoes = clientesPorSessoes[0]?.totalSessoes ?? 1;
                const pct = (cliente.totalSessoes / maxSessoes) * 100;
                const dias = diasDesdeUltimaSessao(cliente.ultimaSessao);
                const aromas = cliente.historicoAromasPreferidos;
                const aromasTrunc = aromas && aromas.length > 60 ? aromas.slice(0, 60) + "…" : aromas;
                const animClass = i < 3 ? "anim-scale-in" : "anim-fade-up";
                const delay = i < 3 ? `${0.6 + i * 0.1}s` : `${0.65 + i * 0.04}s`;
                return (
                  <Link key={cliente.id} href={`/clientes/${cliente.id}`} style={{ textDecoration: "none", display: "block" }}>
                    <div
                      className={`${animClass} hover:bg-[rgba(212,184,134,0.06)]`}
                      style={{
                        padding: "14px 20px",
                        borderBottom: i < clientesPorSessoes.length - 1 ? "1px solid rgba(212,184,134,0.08)" : "none",
                        backgroundColor: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                        transition: "background-color 120ms",
                        animationDelay: delay,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        <AvatarCliente nome={cliente.nome} posicao={i + 1} cor={primEtiqueta?.cor} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                            <span style={{ fontFamily: "var(--font-body, sans-serif)", fontWeight: 700, fontSize: "14px", color: "var(--nuit-bone)" }}>{cliente.nome}</span>
                            <EstadoBadgeMini estado={cliente.estado} />
                          </div>
                          <AnimatedProgress
                            value={pct}
                            color="#a0a996"
                            delay={0.6 + i * 0.05}
                          />
                        </div>
                        <div style={{ flexShrink: 0, textAlign: "right" }}>
                          <p style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "15px", fontWeight: 700, color: "var(--nuit-bone)" }}>{cliente.totalSessoes} sess.</p>
                          <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "11px", color: "var(--nuit-smoke)" }}>{formatCurrency(Number(cliente.totalGasto))}</p>
                        </div>
                        <div style={{ flexShrink: 0, textAlign: "right", minWidth: "90px" }}>
                          <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "10px", color: "var(--nuit-smoke-deep)" }}>última sessão</p>
                          <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "11px", color: "var(--nuit-smoke)" }}>{formatDate(cliente.ultimaSessao)}</p>
                        </div>
                        <span style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "11px", color: "var(--nuit-champagne)", display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                          Ver perfil →
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "8px", paddingLeft: "52px", flexWrap: "wrap" }}>
                        {cliente.canalPreferido && <CanalIcon canal={cliente.canalPreferido} />}
                        {dias !== 9999 && <span style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "10px", color: "var(--nuit-smoke)" }}>{dias === 0 ? "sessão hoje" : `há ${dias} dias`}</span>}
                        {aromasTrunc && <span style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "10px", color: "var(--nuit-smoke)" }}>{aromasTrunc}</span>}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Em risco — fade right (alerta que vem de fora) */}
      {tab === "risco" && (
        <>
          {clientesEmRisco.length === 0 ? (
            <div
              className="anim-fade-up"
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                padding: "64px", borderRadius: "12px",
                border: "1px dashed rgba(160,169,150,0.4)",
                backgroundColor: "rgba(160,169,150,0.04)",
                animationDelay: "0.55s",
              }}
            >
              <Users size={22} color="#a0a996" opacity={0.6} style={{ marginBottom: "16px" }} />
              <p style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontStyle: "italic", fontSize: "15px", color: "#6d6d6d" }}>
                Nenhuma cliente em risco de abandono.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <p
                className="anim-fade-down"
                style={{
                  fontFamily: "var(--font-body, sans-serif)",
                  fontSize: "12px", color: "#9d9d9a", marginBottom: "4px",
                  animationDelay: "0.55s",
                }}
              >
                {clientesEmRisco.length} {clientesEmRisco.length === 1 ? "cliente" : "clientes"} com estado VIP em Risco ou Reativação.
              </p>
              {clientesEmRisco.map((cliente, i) => {
                const primEtiqueta = cliente.etiquetas[0]?.etiqueta;
                const dias = diasDesdeUltimaSessao(cliente.ultimaSessao);
                const urgente = dias > 90 || dias === 9999;
                const notasTrunc = cliente.notasPessoais && cliente.notasPessoais.length > 80 ? cliente.notasPessoais.slice(0, 80) + "…" : cliente.notasPessoais;
                const aromasTrunc = cliente.historicoAromasPreferidos && cliente.historicoAromasPreferidos.length > 60 ? cliente.historicoAromasPreferidos.slice(0, 60) + "…" : cliente.historicoAromasPreferidos;
                return (
                  <Link key={cliente.id} href={`/clientes/${cliente.id}`} style={{ textDecoration: "none", display: "block" }}>
                    <div
                      className="anim-fade-right hover:bg-[rgba(212,184,134,0.06)]"
                      style={{
                        padding: "14px 20px", borderRadius: "2px",
                        backgroundColor: "var(--nuit-overlay)",
                        border: urgente ? "1px solid rgba(176,96,80,0.35)" : "1px solid rgba(212,184,134,0.16)",
                        boxShadow: "var(--shadow-1)",
                        transition: "background-color 120ms",
                        animationDelay: `${0.58 + i * 0.06}s`,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        <div style={{ position: "relative" }}>
                          <AvatarCliente nome={cliente.nome} cor={primEtiqueta?.cor} />
                          {urgente && (
                            <span className="badge-pulse" style={{ position: "absolute", top: "-3px", right: "-3px", width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#b06050", border: "2px solid var(--nuit-overlay)" }} />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontFamily: "var(--font-body, sans-serif)", fontWeight: 700, fontSize: "14px", color: "var(--nuit-bone)" }}>{cliente.nome}</span>
                            <EstadoBadgeMini estado={cliente.estado} />
                          </div>
                          <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "11px", color: "var(--nuit-smoke)", marginTop: "3px" }}>
                            {cliente.telefone ?? "sem telefone"} · {cliente.totalSessoes} sessões
                          </p>
                        </div>
                        <div style={{ flexShrink: 0, textAlign: "right" }}>
                          {dias === 9999 ? (
                            <p style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "13px", fontWeight: 700, color: "#b06050" }}>Nunca teve sessão</p>
                          ) : (
                            <>
                              <p style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "14px", fontWeight: 700, color: urgente ? "#b06050" : "var(--nuit-champagne)" }}>{dias} dias</p>
                              <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "10px", color: "var(--nuit-smoke)" }}>sem sessão</p>
                            </>
                          )}
                        </div>
                        <span style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "11px", color: "var(--nuit-champagne)", display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                          Ver perfil →
                        </span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px", marginTop: "8px", paddingLeft: "52px" }}>
                        {cliente.canalPreferido && <CanalIcon canal={cliente.canalPreferido} />}
                        {dias !== 9999 && <span style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "10px", fontWeight: 600, color: "#b06050" }}>Sem sessão há {dias} dias</span>}
                        {aromasTrunc && <span style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "10px", color: "var(--nuit-smoke)" }}>{aromasTrunc}</span>}
                        {notasTrunc && <span style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "10px", color: "var(--nuit-smoke)", fontStyle: "italic" }}>{notasTrunc}</span>}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
