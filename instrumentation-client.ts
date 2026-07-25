import * as Sentry from "@sentry/nextjs"

// Sem replayIntegration nem feedbackIntegration de propósito: esta app mostra
// dados clínicos (fichaClinica, alergias, estado emocional) no ecrã — gravar
// sessões do browser para um serviço terceiro sem mascarar esses campos seria
// um problema de RGPD. Se um dia se quiser ligar Session Replay, tem de vir
// com uma configuração de mascaramento explícita desses campos primeiro.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
