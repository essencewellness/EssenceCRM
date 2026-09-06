# 09 | Sugestão de Etiquetas (Groq)

**Estado no N8N:** ✅ ativo.

> **Actualizado 2026-08-31:** mudou de 8h para **6h30** — colidia com o WF03
> (também usa Groq, corre de hora a hora a partir das 8h) e esgotava a
> quota partilhada de tokens/min. Ganhou também espaçamento real (9-11s)
> entre pedidos, para não se esgotar sozinho num lote grande.

**Trigger:** Agendado diário 8h (+ manual para testes).

## O que faz

1. Busca até 15 sessões `realizada` ainda sem `etiquetasSugeridasEm`.
2. Busca as etiquetas já existentes no CRM (para a IA preferir reutilizar em
   vez de duplicar).
3. Para cada sessão, Groq lê as notas (`resumoSessao` + `notasPosSessao`) e
   sugere etiquetas (existentes ou novas, com tipo saude/campanha/preferencia/
   **experiencia** — alargado 2026-09-07, ver nota abaixo).
4. Marca a sessão como processada.
5. Se houver sugestões, cria uma `Tarefa` de revisão atribuída à terapeuta
   que fez a sessão (`terapeutaId` da sessão — não a etiqueta "terapeuta
   habitual" do cliente, que pode estar desatualizada).

## Endpoints usados

- `GET /api/v1/sessoes?estado=realizada&etiquetasSugeridas=false&limit=15`
- `GET /api/v1/etiquetas`
- `PATCH /api/v1/sessoes/{id}` (`etiquetasSugeridasEm`)
- `POST /api/v1/tarefas`
- Groq (`groqApi`)

## Notas importantes

- Consome a quota Groq — até 15 pedidos/dia, ~750 tokens cada.
- `atribuidaA` da tarefa vem do `terapeutaId` real da sessão (corrigido
  2026-08-05) — antes causava tarefas atribuídas à terapeuta errada quando a
  etiqueta "terapeuta habitual" do cliente estava desatualizada.

**2026-09-07 — divisão de trabalho com o motor de etiquetas automáticas**
(`lib/etiquetas-automaticas.ts`, integrado no cron `/api/cron/estados`):
7 etiquetas (Lead fria, Onboarding, LTV alto, Cross-buy alto/moderado,
Promotora/Detratora NPS) passaram a ser calculadas por regras, sem IA e
sem aprovação. Este workflow continua a cobrir tudo o resto — o que só dá
para saber lendo texto livre da sessão (saúde, campanha, preferência, e
agora também experiência: "Reclamação registada"/"Recuperação de
serviço"). Duas mudanças no node "Preparar Prompts":
- a lista de etiquetas existentes mostrada ao Groq já não inclui as de
  tipo `ciclo`/`compra` (são só do motor automático, a IA nunca deve
  sugeri-las nem reutilizá-las)
- `tipoEtiqueta` aceita agora `experiencia` além de
  `saude|campanha|preferencia`, com instrução explícita para nunca sugerir
  `ciclo`/`compra`
