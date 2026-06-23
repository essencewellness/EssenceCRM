# D1 — N8N: Envio de link de feedback 24h pós-sessão

## Objectivo

Enviar automaticamente um link para `public/forms/feedback.html` por WhatsApp, 24h após cada sessão realizada.

---

## Trigger

**Webhook:** `sessao.realizada`  
**Variável Vercel:** `WEBHOOK_N8N_SESSAO_REALIZADA`  
**Evento emitido por:** `PATCH /api/v1/sessoes/[id]` quando `estado = "realizada"`  

Payload recebido pelo N8N:
```json
{
  "evento": "sessao.realizada",
  "payload": {
    "sessaoId": "cuid...",
    "clienteId": "cuid...",
    "preco": 40,
    "servico": "Essência Plena",
    "terapeuta": "Beatriz Leão"
  },
  "timestamp": "2026-06-23T10:00:00.000Z"
}
```

---

## Fluxo N8N

```
Webhook (sessao.realizada)
    ↓
Wait 24h   [Wait node — 86400 segundos]
    ↓
GET /api/v1/clientes/{{payload.clienteId}}
    [Header: X-API-Key]
    ↓
IF cliente.estado == "blacklist"  →  STOP
    ↓
Construir URL do formulário:
  https://crm.essencewellness.pt/forms/feedback.html
    ?c={{payload.clienteId}}
    &s={{payload.sessaoId}}
    ↓
Mensagem WhatsApp (Evolution API):
  Para: cliente.telefone
  Texto: ver template abaixo
    ↓
[Fim]
```

---

## Template da mensagem WhatsApp

```
Olá {{primeiroNome}} 🌿

Já passou um dia desde a tua sessão de {{servico}}.

Como te estás a sentir?

Adorávamos saber a tua opinião — demora menos de 1 minuto:
{{linkFeedback}}

Flora ✦ | Essence Wellness
```

**Regras:**
- `primeiroNome` = `cliente.nome.split(' ')[0]`
- `linkFeedback` = URL completo com `?c=` e `?s=`
- Nunca enviar se `cliente.estado == "blacklist"`
- Não repetir se já existe um `Feedback` para este `sessaoId` (verificar via GET cliente ou adicionar campo no payload)

---

## Endpoint de verificação duplicados (opcional)

Antes de enviar, o N8N pode consultar:

```
GET /api/v1/clientes/{{clienteId}}
```

O campo `cliente.feedbacks` não está exposto directamente — alternativa: adicionar ao payload do webhook `jaTemFeedback: boolean` (melhoria futura).

Por agora: enviar sempre, o formulário aceita múltiplos feedbacks por sessão.

---

## Configuração no Vercel

| Variável | Valor |
|---|---|
| `WEBHOOK_N8N_SESSAO_REALIZADA` | `https://n8n.essencewellnesspt.com/webhook/crm-sessao-realizada` |

---

## Configuração no N8N

| Nó | Tipo | Configuração |
|---|---|---|
| Webhook | Webhook | URL: `/webhook/crm-sessao-realizada`, Method: POST |
| Esperar 24h | Wait | Resume After: 24 hours (ou Fixed Interval: 86400s) |
| GET Cliente | HTTP Request | `GET {{API_BASE}}/api/v1/clientes/{{$json.payload.clienteId}}` + `X-API-Key` |
| Check Blacklist | IF | `{{$json.data.estado}} !== 'blacklist'` |
| Enviar WA | HTTP Request | Evolution API `/message/sendText/essence_whatsapp` |

---

## Validação de assinatura (recomendado)

O CRM assina todos os webhooks com HMAC-SHA256 no header `X-Assinatura`.  
O N8N deve verificar:

```
sha256=HMAC(WEBHOOK_SECRET, body)  ==  X-Assinatura
```

Usar o nó **Code** no N8N com `crypto.createHmac('sha256', secret).update(body).digest('hex')`.
