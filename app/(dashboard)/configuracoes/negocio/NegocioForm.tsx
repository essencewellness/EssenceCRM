"use client";

import { useState } from "react";
import { guardarConfigNegocio, guardarConfigAutomacoes } from "./actions";

const GOLD = "#d4b886";

interface ConfigNegocio {
  nomeNegocio: string;
  emailContacto: string;
  whatsappPrincipal: string;
  assinaturaAutomatica: string;
  assinaturaReferral: string;
  horarioAbertura: string;
  horarioFecho: string;
  diasReativacao: number;
  quietHoraInicio: string;
  quietHoraFim: string;
  maxMensagensDia: number;
}

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans, sans-serif)",
  fontSize: "10px", fontWeight: 600,
  letterSpacing: "0.22em", textTransform: "uppercase",
  color: "#7a7e8a", display: "block", marginBottom: "5px",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px",
  backgroundColor: "#faf8f6",
  border: "1px solid #e0d8cc",
  borderRadius: "3px",
  fontFamily: "var(--font-sans, sans-serif)",
  fontSize: "13px", color: "#161a26", outline: "none",
};

const secaoStyle: React.CSSProperties = {
  backgroundColor: "#faf8f6",
  border: "1px solid #e0d8cc",
  borderRadius: "4px",
  padding: "24px",
  marginBottom: "20px",
};

const tituloSecao: React.CSSProperties = {
  fontFamily: "var(--font-heading, Georgia, serif)",
  fontSize: "15px", color: "#161a26",
  fontWeight: 400, marginBottom: "20px",
  paddingBottom: "12px",
  borderBottom: "1px solid #e8e2d9",
};

export function NegocioForm({ config }: { config: ConfigNegocio }) {
  const [negocio, setNegocio] = useState({
    nomeNegocio: config.nomeNegocio,
    emailContacto: config.emailContacto,
    whatsappPrincipal: config.whatsappPrincipal,
    assinaturaAutomatica: config.assinaturaAutomatica,
    assinaturaReferral: config.assinaturaReferral,
    horarioAbertura: config.horarioAbertura,
    horarioFecho: config.horarioFecho,
  });
  const [automacoes, setAutomacoes] = useState({
    diasReativacao: config.diasReativacao,
    quietHoraInicio: config.quietHoraInicio,
    quietHoraFim: config.quietHoraFim,
    maxMensagensDia: config.maxMensagensDia,
  });

  const [loadingNegocio, setLoadingNegocio] = useState(false);
  const [loadingAutomacoes, setLoadingAutomacoes] = useState(false);
  const [msgNegocio, setMsgNegocio] = useState<string | null>(null);
  const [msgAutomacoes, setMsgAutomacoes] = useState<string | null>(null);
  const [erroNegocio, setErroNegocio] = useState<string | null>(null);
  const [erroAutomacoes, setErroAutomacoes] = useState<string | null>(null);

  async function handleNegocio(e: React.FormEvent) {
    e.preventDefault();
    setLoadingNegocio(true);
    setErroNegocio(null);
    try {
      await guardarConfigNegocio(negocio);
      setMsgNegocio("Configurações guardadas.");
      setTimeout(() => setMsgNegocio(null), 3000);
    } catch (err) {
      setErroNegocio(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoadingNegocio(false);
    }
  }

  async function handleAutomacoes(e: React.FormEvent) {
    e.preventDefault();
    setLoadingAutomacoes(true);
    setErroAutomacoes(null);
    try {
      await guardarConfigAutomacoes(automacoes);
      setMsgAutomacoes("Configurações guardadas.");
      setTimeout(() => setMsgAutomacoes(null), 3000);
    } catch (err) {
      setErroAutomacoes(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoadingAutomacoes(false);
    }
  }

  return (
    <div style={{ maxWidth: "640px" }}>
      {/* Dados do negócio */}
      <form onSubmit={handleNegocio} style={secaoStyle}>
        <h2 style={tituloSecao}>Dados do Negócio</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Nome do Negócio</label>
            <input required value={negocio.nomeNegocio} onChange={e => setNegocio(n => ({ ...n, nomeNegocio: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Email de Contacto</label>
            <input type="email" value={negocio.emailContacto} onChange={e => setNegocio(n => ({ ...n, emailContacto: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>WhatsApp Principal</label>
            <input value={negocio.whatsappPrincipal} onChange={e => setNegocio(n => ({ ...n, whatsappPrincipal: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Horário de Abertura</label>
            <input type="time" value={negocio.horarioAbertura} onChange={e => setNegocio(n => ({ ...n, horarioAbertura: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Horário de Fecho</label>
            <input type="time" value={negocio.horarioFecho} onChange={e => setNegocio(n => ({ ...n, horarioFecho: e.target.value }))} style={inputStyle} />
          </div>
        </div>
        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>Assinatura Automática (WhatsApp)</label>
          <input value={negocio.assinaturaAutomatica} onChange={e => setNegocio(n => ({ ...n, assinaturaAutomatica: e.target.value }))} style={inputStyle} />
        </div>
        <div style={{ marginBottom: "20px" }}>
          <label style={labelStyle}>Assinatura Referral</label>
          <input value={negocio.assinaturaReferral} onChange={e => setNegocio(n => ({ ...n, assinaturaReferral: e.target.value }))} style={inputStyle} />
        </div>
        {erroNegocio && <p style={{ color: "#b06050", fontSize: "13px", marginBottom: "12px", fontFamily: "var(--font-sans)" }}>{erroNegocio}</p>}
        {msgNegocio && <p style={{ color: "#7a9e7e", fontSize: "13px", marginBottom: "12px", fontFamily: "var(--font-sans)" }}>{msgNegocio}</p>}
        <button type="submit" disabled={loadingNegocio} style={{ backgroundColor: GOLD, color: "#161a26", border: "none", borderRadius: "3px", padding: "10px 20px", fontFamily: "var(--font-sans)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", cursor: "pointer" }}>
          {loadingNegocio ? "A guardar…" : "Guardar"}
        </button>
      </form>

      {/* Automações */}
      <form onSubmit={handleAutomacoes} style={secaoStyle}>
        <h2 style={tituloSecao}>Automações</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
          <div>
            <label style={labelStyle}>Dias para Reativação</label>
            <input
              type="number" min={1} max={365}
              value={automacoes.diasReativacao}
              onChange={e => setAutomacoes(a => ({ ...a, diasReativacao: parseInt(e.target.value) || 45 }))}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Máx. Mensagens / Dia</label>
            <input
              type="number" min={1} max={200}
              value={automacoes.maxMensagensDia}
              onChange={e => setAutomacoes(a => ({ ...a, maxMensagensDia: parseInt(e.target.value) || 10 }))}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Quiet Hours — Início</label>
            <input type="time" value={automacoes.quietHoraInicio} onChange={e => setAutomacoes(a => ({ ...a, quietHoraInicio: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Quiet Hours — Fim</label>
            <input type="time" value={automacoes.quietHoraFim} onChange={e => setAutomacoes(a => ({ ...a, quietHoraFim: e.target.value }))} style={inputStyle} />
          </div>
        </div>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: "11px", color: "#9d9d9a", marginBottom: "16px", lineHeight: 1.6 }}>
          Quiet Hours: mensagens automáticas não são enviadas neste intervalo.
        </p>
        {erroAutomacoes && <p style={{ color: "#b06050", fontSize: "13px", marginBottom: "12px", fontFamily: "var(--font-sans)" }}>{erroAutomacoes}</p>}
        {msgAutomacoes && <p style={{ color: "#7a9e7e", fontSize: "13px", marginBottom: "12px", fontFamily: "var(--font-sans)" }}>{msgAutomacoes}</p>}
        <button type="submit" disabled={loadingAutomacoes} style={{ backgroundColor: GOLD, color: "#161a26", border: "none", borderRadius: "3px", padding: "10px 20px", fontFamily: "var(--font-sans)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", cursor: "pointer" }}>
          {loadingAutomacoes ? "A guardar…" : "Guardar"}
        </button>
      </form>
    </div>
  );
}
