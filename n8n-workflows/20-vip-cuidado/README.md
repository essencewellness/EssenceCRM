# 20 | VIP — Cuidado Proactivo (Claude Haiku)

**Estado no N8N:** ✅ ativo em produção — criado 2026-09-05 via API do N8N
(`POST /api/v1/workflows` + `.../activate`), id `63mgzEwK0BSTmyPl`, 12 nós.

**Trigger:** Agendado diário 12h (+ manual para testes).

## Porquê este workflow

Mesma auditoria (2026-09-05) confirmou outro buraco: `estado=vip_embaixadora`
nunca recebia nada de propósito — só era tocada depois de já ter degradado
para `vip_em_risco`. Pedido directo do Nuno: "temos que prever isso e
tentar marcações ou vouchers etc para não perdermos essa pessoa desse
estado óptimo" — grounded em Reichheld (*The Ultimate Question 2.0*): os
"promoters" são o segmento mais lucrativo, vale a pena protegê-los
activamente em vez de só reagir quando já esfriaram.

## O que faz

`GET /api/v1/clientes?estado=vip_embaixadora&semMensagemDias=30&limit=10`
→ perfil completo (packs já incluídos) → Claude Haiku → cria `MensagemIA`
`pendente` (`tipo: "vip_cuidado"`) → aprovação normal da Bea.

**Ao contrário de todas as outras mensagens novas desta sessão, esta pode
ser activa**: reconhece a fidelidade da cliente e termina com UM convite
concreto — marcar a próxima sessão, ou (se o perfil trouxer um pack com
poucas sessões por usar) lembrar isso com calor, nunca tom comercial.
Nunca os dois ângulos na mesma mensagem.

## Endpoints usados

- `GET /api/v1/clientes` (filtro `estado=vip_embaixadora`)
- `GET /api/v1/mensagens?estado=pendente` (dedupe)
- `GET /api/v1/clientes/{id}` (perfil completo, com packs)
- Claude Haiku (`anthropicApi`)
- `POST /api/v1/mensagens`

## Notas importantes

- `LIMITE_DIARIO = 10`.
- Regra de marca: nunca travessão no meio de frases.
- É a única mensagem do sistema onde é permitido usar as palavras
  "marcar"/"sessão" de forma directa — todas as outras (continuidade,
  reativação, perdida) proíbem isso.
