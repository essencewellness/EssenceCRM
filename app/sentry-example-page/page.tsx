// Página de verificação manual do Sentry — não faz parte do produto, só
// serve para confirmar que a integração está mesmo a reportar erros depois
// de NEXT_PUBLIC_SENTRY_DSN estar definida (local ou em produção). Podes
// apagar esta pasta quando já tiveres confirmado que funciona.
//
// force-dynamic: sem dados dinâmicos, o Next prerenderizava esta página como
// estática — os <script> ficavam com o nonce do build, que nunca bate certo
// com o nonce novo que o CSP (proxy.ts) gera a cada pedido. Resultado: CSP
// bloqueava TODOS os scripts da página (incluindo os do próprio Next), a
// página nunca hidratava, e o botão não fazia nada. A config só é respeitada
// vinda de um Server Component — por isso o botão foi movido para
// BotaoTesteSentry.tsx ("use client" à parte).
export const dynamic = "force-dynamic"

import { BotaoTesteSentry } from "./BotaoTesteSentry"

export default function SentryExamplePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        backgroundColor: "#161a26",
        color: "#ece6d6",
        fontFamily: "sans-serif",
        padding: "24px",
        textAlign: "center",
      }}
    >
      <p style={{ fontSize: "9px", letterSpacing: "0.32em", textTransform: "uppercase", color: "#d4b886" }}>
        Essence Wellness · CRM
      </p>
      <h1 style={{ fontSize: "20px", marginBottom: "4px" }}>Teste do Sentry</h1>
      <p style={{ fontSize: "13px", color: "#7a7e8a", maxWidth: "360px" }}>
        Clica no botão para disparar um erro de propósito. Se aparecer um erro novo
        em sentry.io → Issues (pode demorar alguns segundos), a integração está a
        funcionar. Apaga esta página depois de confirmares.
      </p>
      <BotaoTesteSentry />
    </main>
  )
}
