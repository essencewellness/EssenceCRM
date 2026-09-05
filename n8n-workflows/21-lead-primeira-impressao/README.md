# 21 | Lead — Primeira Impressão (Claude Haiku)

**Estado no N8N:** ✅ ativo em produção — criado 2026-09-05 via API do N8N
(`POST /api/v1/workflows` + `.../activate`), id `F4LHVgTNAXTygXdp`, 12 nós.

**Trigger:** Agendado diário 13h (+ manual para testes).

## Porquê este workflow

Última das duas fases confirmadas em falta ao mapear os 9 estados CRM.
`estado=lead` nunca recebia nenhum nurture — o único contacto era o
próprio onboarding/lead form, uma vez, e depois silêncio se a pessoa não
marcasse.

## O que faz

`GET /api/v1/clientes?estado=lead&criadoDesdeDiasMin=3&criadoDesdeDiasMax=10&semMensagemDias=30&limit=10`
→ perfil → Claude Haiku → cria `MensagemIA` `pendente` (`tipo:
"lead_nurture"`) → aprovação normal da Bea.

**Única mensagem do sistema onde é permitido mencionar os serviços do
catálogo de forma informativa** — esta pessoa nunca foi cliente, ainda
está a decidir. Todas as outras mensagens (para quem já é cliente)
proíbem isto por soar a venda; aqui é o oposto: falta de informação é a
barreira real.

## Endpoints usados

- `GET /api/v1/clientes` (novo filtro `criadoDesdeDiasMin/Max` — janela
  sobre `criadoEm`, necessário porque leads nunca têm `ultimaSessao`)
- `GET /api/v1/mensagens?estado=pendente` (dedupe)
- `GET /api/v1/clientes/{id}`
- Claude Haiku (`anthropicApi`)
- `POST /api/v1/mensagens`

## Notas importantes

- `LIMITE_DIARIO = 10`.
- `semMensagemDias=30` — janela larga, não é para insistir todas as semanas.
