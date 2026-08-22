import { prisma } from "@/lib/prisma";
import { formatDate, formatPhone } from "@/lib/utils";
import { ShieldAlert } from "lucide-react";
import { addToBlacklist, removeFromBlacklist } from "./actions";

export default async function BlacklistPage() {
  const bloqueados = await prisma.cliente.findMany({
    where: { estado: "blacklist" },
    orderBy: { atualizadoEm: "desc" },
  });

  return (
    <div style={{ maxWidth: "880px", margin: "0 auto" }}>

      {/* Header */}
      <header style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <div style={{
            width: "38px", height: "38px", borderRadius: "10px",
            backgroundColor: "rgba(176,96,80,0.08)",
            border: "1px solid rgba(176,96,80,0.22)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <ShieldAlert size={16} color="var(--destructive)" />
          </div>
          <div>
            <h1 style={{
              fontFamily: "var(--font-heading, Georgia, serif)",
              fontSize: "20px", fontWeight: 400, color: "var(--nuit-bone)",
            }}>
              Acessos Bloqueados
            </h1>
            <p style={{
              fontFamily: "var(--font-body, sans-serif)",
              fontSize: "11px", color: "#9d9d9a",
            }}>
              {bloqueados.length} registo{bloqueados.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div style={{
          height: "1px",
          background: "linear-gradient(to right, transparent, rgba(176,96,80,0.25), transparent)",
          marginTop: "16px",
        }} />
      </header>

      {/* Add form */}
      <div style={{
        backgroundColor: "var(--nuit-overlay)",
        border: "1px solid rgba(176,96,80,0.22)",
        borderRadius: "8px",
        padding: "20px 24px",
        marginBottom: "20px",
      }}>
        <p style={{
          fontFamily: "var(--font-sans, sans-serif)",
          fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em",
          color: "rgba(176,96,80,0.7)", textTransform: "uppercase",
          marginBottom: "16px",
        }}>
          Adicionar registo
        </p>
        <form action={addToBlacklist}>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]" style={{ gap: "10px", alignItems: "end" }}>
            <div>
              <label htmlFor="bl-nome" style={labelStyle}>Nome *</label>
              <input id="bl-nome" name="nome" placeholder="Nome completo" style={inputStyle} />
            </div>
            <div>
              <label htmlFor="bl-telefone" style={labelStyle}>Telefone *</label>
              <input id="bl-telefone" name="telefone" placeholder="351912345678" style={inputStyle} />
            </div>
            <div>
              <label htmlFor="bl-email" style={labelStyle}>Email</label>
              <input id="bl-email" name="email" type="email" placeholder="opcional" style={inputStyle} />
            </div>
            <div>
              <label htmlFor="bl-motivo" style={labelStyle}>Motivo</label>
              <input id="bl-motivo" name="motivo" placeholder="ex: comportamento" style={inputStyle} />
            </div>
            <button type="submit" style={{
              height: "36px", padding: "0 18px",
              backgroundColor: "rgba(176,96,80,0.08)",
              border: "1px solid rgba(176,96,80,0.30)",
              borderRadius: "8px", cursor: "pointer",
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: "11px", fontWeight: 600,
              letterSpacing: "0.06em", color: "var(--destructive)",
              whiteSpace: "nowrap",
              transition: "all 150ms",
            }}>
              Bloquear
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div style={{
        backgroundColor: "var(--nuit-overlay)",
        border: "1px solid rgba(212,184,134,0.16)",
        borderRadius: "8px",
        overflow: "hidden",
      }}>
        {bloqueados.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: "60px 24px",
          }}>
            <ShieldAlert size={28} color="var(--destructive)" opacity={0.18} style={{ marginBottom: "12px" }} />
            <p style={{
              fontFamily: "var(--font-heading, Georgia, serif)",
              fontStyle: "italic", fontSize: "14px", color: "#9d9d9a",
            }}>
              Nenhum registo bloqueado
            </p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(212,184,134,0.14)" }}>
                {[
                  { label: "Nome", key: "nome" },
                  { label: "Telefone", key: "telefone" },
                  { label: "Email", key: "email" },
                  { label: "Motivo", key: "motivo" },
                  { label: "Adicionada", key: "adicionada" },
                  { label: "", key: "acoes" },
                ].map(({ label, key }, i) => (
                  <th key={key} style={{
                    padding: "10px 16px",
                    fontFamily: "var(--font-sans, sans-serif)",
                    fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em",
                    color: "var(--nuit-bone-soft)", textTransform: "uppercase",
                    textAlign: i === 5 ? "center" : "left",
                    backgroundColor: "rgba(212,184,134,0.06)",
                  }}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bloqueados.map((c, idx) => {
                const motivo = c.notasPessoais?.replace("[BLACKLIST] ", "") ?? "—";
                return (
                  <tr
                    key={c.id}
                    style={{
                      borderBottom: idx < bloqueados.length - 1 ? "1px solid rgba(212,184,134,0.10)" : "none",
                    }}
                    className="hover:bg-[rgba(212,184,134,0.05)]"
                  >
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{
                          width: "30px", height: "30px", borderRadius: "50%", flexShrink: 0,
                          backgroundColor: "rgba(176,96,80,0.08)",
                          border: "1px solid rgba(176,96,80,0.22)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontFamily: "var(--font-sans, sans-serif)",
                          fontSize: "10px", fontWeight: 700, color: "var(--destructive)",
                        }}>
                          {c.nome.slice(0, 1).toUpperCase()}
                        </div>
                        <span style={{
                          fontFamily: "var(--font-body, sans-serif)",
                          fontSize: "13px", fontWeight: 600, color: "var(--nuit-bone)",
                        }}>
                          {c.nome}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "13px", color: "var(--nuit-bone-soft)" }}>
                        {formatPhone(c.telefone)}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{
                        fontFamily: "var(--font-body, sans-serif)", fontSize: "12px", color: "#9d9d9a",
                        display: "block", maxWidth: "180px",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {c.email ?? "—"}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{
                        fontFamily: "var(--font-body, sans-serif)", fontSize: "12px", color: "var(--nuit-bone-soft)",
                        fontStyle: motivo === "—" ? "italic" : "normal",
                        display: "block", maxWidth: "160px",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {motivo}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: "12px", color: "#9d9d9a" }}>
                        {formatDate(c.atualizadoEm)}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px", textAlign: "center" }}>
                      <form action={removeFromBlacklist}>
                        <input type="hidden" name="id" value={c.id} />
                        <button
                          type="submit"
                          title="Remover bloqueio"
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            padding: "4px 8px", borderRadius: "6px",
                            fontFamily: "var(--font-sans, sans-serif)",
                            fontSize: "10px", fontWeight: 500,
                            color: "var(--nuit-bone-soft)",
                            letterSpacing: "0.06em",
                            transition: "all 150ms",
                          }}
                          className="hover:text-[var(--nuit-bone-soft)] hover:bg-[rgba(212,184,134,0.06)]"
                        >
                          remover
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Disclaimer */}
      <p style={{
        fontFamily: "var(--font-body, sans-serif)",
        fontSize: "10px", color: "var(--nuit-bone-soft)",
        textAlign: "center", marginTop: "20px",
        fontStyle: "italic",
      }}>
        Pessoas nesta lista são detetadas automaticamente pelo sistema de marcações e bloqueadas.
      </p>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-sans, sans-serif)",
  fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.14em",
  color: "#9d9d9a", textTransform: "uppercase",
  marginBottom: "5px",
};

const inputStyle: React.CSSProperties = {
  width: "100%", height: "36px", padding: "0 10px",
  backgroundColor: "var(--nuit-midnight)",
  border: "1px solid rgba(212,184,134,0.22)",
  borderRadius: "8px",
  fontFamily: "var(--font-body, sans-serif)",
  fontSize: "13px", color: "var(--nuit-bone)",
  outline: "none",
  boxSizing: "border-box",
};
