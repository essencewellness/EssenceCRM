"use client";

import { useState } from "react";
import { criarTemplate, atualizarTemplate, apagarTemplate } from "./actions";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

const GOLD = "var(--nuit-champagne)";

const TIPOS = ["reativacao", "reengagement", "onboarding", "voucher", "geral"];

type Template = {
  id: string;
  nome: string;
  tipo: string;
  texto: string;
  variaveis: string[];
  ativo: boolean;
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans, sans-serif)",
  fontSize: "10px", fontWeight: 600,
  letterSpacing: "0.22em", textTransform: "uppercase",
  color: "var(--nuit-bone-soft)", display: "block", marginBottom: "5px",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px",
  backgroundColor: "#faf8f6",
  border: "1px solid #e0d8cc",
  borderRadius: "3px",
  fontFamily: "var(--font-sans, sans-serif)",
  fontSize: "13px", color: "var(--nuit-midnight)", outline: "none",
};

export function TemplatesManager({ templates }: { templates: Template[] }) {
  const [mostrarFormCriar, setMostrarFormCriar] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmApagarId, setConfirmApagarId] = useState<string | null>(null);

  const [form, setForm] = useState({
    nome: "", tipo: "geral", texto: "", variaveis: "",
  });
  const [editForm, setEditForm] = useState({
    nome: "", texto: "", ativo: true,
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
      const variaveis = form.variaveis
        .split(",")
        .map(v => v.trim())
        .filter(Boolean);
      await criarTemplate({ ...form, variaveis });
      feedback("Template criado.");
      setMostrarFormCriar(false);
      setForm({ nome: "", tipo: "geral", texto: "", variaveis: "" });
      window.location.reload();
    } catch (err) {
      feedback(err instanceof Error ? err.message : "Erro", true);
    } finally {
      setLoading(false);
    }
  }

  function iniciarEdicao(t: Template) {
    setEditandoId(t.id);
    setEditForm({ nome: t.nome, texto: t.texto, ativo: t.ativo });
  }

  async function handleAtualizar(id: string) {
    setLoading(true);
    try {
      await atualizarTemplate(id, editForm);
      feedback("Template atualizado.");
      setEditandoId(null);
      window.location.reload();
    } catch (err) {
      feedback(err instanceof Error ? err.message : "Erro", true);
    } finally {
      setLoading(false);
    }
  }

  async function confirmarApagar() {
    if (!confirmApagarId) return;
    setLoading(true);
    try {
      await apagarTemplate(confirmApagarId);
      setConfirmApagarId(null);
      feedback("Template apagado.");
      window.location.reload();
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
    padding: "20px",
    marginBottom: "12px",
  };

  const porTipo: Record<string, Template[]> = {};
  for (const t of templates) {
    (porTipo[t.tipo] ??= []).push(t);
  }

  return (
    <div style={{ maxWidth: "720px" }}>
      <ConfirmModal
        open={!!confirmApagarId}
        onOpenChange={(open) => { if (!open) setConfirmApagarId(null) }}
        title="Apagar template"
        description="Tens a certeza que queres apagar este template? Esta ação não pode ser revertida."
        confirmLabel="Apagar"
        variant="destructive"
        onConfirm={confirmarApagar}
        loading={loading}
      />
      {mensagem && <p style={{ color: "#7a9e7e", fontSize: "13px", marginBottom: "14px", fontFamily: "var(--font-sans)" }}>{mensagem}</p>}
      {erro && <p style={{ color: "var(--destructive)", fontSize: "13px", marginBottom: "14px", fontFamily: "var(--font-sans)" }}>{erro}</p>}

      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => setMostrarFormCriar(!mostrarFormCriar)}
          style={{
            backgroundColor: GOLD, color: "var(--nuit-midnight)",
            border: "none", borderRadius: "3px", padding: "8px 16px",
            fontFamily: "var(--font-sans)", fontSize: "11px", fontWeight: 600,
            letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer",
          }}
        >
          + Novo Template
        </button>
      </div>

      {/* Form criar */}
      {mostrarFormCriar && (
        <form onSubmit={handleCriar} style={{ ...secaoStyle, borderColor: GOLD + "44" }}>
          <h2 style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontSize: "14px", color: "var(--nuit-midnight)", fontWeight: 400, marginBottom: "16px" }}>
            Novo Template
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
            <div>
              <label style={labelStyle}>Nome</label>
              <input required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Tipo</label>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} style={{ ...inputStyle }}>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: "14px" }}>
            <label style={labelStyle}>Texto</label>
            <textarea
              required
              value={form.texto}
              onChange={e => setForm(f => ({ ...f, texto: e.target.value }))}
              rows={4}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Variáveis (separadas por vírgula)</label>
            <input value={form.variaveis} onChange={e => setForm(f => ({ ...f, variaveis: e.target.value }))} placeholder="nome, servico, data" style={inputStyle} />
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button type="submit" disabled={loading} style={{ backgroundColor: GOLD, color: "var(--nuit-midnight)", border: "none", borderRadius: "3px", padding: "9px 18px", fontFamily: "var(--font-sans)", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>
              {loading ? "A criar…" : "Criar"}
            </button>
            <button type="button" onClick={() => setMostrarFormCriar(false)} style={{ backgroundColor: "transparent", border: "1px solid #e0d8cc", borderRadius: "3px", padding: "9px 18px", fontFamily: "var(--font-sans)", fontSize: "11px", color: "var(--nuit-bone-soft)", cursor: "pointer" }}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Lista por tipo */}
      {Object.keys(porTipo).length === 0 && (
        <div style={{ ...secaoStyle, textAlign: "center" }}>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "#9d9d9a" }}>
            Nenhum template configurado.
          </p>
        </div>
      )}

      {Object.entries(porTipo).map(([tipo, lista]) => (
        <div key={tipo} style={{ marginBottom: "24px" }}>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.24em", textTransform: "uppercase", color: "#9d9d9a", marginBottom: "10px" }}>
            {tipo} <span style={{ fontWeight: 400, letterSpacing: 0, fontSize: "10px" }}>({lista.length})</span>
          </p>
          {lista.map(t => (
            <div key={t.id} style={secaoStyle}>
              {editandoId === t.id ? (
                <div>
                  <div style={{ marginBottom: "12px" }}>
                    <label style={labelStyle}>Nome</label>
                    <input value={editForm.nome} onChange={e => setEditForm(f => ({ ...f, nome: e.target.value }))} style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: "12px" }}>
                    <label style={labelStyle}>Texto</label>
                    <textarea rows={4} value={editForm.texto} onChange={e => setEditForm(f => ({ ...f, texto: e.target.value }))} style={{ ...inputStyle, resize: "vertical" }} />
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", cursor: "pointer" }}>
                    <input type="checkbox" checked={editForm.ativo} onChange={e => setEditForm(f => ({ ...f, ativo: e.target.checked }))} />
                    <span style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--nuit-bone-soft)" }}>Ativo</span>
                  </label>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={() => handleAtualizar(t.id)} disabled={loading} style={{ backgroundColor: GOLD, color: "var(--nuit-midnight)", border: "none", borderRadius: "3px", padding: "7px 14px", fontFamily: "var(--font-sans)", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>
                      Guardar
                    </button>
                    <button onClick={() => setEditandoId(null)} style={{ backgroundColor: "transparent", border: "1px solid #e0d8cc", borderRadius: "3px", padding: "7px 14px", fontFamily: "var(--font-sans)", fontSize: "11px", color: "var(--nuit-bone-soft)", cursor: "pointer" }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div>
                      <p style={{ fontFamily: "var(--font-sans)", fontSize: "13px", fontWeight: 600, color: "var(--nuit-midnight)" }}>
                        {t.nome}
                        {!t.ativo && <span style={{ marginLeft: "8px", fontSize: "10px", color: "#9d9d9a" }}>(inativo)</span>}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={() => iniciarEdicao(t)} style={{ backgroundColor: "transparent", border: "1px solid #e0d8cc", borderRadius: "3px", padding: "4px 10px", fontFamily: "var(--font-sans)", fontSize: "11px", color: "var(--nuit-bone-soft)", cursor: "pointer" }}>
                        Editar
                      </button>
                      <button onClick={() => setConfirmApagarId(t.id)} disabled={loading} style={{ backgroundColor: "transparent", border: "1px solid rgba(176,96,80,0.3)", borderRadius: "3px", padding: "4px 10px", fontFamily: "var(--font-sans)", fontSize: "11px", color: "var(--destructive)", cursor: "pointer" }}>
                        Apagar
                      </button>
                    </div>
                  </div>
                  <p style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--nuit-bone-soft)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{t.texto}</p>
                  {t.variaveis.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "10px" }}>
                      {t.variaveis.map(v => (
                        <span key={v} style={{ fontFamily: "monospace", fontSize: "11px", backgroundColor: "rgba(212,184,134,0.08)", color: GOLD, padding: "2px 8px", borderRadius: "3px", border: "1px solid rgba(212,184,134,0.18)" }}>
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
