# Research — Sistema de Tags Dinâmicas (Spec 005)

## Decision 1: Auto-tags de actividade — computed vs stored

**Decision:** Computed em runtime (não armazenadas na BD).

**Rationale:** A actividade muda a cada sessão criada. Armazenar como `ClienteEtiqueta` implicaria recalcular e reescrever para todos os clientes no cron diário — risco de race condition e sobrecarga. Derivar de `ultimaSessao` (campo já existente em `Cliente`) é instantâneo, sempre correcto, e sem migração.

**How to apply:** O componente de perfil e a lista de clientes calculam o badge de actividade inline com `Date.now() - ultimaSessao`. A função helper `calcularTagActividade(ultimaSessao: Date | null): string` fica em `lib/etiquetas.ts`.

**Alternatives considered:**
- Stored in DB: rejeitado por complexidade de manutenção e risco de dessincronização
- Cron diário para recalcular: rejeitado por latência (até 24h de desfasamento)

---

## Decision 2: Auto-tags de voucher — computed vs stored

**Decision:** Stored como `ClienteEtiqueta` com `tipo: automatica`.

**Rationale:** O estado do voucher é um evento discreto (ativo → usado), não contínuo. Armazenar permite filtrar clientes por "tem voucher ativo" na query Prisma sem joins extras. A trigger acontece na `actions.ts` do financeiro (ao criar ou marcar como usado um `GiftCard`).

**Alternatives considered:**
- Computed: exigiria join entre GiftCard e Cliente em toda query de lista — mais lento e mais código
- WebHook externo: sobrecomplexo para uso interno

---

## Decision 3: Criação de campanhas segmentadas

**Decision:** Reutilizar o modelo `Campanha` existente + `MensagemIA` em lote.

**Rationale:** O modelo `Campanha` já existe no schema com `segmento: Json` e `mensagens: MensagemIA[]`. O fluxo de aprovação e envio de `MensagemIA` já está construído. Criar uma campanha a partir de um filtro de tag = criar uma `Campanha` com `segmento = {etiquetas: [...], estados: [...]}` + uma `MensagemIA pendente` por cliente filtrado.

**How to apply:** Server Action `criarCampanhaFromFiltro` em `app/(dashboard)/clientes/actions.ts`:
1. Query clientes pelo filtro (tags + estado + inatividade)
2. Excluir clientes com tag `bloqueiaAutomacoes: true`
3. Criar `Campanha` com metadata do filtro
4. Para cada cliente: criar `MensagemIA` com `tipo: "campanha"`, `campanhaId`, `estado: pendente`
5. Redirecionar para `/mensagens` para aprovação individual

---

## Decision 4: Gestão de tags — página dedicada vs modal

**Decision:** Página dedicada em `/etiquetas`.

**Rationale:** A gestão de catálogo (criar, editar, apagar, ver contagens) é suficientemente complexa para justificar uma página própria. Modais ficam pesados com listas longas e confirmações de apagamento. A criação *on-the-fly* no perfil de cliente é adicionalmente suportada por um mini-formulário inline.

---

## Decision 5: Filtros na lista de clientes — query params vs estado local

**Decision:** Query params (`?etiquetas[]=x&estado=vip_em_risco&inativo=60`).

**Rationale:** Consistente com o pattern já usado (`?q=...&estado=...`). Permite partilhar/favoritar o URL filtrado. Server Component faz a query direto no Prisma sem fetch client-side.

**How to apply:** `clientes/page.tsx` (Server Component) lê `searchParams`, constrói a `where` clause, e passa a Server Action `criarCampanhaFromFiltro` via Client Component de botão.

---

## Decision 6: Bloqueio de automações por tag de saúde

**Decision:** Filtro na query de clientes a mensagar — não no envio.

**Rationale:** Bloquear na fonte (ao seleccionar clientes para campanha/reengagement) é mais seguro que bloquear no envio. O motor de reengagement diário (cron → `/api/cron/reengagement`) já faz uma query `findMany` — adicionar `.etiquetas: { every: { etiqueta: { bloqueiaAutomacoes: false } } }` é uma linha.

---

## Decision 7: Esquema de cores das tags

**Decision:** Paleta de 12 cores pré-definidas (hex) — não picker livre.

**Rationale:** Um colour picker livre resulta em tags com cores inconsistentes e difíceis de ler. 12 cores bem escolhidas cobrem os casos e mantêm o design coerente. Bea selecciona clicando num círculo de cor.

**Paleta definida:**
```
#b9a07a  #a0a996  #7a9e7e  #d4956b  #b06050
#6d7fcc  #9b72cf  #4d9ab0  #c4704f  #5e8e6e
#9d9d9a  #161a26
```
