import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BarChart2, Users, AlertTriangle, TrendingUp, MessageSquare, Calendar } from "lucide-react";

export const revalidate = 60;

const ESTADOS: {
  key: string;
  label: string;
  desc: string;
  color: string;
  bg: string;
  href: string;
}[] = [
  { key: "lead",            label: "Lead",            desc: "Interesse inicial, ainda não marcou",  color: "#b9a07a", bg: "rgba(185,160,122,0.08)", href: "/clientes?estado=lead"            },
  { key: "novo",            label: "Novo",            desc: "Primeira sessão recente",              color: "#a0a996", bg: "rgba(160,169,150,0.10)", href: "/clientes?estado=novo"            },
  { key: "ativa_recente",   label: "Ativa Recente",   desc: "Sessão nos últimos 45 dias",          color: "#7a9e7e", bg: "rgba(122,158,126,0.10)", href: "/clientes?estado=ativa_recente"   },
  { key: "ativa_frequente", label: "Ativa Frequente", desc: "3+ sessões e visita regular",         color: "#4a8e5e", bg: "rgba(74,142,94,0.10)",   href: "/clientes?estado=ativa_frequente" },
  { key: "vip_embaixadora", label: "VIP Embaixadora", desc: "Top clientes, promotoras da marca",   color: "#b9a07a", bg: "#d4b88618",              href: "/clientes?estado=vip_embaixadora" },
  { key: "vip_em_risco",    label: "VIP em Risco",    desc: "VIP sem sessão há mais de 45 dias",   color: "#d4956b", bg: "rgba(212,149,107,0.10)", href: "/clientes?estado=vip_em_risco"    },
  { key: "reativacao",      label: "Reativação",      desc: "Sem sessão há mais de 60 dias",       color: "#b06050", bg: "rgba(176,96,80,0.08)",   href: "/clientes?estado=reativacao"      },
  { key: "perdida",         label: "Perdida",         desc: "Sem sessão há mais de 180 dias",      color: "#9d9d9a", bg: "rgba(157,157,154,0.10)", href: "/clientes?estado=perdida"         },
  { key: "blacklist",       label: "Blacklist",       desc: "Bloqueada — sem comunicação",         color: "#b06050", bg: "rgba(176,96,80,0.12)",   href: "/clientes?estado=blacklist"       },
];

export default async function PipelinePage() {
  const hoje = new Date();
  const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const fimDia    = new Date(inicioDia.getTime() + 86400000);
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  const [contagens, sessoesHoje, mensagensPendentes, emFila, totalClientes, clientesEmRisco, ativosMes] = await Promise.all([
    prisma.cliente.groupBy({
      by: ["estado"],
      where: { apagadoEm: null },
      _count: { estado: true },
    }),
    prisma.sessao.count({
      where: {
        data: { gte: inicioDia, lt: fimDia },
        estado: { in: ["agendada", "confirmada", "realizada"] },
        apagadoEm: null,
      },
    }),
    prisma.mensagemIA.count({ where: { estado: "pendente" } }),
    prisma.mensagemIA.count({ where: { estado: "em_fila" } }),
    prisma.cliente.count({ where: { apagadoEm: null } }),
    prisma.cliente.count({
      where: { estado: { in: ["vip_em_risco", "reativacao"] }, apagadoEm: null },
    }),
    prisma.cliente.count({
      where: { ultimaSessao: { gte: inicioMes }, apagadoEm: null },
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
          color: "#b9a07a", marginBottom: "6px",
        }}>
          Essence Wellness · CRM
        </p>
        <h1 style={{
          fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "26px",
          fontWeight: 400, color: "#161a26", letterSpacing: "-0.005em",
        }}>
          Pipeline
        </h1>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: "28px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          {[
            { label: "Total clientes", value: totalClientes,      icon: <Users       size={15} color="#a0a996" /> },
            { label: "Sessões hoje",   value: sessoesHoje,        icon: <Calendar    size={15} color="#b9a07a" /> },
            { label: "Em risco",       value: clientesEmRisco,    icon: <AlertTriangle size={15} color="#d4956b" /> },
          ].map(({ label, value, icon }) => (
            <div key={label} style={{
              backgroundColor: "#fdfaf1", border: "1px solid #ddd6c4",
              borderRadius: "2px", padding: "16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{
                  fontFamily: "var(--font-sans, sans-serif)", fontSize: "9px",
                  fontWeight: 700, letterSpacing: "0.18em", color: "#9d9d9a", textTransform: "uppercase",
                }}>{label}</span>
                {icon}
              </div>
              <p style={{
                fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "26px",
                fontWeight: 400, color: "#161a26",
              }}>{value}</p>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          {[
            { label: "Ativas este mês", value: ativosMes,            icon: <TrendingUp    size={15} color="#7a9e7e" /> },
            { label: "Msg. pendentes",  value: mensagensPendentes,   icon: <MessageSquare size={15} color="#b9a07a" /> },
            { label: "Em fila envio",   value: emFila,               icon: <MessageSquare size={15} color="#a0a996" /> },
          ].map(({ label, value, icon }) => (
            <div key={label} style={{
              backgroundColor: "#fdfaf1", border: "1px solid #ddd6c4",
              borderRadius: "2px", padding: "16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{
                  fontFamily: "var(--font-sans, sans-serif)", fontSize: "9px",
                  fontWeight: 700, letterSpacing: "0.18em", color: "#9d9d9a", textTransform: "uppercase",
                }}>{label}</span>
                {icon}
              </div>
              <p style={{
                fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "26px",
                fontWeight: 400, color: "#161a26",
              }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Estados CRM */}
      <div style={{ marginBottom: "8px" }}>
        <span style={{
          fontFamily: "var(--font-sans, sans-serif)", fontSize: "9.5px",
          fontWeight: 700, letterSpacing: "0.22em", color: "#9d9d9a", textTransform: "uppercase",
        }}>
          Distribuição por Estado
        </span>
      </div>

      <div style={{
        backgroundColor: "#ffffff", border: "1px solid #ddd6c4",
        borderRadius: "2px", overflow: "hidden",
      }}>
        {ESTADOS.map((estado, i) => {
          const count = porEstado[estado.key] ?? 0;
          const pct   = maxCount > 0 ? (count / maxCount) * 100 : 0;
          return (
            <Link
              key={estado.key}
              href={estado.href}
              style={{ textDecoration: "none", display: "block" }}
            >
              <div
                style={{
                  padding: "14px 20px",
                  borderBottom: i < ESTADOS.length - 1 ? "1px solid #f0ece4" : "none",
                  backgroundColor: i % 2 === 0 ? "#ffffff" : "rgba(237,231,227,0.18)",
                  transition: "background-color 120ms",
                }}
                className="hover:bg-[#efe9db]"
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
                      height: "4px", backgroundColor: "#f0ece4",
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
                      color: "#9d9d9a", marginTop: "4px", display: "block",
                    }}>
                      {estado.desc}
                    </span>
                  </div>

                  {/* Contagem */}
                  <div style={{ flexShrink: 0, textAlign: "right", minWidth: "60px" }}>
                    <span style={{
                      fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "22px",
                      fontWeight: 400, color: count > 0 ? "#161a26" : "#ddd6c4",
                    }}>
                      {count}
                    </span>
                    <span style={{
                      fontFamily: "var(--font-sans, sans-serif)", fontSize: "10px",
                      color: "#9d9d9a", marginLeft: "4px",
                    }}>
                      {count === 1 ? "cliente" : "clientes"}
                    </span>
                  </div>

                  <span style={{
                    fontFamily: "var(--font-sans, sans-serif)", fontSize: "11px",
                    color: "#b9a07a", flexShrink: 0,
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
        fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px", color: "#9d9d9a",
      }}>
        <BarChart2 size={13} />
        {totalClientes} clientes no total · atualizado a cada 60 s
      </div>
    </div>
  );
}
