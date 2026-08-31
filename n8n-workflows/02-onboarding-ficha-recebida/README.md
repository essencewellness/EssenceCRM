# 02 | Onboarding — Ficha Recebida (Forms → Groq → Ficha Clínica)

**Estado no N8N:** ✅ ativo.

**Trigger:** Webhook `crm-onboarding` (disparado pelo CRM no evento
`onboarding.submetido`, quando a cliente submete um dos formulários públicos).

## O que faz

1. Recebe o payload do onboarding submetido (dados reportados nesta sessão).
2. Busca o perfil completo do cliente no CRM (histórico, notas, tarefas,
   mensagens, ficha clínica anterior).
3. Monta um prompt com os dados de hoje + contexto acumulado.
4. Groq gera a ficha clínica (2 parágrafos factuais + recomendação, nunca
   diagnóstico).
5. `PATCH /api/v1/clientes/{id}` grava `fichaClinica`.

## Endpoints usados

- `GET /api/v1/clientes/{id}`
- `PATCH /api/v1/clientes/{id}`
- Groq (`groqApi`, `llama-3.3-70b-versatile`)

## Notas importantes

- Consome a quota partilhada do Groq (ver limites em `CLAUDE.md` da raiz do
  projeto) — 1x por onboarding submetido.
- O prompt tem regras explícitas contra linguagem médica/diagnóstico e contra
  sugerir aromas (decisão sempre da terapeuta no momento).
