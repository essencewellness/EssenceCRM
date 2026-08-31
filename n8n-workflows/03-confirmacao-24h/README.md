# 03 | Confirmação 24h + Ficha da Terapeuta

**Estado no N8N:** ✅ ativo.

> **Actualizado 2026-08-31:** ganhou fallback por email quando o WhatsApp
> falha (2 nós — confirmação ao cliente + ficha à terapeuta).

**Trigger:** Agendado, hora a hora entre as 8h e as 21h (`0 8-21 * * *`,
Europe/Lisbon).

## O que faz

Duas responsabilidades no mesmo workflow:

1. **Confirmação ao cliente** — busca sessões nas próximas 24h ainda sem
   `briefingEnviado`, envia WhatsApp/email a pedir confirmação de presença
   (link `confirmar-sessao.html`).
2. **Ficha da terapeuta** — para as mesmas sessões, busca o perfil completo
   do cliente, gera um relatório clínico via Groq (JSON estruturado: mapa
   corporal, recomendações, alertas se a ficha da cliente ainda não foi
   preenchida) e envia à Bea por WhatsApp (link `ficha-sessao.html`).

O intervalo `de`/`ate` cobre hoje→amanhã (não só "amanhã") para apanhar
também marcações feitas no próprio dia.

## Endpoints usados

- `GET /api/v1/sessoes?de=&ate=&estado=agendada&briefingEnviado=false`
- `GET /api/v1/clientes/{id}`
- `PATCH /api/v1/sessoes/{id}` (grava `briefingJson`, `briefingEnviado`, `lembreteEnviado`)
- Groq (`groqApi`)
- Evolution API + Gmail

## Notas importantes

- Consome a quota Groq (ver `CLAUDE.md`) — 1x por sessão do dia seguinte.
- O número da Bea está hardcoded (`351911150025`, TODO no código: mapear por
  terapeuta quando houver mais do que uma ativa a receber fichas).
