# 07 | Feedback — Notificações

**Estado no N8N:** ✅ ativo em produção com o branch de NPS baixo (aplicado
2026-09-05 via API do N8N — 10 nós, `active: true`). Prompt do branch NPS
afinado numa 2ª iteração no mesmo dia (feedback do Nuno sobre as
mensagens de demonstração): passou a usar as palavras exactas da cliente
como promessa e a terminar com um convite suave a voltar, em vez de nunca
convidar.

> **Actualizado 2026-08-31:** ganhou fallback por email quando o WhatsApp
> falha.

**Trigger:** Webhook `feedback-recebido` (evento `feedback.recebido` do CRM).

## O que faz

Monta e envia uma mensagem WhatsApp com o resumo do feedback recebido
(NPS, pontos positivos/a melhorar, se é detratora, se pediu contacto para
marcar próxima sessão). Se pediu contacto e mencionou serviços de interesse,
inclui o link real do Calendly para cada serviço mencionado (não um link
genérico).

## Mudança 2026-09-05 (auditoria do sistema de mensagens)

Novo branch em paralelo, disparado pelo mesmo webhook: quando `npsScore <= 6`
(detratora), além de notificar o Nuno/Bea (como já fazia), gera com Claude
Haiku uma mensagem de reconhecimento para a própria cliente — reconhece o
feedback, promete algo concreto para a próxima sessão, nunca defensiva,
nunca menciona packs/preços. Cria `MensagemIA` `pendente`
(`tipo: "nps_baixo"`), passa pela aprovação normal da Bea em `/mensagens`,
**nunca envia sozinha**. Complementa a notificação existente, não a
substitui — a Bea continua a ser avisada por WhatsApp/email como antes.

## Endpoints usados

- Evolution API (`sendText`)
- Claude Haiku (`anthropicApi`) — novo, só para o branch de NPS baixo
- `POST /api/v1/mensagens` — novo, só para o branch de NPS baixo

## Notas importantes

- `DESTINATARIOS` só tem o número do Nuno por agora — acrescentar o da
  Beatriz quando confirmado (comentário no código já marca onde).
- `LINKS_SERVICO` mapeia nome do serviço → URL Calendly real (Essência
  Plena/Puro Aroma/Cera Quente/Pré-Natal partilham a página "agendar-massagem";
  Drenagem tem página própria).
