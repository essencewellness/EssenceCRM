# 18 | Continuidade Pós-Sessão (Claude Haiku)

**Estado no N8N:** 🆕 novo — construído 2026-09-05, validado
(`validate_workflow`, zero erros) mas ainda não importado para o N8N real
(bloqueado por permissão de escrita, ver `../README.md`).

**Trigger:** Agendado diário 10h (+ manual para testes). Escolhido por não
colidir com nenhum outro consumidor de Groq/Haiku listado no `CLAUDE.md`
da raiz (WF03 8-21h de hora a hora, WF06 11h, WF09 6h30, WF13 9h).

## O que faz

Check-in genuíno de bem-estar para clientes que tiveram uma sessão há
5-14 dias e não têm nenhum pack activo — a janela em que, segundo o
`/council` desta sessão, faz sentido perguntar como ficaram sem ser nem
cedo demais (ainda a recuperar) nem tarde demais (já esquecido).

**Isto não é uma mensagem de venda.** Nunca menciona packs, preços,
descontos, nem sugere directamente marcar outra sessão — o único objectivo
é saber como a cliente ficou. Reforçado com uma rede de segurança
determinística (regex) que rejeita a mensagem se o modelo, mesmo assim,
mencionar marcação/pack/preço.

Fluxo: busca candidatos (`ultimaSessaoDesdeDiasMin=5&Max=14&semPackAtivo=true&semMensagemDias=14`)
→ exclui quem já tem mensagem pendente → busca perfil completo → Claude Haiku
gera a mensagem → valida → cria `MensagemIA` `pendente` (`tipo: "continuidade"`)
→ aprovação normal da Bea em `/mensagens`.

## Endpoints usados

- `GET /api/v1/clientes` (filtros novos: `ultimaSessaoDesdeDiasMin/Max`, `semPackAtivo`)
- `GET /api/v1/mensagens?estado=pendente` (dedupe)
- `GET /api/v1/clientes/{id}` (perfil completo)
- Claude Haiku (`anthropicApi`)
- `POST /api/v1/mensagens`

## Notas importantes

- `LIMITE_DIARIO = 10` — mesmo espírito do WF13, evita rajadas.
- Estrutura e nós seguem o padrão já comprovado do WF13 (Reativação) —
  mesma credencial Anthropic, mesmo formato de resposta esperado do
  modelo (`{"mensagem": "...", "motivo": "..."}`), mesma rede de
  segurança por regex antes de criar a mensagem.
