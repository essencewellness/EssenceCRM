import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { auth } from "@/lib/auth";
import { aprovarEAgendar } from "@/lib/fila-envio";
import { auditar } from "@/lib/audit";
import { MensagensBulk, type MensagemPendente } from "@/components/mensagens-bulk";
import { getFiltrosTerapeuta } from "@/lib/contexto-utilizador";
import { FiltroTerapeutaSlot } from "@/components/filtro-terapeuta-slot";
import type { Prisma } from "@/lib/prisma-client";
import {
  MessageSquare, Clock, CheckCircle2, XCircle, TrendingUp,
  Hourglass, AlertTriangle, Send, RotateCcw,
} from "lucide-react";

export const revalidate = 10;

const INK = "var(--nuit-bone)";
const CHAMPAGNE = "var(--nuit-champagne-soft)";
const SAGE = "#7a9e7e";
const TERRA = "var(--destructive)";
const SMOKE = "var(--nuit-bone-soft)";
const CARD = "var(--nuit-overlay)";
const BORDER = "rgba(212,184,134,0.16)";

// ── Server Actions ─────────────────────────────────────────────

async function aprovarBulkAction(
  // Cada mensagem pode ter a sua PRÓPRIA hora de envio (2026-09-04 — antes
  // uma única hora escolhida no topo aplicava-se a todo o lote de uma vez;
  // agora cada cartão tem o seu seletor). Sem `agendarParaISO`, essa
  // mensagem quer sair "assim que possível" — o espaçamento anti-ban (que
  // escala com o tamanho do lote, ver lib/fila-envio.ts) continua a
  // aplicar-se sempre, mesmo entre mensagens com a mesma hora escolhida.
  itens: Array<{ id: string; mensagemFinal: string; agendarParaISO?: string }>
) {
  "use server";
  const session = await auth();
  if (!session?.user) throw new Error("Não autorizado");

  const resultado = await aprovarEAgendar(
    itens.slice(0, 100).map((i) => ({
      id: i.id,
      mensagemFinal: i.mensagemFinal.slice(0, 4000),
      agendarPara: i.agendarParaISO && !Number.isNaN(Date.parse(i.agendarParaISO))
        ? new Date(i.agendarParaISO)
        : undefined,
    }))
  );

  auditar({
    quem: session.user.email ?? "dashboard",
    acao: "mensagem.aprovacao_bulk",
    entidade: "MensagemIA",
    detalhe: {
      agendadas: resultado.agendadas.length,
      ignoradas: resultado.ignoradas.length,
    },
  });

  revalidatePath("/mensagens");
  return { agendadas: resultado.agendadas.length };
}

async function rejeitarAction(id: string) {
  "use server";
  const session = await auth();
  if (!session?.user) throw new Error("Não autorizado");

  await prisma.mensagemIA.update({
    where: { id },
    data: { estado: "rejeitada" },
  });
  auditar({
    quem: session.user.email ?? "dashboard",
    acao: "mensagem.rejeitada",
    entidade: "MensagemIA",
    entidadeId: id,
  });
  revalidatePath("/mensagens");
}

async function reporNaFilaAction(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user) throw new Error("Não autorizado");

  const id = formData.get("id") as string;
  await prisma.mensagemIA.update({
    where: { id },
    data: { estado: "em_fila", enviarApos: new Date(), erroEnvio: null },
  });
  auditar({
    quem: session.user.email ?? "dashboard",
    acao: "mensagem.reposta_fila",
    entidade: "MensagemIA",
    entidadeId: id,
  });
  revalidatePath("/mensagens");
}

// ── Page ───────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ tab?: string; terapeuta?: string }>;
}

export default async function MensagensPage({ searchParams }: PageProps) {
  const { tab = "pendentes", terapeuta } = await searchParams;
  const { filtroCliente } = await getFiltrosTerapeuta(terapeuta);
  // Mensagens filtradas pela terapeuta do cliente associado
  const fMsg = (filtroCliente as Prisma.ClienteWhereInput).terapeutaPrincipalId
    ? { cliente: filtroCliente as Prisma.ClienteWhereInput }
    : {};

  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

  const [
    totalPendentes,
    totalFila,
    totalFalhadas,
    enviadasMes,
    convertidasMes,
    mensagensPendentes,
    mensagensFila,
    mensagensHistorico,
  ] = await Promise.all([
    prisma.mensagemIA.count({ where: { estado: "pendente", ...fMsg } }),
    prisma.mensagemIA.count({ where: { estado: "em_fila", ...fMsg } }),
    prisma.mensagemIA.count({ where: { estado: "falhada", ...fMsg } }),
    prisma.mensagemIA.count({ where: { estado: "enviada", enviadaEm: { gte: inicioMes }, ...fMsg } }),
    prisma.mensagemIA.count({ where: { converteu: true, enviadaEm: { gte: inicioMes }, ...fMsg } }),
    prisma.mensagemIA.findMany({
      where: { estado: "pendente", ...fMsg },
      include: { cliente: { include: { etiquetas: { include: { etiqueta: true } } } } },
      orderBy: { geradaEm: "desc" },
      take: 100,
    }),
    prisma.mensagemIA.findMany({
      where: { estado: { in: ["em_fila", "falhada"] }, ...fMsg },
      include: { cliente: { select: { id: true, nome: true, telefone: true } } },
      orderBy: { enviarApos: "asc" },
      take: 100,
    }),
    prisma.mensagemIA.findMany({
      where: { estado: { in: ["enviada", "rejeitada", "aprovada"] }, ...fMsg },
      include: { cliente: { select: { id: true, nome: true } } },
      orderBy: { geradaEm: "desc" },
      take: 50,
    }),
  ]);

  const taxaConversao = enviadasMes > 0 ? Math.round((convertidasMes / enviadasMes) * 100) : 0;

  // Serializar para o componente cliente (datas → strings)
  const pendentesDTO: MensagemPendente[] = mensagensPendentes.map((m) => ({
    id: m.id,
    clienteId: m.cliente.id,
    clienteNome: m.cliente.nome,
    telefone: m.cliente.telefone,
    canal: m.canal,
    texto: m.mensagemFinal ?? m.mensagemGerada,
    motivo: m.motivoGeracao,
    geradaEm: formatDateTime(m.geradaEm),
    etiquetas: m.cliente.etiquetas.map(({ etiqueta }) => ({
      id: etiqueta.id, nome: etiqueta.nome, cor: etiqueta.cor,
    })),
  }));

  const tabs = [
    { key: "pendentes", label: "Pendentes", count: totalPendentes },
    { key: "fila", label: "Fila de envio", count: totalFila + totalFalhadas },
    { key: "historico", label: "Histórico", count: mensagensHistorico.length },
  ];

  const stats = [
    { label: "Pendentes", value: totalPendentes, desc: "aguardam a tua aprovação", icon: <Clock size={16} color={CHAMPAGNE} /> },
    { label: "Na fila", value: totalFila, desc: "saem espaçadas 30–90s", icon: <Hourglass size={16} color={CHAMPAGNE} /> },
    { label: "Enviadas", value: enviadasMes, desc: "este mês", icon: <Send size={16} color="var(--nuit-sage)" /> },
    { label: "Conversão", value: `${taxaConversao}%`, desc: "voltaram a marcar", icon: <TrendingUp size={16} color={CHAMPAGNE} /> },
  ];

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      <PageHeader
        titulo="Mensagens IA"
        subtitulo="Aprova em massa — a fila trata do envio com espaçamento seguro."
      />

      <FiltroTerapeutaSlot />

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "24px" }}>
        {stats.map(({ label, value, desc, icon }, i) => (
          <div
            key={label}
            className="anim-scale-in"
            style={{
              backgroundColor: CARD, borderRadius: "2px",
              border: `1px solid ${BORDER}`, padding: "18px 20px",
              animationDelay: `${0.2 + i * 0.08}s`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <span style={{
                fontFamily: "var(--font-sans, sans-serif)", fontSize: "9.5px", fontWeight: 600,
                letterSpacing: "0.22em", color: SMOKE, textTransform: "uppercase",
              }}>
                {label}
              </span>
              {icon}
            </div>
            <p style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "28px", color: INK }}>{value}</p>
            <p style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "11px", color: SMOKE, marginTop: "3px" }}>{desc}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div
        className="anim-fade-down"
        style={{
          display: "flex", gap: "0px",
          backgroundColor: CARD, border: `1px solid ${BORDER}`, borderRadius: "0px",
          marginBottom: "20px", animationDelay: "0.35s",
        }}
      >
        {tabs.map(({ key, label, count }) => (
          <a
            key={key}
            href={`?tab=${key}`}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              padding: "10px 12px", borderRadius: "0px",
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: "9.5px", fontWeight: 500, letterSpacing: "0.22em", textTransform: "uppercase",
              color: tab === key ? CHAMPAGNE : SMOKE,
              backgroundColor: tab === key ? "rgba(185,160,122,0.07)" : "transparent",
              borderBottom: tab === key ? `1px solid ${CHAMPAGNE}` : "1px solid transparent",
              borderTop: "none", borderLeft: "none", borderRight: "none",
              textDecoration: "none", transition: "all 150ms",
            }}
          >
            {label}
            <span style={{
              padding: "1px 6px", borderRadius: "0px", fontSize: "9px", fontWeight: 600,
              fontFamily: "var(--font-sans, sans-serif)",
              color: tab === key ? CHAMPAGNE : "#b5b5b2",
              backgroundColor: tab === key ? "rgba(185,160,122,0.15)" : "rgba(221,214,196,0.4)",
            }}>
              {count}
            </span>
          </a>
        ))}
      </div>

      {/* ── Pendentes: aprovação em massa ── */}
      {tab === "pendentes" && (
        <MensagensBulk
          mensagens={pendentesDTO}
          aprovarBulkAction={aprovarBulkAction}
          rejeitarAction={rejeitarAction}
        />
      )}

      {/* ── Fila de envio ── */}
      {tab === "fila" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {mensagensFila.length === 0 ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              padding: "52px 24px", backgroundColor: CARD,
              border: "1px dashed rgba(185,160,122,0.35)", borderRadius: "6px",
            }}>
              <p style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontStyle: "italic", fontSize: "15px", color: "#6d6d6d" }}>
                Fila vazia
              </p>
              <p style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px", color: SMOKE, marginTop: "6px" }}>
                Aprova mensagens em &quot;Pendentes&quot; e elas entram aqui com hora marcada.
              </p>
            </div>
          ) : (
            mensagensFila.map((m) => {
              const falhou = m.estado === "falhada";
              const madura = m.enviarApos !== null && m.enviarApos <= agora;
              return (
                <div
                  key={m.id}
                  style={{
                    display: "flex", alignItems: "center", gap: "14px",
                    padding: "14px 18px", backgroundColor: CARD,
                    border: falhou ? "1px solid rgba(176,96,80,0.35)" : `1px solid ${BORDER}`,
                    borderRadius: "6px",
                  }}
                >
                  {falhou
                    ? <AlertTriangle size={17} color={TERRA} style={{ flexShrink: 0 }} />
                    : <Hourglass size={17} color={madura ? SAGE : CHAMPAGNE} style={{ flexShrink: 0 }} />}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}>
                      <a href={`/clientes/${m.cliente.id}`} style={{
                        fontFamily: "var(--font-sans, sans-serif)", fontSize: "13px",
                        fontWeight: 700, color: INK, textDecoration: "none",
                      }}>
                        {m.cliente.nome}
                      </a>
                      <span style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "11px", color: SMOKE }}>
                        {falhou
                          ? `Falhou: ${m.erroEnvio ?? "erro desconhecido"}`
                          : madura
                            ? "pronta — o N8N envia no próximo ciclo"
                            : `sai ${m.enviarApos ? formatDateTime(m.enviarApos) : "em breve"}`}
                      </span>
                    </div>
                    <p style={{
                      fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px", color: "#6d6d6d",
                      marginTop: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {m.mensagemFinal ?? m.mensagemGerada}
                    </p>
                  </div>

                  {falhou && (
                    <form action={reporNaFilaAction}>
                      <input type="hidden" name="id" value={m.id} />
                      <button
                        type="submit"
                        className="cursor-pointer transition-opacity hover:opacity-80"
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "6px",
                          padding: "7px 14px", borderRadius: "3px",
                          fontFamily: "var(--font-sans, sans-serif)", fontSize: "11px", fontWeight: 600,
                          color: CHAMPAGNE, backgroundColor: "rgba(185,160,122,0.08)",
                          border: "1px solid rgba(185,160,122,0.30)",
                        }}
                      >
                        <RotateCcw size={12} />
                        Tentar de novo
                      </button>
                    </form>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Histórico ── */}
      {tab === "historico" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {mensagensHistorico.length === 0 ? (
            <div style={{
              display: "flex", justifyContent: "center", padding: "52px 24px",
              border: "1px dashed rgba(185,160,122,0.3)", borderRadius: "6px",
            }}>
              <p style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontStyle: "italic", color: SMOKE }}>
                Nenhuma mensagem no histórico ainda.
              </p>
            </div>
          ) : (
            mensagensHistorico.map((m) => {
              const cfg = {
                enviada: { label: "Enviada", color: SAGE, Icon: CheckCircle2 },
                aprovada: { label: "Aprovada", color: CHAMPAGNE, Icon: CheckCircle2 },
                rejeitada: { label: "Rejeitada", color: TERRA, Icon: XCircle },
              }[m.estado as "enviada" | "aprovada" | "rejeitada"] ?? { label: m.estado, color: SMOKE, Icon: MessageSquare };
              return (
                <div key={m.id} style={{
                  display: "flex", alignItems: "flex-start", gap: "12px",
                  padding: "14px 18px", backgroundColor: CARD,
                  border: `1px solid ${BORDER}`, borderRadius: "6px",
                }}>
                  <cfg.Icon size={16} color={cfg.color} style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}>
                      <a href={`/clientes/${m.cliente.id}`} style={{
                        fontFamily: "var(--font-sans, sans-serif)", fontSize: "13px",
                        fontWeight: 700, color: INK, textDecoration: "none",
                      }}>
                        {m.cliente.nome}
                      </a>
                      <span style={{
                        fontSize: "10px", fontWeight: 600, fontFamily: "var(--font-sans, sans-serif)",
                        color: cfg.color, textTransform: "uppercase", letterSpacing: "0.08em",
                      }}>
                        {cfg.label}
                      </span>
                      {m.converteu && (
                        <span style={{
                          fontSize: "10px", fontWeight: 600, fontFamily: "var(--font-sans, sans-serif)",
                          color: SAGE, backgroundColor: "rgba(95,122,95,0.10)",
                          padding: "1px 8px", borderRadius: "100px",
                          border: "1px solid rgba(95,122,95,0.25)",
                        }}>
                          Converteu
                        </span>
                      )}
                      <span style={{ marginLeft: "auto", fontFamily: "var(--font-sans, sans-serif)", fontSize: "11px", color: "#b5b5b2" }}>
                        {formatDateTime(m.geradaEm)}
                      </span>
                    </div>
                    <p style={{
                      fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px", color: "#6d6d6d",
                      marginTop: "5px", lineHeight: 1.55,
                      display: "-webkit-box", WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical" as const, overflow: "hidden",
                    }}>
                      {m.mensagemFinal ?? m.mensagemGerada}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
