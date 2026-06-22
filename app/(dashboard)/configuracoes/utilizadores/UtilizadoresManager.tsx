"use client";

import { useState } from "react";
import { criarUtilizador, redefinirPassword, desativarUtilizador, ativarUtilizador } from "./actions";

const GOLD = "#d4b886";

type UtilizadorRow = {
  id: string;
  username: string | null;
  name: string | null;
  email: string;
  role: string;
  ativo: boolean;
};

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

export function UtilizadoresManager({ utilizadores }: { utilizadores: UtilizadorRow[] }) {
  const [lista, setLista] = useState(utilizadores);
  const [mostrarFormCriar, setMostrarFormCriar] = useState(false);
  const [redefinirId, setRedefinirId] = useState<string | null>(null);
  const [novaPassTemp, setNovaPassTemp] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Form criar utilizador
  const [form, setForm] = useState({
    username: "", nome: "", email: "",
    role: "terapeuta" as "admin" | "terapeuta",
    passwordTemporaria: "",
  });

  function feedback(msg: string, isErro = false) {
    if (isErro) setErro(msg);
    else { setMensagem(msg); setErro(null); }
    setTimeout(() => { setMensagem(null); setErro(null); }, 4000);
  }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await criarUtilizador(form);
      feedback("Utilizador criado.");
      setMostrarFormCriar(false);
      setForm({ username: "", nome: "", email: "", role: "terapeuta", passwordTemporaria: "" });
      // Refresh manual simplificado
      window.location.reload();
    } catch (err) {
      feedback(err instanceof Error ? err.message : "Erro", true);
    } finally {
      setLoading(false);
    }
  }

  async function handleRedefinir(id: string) {
    if (!novaPassTemp || novaPassTemp.length < 8) {
      return feedback("Password deve ter pelo menos 8 caracteres", true);
    }
    setLoading(true);
    try {
      await redefinirPassword(id, novaPassTemp);
      feedback("Password redefinida.");
      setRedefinirId(null);
      setNovaPassTemp("");
    } catch (err) {
      feedback(err instanceof Error ? err.message : "Erro", true);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleAtivo(u: UtilizadorRow) {
    setLoading(true);
    try {
      if (u.ativo) await desativarUtilizador(u.id);
      else await ativarUtilizador(u.id);
      setLista(prev => prev.map(x => x.id === u.id ? { ...x, ativo: !x.ativo } : x));
      feedback(u.ativo ? "Utilizador desativado." : "Utilizador reativado.");
    } catch (err) {
      feedback(err instanceof Error ? err.message : "Erro", true);
    } finally {
      setLoading(false);
    }
  }

  const secaoStyle: React.CSSProperties = {
    backgroundColor: "#faf8f6",
    border: "1px solid #e0d8cc",
    borderRadius: "4px",
    padding: "24px",
    marginBottom: "20px",
  };

  return (
    <div style={{ maxWidth: "680px" }}>
      {mensagem && <p style={{ color: "#7a9e7e", fontSize: "13px", marginBottom: "14px", fontFamily: "var(--font-sans)" }}>{mensagem}</p>}
      {erro && <p style={{ color: "#b06050", fontSize: "13px", marginBottom: "14px", fontFamily: "var(--font-sans)" }}>{erro}</p>}

      {/* Lista de utilizadores */}
      <div style={secaoStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "15px", color: "#161a26", fontWeight: 400 }}>
            Utilizadores ({lista.length})
          </h2>
          <button
            onClick={() => setMostrarFormCriar(!mostrarFormCriar)}
            style={{
              backgroundColor: GOLD, color: "#161a26",
              border: "none", borderRadius: "3px",
              padding: "8px 16px",
              fontFamily: "var(--font-sans)", fontSize: "11px", fontWeight: 600,
              letterSpacing: "0.2em", textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            + Novo Utilizador
          </button>
        </div>

        {lista.map(u => (
          <div key={u.id} style={{
            padding: "14px 0",
            borderTop: "1px solid #e8e2d9",
            display: "flex", alignItems: "center", gap: "16px",
          }}>
            <div style={{
              width: "34px", height: "34px", borderRadius: "50%",
              backgroundColor: "rgba(212,184,134,0.12)",
              border: "1px solid rgba(212,184,134,0.28)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-sans)", fontSize: "11px", fontWeight: 700,
              color: GOLD, flexShrink: 0,
            }}>
              {(u.name ?? u.email).slice(0, 2).toUpperCase()}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: "13px", fontWeight: 500, color: u.ativo ? "#161a26" : "#9d9d9a" }}>
                {u.name ?? u.email}
                {!u.ativo && <span style={{ marginLeft: "8px", fontSize: "10px", color: "#9d9d9a" }}>(inativo)</span>}
              </p>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: "11px", color: "#9d9d9a" }}>
                @{u.username ?? "—"} · {u.role}
              </p>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setRedefinirId(redefinirId === u.id ? null : u.id)}
                style={{
                  backgroundColor: "transparent",
                  border: "1px solid #e0d8cc",
                  borderRadius: "3px", padding: "5px 10px",
                  fontFamily: "var(--font-sans)", fontSize: "11px", color: "#7a7e8a",
                  cursor: "pointer",
                }}
              >
                Password
              </button>
              <button
                onClick={() => handleToggleAtivo(u)}
                disabled={loading}
                style={{
                  backgroundColor: "transparent",
                  border: `1px solid ${u.ativo ? "rgba(176,96,80,0.4)" : "rgba(122,158,126,0.4)"}`,
                  borderRadius: "3px", padding: "5px 10px",
                  fontFamily: "var(--font-sans)", fontSize: "11px",
                  color: u.ativo ? "#b06050" : "#7a9e7e",
                  cursor: "pointer",
                }}
              >
                {u.ativo ? "Desativar" : "Ativar"}
              </button>
            </div>
          </div>
        ))}

        {/* Form redefinir password inline */}
        {redefinirId && (
          <div style={{ marginTop: "16px", padding: "16px", backgroundColor: "#f4f0ea", borderRadius: "3px" }}>
            <label style={labelStyle}>Nova Password Temporária</label>
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                type="password"
                value={novaPassTemp}
                onChange={e => setNovaPassTemp(e.target.value)}
                minLength={8}
                placeholder="mín. 8 caracteres"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={() => handleRedefinir(redefinirId)}
                disabled={loading}
                style={{
                  backgroundColor: GOLD, color: "#161a26",
                  border: "none", borderRadius: "3px", padding: "9px 16px",
                  fontFamily: "var(--font-sans)", fontSize: "11px", fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Guardar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Form criar utilizador */}
      {mostrarFormCriar && (
        <form onSubmit={handleCriar} style={secaoStyle}>
          <h2 style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "15px", color: "#161a26", fontWeight: 400, marginBottom: "20px" }}>
            Novo Utilizador
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div>
              <label style={labelStyle}>Username</label>
              <input required value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} style={inputStyle} placeholder="bea" />
            </div>
            <div>
              <label style={labelStyle}>Nome Completo</label>
              <input required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as "admin" | "terapeuta" }))} style={{ ...inputStyle }}>
                <option value="terapeuta">Terapeuta</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Password Temporária</label>
            <input type="password" required minLength={8} value={form.passwordTemporaria} onChange={e => setForm(f => ({ ...f, passwordTemporaria: e.target.value }))} style={inputStyle} />
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button type="submit" disabled={loading} style={{
              backgroundColor: GOLD, color: "#161a26", border: "none", borderRadius: "3px",
              padding: "10px 20px", fontFamily: "var(--font-sans)", fontSize: "11px", fontWeight: 600,
              letterSpacing: "0.22em", textTransform: "uppercase", cursor: "pointer",
            }}>
              {loading ? "A criar…" : "Criar"}
            </button>
            <button type="button" onClick={() => setMostrarFormCriar(false)} style={{
              backgroundColor: "transparent", border: "1px solid #e0d8cc",
              borderRadius: "3px", padding: "10px 20px",
              fontFamily: "var(--font-sans)", fontSize: "11px", color: "#7a7e8a",
              cursor: "pointer",
            }}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
