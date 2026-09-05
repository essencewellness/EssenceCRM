# 19 | Perdida — Reconquista (Claude Haiku)

**Estado no N8N:** ✅ ativo em produção — criado 2026-09-05 via API do N8N
(`POST /api/v1/workflows` + `.../activate`), id `YzLHYlf54wQAyn8R`, 12 nós.

**Trigger:** Agendado diário 11h (+ manual para testes).

## Porquê este workflow

Auditoria ao sistema de mensagens (2026-09-05) confirmou um buraco real:
o WF13 (Reativação) só consulta `estado=reativacao` e `estado=vip_em_risco`
— uma cliente que passa os 180 dias sem sessão e cai em `estado=perdida`
**nunca mais recebia nada**. Este workflow fecha esse buraco.

## O que faz

`GET /api/v1/clientes?estado=perdida&semMensagemDias=180&limit=10` → exclui
quem já tem mensagem pendente → perfil completo → Claude Haiku → cria
`MensagemIA` `pendente` (`tipo: "perdida_reconquista"`) → aprovação normal
da Bea.

**Tom deliberadamente diferente do WF13**: reconhece que passou muito
tempo, sem culpa nem urgência, "a porta está sempre aberta". Nunca
pergunta "porquê não voltou" (soa a cobrança). `semMensagemDias=180` (não
os 14 do WF13) garante que só tenta reconquistar uma vez, não repete
constantemente.

## Endpoints usados

- `GET /api/v1/clientes` (filtro `estado=perdida`)
- `GET /api/v1/mensagens?estado=pendente` (dedupe)
- `GET /api/v1/clientes/{id}` (perfil completo, com observações antigas)
- Claude Haiku (`anthropicApi`)
- `POST /api/v1/mensagens`

## Notas importantes

- `LIMITE_DIARIO = 10`, mesmo padrão do WF13/WF18.
- Regra de marca (2026-09-05): nunca travessão no meio de frases na
  mensagem final — vírgula, dois pontos ou ponto final.
