"use client";

// Aprovação em massa de mensagens IA — o coração do "20 mensagens em 10 min".
// Selecionar → editar inline (opcional) → Aprovar selecionadas → fila espaçada.
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { CheckCircle2, XCircle, Pencil, Send, CheckCheck } from "lucide-react";
import { StaggerList, StaggerItem } from "@/components/stagger";

const INK = "#161a26";
const CHAMPAGNE = "#b9a07a";
const SAGE = "#5f7a5f";
const TERRA = "#b06050";
const CARD = "var(--nuit-overlay)";
const BORDER = "rgba(212,184,134,0.18)";

export interface MensagemPendente {
  id: string;
  clienteId: string;
  clienteNome: string;
  telefone: string | null;
  canal: string;
  texto: string;
  motivo: string | null;
  geradaEm: string; // pré-formatada no servidor
  etiquetas: Array<{ id: string; nome: string; cor: string }>;
}

interface Props {
  mensagens: MensagemPendente[];
  aprovarBulkAction: (itens: Array<{ id: string; mensagemFinal: string }>) => Promise<{ agendadas: number }>;
  rejeitarAction: (id: string) => Promise<void>;
}

function iniciais(nome: string): string {
  return nome.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

export function MensagensBulk({ mensagens, aprovarBulkAction, rejeitarAction }: Props) {
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [edicoes, setEdicoes] = useState<Record<string, string>>({});
  const [emEdicao, setEmEdicao] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const todasSelecionadas = mensagens.length > 0 && selecionadas.size === mensagens.length;
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current) }, []);

  const textoDe = useCallback(
    (m: MensagemPendente) => edicoes[m.id] ?? m.texto,
    [edicoes]
  );

  function alternar(id: string) {
    setSelecionadas((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function alternarTodas() {
    setSelecionadas(todasSelecionadas ? new Set() : new Set(mensagens.map((m) => m.id)));
  }

  function aprovarSelecionadas() {
    const itens = mensagens
      .filter((m) => selecionadas.has(m.id))
      .map((m) => ({ id: m.id, mensagemFinal: textoDe(m) }));
    if (itens.length === 0) return;

    startTransition(async () => {
      const r = await aprovarBulkAction(itens);
      setFeedback(
        r.agendadas === 1
          ? "1 mensagem na fila de envio."
          : `${r.agendadas} mensagens na fila — saem espaçadas 30–90s para proteger o número.`
      );
      setSelecionadas(new Set());
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = setTimeout(() => setFeedback(null), 6000);
    });
  }

  function aprovarUma(m: MensagemPendente) {
    startTransition(async () => {
      await aprovarBulkAction([{ id: m.id, mensagemFinal: textoDe(m) }]);
      setFeedback("Mensagem na fila de envio.");
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = setTimeout(() => setFeedback(null), 5000);
    });
  }

  function rejeitarUma(id: string) {
    startTransition(async () => {
      await rejeitarAction(id);
    });
  }

  if (mensagens.length === 0) {
    return (
      <div
        style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "64px 24px",
          backgroundColor: CARD, borderRadius: "6px",
          border: `1px dashed rgba(185,160,122,0.35)`,
        }}
      >
        <p style={{ fontFamily: "var(--font-heading, Georgia, serif)", fontStyle: "italic", fontSize: "16px", color: "var(--nuit-smoke)" }}>
          Nenhuma mensagem pendente
        </p>
        <p style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px", color: "var(--nuit-smoke)", marginTop: "6px" }}>
          Assim que a IA gerar novas mensagens, aparecem aqui para aprovares.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Barra de ação em massa — fixa no topo da lista */}
      <div
        style={{
          position: "sticky", top: "8px", zIndex: 20,
          display: "flex", alignItems: "center", gap: "12px",
          padding: "12px 16px", marginBottom: "16px",
          backgroundColor: INK, borderRadius: "6px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: "9px", cursor: "pointer", userSelect: "none" }}>
          <input
            type="checkbox"
            checked={todasSelecionadas}
            onChange={alternarTodas}
            style={{ width: "15px", height: "15px", accentColor: "#d4b886", cursor: "pointer" }}
            aria-label="Selecionar todas as mensagens"
          />
          <span style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px", color: "#ece6d6", fontWeight: 500 }}>
            {selecionadas.size === 0
              ? "Selecionar todas"
              : `${selecionadas.size} de ${mensagens.length} selecionadas`}
          </span>
        </label>

        <div style={{ flex: 1 }} />

        <button
          onClick={aprovarSelecionadas}
          disabled={selecionadas.size === 0 || pending}
          className="cursor-pointer transition-opacity hover:opacity-85 disabled:opacity-35 disabled:cursor-default"
          style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            padding: "10px 20px", border: "none", borderRadius: "3px",
            backgroundColor: "#d4b886", color: INK,
            fontFamily: "var(--font-sans, sans-serif)",
            fontSize: "11px", fontWeight: 600,
            letterSpacing: "0.18em", textTransform: "uppercase",
          }}
        >
          <Send size={13} />
          {pending ? "A processar…" : `Aprovar selecionadas${selecionadas.size > 0 ? ` (${selecionadas.size})` : ""}`}
        </button>
      </div>

      {/* Feedback de sucesso */}
      {feedback && (
        <div
          role="status"
          style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "12px 16px", marginBottom: "16px",
            backgroundColor: "rgba(95,122,95,0.10)",
            border: "1px solid rgba(95,122,95,0.30)",
            borderRadius: "4px",
            fontFamily: "var(--font-sans, sans-serif)",
            fontSize: "13px", color: SAGE,
          }}
        >
          <CheckCheck size={16} />
          {feedback}
        </div>
      )}

      {/* Lista de mensagens */}
      <StaggerList style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {mensagens.map((m) => {
          const marcada = selecionadas.has(m.id);
          const editada = edicoes[m.id] !== undefined && edicoes[m.id] !== m.texto;
          const aEditar = emEdicao === m.id;

          return (
            <StaggerItem
              key={m.id}
              style={{
                backgroundColor: CARD,
                borderRadius: "6px",
                border: marcada ? `1px solid rgba(185,160,122,0.65)` : `1px solid ${BORDER}`,
                boxShadow: marcada
                  ? "0 4px 16px rgba(185,160,122,0.18)"
                  : "0 1px 3px rgba(22,26,38,0.05)",
                padding: "18px 20px",
                transition: "border-color 160ms, box-shadow 160ms",
              }}
            >
              {/* Cabeçalho do cartão */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <input
                  type="checkbox"
                  checked={marcada}
                  onChange={() => alternar(m.id)}
                  style={{ width: "15px", height: "15px", marginTop: "11px", accentColor: CHAMPAGNE, cursor: "pointer", flexShrink: 0 }}
                  aria-label={`Selecionar mensagem para ${m.clienteNome}`}
                />

                <div
                  style={{
                    width: "38px", height: "38px", borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px", fontWeight: 700,
                    backgroundColor: "rgba(185,160,122,0.10)", color: CHAMPAGNE,
                    border: "1px solid rgba(185,160,122,0.28)",
                  }}
                >
                  {iniciais(m.clienteNome)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
                    <a
                      href={`/clientes/${m.clienteId}`}
                      style={{ fontFamily: "var(--font-sans, sans-serif)", fontWeight: 700, fontSize: "14px", color: "var(--nuit-bone)", textDecoration: "none" }}
                    >
                      {m.clienteNome}
                    </a>
                    {m.etiquetas.map((e) => (
                      <span
                        key={e.id}
                        style={{
                          padding: "2px 8px", borderRadius: "100px",
                          fontSize: "10px", fontWeight: 600,
                          fontFamily: "var(--font-sans, sans-serif)",
                          color: e.cor, backgroundColor: e.cor + "18",
                          border: `1px solid ${e.cor}30`,
                        }}
                      >
                        {e.nome}
                      </span>
                    ))}
                    {editada && (
                      <span
                        style={{
                          padding: "2px 8px", borderRadius: "100px",
                          fontSize: "10px", fontWeight: 600,
                          fontFamily: "var(--font-sans, sans-serif)",
                          color: CHAMPAGNE, backgroundColor: "rgba(185,160,122,0.12)",
                          border: "1px solid rgba(185,160,122,0.30)",
                        }}
                      >
                        Editada
                      </span>
                    )}
                  </div>
                  {m.motivo && (
                    <p style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "11px", color: "#9d9d9a", marginTop: "3px" }}>
                      {m.motivo}
                    </p>
                  )}
                </div>

                <span style={{ flexShrink: 0, fontFamily: "var(--font-sans, sans-serif)", fontSize: "11px", color: "#b5b5b2" }}>
                  {m.geradaEm}
                </span>
              </div>

              {/* Bolha estilo WhatsApp — pré-visualização fiel do que a cliente recebe */}
              <div style={{ margin: "14px 0 0 64px" }}>
                {aEditar ? (
                  <textarea
                    value={textoDe(m)}
                    onChange={(e) => setEdicoes((prev) => ({ ...prev, [m.id]: e.target.value }))}
                    rows={Math.max(3, textoDe(m).split("\n").length + 1)}
                    autoFocus
                    style={{
                      width: "100%", padding: "12px 14px",
                      fontFamily: "var(--font-sans, sans-serif)", fontSize: "13.5px", lineHeight: 1.65,
                      color: "var(--nuit-bone)", backgroundColor: "var(--nuit-midnight)",
                      border: `1px solid rgba(185,160,122,0.6)`, borderRadius: "8px",
                      resize: "vertical",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      maxWidth: "520px",
                      padding: "11px 14px",
                      backgroundColor: "#e7f5dd",
                      border: "1px solid rgba(95,122,95,0.18)",
                      borderRadius: "10px 10px 2px 10px",
                      fontFamily: "var(--font-sans, sans-serif)",
                      fontSize: "13.5px", lineHeight: 1.65, color: "#22301f",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {textoDe(m)}
                    <div style={{ textAlign: "right", fontSize: "10px", color: "rgba(34,48,31,0.45)", marginTop: "4px" }}>
                      {m.telefone ?? "sem número"} · WhatsApp
                    </div>
                  </div>
                )}
              </div>

              {/* Ações */}
              <div style={{ display: "flex", gap: "8px", marginTop: "12px", marginLeft: "64px" }}>
                <button
                  onClick={() => aprovarUma(m)}
                  disabled={pending}
                  className="cursor-pointer transition-all hover:opacity-80 disabled:opacity-40"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "6px",
                    padding: "8px 16px", borderRadius: "3px",
                    fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px", fontWeight: 600,
                    color: "#fdfaf1", backgroundColor: SAGE, border: "none",
                  }}
                >
                  <CheckCircle2 size={14} />
                  Aprovar
                </button>

                <button
                  onClick={() => setEmEdicao(aEditar ? null : m.id)}
                  className="cursor-pointer transition-all hover:opacity-80"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "6px",
                    padding: "8px 16px", borderRadius: "3px",
                    fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px", fontWeight: 600,
                    color: CHAMPAGNE, backgroundColor: "rgba(185,160,122,0.08)",
                    border: "1px solid rgba(185,160,122,0.30)",
                  }}
                >
                  <Pencil size={13} />
                  {aEditar ? "Concluir edição" : "Editar"}
                </button>

                <button
                  onClick={() => rejeitarUma(m.id)}
                  disabled={pending}
                  className="cursor-pointer transition-all hover:opacity-80 disabled:opacity-40"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "6px",
                    padding: "8px 16px", borderRadius: "3px",
                    fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px", fontWeight: 600,
                    color: TERRA, backgroundColor: "rgba(176,96,80,0.07)",
                    border: "1px solid rgba(176,96,80,0.22)",
                  }}
                >
                  <XCircle size={14} />
                  Rejeitar
                </button>
              </div>
            </StaggerItem>
          );
        })}
      </StaggerList>
    </div>
  );
}
