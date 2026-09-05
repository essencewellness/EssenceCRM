# 22 | Ativa Frequente — Reconhecedora (Claude Haiku)

**Estado no N8N:** ✅ ativo em produção — criado 2026-09-05 via API do N8N
(`POST /api/v1/workflows` + `.../activate`), id `3ffXropC0kOXo6tq`, 12 nós.

**Trigger:** Agendado diário 14h (+ manual para testes).

## Porquê este workflow

Segunda fase confirmada em falta ao mapear os 9 estados CRM.
`estado=ativa_frequente` (4+ sessões, ainda não VIP) nunca recebia
qualquer mensagem de propósito — só nutrição antes da sessão e, se
degradasse, reativação. Nenhum reconhecimento do hábito que se estava a
formar.

## O que faz

`GET /api/v1/clientes?estado=ativa_frequente&semMensagemDias=45&limit=10`
→ perfil completo (calcula o serviço mais frequente a partir das
sessões) → Claude Haiku → cria `MensagemIA` `pendente` (`tipo:
"ativa_reconhecimento"`) → aprovação normal da Bea.

Tom celebratório mas leve — reconhece o hábito, não a fidelidade total
(isso é o VIP cuidado, WF20). Nunca packs, marcação ou preços.

## Endpoints usados

- `GET /api/v1/clientes` (filtro `estado=ativa_frequente`)
- `GET /api/v1/mensagens?estado=pendente` (dedupe)
- `GET /api/v1/clientes/{id}` (perfil completo, com sessões para calcular
  o serviço mais frequente)
- Claude Haiku (`anthropicApi`)
- `POST /api/v1/mensagens`

## Notas importantes

- `LIMITE_DIARIO = 10`.
- `semMensagemDias=45` — evita repetir o mesmo reconhecimento com
  frequência excessiva.
