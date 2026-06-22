import { redirect } from "next/navigation";
import { getContextoUtilizador } from "@/lib/contexto-utilizador";
import { getConfigNegocio } from "@/lib/config-negocio";
import { NegocioForm } from "./NegocioForm";

export default async function ConfigNegocioPage() {
  const ctx = await getContextoUtilizador();
  if (!ctx.isAdmin) redirect("/configuracoes/perfil");

  const config = await getConfigNegocio();

  return (
    <div>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{
          fontFamily: "var(--font-heading, Georgia, serif)",
          fontSize: "20px", fontWeight: 400, color: "#161a26",
          marginBottom: "6px",
        }}>
          Negócio & Automações
        </h1>
        <p style={{
          fontFamily: "var(--font-sans, sans-serif)",
          fontSize: "13px", color: "#7a7e8a", lineHeight: 1.6,
        }}>
          Dados do negócio e configurações globais de automação.
        </p>
      </div>

      <NegocioForm config={{
        nomeNegocio: config.nomeNegocio,
        emailContacto: config.emailContacto,
        whatsappPrincipal: config.whatsappPrincipal,
        assinaturaAutomatica: config.assinaturaAutomatica,
        assinaturaReferral: config.assinaturaReferral,
        horarioAbertura: config.horarioAbertura,
        horarioFecho: config.horarioFecho,
        diasReativacao: config.diasReativacao,
        quietHoraInicio: config.quietHoraInicio,
        quietHoraFim: config.quietHoraFim,
        maxMensagensDia: config.maxMensagensDia,
      }} />
    </div>
  );
}
