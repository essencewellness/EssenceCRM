import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getFiltrosTerapeuta } from "@/lib/contexto-utilizador";
import { FiltroTerapeutaSlot } from "@/components/filtro-terapeuta-slot";
import { BarChart2, Users, AlertTriangle, TrendingUp, MessageSquare, Calendar } from "lucide-react";
import type { Prisma } from "@/lib/prisma-client";

export const revalidate = 60;

const ESTADOS: {
  key: string;
  label: string;
  desc: string;
  color: string;
  bg: string;
  href: string;
}[] = [
  { key: "lead",            label: "Lead",            desc: "Interesse inicial, ainda não marcou",  color: "var(--nuit-champagne-soft)", bg: "rgba(185,160,122,0.08)", href: "/clientes?estado=lead"            },
  { key: "novo",            label: "Novo",            desc: "Primeira sessão recente",              color: "var(--nuit-sage)", bg: "rgba(160,169,150,0.10)", href: "/clientes?estado=novo"            },
  { key: "ativa_recente",   label: "Ativa Recente",   desc: "Sessão nos últimos 45 dias",          color: "#7a9e7e", bg: "rgba(122,158,126,0.10)", href: "/clientes?estado=ativa_recente"   },
  { key: "ativa_frequente", label: "Ativa Frequente", desc: "3+ sessões e visita regular",         color: "#4a8e5e", bg: "rgba(74,142,94,0.10)",   href: "/clientes?estado=ativa_frequente" },
  { key: "vip_embaixadora", label: "VIP Embaixadora", desc: "Top clientes, promotoras da marca",   color: "var(--nuit-champagne-soft)", bg: "var(--nuit-champagne)18",              href: "/clientes?estado=vip_embaixadora" },
  { key: "vip_em_risco",    label: "VIP em Risco",    desc: "VIP sem sessão há mais de 45 dias",   color: "#d4956b", bg: "rgba(212,149,107,0.10)", href: "/clientes?estado=vip_em_risco"    },
  { key: "reativacao",      label: "Reativação",      desc: "Sem sessão há mais de 60 dias",       color: "var(--destructive)", bg: "rgba(176,96,80,0.08)",   href: "/clientes?estado=reativacao"      },
  { key: "perdida",         label: "Perdida",         desc: "Sem sessão há mais de 180 dias",      color: "var(--nuit-bone-soft)", bg: "rgba(157,157,154,0.10)", href: "/clientes?estado=perdida"         },
  { key: "blacklist",       label: "Blacklist",       desc: "Bloqueada — sem comunicação",         color: "var(--destructive)", bg: "rgba(176,96,80,0.12)",   href: "/clientes?estado=blacklist"       },
];

interface PageProps {
  searchParams: Promise<{ terapeuta?: string }>;
}

export default async function PipelinePage({ searchParams }: PageProps) {
  const { terapeuta } = await searchParams;
  const { filtroCliente: fcBase, filtroSessao: fsBase } = await getFiltrosTerapeuta(terapeuta);
  const filtroCliente = fcBase as Prisma.ClienteWhereInput;
  const filtroSessao = fsBase as Prisma.SessaoWhereInput;
  // Mensagens são filtradas pelo cliente associado
  const filtroMensagemCliente = (terapeuta || (filtroCliente.terapeutaPrincipalId))
    ? { cliente: filtroCliente }
    : {};

  const hoje = new Date();
  const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const fimDia    = new Date(inicioDia.getTime() + 86400000);
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  const [contagens, sessoesHoje, mensagensPendentes, emFila, totalClientes, clientesEmRisco, ativosMes] = await Promise.all([
    prisma.cliente.groupBy({
      by: ["estado"],
      where: { apagadoEm: null, ...filtroCliente },
      _count: { estado: true },
    }),
    prisma.sessao.count({
      where: {
        data: { gte: inicioDia, lt: fimDia },
        estado: { in: ["agendada", "confirmada", "realizada"] },
        apagadoEm: null,
        ...filtroSessao,
      },
    }),
    prisma.mensagemIA.count({ where: { estado: "pendente", ...filtroMensagemCliente } }),
    prisma.mensagemIA.count({ where: { estado: "em_fila", ...filtroMensagemCliente } }),
    prisma.cliente.count({ where: { apagadoEm: null, ...filtroCliente } }),
    prisma.cliente.count({
      where: { estado: { in: ["vip_em_risco", "reativacao"] }, apagadoEm: null, ...filtroCliente },
    }),
    prisma.cliente.count({
      where: { ultimaSessao: { gte: inicioMes }, apagadoEm: null, ...filtroCliente },
    }),
  ]);

  const porEstado = Object.fromEntries(
    contagens.map((c) => [c.estado, c._count.estado])
  );

  const maxCount = Math.max(...ESTADOS.map((e) => porEstado[e.key] ?? 0), 1);

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
          Pipeline
        </h1>
      </div>

      <FiltroTerapeutaSlot />

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: "28px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          {[
            { label: "Total clientes", value: totalClientes,      icon: <Users       size={15} color="var(--nuit-sage)" /> },
            { label: "Sessões hoje",   value: sessoesHoje,        icon: <Calendar    size={15} color="var(--nuit-champagne-soft)" /> },
            { label: "Em risco",       value: clientesEmRisco,    icon: <AlertTriangle size={15} color="#d4956b" /> },
          ].map(({ label, value, icon }) => (
            <div key={label} style={{
              backgroundColor: "var(--nuit-overlay)", border: "1px solid rgba(212,184,134,0.16)",
              borderRadius: "2px", padding: "16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{
                  fontFamily: "var(--font-sans, sans-serif)", fontSize: "9px",
                  fontWeight: 700, letterSpacing: "0.18em", color: "var(--nuit-bone-soft)", textTransform: "uppercase",
                }}>{label}</span>
                {icon}
              </div>
              <p style={{
                fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "26px",
                fontWeight: 400, color: "var(--nuit-bone)",
              }}>{value}</p>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          {[
            { label: "Ativas este mês", value: ativosMes,            icon: <TrendingUp    size={15} color="#7a9e7e" /> },
            { label: "Msg. pendentes",  value: mensagensPendentes,   icon: <MessageSquare size={15} color="var(--nuit-champagne-soft)" /> },
            { label: "Em fila envio",   value: emFila,               icon: <MessageSquare size={15} color="var(--nuit-sage)" /> },
          ].map(({ label, value, icon }) => (
            <div key={label} style={{
              backgroundColor: "var(--nuit-overlay)", border: "1px solid rgba(212,184,134,0.16)",
              borderRadius: "2px", padding: "16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{
                  fontFamily: "var(--font-sans, sans-serif)", fontSize: "9px",
                  fontWeight: 700, letterSpacing: "0.18em", color: "var(--nuit-bone-soft)", textTransform: "uppercase",
                }}>{label}</span>
                {icon}
              </div>
              <p style={{
                fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "26px",
                fontWeight: 400, color: "var(--nuit-bone)",
              }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Estados CRM */}
      <div style={{ marginBottom: "8px" }}>
        <span style={{
          fontFamily: "var(--font-sans, sans-serif)", fontSize: "9.5px",
          fontWeight: 700, letterSpacing: "0.22em", color: "var(--nuit-bone-soft)", textTransform: "uppercase",
        }}>
          Distribuição por Estado
        </span>
      </div>

      <div style={{
        backgroundColor: "var(--nuit-overlay)", border: "1px solid rgba(212,184,134,0.16)",
        borderRadius: "2px", overflow: "hidden",
      }}>
        {ESTADOS.map((estado, i) => {
          const count = porEstado[estado.key] ?? 0;
          const pct   = maxCount > 0 ? (count / maxCount) * 100 : 0;
          return (
            <Link
              key={estado.key}
              href={terapeuta ? `${estado.href}&terapeuta=${terapeuta}` : estado.href}
              style={{ textDecoration: "none", display: "block" }}
            >
              <div
                style={{
                  padding: "14px 20px",
                  borderBottom: i < ESTADOS.length - 1 ? "1px solid rgba(212,184,134,0.1)" : "none",
                  backgroundColor: i % 2 === 0 ? "var(--nuit-overlay)" : "rgba(255,255,255,0.02)",
                  transition: "background-color 120ms",
                }}
                className="hover:bg-[rgba(212,184,134,0.06)]"
              >
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  {/* Badge estado */}
                  <span style={{
                    padding: "3px 10px", borderRadius: "0px", flexShrink: 0, width: "148px",
                    fontSize: "9px", fontWeight: 500, letterSpacing: "0.22em", textTransform: "uppercase",
                    fontFamily: "var(--font-sans, sans-serif)",
                    color: estado.color, backgroundColor: estado.bg,
                    border: `1px solid ${estado.color}44`,
                    display: "inline-block", textAlign: "center",
                  }}>
                    {estado.label}
                  </span>

                  {/* Barra de progresso */}
                  <div style={{ flex: 1, position: "relative" }}>
                    <div style={{
                      height: "4px", backgroundColor: "rgba(212,184,134,0.1)",
                      borderRadius: "2px", overflow: "hidden",
                    }}>
                      <div style={{
                        height: "100%", width: `${pct}%`,
                        backgroundColor: estado.color,
                        borderRadius: "2px",
                        transition: "width 0.6s ease",
                      }} />
                    </div>
                    <span style={{
                      fontFamily: "var(--font-sans, sans-serif)", fontSize: "10px",
                      color: "var(--nuit-bone-soft)", marginTop: "4px", display: "block",
                    }}>
                      {estado.desc}
                    </span>
                  </div>

                  {/* Contagem */}
                  <div style={{ flexShrink: 0, textAlign: "right", minWidth: "60px" }}>
                    <span style={{
                      fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "22px",
                      fontWeight: 400, color: count > 0 ? "var(--nuit-bone)" : "var(--nuit-smoke)",
                    }}>
                      {count}
                    </span>
                    <span style={{
                      fontFamily: "var(--font-sans, sans-serif)", fontSize: "10px",
                      color: "var(--nuit-bone-soft)", marginLeft: "4px",
                    }}>
                      {count === 1 ? "cliente" : "clientes"}
                    </span>
                  </div>

                  <span style={{
                    fontFamily: "var(--font-sans, sans-serif)", fontSize: "11px",
                    color: "var(--nuit-champagne-soft)", flexShrink: 0,
                  }}>
                    Ver →
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Total */}
      <div style={{
        display: "flex", justifyContent: "flex-end", alignItems: "center",
        gap: "6px", marginTop: "12px",
        fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px", color: "var(--nuit-bone-soft)",
      }}>
        <BarChart2 size={13} />
        {totalClientes} clientes no total · atualizado a cada 60 s
      </div>
    </div>
  );
}
