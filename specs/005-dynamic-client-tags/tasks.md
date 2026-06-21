# Tasks — Sistema de Tags Dinâmicas (Spec 005)

**Feature:** Sistema de Tags & Categorias Dinâmicas de Clientes
**Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)
**Stack:** Next.js 15 App Router · Prisma 6 · Neon PostgreSQL · NextAuth v5 · TypeScript

---

## Dependências entre User Stories

```
Setup → Foundational → US1 (perfil) → US2 (lista + campanha)
                    → US3 (catálogo) → independente
                    → US4 (auto-tags) → independente
```

US2 depende de US1 (FilterClientesComponent usa tags do perfil).
US3 e US4 são independentes entre si e de US1/US2 (ficheiros diferentes).

---

## Phase 1 — Setup

**Goal:** Schema migrado, helper lib disponível.

- [ ] T001 Adicionar enum `TipoEtiqueta` e campos `tipo`/`bloqueiaAutomacoes` ao modelo `Etiqueta` em `prisma/schema.prisma`
- [ ] T002 Correr `npx prisma generate` e `npx prisma db push` para aplicar o schema localmente
- [ ] T003 [P] Criar `lib/etiquetas.ts` com `calcularTagActividade`, `CORES_PALETA` e `ESTADO_CRM_CONFIG` conforme `plan.md` Fase 1.2

---

## Phase 2 — Foundational

**Goal:** Catálogo inicial de 17 tags pré-definidas disponível na BD. Pré-requisito para todos os user stories.

- [ ] T004 Criar `prisma/seed-tags.ts` com upsert idempotente das 17 tags do catálogo inicial (3 saúde bloqueantes, 3 saúde não-bloqueantes, 5 campanha, 4 preferência, 2 automáticas) conforme `data-model.md`
- [ ] T005 Correr `npx tsx prisma/seed-tags.ts` para criar o catálogo na BD local e verificar que as 17 tags existem via `npx prisma studio`

---

## Phase 3 — US1: Gerir tags no perfil de cliente

**Goal:** A Bea consegue ver, adicionar, remover e criar tags no perfil de qualquer cliente, e editar o estado CRM inline com um clique.

**Critérios de teste independentes:**
- Ir a `/clientes/[id]` → secção de tags visível com badge de actividade
- Adicionar tag "Grávida" → chip aparece no grupo Saúde
- Criar tag "Teste" on-the-fly → fica disponível no catálogo
- Clicar no chip de estado → selector com 9 estados → alterar → persiste no reload

- [ ] T006 [US1] Criar `app/(dashboard)/clientes/actions.ts` com Server Actions: `verificarSessao`, `adicionarEtiqueta(clienteId, etiquetaId)`, `removerEtiqueta(clienteId, etiquetaId)`, `criarEtiqueta(dados)`, `atualizarEstadoCliente(clienteId, estado)` — conforme `contracts/actions.md`
- [ ] T007 [US1] Criar `app/(dashboard)/clientes/[id]/EstadoEditor.tsx` como Client Component: chip colorido clicável que abre dropdown com os 9 estados, usa `ESTADO_CRM_CONFIG` de `lib/etiquetas.ts`, chama `atualizarEstadoCliente` via `useTransition`, fecha ao clicar fora
- [ ] T008 [US1] Criar `app/(dashboard)/clientes/[id]/TagsSection.tsx` como Client Component: recebe `clienteId`, `etiquetasCliente`, `todasEtiquetas`, `ultimaSessao`; mostra badge de actividade via `calcularTagActividade`; chips agrupados por tipo (Saúde/Campanha/Preferência/Automáticas) com × nos manuais; dropdown searchable para adicionar; formulário inline para criar nova tag com paleta de 12 cores; `useTransition` em todas as mutações
- [ ] T009 [US1] Actualizar `app/(dashboard)/clientes/[id]/page.tsx`: adicionar `include: { etiquetas: { include: { etiqueta: true } } }` na query Prisma; buscar `todasEtiquetas` em paralelo via `prisma.etiqueta.findMany({ where: { tipo: { not: "automatica" } } })`; substituir `EstadoBadge` estático por `<EstadoEditor>`; adicionar `<TagsSection>` após o cabeçalho do perfil; serializar `ultimaSessao` como ISO string

---

## Phase 4 — US2: Filtrar clientes e lançar campanha WhatsApp

**Goal:** A Bea consegue filtrar a lista de clientes por tags + estado + inactividade e criar uma campanha WhatsApp para o grupo filtrado, com as clientes bloqueadas excluídas automaticamente.

**Critérios de teste independentes:**
- Filtrar por tag "Grávida" → só clientes com essa tag
- Filtrar por tag "Massagem de Casal" + estado "ativa_recente" → interseção correcta
- Clicar "Criar campanha" → modal com templates → confirmar → mensagens pendentes em `/mensagens`
- Cliente com "Grávida" excluída da campanha → toast informa count

- [ ] T010 [US2] Adicionar `criarCampanhaFromFiltro(dados)` ao `app/(dashboard)/clientes/actions.ts`: query clientes com filtro de etiquetas + estado + inactividade + `NOT { etiquetas: { some: { etiqueta: { bloqueiaAutomacoes: true } } } }`; criar `Campanha`; criar `MensagemIA pendente` por cliente (máx. 200); `revalidatePath("/mensagens")`; retornar `{ campanhaId, totalCriadas, totalExcluidas }`
- [ ] T011 [US2] Actualizar `components/clientes-table.tsx`: substituir coluna de última visita por badge de actividade colorido usando `calcularTagActividade` de `lib/etiquetas.ts`; adicionar coluna de chips de tags de Saúde (máx. 2 visíveis + "+N" se mais); passar `ultimaSessao` serializado
- [ ] T012 [US2] Criar `app/(dashboard)/clientes/FiltrosClientes.tsx` como Client Component: multi-select de tags por tipo (chips clicáveis); multi-select de estado CRM; selector de inactividade (Qualquer / <30d / 30–60d / 60–90d / 90+d); ao alterar → `router.push` com query params actualizados; chips activos com ×; botão "Criar campanha" (activo quando filtros activos) → modal com `TemplateMensagem` disponíveis → chama `criarCampanhaFromFiltro`
- [ ] T013 [US2] Actualizar `app/(dashboard)/clientes/page.tsx`: aceitar `searchParams` com `etiquetas[]`, `inativo`, manter `q` e `estado`; construir `where` Prisma com filtro por `etiquetas.some` + `ultimaSessao < X`; buscar `todasEtiquetas` e `templates` em paralelo; passar tudo para `<FiltrosClientes>` como Client Component; incluir etiquetas nos rows serializados

---

## Phase 5 — US3: Gerir o catálogo de tags

**Goal:** A Bea consegue ver todas as tags, criar novas, editar nome/cor/bloqueio e apagar com confirmação.

**Critérios de teste independentes:**
- Ir a `/etiquetas` → lista agrupada por tipo com contagem de clientes
- Criar nova tag "Relaxamento Profundo" tipo Campanha → aparece na lista
- Editar cor de tag existente → cor actualiza
- Apagar tag com 0 clientes → sem confirmação; com 1+ → modal de confirmação

- [ ] T014 [US3] Criar `app/(dashboard)/etiquetas/actions.ts` com Server Actions: `atualizarEtiqueta(etiquetaId, dados)` (nome, cor, bloqueiaAutomacoes) e `apagarEtiqueta(etiquetaId, confirmar?)` (retorna `{ clientesAfectados }` se `confirmar` não passado; deleta se `confirmar: true`)
- [ ] T015 [US3] Criar `app/(dashboard)/etiquetas/EtiquetasManager.tsx` como Client Component: lista por tipo (Saúde/Campanha/Preferência/Automáticas); por linha: circle de cor + nome + badge com count + botões Editar/Apagar; modal de edição com nome, cor (paleta 12 cores), toggle `bloqueiaAutomacoes` (apenas para tipo saude); modal de criação completo; lógica de apagamento com confirmação condicional; tags automáticas sem botões de editar/apagar
- [ ] T016 [US3] Criar `app/(dashboard)/etiquetas/page.tsx` como Server Component: buscar `prisma.etiqueta.findMany({ include: { _count: { select: { clientes: true } } }, orderBy: [{ tipo: "asc" }, { nome: "asc" }] })`; agrupar por tipo; passar para `<EtiquetasManager>`
- [ ] T017 [US3] Adicionar link `/etiquetas` à navegação lateral do dashboard (procurar `app/(dashboard)/layout.tsx` ou `components/sidebar.tsx` e adicionar item "Etiquetas" com ícone `Tag` do lucide-react)

---

## Phase 6 — US4: Tags automáticas de actividade e vouchers

**Goal:** O sistema calcula automaticamente a actividade de cada cliente e auto-atribui tags de voucher quando um GiftCard é criado ou marcado como usado.

**Critérios de teste independentes:**
- Badge de actividade no perfil reflecte `ultimaSessao` correctamente (já coberto por US1/T008)
- Criar voucher com telefone de cliente existente → tag "Voucher ativo" aparece no perfil
- Marcar voucher como "Usado" → tag muda para "Voucher usado"

- [ ] T018 [US4] Estender `app/(dashboard)/financeiro/actions.ts` — em `criarVoucher`: após criar `GiftCard`, se `beneficiarioTelefone` existe, buscar `Cliente` por `telefone`; se encontrado, buscar etiqueta "Voucher ativo" (tipo automatica); fazer upsert `ClienteEtiqueta`; `revalidatePath("/clientes/" + cliente.id)`
- [ ] T019 [US4] Estender `app/(dashboard)/financeiro/actions.ts` — em `atualizarEstadoVoucher`: se `estado === "usado"` e `GiftCard.clienteId` existe, remover `ClienteEtiqueta` "Voucher ativo" e upsert `ClienteEtiqueta` "Voucher usado"; `revalidatePath("/clientes/" + giftCard.clienteId)`

---

## Phase 7 — API REST para N8N

**Goal:** N8N consegue listar tags, atribuir e remover tags de clientes via API REST com X-API-Key.

- [ ] T020 [P] Criar `app/api/v1/etiquetas/route.ts`: handler GET com `validarApiKey`; query `prisma.etiqueta.findMany({ include: { _count: { select: { clientes: true } } } })`; suportar query params `tipo` e `bloqueiaAutomacoes`; response `{ data, meta }`
- [ ] T021 [P] Criar `app/api/v1/clientes/[id]/etiquetas/route.ts`: handler POST com `validarApiKey`; aceitar `{ etiquetaId }` ou `{ etiquetaNome }`; upsert `ClienteEtiqueta`; response 200
- [ ] T022 [P] Criar `app/api/v1/clientes/[id]/etiquetas/[etiquetaId]/route.ts`: handler DELETE com `validarApiKey`; delete `ClienteEtiqueta`; response 200
- [ ] T023 Actualizar `app/api/v1/clientes/route.ts` (GET existente): suportar parâmetros `etiquetas[]` e `sem_automacoes=true`; quando `sem_automacoes=true` adicionar `NOT: { etiquetas: { some: { etiqueta: { bloqueiaAutomacoes: true } } } }` à query

---

## Phase 8 — Polish & Deploy

- [ ] T024 Verificar TypeScript: `npx tsc --noEmit --skipLibCheck` — resolver todos os erros antes de fazer push
- [ ] T025 Correr seed de tags na Neon de produção: `DATABASE_URL="<neon-pooler-url>" npx tsx prisma/seed-tags.ts`
- [ ] T026 Aplicar schema na Neon de produção: `DATABASE_URL="<neon-pooler-url>" npx prisma db push`
- [ ] T027 Commit e push para deploy Vercel: `git add -A && git commit -m "feat: sistema de tags dinâmicas (spec 005)" && git push`

---

## Dependency Graph

```
T001 → T002 → T003 (paralelo com T004)
              T004 → T005
T001–T005 completos →
  US1: T006 → T007 [P] T008 [P] → T009
  US3: T014 → T015 → T016 → T017  (paralelo com US1)
  US4: T018 → T019                  (paralelo com US1/US3)

US1 completo →
  US2: T010 → T011 [P] T012 [P] → T013

Todos completos →
  API: T020 [P] T021 [P] T022 [P] → T023
  Polish: T024 → T025 [P] T026 [P] → T027
```

---

## Parallel Execution Examples

**Bloco A (após T005):**
- `T007 EstadoEditor.tsx` + `T008 TagsSection.tsx` — ficheiros independentes

**Bloco B (após T009, US1 completo):**
- `T011 clientes-table.tsx` + `T012 FiltrosClientes.tsx` — ficheiros independentes

**Bloco C (após T005, paralelo com US1):**
- `T014→T015→T016→T017 (US3)` + `T018→T019 (US4)` — ficheiros independentes

**Bloco D (API REST, após US1 completo):**
- `T020` + `T021` + `T022` — ficheiros independentes

---

## MVP Scope (US1 apenas)

Para uma versão mínima utilizável imediatamente:
```
T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008 → T009
```
Resultado: A Bea vê tags no perfil, adiciona/remove/cria tags e edita o estado CRM inline.
US2, US3, US4, API REST podem seguir depois.

---

## Implementation Strategy

1. **Não partir o existente**: `Etiqueta` já tem dados — os novos campos `tipo` e `bloqueiaAutomacoes` têm defaults e são retrocompatíveis com os dados existentes
2. **Seed antes de deploy**: correr `seed-tags.ts` em prod antes do deploy para que as etiquetas automáticas de voucher existam quando o código precisar delas (T025 antes de T027)
3. **Schema primeiro**: T001+T002 antes de qualquer código TypeScript para o Prisma Client estar actualizado
4. **Actions antes de Components**: T006 (actions) antes de T007/T008 (components) — os components importam as actions
