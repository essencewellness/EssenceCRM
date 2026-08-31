# 07 | Feedback — Notificações

**Estado no N8N:** ✅ ativo.

> **Actualizado 2026-08-31:** ganhou fallback por email quando o WhatsApp
> falha.

**Trigger:** Webhook `feedback-recebido` (evento `feedback.recebido` do CRM).

## O que faz

Monta e envia uma mensagem WhatsApp com o resumo do feedback recebido
(NPS, pontos positivos/a melhorar, se é detratora, se pediu contacto para
marcar próxima sessão). Se pediu contacto e mencionou serviços de interesse,
inclui o link real do Calendly para cada serviço mencionado (não um link
genérico).

## Endpoints usados

- Evolution API (`sendText`)

## Notas importantes

- `DESTINATARIOS` só tem o número do Nuno por agora — acrescentar o da
  Beatriz quando confirmado (comentário no código já marca onde).
- `LINKS_SERVICO` mapeia nome do serviço → URL Calendly real (Essência
  Plena/Puro Aroma/Cera Quente/Pré-Natal partilham a página "agendar-massagem";
  Drenagem tem página própria).
