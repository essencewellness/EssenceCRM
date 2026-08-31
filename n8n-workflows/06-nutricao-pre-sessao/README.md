# 06 | Nutrição Pré-Sessão (Groq)

**Estado no N8N:** ✅ ativo.

**Trigger:** Agendado diário 11h (+ manual para testes).

## O que faz

Cadência de "nutrição" para clientes com sessão marcada a mais de 7 dias de
distância (a confirmação 24h já cobre o resto):

1. **Boas-vindas** (email, 2 dias após marcar, se lead ≥ 10 dias)
2. **Meio do caminho** (WhatsApp, a meio do intervalo, se lead ≥ 14 dias)
3. **Reta final** (email, 7 dias antes, se lead ≥ 7 dias)

Máx. 1 toque por sessão por dia (prioridade: reta final > meio > boas-vindas).
Sem envios ao domingo. Cada mensagem é gerada por Groq com um prompt de
tom/voz da marca (Flora ✦ | Essence Wellness) diferente por ângulo — nunca
comercial, nunca menciona preços/urgência, sempre em português europeu
informal ("tu").

## Endpoints usados

- `GET /api/v1/sessoes?de=&limit=200`
- `GET /api/v1/clientes/{id}`
- `PATCH /api/v1/sessoes/{id}` (flags `nutricaoBoasVindasEnviado`, `nutricao14dEnviado`, `nutricao7dEnviado`)
- Groq (`groqApi`)
- Evolution API + Gmail

## Notas importantes

- Consome a quota Groq — até 1 pedido por cliente elegível/dia (ver limites
  no `CLAUDE.md`).
- As regras de tom/voz completas (proibições de clichês de wellness,
  gerúndios, linguagem comercial, etc.) estão preservadas na íntegra no node
  "Preparar Prompt Nutrição" — é o mesmo texto usado em produção.
