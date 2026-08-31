# 08 | Leads — Nova Lead

**Estado no N8N:** ✅ ativo.

**Trigger:** Webhook `lead-criado` (evento `lead.criado` do CRM, disparado
pelo endpoint público `/api/v1/public/lead`).

## O que faz

Monta e envia uma mensagem WhatsApp simples com os dados da nova lead
(nome, telefone, email, como conheceu, serviço de interesse).

## Endpoints usados

- Evolution API (`sendText`)

## Notas importantes

- `DESTINATARIOS` só tem o número do Nuno por agora — acrescentar o da
  Beatriz quando confirmado.
