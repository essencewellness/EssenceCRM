import { redirect } from "next/navigation";
import { getContextoUtilizador } from "@/lib/contexto-utilizador";
import { IntegracoesPanel } from "./IntegracoesPanel";

export default async function ConfigIntegracoesPage() {
  const ctx = await getContextoUtilizador();
  if (!ctx.isAdmin) redirect("/configuracoes/perfil");

  const webhooksConfigurados: Record<string, boolean> = {
    "mensagem.aprovada": !!process.env.WEBHOOK_N8N_MENSAGEM_APROVADA,
    "sessao.realizada": !!process.env.WEBHOOK_N8N_SESSAO_REALIZADA,
    "cliente.estado_alterado": !!process.env.WEBHOOK_N8N_CLIENTE_ESTADO_ALTERADO,
    "lead.criado": !!process.env.WEBHOOK_N8N_LEAD_CRIADO,
    "onboarding.submetido": !!process.env.WEBHOOK_N8N_ONBOARDING_SUBMETIDO,
  };

  return (
    <div>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{
          fontFamily: "var(--font-heading, Georgia, serif)",
          fontSize: "20px", fontWeight: 400, color: "var(--nuit-midnight)",
          marginBottom: "6px",
        }}>
          Integrações
        </h1>
        <p style={{
          fontFamily: "var(--font-sans, sans-serif)",
          fontSize: "13px", color: "var(--nuit-bone-soft)", lineHeight: 1.6,
        }}>
          Estado das ligações externas e webhooks de saída.
        </p>
      </div>

      <IntegracoesPanel data={{
        n8nUrl: process.env.WEBHOOK_N8N_MENSAGEM_APROVADA
          ? new URL(process.env.WEBHOOK_N8N_MENSAGEM_APROVADA).origin
          : "",
        whatsappUrl: "",
        webhooksConfigurados,
      }} />
    </div>
  );
}
