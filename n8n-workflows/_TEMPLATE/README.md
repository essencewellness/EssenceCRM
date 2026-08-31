# [Número] — [Nome do Workflow]

> Copia esta pasta `_TEMPLATE/` e renomeia para `NN-nome-curto/`. Substitui os
> campos entre parênteses retos.

**Objetivo:** (uma frase — o que este workflow faz)
**Tipo de trigger:** (Pull / Push / Inbound) · **Frequência:** (ex: cada 1 min)
**Estado:** ⬜ por construir

---

## Quando dispara

(Descreve o gatilho: um Schedule a cada X, ou um Webhook chamado por quem.)

## Endpoints da API que usa

| Passo | Método + endpoint | Para quê |
|---|---|---|
| 1 | `GET /...` | (ler dados) |
| 2 | `POST /...` | (agir) |

## Passo a passo (nós N8N)

```
[Trigger]
   → [HTTP ...]        (header X-API-Key)
   → [IF / Switch ...]
   → [Ação: Evolution / Claude / Sheets]
   → [HTTP PATCH ...]  (marcar como feito — fecha o ciclo)
```

## Variáveis / credenciais necessárias

- Credencial Header Auth `X-API-Key`
- (Evolution API / Google Sheets / Claude — conforme o caso)
- (Vercel `WEBHOOK_N8N_*` — só se for push)

## Notas / cuidados

- (Ex: marcar sempre o flag após agir, senão reenvia.)
