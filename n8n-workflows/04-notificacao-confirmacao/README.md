# 04 | Notificação de Confirmação (via Link)

**Estado no N8N:** ✅ ativo.

> **Actualizado 2026-08-31:** ganhou fallback por email quando o WhatsApp
> falha (2 nós).

**Trigger:** Webhook `sessao-confirmada` (disparado pelo CRM no evento
`sessao.confirmada`, quando o cliente clica em confirmar via `confirmar-sessao.html`).

## O que faz

Em paralelo:

1. Avisa a Bea por WhatsApp que o cliente confirmou.
2. Envia ao cliente uma mensagem de lembrete com morada, hora e métodos de
   pagamento aceites (numerário, MBWay, transferência) — só se houver
   telefone válido.

## Endpoints usados

- Evolution API (`sendText`) — dois destinatários (Bea + cliente)

## Notas importantes

- Adicionado 2026-08-01: antes só notificava a Bea; agora também avisa o
  cliente diretamente, no mesmo estilo de mensagem que a Bea já enviava
  manualmente.
