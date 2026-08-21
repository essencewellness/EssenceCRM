"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { atualizarPerfil, alterarPassword } from "./actions";

const GOLD = "var(--nuit-champagne)";

interface PerfilFormProps {
  nomeInicial: string;
  emailInicial: string;
  obrigatorio?: boolean;
}

export function PerfilForm({ nomeInicial, emailInicial, obrigatorio }: PerfilFormProps) {
  const router = useRouter();
  const [nome, setNome] = useState(nomeInicial);
  const [email, setEmail] = useState(emailInicial);
  const [passwordAtual, setPasswordAtual] = useState("");
  const [passwordNova, setPasswordNova] = useState("");
  const [loadingPerfil, setLoadingPerfil] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [mensagemPerfil, setMensagemPerfil] = useState<string | null>(null);
  const [mensagemPassword, setMensagemPassword] = useState<string | null>(null);
  const [erroPerfil, setErroPerfil] = useState<string | null>(null);
  const [erroPassword, setErroPassword] = useState<string | null>(null);

  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-sans, sans-serif)",
    fontSize: "10px", fontWeight: 600,
    letterSpacing: "0.24em", textTransform: "uppercase",
    color: "var(--nuit-bone-soft)", display: "block", marginBottom: "6px",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px",
    backgroundColor: "#faf8f6",
    border: "1px solid #e0d8cc",
    borderRadius: "3px",
    fontFamily: "var(--font-sans, sans-serif)",
    fontSize: "14px", color: "var(--nuit-midnight)",
    outline: "none",
  };

  async function handlePerfil(e: React.FormEvent) {
    e.preventDefault();
    setLoadingPerfil(true);
    setErroPerfil(null);
    setMensagemPerfil(null);
    try {
      await atualizarPerfil({ nome, email });
      setMensagemPerfil("Perfil guardado.");
      router.refresh();
    } catch (err) {
      setErroPerfil(err instanceof Error ? err.message : "Erro ao guardar");
    } finally {
      setLoadingPerfil(false);
    }
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setLoadingPassword(true);
    setErroPassword(null);
    setMensagemPassword(null);
    try {
      await alterarPassword({ passwordAtual, passwordNova, obrigatorio });
      setPasswordAtual("");
      setPasswordNova("");
      if (obrigatorio) {
        // A sessão (JWT) guarda precisaMudarPassword em cache e só é
        // recalculada num novo login — sem isto, o middleware continuava a
        // mandar de volta para esta página em qualquer outro sítio, mesmo
        // já não sendo preciso (bug real encontrado em produção 2026-08-12).
        setMensagemPassword("Password alterada. A reencaminhar para o login…");
        await signOut({ redirectTo: "/login" });
      } else {
        setMensagemPassword("Password alterada com sucesso.");
        router.refresh();
      }
    } catch (err) {
      setErroPassword(err instanceof Error ? err.message : "Erro ao alterar password");
    } finally {
      setLoadingPassword(false);
    }
  }

  const secaoStyle: React.CSSProperties = {
    backgroundColor: "#faf8f6",
    border: "1px solid #e0d8cc",
    borderRadius: "4px",
    padding: "24px",
    marginBottom: "20px",
  };

  const tituloSecao: React.CSSProperties = {
    fontFamily: "var(--font-heading, Georgia, serif)",
    fontSize: "15px", color: "var(--nuit-midnight)",
    fontWeight: 400, marginBottom: "20px",
    paddingBottom: "12px",
    borderBottom: "1px solid #e8e2d9",
  };

  return (
    <div>
      {/* Secção: dados pessoais */}
      {!obrigatorio && (
        <form onSubmit={handlePerfil} style={secaoStyle}>
          <h2 style={tituloSecao}>Dados Pessoais</h2>
          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Nome</label>
            <input
              value={nome}
              onChange={e => setNome(e.target.value)}
              required
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={inputStyle}
            />
          </div>
          {erroPerfil && <p style={{ color: "var(--destructive)", fontSize: "13px", marginBottom: "12px" }}>{erroPerfil}</p>}
          {mensagemPerfil && <p style={{ color: "#7a9e7e", fontSize: "13px", marginBottom: "12px" }}>{mensagemPerfil}</p>}
          <button
            type="submit"
            disabled={loadingPerfil}
            style={{
              backgroundColor: GOLD, color: "var(--nuit-midnight)",
              border: "none", borderRadius: "3px",
              padding: "10px 20px",
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: "11px", fontWeight: 600,
              letterSpacing: "0.24em", textTransform: "uppercase",
              cursor: loadingPerfil ? "not-allowed" : "pointer",
              opacity: loadingPerfil ? 0.6 : 1,
            }}
          >
            {loadingPerfil ? "A guardar…" : "Guardar"}
          </button>
        </form>
      )}

      {/* Secção: password */}
      <form onSubmit={handlePassword} style={secaoStyle}>
        <h2 style={tituloSecao}>
          {obrigatorio ? "Definir Nova Password" : "Alterar Password"}
        </h2>
        {!obrigatorio && (
          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Password Atual</label>
            <input
              type="password"
              value={passwordAtual}
              onChange={e => setPasswordAtual(e.target.value)}
              required
              autoComplete="current-password"
              style={inputStyle}
            />
          </div>
        )}
        <div style={{ marginBottom: "20px" }}>
          <label style={labelStyle}>Nova Password (mín. 8 caracteres)</label>
          <input
            type="password"
            value={passwordNova}
            onChange={e => setPasswordNova(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            style={inputStyle}
          />
        </div>
        {erroPassword && <p style={{ color: "var(--destructive)", fontSize: "13px", marginBottom: "12px" }}>{erroPassword}</p>}
        {mensagemPassword && <p style={{ color: "#7a9e7e", fontSize: "13px", marginBottom: "12px" }}>{mensagemPassword}</p>}
        <button
          type="submit"
          disabled={loadingPassword}
          style={{
            backgroundColor: GOLD, color: "var(--nuit-midnight)",
            border: "none", borderRadius: "3px",
            padding: "10px 20px",
            fontFamily: "var(--font-sans, sans-serif)",
            fontSize: "11px", fontWeight: 600,
            letterSpacing: "0.24em", textTransform: "uppercase",
            cursor: loadingPassword ? "not-allowed" : "pointer",
            opacity: loadingPassword ? 0.6 : 1,
          }}
        >
          {loadingPassword ? "A guardar…" : obrigatorio ? "Definir Password" : "Alterar Password"}
        </button>
      </form>
    </div>
  );
}
