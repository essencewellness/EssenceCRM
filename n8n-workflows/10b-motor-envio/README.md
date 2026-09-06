# 10 | Motor de Envio (Fila de Mensagens)

> ⚠️ **Nota de numeração:** dentro do N8N este workflow chama-se **"10 |
> Motor de Envio"**, mas o número `10` já estava ocupado neste repositório
> por [10-atualizar-telefone-whatsapp](../10-atualizar-telefone-whatsapp/)
> (numeração do CLAUDE.md). Ficou `10b-motor-envio` para não colidir — mesmo
> critério já usado em [13-reativacao-mensagens](../13-reativacao-mensagens/).

**Estado no N8N:** ✅ ativo.

**Triggers:** dois caminhos independentes, convergem na mesma lógica de envio:
- **Schedule, 8h-20h, a cada 20 min** — rede de segurança (fila `GET /api/v1/mensagens/fila`)
- **Webhook `crm-mensagem-aprovada`** — push instantâneo quando o CRM aprova uma mensagem sem hora agendada

## Reescrito em 2026-08-31 (antes: polling a cada 1 min, 24h/dia)

O desenho antigo verificava a fila **a cada 1 minuto, sem parar**, o que por
si só chegava para nunca deixar a Neon suspender (era provavelmente o maior
consumidor de CU-hours de todos os workflows). A correção:

1. **Intervalo alargado + janela de horário** — só 8h-20h, de 20 em 20 min
   (a Bea só aprova de manhã/início de tarde; enviar até às 19h é válido).
2. **Loop com espaçamento real** (`Loop Envio`, splitInBatches 1 a 1 + nó
   Wait de 30-90s) — garante que, mesmo que se acumule um lote grande entre
   verificações, as mensagens continuam a sair espaçadas (protecção
   anti-ban do WhatsApp), em vez de rebentarem todas de seguida.
3. **Caminho push** (`Webhook — Mensagem Aprovada`) — quando a Bea aprova
   uma mensagem sem escolher hora, o CRM (`lib/fila-envio.ts`) dispara este
   webhook para a primeira mensagem do lote, dando envio quase instantâneo
   sem esperar pela próxima verificação periódica. Completamente separado
   do loop da fila (confirmado por análise de grafo — nunca partilha nós a
   jusante), para nunca reentrar no Wait/loop da fila por engano.

## Endpoints usados

- `GET /api/v1/mensagens/fila?limite=10`
- `POST /api/v1/webhooks/confirmacao-envio`
- Evolution API (`sendText`)
- Webhook de entrada: `WEBHOOK_N8N_MENSAGEM_APROVADA` (env var do CRM) →
  `https://n8n.essencewellnesspt.com/webhook/crm-mensagem-aprovada`

Testado ao vivo em 2026-08-31 com mensagens de teste reais (`TESTE TESTE`)
em ambos os caminhos — confirmado sem duplicação de envios.

## Bug corrigido 2026-09-06/07 — canal não verificado

Descoberto ao construir o sistema de campanhas (que introduziu a
possibilidade de canal `email`): o caminho pull nunca verificava o campo
`canal` de uma mensagem — tentava enviar **tudo** por WhatsApp,
independentemente do canal escolhido. O caminho push já verificava
(`Normalizar Payload (Push)` devolve `[]` se `canal !== 'whatsapp'`), mas
isso só significava que a mensagem ficava muda até o pull a apanhar 20 min
depois e a enviar pelo canal errado — pior do que simplesmente falhar.

Corrigido nos dois nós `Normalizar Telefone` (pull e push): calculam
`canalSuportado = !item.canal || item.canal === 'whatsapp'` e forçam
`temWhatsapp = false` quando o canal não é suportado — reaproveita a
condição `Tem WhatsApp Válido?` já existente (routing para o branch "sem
canal"), sem precisar de mexer no próprio nó IF (tentativa inicial de
adicionar uma condição nova ao IF via API falhou silenciosamente —
n8n aceitou o PUT mas não persistiu a condição; forçar a flag existente
foi a alternativa robusta). `Preparar Confirmação (Sem Canal)` passou a
diferenciar a mensagem de erro: "Canal X ainda não é enviado por este
motor" vs. "Cliente sem telefone/WhatsApp válido".

**Email continua sem integração real** (Brevo por configurar) — o efeito
desta correcção é a mensagem ficar correctamente marcada `falhada` com o
motivo certo, não que passe a ser entregue por email.
