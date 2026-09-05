# 06 | Nutrição Pré-Sessão (Claude Haiku)

**Estado no N8N:** ✅ ativo em produção com esta versão (aplicada
2026-09-05 via API do N8N, `PUT /api/v1/workflows/{id}`, confirmada com
GET a seguir — 12 nós, `active: true`).

**Trigger:** Agendado diário 11h (+ manual para testes).

## O que faz

Cadência de "nutrição" para clientes com sessão marcada a mais de 7 dias de
distância (a confirmação 24h já cobre o resto):

1. **Boas-vindas** (email, 2 dias após marcar, se lead ≥ 10 dias)
2. **Meio do caminho** (WhatsApp, a meio do intervalo, se lead ≥ 14 dias)
3. **Reta final** (email, 7 dias antes, se lead ≥ 7 dias)

Máx. 1 toque por sessão por dia (prioridade: reta final > meio > boas-vindas).
Sem envios ao domingo.

## Mudança 2026-09-05 (auditoria do sistema de mensagens)

Duas correções, decididas em `/council` e implementadas nesta versão:

1. **Groq → Claude Haiku** — todos os 3 ângulos passam a usar
   `claude-haiku-4-5` (nó "Claude Haiku — Gerar Mensagem"), mesmo padrão já
   comprovado no WF13 (reativação). Alinha com a política: qualquer texto de
   IA visível ao cliente usa Claude, Groq fica só para uso interno.
2. **O toque WhatsApp ("meio") passa a ser aprovado pela Bea** — deixa de
   enviar directo via Evolution API; em vez disso cria uma `MensagemIA`
   `pendente` (`POST /api/v1/mensagens`, `tipo: "nutricao"`) que só sai depois
   de aprovada em `/mensagens`, com `motivoGeracao` a vir do próprio modelo.

**Os dois toques por email (boas-vindas, reta final) continuam a enviar
directo, por decisão deliberada** — não é um esquecimento. O motor de envio
(`10-atualizar-telefone-whatsapp`/`10b-motor-envio`) só sabe entregar
WhatsApp; a fila `MensagemIA` não tem hoje nenhum caminho de entrega por
email (`canal: "email"` fica preso na fila para sempre, ninguém o consome).
Aprovar-e-nunca-entregar seria pior do que o comportamento actual. Para
fechar isto a sério é preciso primeiro estender o motor de envio com um
branch de Gmail — ver nota em `../README.md`.

`Marcar Toque Enviado` passa a disparar logo a seguir a `POST
/api/v1/mensagens` ter sucesso (não depois do envio real) — evita gerar
duplicados no dia seguinte enquanto a mensagem está pendente de aprovação.
A flag `nutricao14dEnviado` passa a significar "já foi para a fila", não
"já chegou à cliente" — só para o toque WhatsApp; os dois toques de email
mantêm o significado original.

## Endpoints usados

- `GET /api/v1/sessoes?de=&limit=200`
- `GET /api/v1/clientes/{id}`
- `PATCH /api/v1/sessoes/{id}` (flags `nutricaoBoasVindasEnviado`, `nutricao14dEnviado`, `nutricao7dEnviado`)
- `POST /api/v1/mensagens` (novo — só o toque WhatsApp)
- Claude Haiku (`anthropicApi`)
- Evolution API (removido do fluxo WhatsApp) + Gmail (mantido, só email)

## Notas importantes

- As regras de tom/voz completas (proibições de clichês de wellness,
  gerúndios, linguagem comercial, etc.) estão preservadas na íntegra no node
  "Preparar Prompt Nutrição" — é o mesmo texto usado em produção, com o
  campo `motivo` acrescentado ao formato de saída pedido ao modelo.
