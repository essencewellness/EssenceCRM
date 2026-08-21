"use client";

import { useState } from "react";
import { testarWebhookN8N } from "./actions";

interface Integracao {
  nome: string;
  descricao: string;
  estado: "ativo" | "inativo" | "desconhecido";
  detalhe?: string;
  webhookUrl?: string;
}

interface IntegracoesData {
  n8nUrl: string;
  whatsappUrl: string;
  webhooksConfigurados: Record<string, boolean>;
}

const badgeStyle = (estado: string): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center",
  padding: "2px 8px", borderRadius: "20px",
  fontFamily: "var(--font-sans)", fontSize: "10px", fontWeight: 700,
  letterSpacing: "0.06em",
  background: estado === "ativo"
    ? "rgba(122,158,126,0.12)"
    : estado === "inativo"
      ? "rgba(176,96,80,0.10)"
      : "rgba(157,157,154,0.12)",
  color: estado === "ativo" ? "#7a9e7e" : estado === "inativo" ? "var(--destructive)" : "#9d9d9a",
});

export function IntegracoesPanel({ data }: { data: IntegracoesData }) {
  const [testando, setTestando] = useState<string | null>(null);
  const [resultados, setResultados] = useState<Record<string, boolean | null>>({});

  async function testar(nome: string, url: string) {
    setTestando(nome);
    try {
      const res = await testarWebhookN8N(url);
      setResultados(r => ({ ...r, [nome]: res.ok }));
    } catch {
      setResultados(r => ({ ...r, [nome]: false }));
    } finally {
      setTestando(null);
    }
  }

  const integracoes: Integracao[] = [
    {
      nome: "N8N",
      descricao: "Plataforma de automação — processa fluxos de reengagement, onboarding e envio WhatsApp.",
      estado: data.n8nUrl ? "ativo" : "inativo",
      detalhe: data.n8nUrl || "URL não configurado",
    },
    {
      nome: "WhatsApp (Evolution API)",
      descricao: "Canal principal de comunicação com clientes.",
      estado: data.whatsappUrl ? "ativo" : "inativo",
      detalhe: data.whatsappUrl || "URL não configurado",
    },
    {
      nome: "Calendly",
      descricao: "Agendamentos de sessões — integração via webhook.",
      estado: "ativo",
      detalhe: "Webhook configurado",
    },
    {
      nome: "Neon PostgreSQL",
      descricao: "Base de dados de produção (Frankfurt).",
      estado: "ativo",
      detalhe: "Ligado",
    },
  ];

  const webhookEventos = [
    { key: "mensagem.aprovada", label: "Mensagem Aprovada" },
    { key: "sessao.realizada", label: "Sessão Realizada" },
    { key: "cliente.estado_alterado", label: "Estado do Cliente" },
    { key: "lead.criado", label: "Lead Criado" },
    { key: "onboarding.submetido", label: "Onboarding Submetido" },
  ];

  return (
    <div style={{ maxWidth: "640px" }}>
      {/* Sistemas */}
      <div style={{
        backgroundColor: "#faf8f6", border: "1px solid #e0d8cc",
        borderRadius: "4px", padding: "24px", marginBottom: "20px",
      }}>
        <h2 style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "15px", color: "var(--nuit-midnight)", fontWeight: 400, marginBottom: "20px", paddingBottom: "12px", borderBottom: "1px solid #e8e2d9" }}>
          Sistemas Ligados
        </h2>
        {integracoes.map(int => (
          <div key={int.nome} style={{ padding: "14px 0", borderTop: "1px solid #f0ebe3", display: "flex", alignItems: "flex-start", gap: "16px" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: "13px", fontWeight: 600, color: "var(--nuit-midnight)" }}>{int.nome}</p>
                <span style={badgeStyle(int.estado)}>{int.estado}</span>
              </div>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--nuit-bone-soft)", lineHeight: 1.5, marginBottom: "4px" }}>{int.descricao}</p>
              {int.detalhe && (
                <p style={{ fontFamily: "monospace", fontSize: "11px", color: "#9d9d9a" }}>{int.detalhe}</p>
              )}
            </div>
            {int.webhookUrl && (
              <button
                onClick={() => testar(int.nome, int.webhookUrl!)}
                disabled={testando === int.nome}
                style={{
                  flexShrink: 0, backgroundColor: "transparent",
                  border: "1px solid #e0d8cc", borderRadius: "3px",
                  padding: "5px 12px", fontFamily: "var(--font-sans)",
                  fontSize: "11px", color: "var(--nuit-bone-soft)", cursor: "pointer",
                }}
              >
                {testando === int.nome ? "A testar…" : "Testar"}
              </button>
            )}
            {resultados[int.nome] !== undefined && (
              <span style={{ fontFamily: "var(--font-sans)", fontSize: "11px", color: resultados[int.nome] ? "#7a9e7e" : "var(--destructive)" }}>
                {resultados[int.nome] ? "✓ OK" : "✗ Falhou"}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Webhooks de saída */}
      <div style={{
        backgroundColor: "#faf8f6", border: "1px solid #e0d8cc",
        borderRadius: "4px", padding: "24px",
      }}>
        <h2 style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "15px", color: "var(--nuit-midnight)", fontWeight: 400, marginBottom: "20px", paddingBottom: "12px", borderBottom: "1px solid #e8e2d9" }}>
          Webhooks de Saída (CRM → N8N)
        </h2>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--nuit-bone-soft)", marginBottom: "16px", lineHeight: 1.6 }}>
          Para activar os webhooks, definir as variáveis de ambiente <code style={{ fontFamily: "monospace", fontSize: "11px", backgroundColor: "rgba(212,184,134,0.08)", padding: "1px 4px", borderRadius: "2px" }}>WEBHOOK_N8N_*</code> no Vercel.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {webhookEventos.map(ev => {
            const ativo = data.webhooksConfigurados[ev.key] ?? false;
            return (
              <div key={ev.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", backgroundColor: "#fff", border: "1px solid #e8e2d9", borderRadius: "3px" }}>
                <span style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--nuit-midnight)" }}>{ev.label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontFamily: "monospace", fontSize: "10px", color: "#9d9d9a" }}>WEBHOOK_N8N_{ev.key.toUpperCase().replace(/\./g, "_")}</span>
                  <span style={badgeStyle(ativo ? "ativo" : "inativo")}>{ativo ? "ativo" : "inativo"}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
