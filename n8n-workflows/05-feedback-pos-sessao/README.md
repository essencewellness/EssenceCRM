# 05 | Feedback Pós-Sessão (Cliente + Terapeuta)

**Estado no N8N:** ✅ ativo.

> **Actualizado 2026-08-31:** o lembrete de registo à terapeuta (antes a
> cada 15 min, 24h/dia) saiu deste workflow — passou a corrida 2x/dia (7h +
> 20h) que delega cada sessão pendente ao novo sub-workflow
> [05b-lembrete-individual](../05b-lembrete-individual/), que espera pela
> hora exacta sem custo. Também ganhou fallback por email nos 3 canais
> (feedback cliente, check-in recorrente, pedido de avaliação).

**Triggers:** três responsabilidades independentes no mesmo workflow:
- 19h diário — pedido de feedback ao cliente
- a cada 15 min — lembrete à terapeuta para registar a sessão
- manual — para testes

## O que faz

1. **Pedido de feedback ao cliente** (19h): busca sessões `realizada` de
   ontem sem `avaliacaoEnviadaEm`. Para cada uma, verifica recorrência
   (sessão anterior há menos de 60 dias) — se recorrente, envia só uma
   mensagem breve de cuidado (sem formulário); caso contrário, envia o link
   do formulário completo `feedback.html`.
2. **Lembrete de registo à terapeuta** (a cada 15 min): calcula o fim real
   da sessão (início + duração + 10 min de margem) e, só depois desse
   momento, envia à terapeuta o link `pos-sessao.html` para registar o
   resultado — não é um lote fixo diário, dispara pouco depois de cada
   sessão terminar.

## Endpoints usados

- `GET /api/v1/sessoes?estado=realizada&de=&ate=`
- `GET /api/v1/sessoes?clienteId=&estado=realizada&limit=2` (cálculo de recorrência)
- `GET /api/v1/sessoes?lembretePosSessaoEnviado=false`
- `PATCH /api/v1/sessoes/{id}` (`avaliacaoEnviadaEm`, `lembretePosSessaoEnviado`)
- Evolution API + Gmail

## Notas importantes

- Regra de recorrência (2026-07-30): sessão < 60 dias desde a anterior → só
  mensagem de cuidado, sem pedir o questionário completo outra vez tão cedo.
