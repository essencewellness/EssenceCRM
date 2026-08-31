# 🎯 Drenagem — Lead Capture (Formulário)

**Estado no N8N:** ✅ ativo. Legado — liga diretamente ao HubSpot, fora do
fluxo do CRM próprio.

**Trigger:** Webhook `drenagem-lead` (formulário de captação de leads da
página de Drenagem Linfática no site).

## O que faz

Recebe a submissão do formulário do site, mapeia os valores para labels
legíveis (objetivo, zona, urgência, experiência) e dispara em paralelo:

1. Email de notificação para `geral@essencewellnesspt.com`
2. WhatsApp de alerta (dois destinatários hardcoded)
3. Upsert de contacto no HubSpot

## Notas importantes

- Independente do CRM Next.js — não cria `Cliente`/lead lá. Se um dia se
  quiser unificar com `/api/v1/public/lead`, é aqui que mexer.
