"use client";

// Aprovação em massa de mensagens IA — o coração do "20 mensagens em 10 min".
// Selecionar → editar inline (opcional) → Aprovar selecionadas → fila espaçada.
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, XCircle, Pencil, Send, CheckCheck, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/toast-nuit";

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
  geradaEm: string;
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

// ── Botão de aprovar com micro-animação de sucesso ───────────────────────────
function BotaoAprovar({ onClick, disabled, pending }: { onClick: () => void; disabled: boolean; pending: boolean }) {
  const [sucesso, setSucesso] = useState(false);

  function handleClick() {
    if (disabled || pending) return;
    onClick();
    setSucesso(true);
    setTimeout(() => setSucesso(false), 1200);
  }

  return (
    <motion.button
      onClick={handleClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.03, y: -1 } : {}}
      whileTap={!disabled ? { scale: 0.96 } : {}}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      style={{
        display: "inline-flex", alignItems: "center", gap: "6px",
        padding: "8px 16px", borderRadius: "3px",
        fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px", fontWeight: 600,
        color: "#fdfaf1",
        backgroundColor: sucesso ? "#3d8b3d" : SAGE,
        border: "none", cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "background-color 200ms ease",
        boxShadow: sucesso ? "0 0 12px rgba(61,139,61,0.40)" : "none",
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {sucesso ? (
          <motion.span
            key="ok"
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
            style={{ display: "inline-flex" }}
          >
            <CheckCheck size={14} />
          </motion.span>
        ) : (
          <motion.span key="check" initial={{ scale: 1 }} style={{ display: "inline-flex" }}>
            <CheckCircle2 size={14} />
          </motion.span>
        )}
      </AnimatePresence>
      {sucesso ? "Na fila!" : "Aprovar"}
    </motion.button>
  );
}

// ── Estado vazio / tudo aprovado ─────────────────────────────────────────────
function TudoFeitoState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "72px 24px",
        backgroundColor: CARD, borderRadius: "6px",
        border: "1px solid rgba(95,122,95,0.30)",
      }}
    >
      <motion.div
        animate={{ rotate: [0, -10, 10, -5, 5, 0], scale: [1, 1.15, 1.1, 1.05, 1] }}
        transition={{ duration: 0.7, delay: 0.2 }}
      >
        <Sparkles size={32} color="#6fcf97" />
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        style={{
          fontFamily: "var(--font-heading, Georgia, serif)",
          fontStyle: "italic", fontSize: "18px", color: "#6fcf97",
          marginTop: "16px",
        }}
      >
        Tudo tratado!
      </motion.p>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.48 }}
        style={{
          fontFamily: "var(--font-sans, sans-serif)",
          fontSize: "13px", color: "var(--nuit-smoke)", marginTop: "8px",
        }}
      >
        As mensagens estão na fila e saem espaçadas automaticamente.
      </motion.p>
    </motion.div>
  );
}

export function MensagensBulk({ mensagens, aprovarBulkAction, rejeitarAction }: Props) {
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [edicoes, setEdicoes] = useState<Record<string, string>>({});
  const [emEdicao, setEmEdicao] = useState<string | null>(null);
  const [saindo, setSaindo] = useState<Record<string, "aprovada" | "rejeitada">>({});
  const [pending, startTransition] = useTransition();
  const [bulkPending, setBulkPending] = useState(false);
  const { toast } = useToast();
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current) }, []);

  // Mensagens visíveis = que ainda não estão a sair
  const visiveis = mensagens.filter(m => !saindo[m.id]);
  const todasSelecionadas = visiveis.length > 0 && selecionadas.size === visiveis.length;

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
    setSelecionadas(todasSelecionadas ? new Set() : new Set(visiveis.map((m) => m.id)));
  }

  async function aprovarSelecionadas() {
    const itens = visiveis
      .filter((m) => selecionadas.has(m.id))
      .map((m) => ({ id: m.id, mensagemFinal: textoDe(m) }));
    if (itens.length === 0) return;

    // Marcar todas como saindo imediatamente (animação de saída)
    const novosSaindo: Record<string, "aprovada"> = {};
    itens.forEach(i => { novosSaindo[i.id] = "aprovada" });
    setSaindo(p => ({ ...p, ...novosSaindo }));
    setSelecionadas(new Set());
    setBulkPending(true);

    startTransition(async () => {
      try {
        const r = await aprovarBulkAction(itens);
        toast(
          r.agendadas === 1
            ? "1 mensagem na fila — sai em breve."
            : `${r.agendadas} mensagens na fila — saem espaçadas 30–90s.`,
          "queue"
        );
      } finally {
        setBulkPending(false);
      }
    });
  }

  function aprovarUma(m: MensagemPendente) {
    setSaindo(p => ({ ...p, [m.id]: "aprovada" }));
    startTransition(async () => {
      await aprovarBulkAction([{ id: m.id, mensagemFinal: textoDe(m) }]);
      toast("Mensagem na fila de envio.", "queue");
    });
  }

  function rejeitarUma(id: string) {
    setSaindo(p => ({ ...p, [id]: "rejeitada" }));
    startTransition(async () => {
      await rejeitarAction(id);
    });
  }

  if (mensagens.length === 0 || (visiveis.length === 0 && Object.keys(saindo).length > 0)) {
    return (
      <AnimatePresence mode="wait">
        {mensagens.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
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
          </motion.div>
        ) : (
          <TudoFeitoState key="done" />
        )}
      </AnimatePresence>
    );
  }

  return (
    <div>
      {/* Barra de ação em massa */}
      <motion.div
        layout
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
          <motion.span
            key={selecionadas.size}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            style={{ fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px", color: "#ece6d6", fontWeight: 500 }}
          >
            {selecionadas.size === 0
              ? "Selecionar todas"
              : `${selecionadas.size} de ${visiveis.length} selecionadas`}
          </motion.span>
        </label>

        <div style={{ flex: 1 }} />

        <motion.button
          onClick={aprovarSelecionadas}
          disabled={selecionadas.size === 0 || bulkPending}
          whileHover={selecionadas.size > 0 && !bulkPending ? { scale: 1.03, y: -1 } : {}}
          whileTap={selecionadas.size > 0 && !bulkPending ? { scale: 0.97 } : {}}
          transition={{ type: "spring", stiffness: 380, damping: 22 }}
          style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            padding: "10px 20px", border: "none", borderRadius: "3px",
            backgroundColor: "#d4b886", color: INK,
            fontFamily: "var(--font-sans, sans-serif)",
            fontSize: "11px", fontWeight: 600,
            letterSpacing: "0.18em", textTransform: "uppercase",
            opacity: selecionadas.size === 0 || bulkPending ? 0.35 : 1,
            cursor: selecionadas.size === 0 || bulkPending ? "default" : "pointer",
            boxShadow: selecionadas.size > 0 && !bulkPending ? "0 4px 14px rgba(212,184,134,0.30)" : "none",
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {bulkPending ? (
              <motion.span
                key="loading"
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0 }}
                style={{ display: "inline-flex" }}
              >
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  style={{ display: "inline-flex" }}
                >
                  <Send size={13} />
                </motion.span>
              </motion.span>
            ) : (
              <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "inline-flex" }}>
                <Send size={13} />
              </motion.span>
            )}
          </AnimatePresence>
          {bulkPending ? "A enviar para a fila…" : `Aprovar${selecionadas.size > 0 ? ` (${selecionadas.size})` : ""}`}
        </motion.button>
      </motion.div>

      {/* Lista de mensagens */}
      <motion.div layout style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <AnimatePresence mode="popLayout">
          {visiveis.map((m, idx) => {
            const marcada = selecionadas.has(m.id);
            const editada = edicoes[m.id] !== undefined && edicoes[m.id] !== m.texto;
            const aEditar = emEdicao === m.id;

            return (
              <motion.div
                key={m.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={
                  saindo[m.id] === "rejeitada"
                    ? { opacity: 0, x: -60, scale: 0.92, transition: { duration: 0.28, ease: [0.36, 0, 0.66, -0.56] } }
                    : { opacity: 0, x: 60, y: -8, scale: 0.94, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } }
                }
                transition={{ duration: 0.38, delay: idx * 0.04, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  backgroundColor: CARD,
                  borderRadius: "6px",
                  border: marcada ? `1px solid rgba(185,160,122,0.65)` : `1px solid ${BORDER}`,
                  boxShadow: marcada
                    ? "0 4px 16px rgba(185,160,122,0.18)"
                    : "0 1px 3px rgba(22,26,38,0.05)",
                  padding: "18px 20px",
                }}
              >
                {/* Cabeçalho do cartão */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <motion.input
                    type="checkbox"
                    checked={marcada}
                    onChange={() => alternar(m.id)}
                    whileTap={{ scale: 0.85 }}
                    style={{ width: "15px", height: "15px", marginTop: "11px", accentColor: CHAMPAGNE, cursor: "pointer", flexShrink: 0 }}
                    aria-label={`Selecionar mensagem para ${m.clienteNome}`}
                  />

                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    style={{
                      width: "38px", height: "38px", borderRadius: "50%", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px", fontWeight: 700,
                      backgroundColor: "rgba(185,160,122,0.10)", color: CHAMPAGNE,
                      border: "1px solid rgba(185,160,122,0.28)",
                    }}
                  >
                    {iniciais(m.clienteNome)}
                  </motion.div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
                      <a
                        href={`/clientes/${m.clienteId}`}
                        style={{ fontFamily: "var(--font-sans, sans-serif)", fontWeight: 700, fontSize: "14px", color: "var(--nuit-bone)", textDecoration: "none" }}
                      >
                        {m.clienteNome}
                      </a>
                      {m.etiquetas.map((e) => (
                        <motion.span
                          key={e.id}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 22 }}
                          style={{
                            padding: "2px 8px", borderRadius: "100px",
                            fontSize: "10px", fontWeight: 600,
                            fontFamily: "var(--font-sans, sans-serif)",
                            color: e.cor, backgroundColor: e.cor + "18",
                            border: `1px solid ${e.cor}30`,
                          }}
                        >
                          {e.nome}
                        </motion.span>
                      ))}
                      <AnimatePresence>
                        {editada && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.7, x: -8 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.7 }}
                            transition={{ type: "spring", stiffness: 400, damping: 22 }}
                            style={{
                              padding: "2px 8px", borderRadius: "100px",
                              fontSize: "10px", fontWeight: 600,
                              fontFamily: "var(--font-sans, sans-serif)",
                              color: CHAMPAGNE, backgroundColor: "rgba(185,160,122,0.12)",
                              border: "1px solid rgba(185,160,122,0.30)",
                            }}
                          >
                            Editada
                          </motion.span>
                        )}
                      </AnimatePresence>
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

                {/* Bolha WhatsApp */}
                <div style={{ margin: "14px 0 0 64px" }}>
                  <AnimatePresence mode="wait" initial={false}>
                    {aEditar ? (
                      <motion.textarea
                        key="editor"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
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
                      <motion.div
                        key="bubble"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
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
                        <div style={{ textAlign: "right", fontSize: "10px", color: "rgba(34,48,31,0.65)", marginTop: "4px" }}>
                          {m.telefone ?? "sem número"} · WhatsApp
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Ações */}
                <div style={{ display: "flex", gap: "8px", marginTop: "12px", marginLeft: "64px" }}>
                  <BotaoAprovar
                    onClick={() => aprovarUma(m)}
                    disabled={pending}
                    pending={pending}
                  />

                  <motion.button
                    onClick={() => setEmEdicao(aEditar ? null : m.id)}
                    whileHover={{ scale: 1.03, y: -1 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "6px",
                      padding: "8px 16px", borderRadius: "3px",
                      fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px", fontWeight: 600,
                      color: CHAMPAGNE, backgroundColor: "rgba(185,160,122,0.08)",
                      border: "1px solid rgba(185,160,122,0.30)", cursor: "pointer",
                    }}
                  >
                    <Pencil size={13} />
                    {aEditar ? "Concluir" : "Editar"}
                  </motion.button>

                  <motion.button
                    onClick={() => rejeitarUma(m.id)}
                    disabled={pending}
                    whileHover={!pending ? { scale: 1.03, y: -1 } : {}}
                    whileTap={!pending ? { scale: 0.96 } : {}}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "6px",
                      padding: "8px 16px", borderRadius: "3px",
                      fontFamily: "var(--font-sans, sans-serif)", fontSize: "12px", fontWeight: 600,
                      color: TERRA, backgroundColor: "rgba(176,96,80,0.07)",
                      border: "1px solid rgba(176,96,80,0.22)",
                      opacity: pending ? 0.4 : 1, cursor: pending ? "default" : "pointer",
                    }}
                  >
                    <XCircle size={14} />
                    Rejeitar
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
