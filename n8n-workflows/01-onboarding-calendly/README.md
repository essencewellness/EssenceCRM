# 01 | Onboarding — Receção de Marcação (Calendly → CRM)

**Estado no N8N:** ⚠️ intencionalmente **inativo** (decisão do Nuno — só liga
quando houver disponibilidade para testar com marcações reais).

> **Actualizado 2026-08-31:** ganhou fallback por email quando o WhatsApp
> falha (4 nós — "Pedir Atribuição", "Reagendamento" cliente/terapeuta,
> "Alerta de Cancelamento"). Continua inactivo de propósito.

**Trigger:** Calendly (`invitee.created`, `invitee.canceled`).

## O que faz

1. Recebe o evento do Calendly (nova marcação ou cancelamento).
2. Extrai dados do cliente/sessão do payload (nome, telefone, serviço, categoria).
3. Se for reagendamento (`old_invitee` presente): busca a sessão antiga via
   `calendlyEventId`, atualiza-a em vez de criar uma nova, e avisa cliente + Bea.
4. Caso contrário: `GET /api/v1/clientes?email=` → upsert de cliente (bloqueia
   se `estado=blacklist`) → `POST /api/v1/sessoes`.
5. Consoante a categoria do serviço (massagem/casal/drenagem/gift card),
   dispara WhatsApp + email de confirmação com o link do formulário de
   onboarding correto.
6. Pede a Bea que atribua terapeuta/preço via `atribuir-sessao.html`.
7. No cancelamento: marca a sessão como `cancelada` e avisa Bea.

## Endpoints usados

- `GET /api/v1/clientes?email=`
- `POST /api/v1/clientes`
- `POST /api/v1/sessoes`
- `PATCH /api/v1/sessoes/{id}` (cancelamento e reagendamento)
- `GET /api/v1/sessoes?calendlyEventId=`
- Evolution API (`sendText`) — WhatsApp cliente + Bea
- Gmail — email de confirmação

## Notas importantes

- As chaves de API neste ficheiro estão substituídas por `{{API_KEY_N8N}}` /
  `{{EVOLUTION_API_KEY}}` — ao reimportar no N8N, substitui pelos valores reais
  (ver `CREDENCIAIS-PRIVADAS.local.md`).
- Alguns corpos de email (blacklist, confirmação por serviço) foram
  abreviados neste backup para poupar espaço — o template HTML completo com a
  identidade visual da marca só existe no N8N em produção. Se recriares este
  workflow a partir do zero, os textos e a lógica estão todos aqui; só o
  HTML decorativo dos emails precisa de ser reconstruído.
- O `pinData` do node "Calendly Trigger" tem um payload de teste sintético
  (não são dados reais de cliente) — documenta o formato exato que o nó
  Calendly Trigger real produz, útil para simular testes.
- **Antes de ativar:** confirmar a credencial Calendly (`16kVKTnjEPByrYSX`) e
  Gmail (`dG6PuQ0LhRtAJ5Ls`) ainda válidas no N8N; o número de WhatsApp da
  Bea (`351911150025`) está hardcoded em vários nós — é o número de teste do
  Nuno, trocar antes de ir para clientes reais.
