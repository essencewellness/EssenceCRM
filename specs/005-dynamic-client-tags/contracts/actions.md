# Server Actions — Sistema de Tags Dinâmicas (Spec 005)

Ficheiro: `app/(dashboard)/clientes/actions.ts`
Auth: `auth()` do NextAuth — todas as actions lançam erro se não autenticado.

---

## `adicionarEtiqueta(clienteId, etiquetaId)`

Associa uma etiqueta existente a um cliente.

```typescript
async function adicionarEtiqueta(clienteId: string, etiquetaId: string): Promise<void>
```

- Upsert `ClienteEtiqueta` (sem erro se já existe)
- `revalidatePath("/clientes/" + clienteId)`

---

## `removerEtiqueta(clienteId, etiquetaId)`

Remove a associação etiqueta↔cliente.

```typescript
async function removerEtiqueta(clienteId: string, etiquetaId: string): Promise<void>
```

- Delete `ClienteEtiqueta` onde `clienteId + etiquetaId`
- `revalidatePath("/clientes/" + clienteId)`

---

## `criarEtiqueta(dados)`

Cria nova etiqueta no catálogo global e opcionalmente atribui-a a um cliente.

```typescript
async function criarEtiqueta(dados: {
  nome: string
  cor: string
  tipo: "saude" | "campanha" | "preferencia"
  bloqueiaAutomacoes?: boolean
  atribuirClienteId?: string  // se fornecido, cria e atribui de uma vez
}): Promise<{ id: string; nome: string }>
```

- Valida `nome` único (erro `{ code: "NOME_DUPLICADO" }` se já existe)
- Cria `Etiqueta`
- Se `atribuirClienteId`: cria `ClienteEtiqueta`
- `revalidatePath("/etiquetas")` + `revalidatePath("/clientes/" + atribuirClienteId)`

---

## `atualizarEstadoCliente(clienteId, estado)`

Edita o estado CRM de um cliente directamente (bypass do motor automático).

```typescript
async function atualizarEstadoCliente(
  clienteId: string,
  estado: EstadoCliente
): Promise<void>
```

- `prisma.cliente.update({ where: { id: clienteId }, data: { estado } })`
- Registar em `AuditLog` com `quem: email do user`, `acao: "cliente.estado_alterado"`, `detalhe: { manual: true, novoEstado: estado }`
- Disparar webhook `cliente.estado_alterado` via `lib/webhooks.ts`
- `revalidatePath("/clientes/" + clienteId)` + `revalidatePath("/clientes")`

---

## `criarCampanhaFromFiltro(dados)`

Cria uma campanha WhatsApp segmentada a partir de um filtro de tags.

```typescript
async function criarCampanhaFromFiltro(dados: {
  nome: string
  templateId: string
  etiquetaIds: string[]
  estados?: EstadoCliente[]
  inativoDesdeDias?: number
}): Promise<{ campanhaId: string; totalCriadas: number; totalExcluidas: number }>
```

1. Query `prisma.cliente.findMany` com filtros e `NOT: { etiquetas: { some: { etiqueta: { bloqueiaAutomacoes: true } } } }`
2. Contar clientes excluídos (total sem filtro bloqueante − total com)
3. Buscar `TemplateMensagem` pelo `templateId`
4. Criar `Campanha` com `segmento: dados` e `templateId`
5. Para cada cliente: criar `MensagemIA` com `tipo: "campanha"`, `campanhaId`, `estado: pendente`, `mensagemGerada: template.texto` (com substituição de `{{nome}}`)
6. `revalidatePath("/mensagens")`
7. Retornar `{ campanhaId, totalCriadas, totalExcluidas }`

---

Ficheiro: `app/(dashboard)/etiquetas/actions.ts`

## `atualizarEtiqueta(etiquetaId, dados)`

```typescript
async function atualizarEtiqueta(
  etiquetaId: string,
  dados: { nome?: string; cor?: string; bloqueiaAutomacoes?: boolean }
): Promise<void>
```

- `prisma.etiqueta.update`
- Valida unicidade de nome se fornecido
- `revalidatePath("/etiquetas")`

---

## `apagarEtiqueta(etiquetaId)`

```typescript
async function apagarEtiqueta(
  etiquetaId: string
): Promise<{ clientesAfectados: number }>
```

- Conta `ClienteEtiqueta` com `etiquetaId` → devolve para confirmação no UI
- Se confirmado (chamado segunda vez com `confirmar: true`): delete cascata via Prisma
- `revalidatePath("/etiquetas")` + `revalidatePath("/clientes")`

**Nota:** Prisma faz delete cascade automático em `ClienteEtiqueta` quando `Etiqueta` é apagada (pela FK `onDelete: Cascade`).
