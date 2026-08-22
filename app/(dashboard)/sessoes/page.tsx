import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { getFiltrosTerapeuta } from "@/lib/contexto-utilizador";
import { FiltroTerapeutaSlot } from "@/components/filtro-terapeuta-slot";
import { Calendar, Clock, User } from "lucide-react";
import { StaggerList, StaggerItem } from "@/components/stagger";
import type { Prisma } from "@/lib/prisma-client";

export const revalidate = 30;

const ESTADO_SESSAO: Record<string, { label: string; color: string; bg: string }> = {
  agendada:          { label: "Agendada",          color: "var(--nuit-champagne-soft)", bg: "rgba(185,160,122,0.10)" },
  confirmada:        { label: "Confirmada",         color: "#7a9e7e", bg: "rgba(122,158,126,0.10)" },
  aguarda_terapeuta: { label: "Aguarda terapeuta",  color: "var(--nuit-sage)", bg: "rgba(160,169,150,0.12)" },
  realizada:         { label: "Realizada",          color: "#7a9e7e", bg: "rgba(122,158,126,0.12)" },
  cancelada:         { label: "Cancelada",          color: "var(--nuit-bone-soft)", bg: "rgba(157,157,154,0.10)" },
  falta:             { label: "Falta",              color: "var(--destructive)", bg: "rgba(176,96,80,0.10)"   },
};

interface PageProps {
  searchParams: Promise<{ estado?: string; data?: string; terapeuta?: string }>;
}

export default async function SessoesPage({ searchParams }: PageProps) {
  const { estado: estadoFiltro, data: dataFiltro, terapeuta } = await searchParams;
  const { filtroSessao: filtroSessaoBase } = await getFiltrosTerapeuta(terapeuta);
  const filtroSessao = filtroSessaoBase as Prisma.SessaoWhereInput;

  const hoje = new Date();
  const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const fimDia   = new Date(inicioDia.getTime() + 86400000);

  const whereBase: Prisma.SessaoWhereInput = {
    apagadoEm: null,
    cliente: { apagadoEm: null },
    ...filtroSessao,
  };

  if (estadoFiltro) whereBase.estado = estadoFiltro as Prisma.SessaoWhereInput["estado"];
  if (dataFiltro === "hoje") {
    whereBase.data = { gte: inicioDia, lt: fimDia };
  } else if (dataFiltro === "futuras") {
    whereBase.data = { gte: inicioDia };
  } else if (dataFiltro === "passadas") {
    whereBase.data = { lt: inicioDia };
  }

  const [sessoes, totais] = await Promise.all([
    prisma.sessao.findMany({
      where: whereBase,
      include: {
        cliente: { select: { id: true, nome: true, telefone: true } },
      },
      orderBy: { data: "desc" },
      take: 100,
    }),
    prisma.sessao.groupBy({
      by: ["estado"],
      where: { apagadoEm: null, cliente: { apagadoEm: null }, ...filtroSessao },
      _count: { estado: true },
    }),
  ]);

  const contagemPorEstado = Object.fromEntries(
    totais.map((t) => [t.estado, t._count.estado])
  );
  const totalSessoes = Object.values(contagemPorEstado).reduce((a, b) => a + b, 0);
  const sessoesHoje  = sessoes.filter(
    (s) => s.data >= inicioDia && s.data < fimDia
  ).length;

  const filtrosData = [
    { key: "",        label: "Todas"   },
    { key: "hoje",    label: "Hoje"    },
    { key: "futuras", label: "Futuras" },
    { key: "passadas",label: "Passadas"},
  ];

  const filtrosEstado = [
    { key: "",                 label: "Todos os estados" },
    { key: "agendada",         label: "Agendada"         },
    { key: "confirmada",       label: "Confirmada"       },
    { key: "realizada",        label: "Realizada"        },
    { key: "cancelada",        label: "Cancelada"        },
    { key: "falta",            label: "Falta"            },
  ];

  function buildUrl(params: Record<string, string>) {
    const p = new URLSearchParams();
    if (estadoFiltro && !("estado" in params)) p.set("estado", estadoFiltro);
    if (dataFiltro   && !("data"   in params)) p.set("data",   dataFiltro);
    if (terapeuta) p.set("terapeuta", terapeuta);
    Object.entries(params).forEach(([k, v]) => { if (v) p.set(k, v); });
    const s = p.toString();
    return s ? `?${s}` : "/sessoes";
  }

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "0 0 40px" }}>

      {/* Cabeçalho */}
      <div style={{ marginBottom: "28px" }}>
        <p style={{
          fontFamily: "var(--font-sans, sans-serif)", fontSize: "9px",
          fontWeight: 500, letterSpacing: "0.32em", textTransform: "uppercase",
          color: "var(--nuit-champagne-soft)", marginBottom: "6px",
        }}>
          Essence Wellness · CRM
        </p>
        <h1 style={{
          fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "26px",
          fontWeight: 400, color: "var(--nuit-bone)", letterSpacing: "-0.005em",
        }}>
          Sessões
        </h1>
      </div>

      <FiltroTerapeutaSlot />

      {/* KPIs rápidos */}
      <StaggerList style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "24px" }}>
        {[
          { label: "Total sessões", value: totalSessoes, icon: <Calendar size={15} color="var(--nuit-sage)" /> },
          { label: "Hoje",          value: sessoesHoje,  icon: <Clock    size={15} color="var(--nuit-champagne-soft)" /> },
          { label: "Realizadas",    value: contagemPorEstado["realizada"] ?? 0, icon: <User size={15} color="#7a9e7e" /> },
        ].map(({ label, value, icon }) => (
          <StaggerItem key={label} style={{
            backgroundColor: "var(--nuit-overlay)", border: "1px solid rgba(212,184,134,0.16)",
            borderRadius: "2px", padding: "18px 20px",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <span style={{
                fontFamily: "var(--font-sans, sans-serif)", fontSize: "9.5px",
                fontWeight: 700, letterSpacing: "0.18em", color: "var(--nuit-bone-soft)", textTransform: "uppercase",
              }}>{label}</span>
              {icon}
            </div>
            <p style={{
              fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "28px",
              fontWeight: 400, color: "var(--nuit-bone)",
            }}>{value}</p>
          </StaggerItem>
        ))}
      </StaggerList>

      {/* Filtros */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
        {filtrosData.map(({ key, label }) => {
          const ativo = (dataFiltro ?? "") === key;
          return (
            <Link key={key} href={buildUrl({ data: key })} style={{
              fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px",
              padding: "5px 12px", borderRadius: "100px", textDecoration: "none",
              border: ativo ? "1px solid var(--nuit-champagne-soft)" : "1px solid rgba(212,184,134,0.16)",
              color: ativo ? "var(--nuit-champagne-soft)" : "var(--nuit-bone-soft)",
              backgroundColor: ativo ? "rgba(185,160,122,0.08)" : "transparent",
              transition: "all 120ms",
            }}>{label}</Link>
          );
        })}
        <div style={{ width: "1px", backgroundColor: "rgba(212,184,134,0.16)", margin: "0 4px" }} />
        {filtrosEstado.map(({ key, label }) => {
          const ativo = (estadoFiltro ?? "") === key;
          return (
            <Link key={key} href={buildUrl({ estado: key })} style={{
              fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px",
              padding: "5px 12px", borderRadius: "100px", textDecoration: "none",
              border: ativo ? "1px solid var(--nuit-champagne-soft)" : "1px solid rgba(212,184,134,0.16)",
              color: ativo ? "var(--nuit-champagne-soft)" : "var(--nuit-bone-soft)",
              backgroundColor: ativo ? "rgba(185,160,122,0.08)" : "transparent",
              transition: "all 120ms",
            }}>{label}</Link>
          );
        })}
      </div>

      {/* Lista de sessões */}
      <div style={{
        backgroundColor: "var(--nuit-overlay)", border: "1px solid rgba(212,184,134,0.16)",
        borderRadius: "2px", overflowX: "auto",
      }}>
        {sessoes.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: "64px",
          }}>
            <Calendar size={32} color="rgba(212,184,134,0.16)" style={{ marginBottom: "12px" }} />
            <p style={{
              fontFamily: "var(--font-heading, Georgia, serif)", fontStyle: "italic",
              fontSize: "14px", color: "var(--nuit-bone-soft)",
            }}>
              Nenhuma sessão encontrada.
            </p>
          </div>
        ) : (
          <>
            {/* Cabeçalho da tabela */}
            <div style={{
              display: "grid", gridTemplateColumns: "120px 1fr 160px 120px 110px", minWidth: "620px",
              padding: "10px 20px",
              borderBottom: "1px solid rgba(212,184,134,0.1)",
              backgroundColor: "var(--nuit-overlay)",
            }}>
              {["Data", "Cliente", "Serviço", "Terapeuta", "Estado"].map((col) => (
                <span key={col} style={{
                  fontFamily: "var(--font-sans, sans-serif)", fontSize: "9.5px",
                  fontWeight: 700, letterSpacing: "0.18em", color: "var(--nuit-bone-soft)",
                  textTransform: "uppercase",
                }}>{col}</span>
              ))}
            </div>

            {sessoes.map((sessao, i) => {
              const cfg = ESTADO_SESSAO[sessao.estado] ?? ESTADO_SESSAO["agendada"]!;
              const isHoje = sessao.data >= inicioDia && sessao.data < fimDia;
              return (
                <Link
                  key={sessao.id}
                  href={`/clientes/${sessao.clienteId}`}
                  style={{
                    textDecoration: "none", display: "block",
                    animation: "fadeUp var(--dur-med) var(--ease-out) both",
                    animationDelay: `${Math.min(i, 12) * 22}ms`,
                  }}
                >
                  <div style={{
                    display: "grid", gridTemplateColumns: "120px 1fr 160px 120px 110px", minWidth: "620px",
                    padding: "13px 20px", alignItems: "center",
                    borderBottom: i < sessoes.length - 1 ? "1px solid rgba(212,184,134,0.1)" : "none",
                    backgroundColor: isHoje
                      ? "rgba(185,160,122,0.04)"
                      : i % 2 === 0 ? "var(--nuit-overlay)" : "rgba(255,255,255,0.02)",
                    transition: "background-color 120ms",
                  }}
                  className="row-hover"
                  >
                    <span style={{
                      fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px",
                      color: isHoje ? "var(--nuit-champagne-soft)" : "var(--nuit-bone-soft)",
                      fontWeight: isHoje ? 600 : 400,
                    }}>
                      {isHoje ? "Hoje" : formatDate(sessao.data)}
                      {sessao.hora && (
                        <span style={{ color: "var(--nuit-bone-soft)", marginLeft: "6px" }}>{sessao.hora}</span>
                      )}
                    </span>

                    <div>
                      <span style={{
                        fontFamily: "var(--font-sans, sans-serif)", fontSize: "13px",
                        fontWeight: 600, color: "var(--nuit-bone)",
                      }}>
                        {sessao.cliente.nome}
                      </span>
                      {sessao.cliente.telefone && (
                        <span style={{
                          fontFamily: "var(--font-sans, sans-serif)", fontSize: "11px",
                          color: "var(--nuit-bone-soft)", marginLeft: "8px",
                        }}>
                          {sessao.cliente.telefone}
                        </span>
                      )}
                    </div>

                    <span style={{
                      fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px",
                      color: "var(--nuit-bone-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {sessao.servico ?? "—"}
                    </span>

                    <span style={{
                      fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px",
                      color: "var(--nuit-bone-soft)", textTransform: "capitalize",
                    }}>
                      {sessao.terapeuta ?? "—"}
                    </span>

                    <span style={{
                      padding: "3px 8px", borderRadius: "0px",
                      fontSize: "9px", fontWeight: 500, letterSpacing: "0.22em", textTransform: "uppercase",
                      fontFamily: "var(--font-sans, sans-serif)",
                      color: cfg.color, backgroundColor: cfg.bg,
                      border: `1px solid ${cfg.color}44`,
                      display: "inline-block",
                    }}>
                      {cfg.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </>
        )}
      </div>

      {sessoes.length === 100 && (
        <p style={{
          fontFamily: "var(--font-sans, sans-serif)", fontSize: "11px",
          color: "var(--nuit-bone-soft)", textAlign: "center", marginTop: "16px",
        }}>
          A mostrar as últimas 100 sessões. Usa os filtros para refinar.
        </p>
      )}
    </div>
  );
}
