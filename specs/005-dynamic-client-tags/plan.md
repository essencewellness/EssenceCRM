# Plano de Implementação — Sistema de Tags Dinâmicas (Spec 005)

**Spec:** [spec.md](spec.md)
**Stack:** Next.js 15 App Router · Prisma 6 · Neon PostgreSQL · NextAuth v5 · TypeScript
**Design system:** bg `#ffffff` / card `#f8f4ef` / gold `#b9a07a` / cream `#ddd6c4` / dark text `#161a26`

---

## Arquitectura de Implementação

### Camadas envolvidas

```
prisma/schema.prisma          ← nova enum TipoEtiqueta + campos em Etiqueta
lib/etiquetas.ts              ← helpers puros (calcularTagActividade, CORES_PALETA)
app/(dashboard)/clientes/
  actions.ts                  ← Server Actions: add/remove/criar tag, mudar estado, criar campanha
  page.tsx                    ← filtro por tags + botão "Criar campanha"
  [id]/page.tsx               ← secção TagsSection + EstadoEditor
  [id]/TagsSection.tsx        ← Client Component: gerir tags inline
  [id]/EstadoEditor.tsx       ← Client Component: chip clicável dos 9 estados
app/(dashboard)/etiquetas/
  page.tsx                    ← catálogo de tags (Server Component)
  EtiquetasManager.tsx        ← Client Component: editar/apagar tags
  actions.ts                  ← atualizarEtiqueta, apagarEtiqueta
components/
  clientes-table.tsx          ← actualizar para mostrar chips de tags + dias sem vir
app/api/v1/
  etiquetas/route.ts          ← GET (listagem p/ N8N)
  clientes/[id]/etiquetas/
    route.ts                  ← POST (adicionar)
    [etiquetaId]/route.ts     ← DELETE (remover)
app/(dashboard)/financeiro/
  actions.ts                  ← estender criarVoucher + atualizarEstadoVoucher com auto-tags
prisma/
  seed-tags.ts                ← catálogo inicial das 17 tags pré-definidas
```

---

## Fase 1 — Schema + helpers

### 1.1 Adicionar `TipoEtiqueta` enum e campos ao modelo `Etiqueta`

**Ficheiro:** `prisma/schema.prisma`

Adicionar enum:
```prisma
enum TipoEtiqueta {
  saude
  campanha
  preferencia
  automatica
}
```

Estender `Etiqueta`:
```prisma
model Etiqueta {
  id                 String            @id @default(cuid())
  nome               String            @unique
  cor                String            @default("#b9a07a")
  tipo               TipoEtiqueta      @default(campanha)
  bloqueiaAutomacoes Boolean           @default(false)
  clientes           ClienteEtiqueta[]

  @@index([tipo])
  @@index([bloqueiaAutomacoes])
}
```

Depois: `npx prisma db push` (dev + prod).

### 1.2 Helper de tags de actividade

**Ficheiro:** `lib/etiquetas.ts` (novo)

```typescript
export const CORES_PALETA = [
  "#b9a07a", "#a0a996", "#7a9e7e", "#d4956b", "#b06050",
  "#6d7fcc", "#9b72cf", "#4d9ab0", "#c4704f", "#5e8e6e",
  "#9d9d9a", "#161a26",
]

export function calcularTagActividade(ultimaSessao: Date | string | null): {
  label: string; cor: string; dias: number | null
} {
  if (!ultimaSessao) return { label: "Sem sessões", cor: "#9d9d9a", dias: null }
  const dias = Math.floor((Date.now() - new Date(ultimaSessao).getTime()) / 86_400_000)
  if (dias <= 30)  return { label: `Ativa · ${dias}d`, cor: "#7a9e7e", dias }
  if (dias <= 60)  return { label: `Inativa · ${dias}d`, cor: "#d4956b", dias }
  if (dias <= 90)  return { label: `Inativa · ${dias}d`, cor: "#b06050", dias }
  return { label: `Inativa · ${dias}d`, cor: "#9d9d9a", dias }
}

export const TIPO_ETIQUETA_LABELS: Record<string, string> = {
  saude: "Saúde",
  campanha: "Campanha",
  preferencia: "Preferência",
  automatica: "Automática",
}

export const ESTADO_CRM_CONFIG: Record<string, { label: string; cor: string; bg: string; border: string }> = {
  lead:            { label: "Lead",         cor: "#b9a07a", bg: "rgba(185,160,122,0.10)", border: "rgba(185,160,122,0.28)" },
  novo:            { label: "Nova",         cor: "#a0a996", bg: "rgba(160,169,150,0.12)", border: "rgba(160,169,150,0.28)" },
  ativa_recente:   { label: "Ativa",        cor: "#a0a996", bg: "rgba(160,169,150,0.12)", border: "rgba(160,169,150,0.28)" },
  ativa_frequente: { label: "Frequente",    cor: "#7a9e7e", bg: "rgba(122,158,126,0.10)", border: "rgba(122,158,126,0.28)" },
  vip_embaixadora: { label: "VIP ✦",        cor: "#b9a07a", bg: "rgba(185,160,122,0.13)", border: "rgba(185,160,122,0.35)" },
  vip_em_risco:    { label: "Em Risco",     cor: "#d4956b", bg: "rgba(212,149,107,0.10)", border: "rgba(212,149,107,0.28)" },
  reativacao:      { label: "Reativação",   cor: "#b06050", bg: "rgba(176,96,80,0.08)",  border: "rgba(176,96,80,0.22)" },
  perdida:         { label: "Perdida",      cor: "#9d9d9a", bg: "rgba(157,157,154,0.10)", border: "rgba(157,157,154,0.22)" },
  blacklist:       { label: "Blacklist",    cor: "#b06050", bg: "rgba(176,96,80,0.12)",  border: "rgba(176,96,80,0.30)" },
}
```

### 1.3 Seed do catálogo inicial de tags

**Ficheiro:** `prisma/seed-tags.ts` (novo, idempotente via upsert)

Criar as 17 tags definidas em `data-model.md`. Usar `prisma.etiqueta.upsert({ where: { nome }, ... })` para ser re-corrível.

Comando: `npx tsx prisma/seed-tags.ts` (funciona em dev e prod com `DATABASE_URL` da Neon).

---

## Fase 2 — Server Actions (lógica de mutação)

### 2.1 Actions de tags no perfil de cliente

**Ficheiro:** `app/(dashboard)/clientes/actions.ts` (novo)

Implementar conforme `contracts/actions.md`:
- `adicionarEtiqueta`
- `removerEtiqueta`
- `criarEtiqueta`
- `atualizarEstadoCliente`
- `criarCampanhaFromFiltro`

Pattern de auth: todas começam com `await verificarSessao()` (importar de `app/(dashboard)/financeiro/actions.ts` ou mover para `lib/server-auth.ts`).

### 2.2 Actions de gestão de catálogo

**Ficheiro:** `app/(dashboard)/etiquetas/actions.ts` (novo)

- `atualizarEtiqueta`
- `apagarEtiqueta` — dois passos: contar afectados (retorna count) e apagar (chamada separada com `confirmar: true`)

### 2.3 Auto-tags de voucher

**Ficheiro:** `app/(dashboard)/financeiro/actions.ts` (existente — estender)

Em `criarVoucher`: após criar o `GiftCard`, se `beneficiarioTelefone` existe e matches um `Cliente.telefone`:
1. Buscar a etiqueta "Voucher ativo" (tipo: automatica)
2. Upsert `ClienteEtiqueta`

Em `atualizarEstadoVoucher`: se `estado === "usado"` e `GiftCard.clienteId` existe:
1. Remover "Voucher ativo"
2. Upsert "Voucher usado"

---

## Fase 3 — Componentes de perfil de cliente

### 3.1 `EstadoEditor.tsx` — chip clicável

**Ficheiro:** `app/(dashboard)/clientes/[id]/EstadoEditor.tsx` (novo, Client Component)

- Chip colorido com o estado actual
- Click → dropdown com os 9 estados (cada um com cor e label)
- Seleccionar → chama `atualizarEstadoCliente` via `useTransition`
- Loading state no chip durante a transição
- Fechar ao clicar fora (backdrop div)

### 3.2 `TagsSection.tsx` — gestão inline de tags

**Ficheiro:** `app/(dashboard)/clientes/[id]/TagsSection.tsx` (novo, Client Component)

Recebe:
```typescript
type Props = {
  clienteId: string
  etiquetasCliente: EtiquetaRow[]   // tags já atribuídas
  todasEtiquetas: EtiquetaRow[]     // catálogo completo
  ultimaSessao: string | null        // para badge de actividade
}
```

Renderiza:
- Badge de actividade (computado via `calcularTagActividade`)
- Chips agrupados por tipo (Saúde → Campanha → Preferência → Automáticas)
- Chips com × nos tipos manuais; sem × nas automáticas
- Botão "+ Adicionar etiqueta" → dropdown searchable com:
  - Lista de etiquetas existentes não atribuídas
  - "Criar nova: [texto]" se não encontrar match exacto
- Formulário de criação on-the-fly: nome, tipo, cor (paleta de 12)
- `useTransition` em todas as mutações — desabilita UI durante loading

### 3.3 Integrar no perfil

**Ficheiro:** `app/(dashboard)/clientes/[id]/page.tsx` (existente — estender)

- Substituir o `EstadoBadge` estático por `<EstadoEditor estado={...} clienteId={...} />`
- Adicionar `<TagsSection .../>` abaixo do cabeçalho do perfil
- Na query Prisma: adicionar `include: { etiquetas: { include: { etiqueta: true } } }`
- Buscar `todasEtiquetas` em paralelo: `prisma.etiqueta.findMany({ where: { tipo: { not: "automatica" } }, orderBy: { tipo: "asc" } })`

---

## Fase 4 — Lista de clientes com filtros

### 4.1 Actualizar `clientes/page.tsx`

- Aceitar `searchParams` com `etiquetas` (array) + `inativo` (número de dias)
- Construir `where` clause com filtro por `etiquetas.some` + `ultimaSessao < X`
- Buscar `todasEtiquetas` em paralelo para o UI de filtros
- Passar `etiquetasFiltro` e `inativoFiltro` para um Client Component de filtros
- Botão "Criar campanha" (Client Component) activo quando há filtros + selecção
- Serializar `ultimaSessao` nos rows para calcular actividade no componente de tabela

### 4.2 Actualizar `components/clientes-table.tsx`

- Coluna "Última visita" → substituir por "Actividade" com badge colorido
- Coluna "Tags" → chips de tags de Saúde (máx. 2, +N se mais)
- Chips mostrados com a cor da etiqueta + nome truncado

### 4.3 Filtros de tags (Client Component)

**Ficheiro:** `app/(dashboard)/clientes/FiltrosClientes.tsx` (novo, Client Component)

- Multi-select de tags: chips clicáveis organizados por tipo
- Multi-select de estado CRM: chips com cores
- Selector de inactividade: 4 opções (qualquer / < 30d / 30–60d / 60–90d / 90+d)
- Ao mudar: `router.push` com novos query params
- Chips activos removíveis com ×
- Contador "X clientes" actualizado conforme filtros (lido do total passado pelo Server Component)

---

## Fase 5 — Página de catálogo de tags

### 5.1 `app/(dashboard)/etiquetas/page.tsx`

Server Component:
- Busca `prisma.etiqueta.findMany({ include: { _count: { select: { clientes: true } } } })`
- Agrupa por tipo e passa para `EtiquetasManager`
- Link na sidebar (actualizar navegação)

### 5.2 `EtiquetasManager.tsx` (Client Component)

- Lista por tipo (Saúde / Campanha / Preferência / Automáticas)
- Cada linha: chip de cor + nome + contagem de clientes + botões "Editar" / "Apagar"
- Modal de criação (mesmo formulário do on-the-fly, mais completo)
- Modal de edição: nome + cor + `bloqueiaAutomacoes` (apenas para tipo saude)
- Apagamento:
  - 0 clientes → apaga directo
  - 1+ clientes → modal de confirmação com contagem
- Tags automáticas: sem botões de editar/apagar

---

## Fase 6 — API REST para N8N (opcional mas útil)

### 6.1 `GET /api/v1/etiquetas`

**Ficheiro:** `app/api/v1/etiquetas/route.ts` (novo)

- Auth: `X-API-Key`
- Response: lista com `_count.clientes`
- Query params: `tipo`, `bloqueiaAutomacoes`

### 6.2 `POST /api/v1/clientes/[id]/etiquetas`

**Ficheiro:** `app/api/v1/clientes/[id]/etiquetas/route.ts` (novo)

### 6.3 `DELETE /api/v1/clientes/[id]/etiquetas/[etiquetaId]`

**Ficheiro:** `app/api/v1/clientes/[id]/etiquetas/[etiquetaId]/route.ts` (novo)

---

## Fase 7 — Bloqueio de automações no motor de reengagement

**Ficheiro:** `app/api/cron/reengagement/route.ts` (existente, se existir) ou onde o cron N8N chama para buscar clientes

- Adicionar à query `findMany`:
  ```typescript
  NOT: {
    etiquetas: {
      some: { etiqueta: { bloqueiaAutomacoes: true } }
    }
  }
  ```
- Se o cron usa `GET /api/v1/clientes?inactivos_desde_dias=45`, adicionar parâmetro `sem_automacoes=true` na API e aplicar o filtro lá

---

## Ordem de implementação recomendada

| Passo | O que fazer | Ficheiros |
|---|---|---|
| 1 | Schema + db push | `schema.prisma` |
| 2 | Helper lib | `lib/etiquetas.ts` |
| 3 | Seed catálogo | `prisma/seed-tags.ts` |
| 4 | Server Actions clientes | `clientes/actions.ts` |
| 5 | Server Actions catálogo | `etiquetas/actions.ts` |
| 6 | Auto-tags voucher | `financeiro/actions.ts` (estender) |
| 7 | EstadoEditor.tsx | `clientes/[id]/EstadoEditor.tsx` |
| 8 | TagsSection.tsx | `clientes/[id]/TagsSection.tsx` |
| 9 | Perfil de cliente | `clientes/[id]/page.tsx` (estender) |
| 10 | FiltrosClientes.tsx | `clientes/FiltrosClientes.tsx` |
| 11 | Clientes table | `components/clientes-table.tsx` (estender) |
| 12 | Lista de clientes | `clientes/page.tsx` (estender) |
| 13 | Página etiquetas | `etiquetas/page.tsx` + `EtiquetasManager.tsx` |
| 14 | API REST tags | `api/v1/etiquetas/...` |
| 15 | Bloqueio motor | `api/cron/...` ou `api/v1/clientes/route.ts` |
| 16 | TypeScript check | `npx tsc --noEmit --skipLibCheck` |
| 17 | Deploy | `git push` → Vercel |

---

## Regras de código (do CLAUDE.md)

- Comentários em português, código camelCase inglês
- Mutations só via Server Actions no dashboard (nunca fetch client-side para o Prisma)
- `revalidatePath` após cada mutação
- Erros: `{ error, code }` nas API routes; `throw new Error` nas Server Actions (NextAuth não usa try/catch no client)
- Sem `mode: "insensitive"` (PostgreSQL prod suporta, mas manter consistência)
- `verificarSessao()` em todas as Server Actions antes de qualquer operação

---

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| `db push` em prod com campo novo nullable | `tipo` e `bloqueiaAutomacoes` têm default — sem downtime, zero migrations pendentes |
| Tag "Voucher ativo" não existe quando voucher criado | Seed garante que etiquetas automáticas existem antes do deploy |
| Filtro de inactividade com `ultimaSessao null` | `null < Date` é `false` em PostgreSQL — clientes sem sessão não aparecem no filtro de inatividade (correcto) |
| `criarCampanhaFromFiltro` lenta com muitos clientes | Limite de 200 clientes por campanha para esta versão |
