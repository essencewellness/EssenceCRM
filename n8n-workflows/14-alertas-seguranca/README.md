# 14 | Alertas de Segurança (SIEM lite)

**Estado no N8N:** ⚠️ inativo de propósito — construído 2026-08-25 (spec-009,
Fase 2, item 14), nunca importado/ligado ainda. Ativar só depois de o Nuno
confirmar o número de WhatsApp de destino e testar manualmente uma vez.

**Trigger:** Agendado, a cada 15 minutos.

## O que faz

Chama `GET /api/v1/seguranca/alertas` (novo endpoint, protegido por
`API_KEY_N8N`) e, se `alertar: true`, manda WhatsApp ao Nuno com o resumo.
O endpoint fica encarregue da lógica de quando alertar — o workflow só lê
o resultado e envia; não faz contagens nem decide limites.

O endpoint alerta quando:
- Mais de 10 `login.falhado` na última hora
- Mais de 10 `webhook.assinatura_invalida` na última hora
- Qualquer `rgpd.anonimizacao` ou `cliente.apagado_definitivo` nos
  últimos 20 minutos (janela um pouco maior que o intervalo do cron, para
  não perder nenhum entre execuções — pode repetir um alerta em casos raros
  de sobreposição, aceitável para um "SIEM lite")

Reutiliza o `AuditLog` que já existe — sem ferramenta externa nova, como
pedido no plano original.

## Endpoints usados

- `GET /api/v1/seguranca/alertas` (CRM, novo)
- Evolution API (`sendText`)

## Notas importantes

- `DESTINATARIOS` só tem o número do Nuno — é quem trata de segurança/RGPD,
  ao contrário do 07 que também pode incluir a Beatriz.
- Antes de ativar: testar via "Executar Manualmente" pelo menos uma vez para
  confirmar que chega WhatsApp quando forçarmos `alertar: true` (ex: gerando
  alguns `login.falhado` a propósito num ambiente de teste).
- Sem estado entre execuções (não há "já alertei isto") — é deliberadamente
  simples ("lite"); se isto virar ruído no WhatsApp, a evolução natural é
  guardar `ultimoAlertaEm` nalgum sítio e só re-alertar depois de X horas.
